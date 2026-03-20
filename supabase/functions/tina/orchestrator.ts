import OpenAI from 'npm:openai@4';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { TINA_SYSTEM_PROMPT, ONBOARDING_CONTEXT_PROMPT, INVENTORY_CONTEXT_PROMPT, RECIPE_CONTEXT_PROMPT } from './prompts.ts';
import { TINA_TOOLS } from './tools.ts';
import { ConversationMode, OnboardingStatus, ExtractionType } from './types.ts';
import type { ChatRequest, ChatResponse, TinaAction } from './types.ts';
import {
  getHouseholdProfile,
  upsertHouseholdProfile,
  getInventorySnapshot,
  addInventoryItems,
  findRecipesByInventory,
  createShoppingList,
  scheduleNudge,
  logInteractionEvent,
} from './services.ts';

const OFF_TOPIC_PATTERNS = [
  /\bcapital of\b/i,
  /\bwrite (me |a |an )?(cover letter|essay|poem|story|code|script|email)\b/i,
  /\b(homework|calculus|algebra|geometry|trigonometry|physics|chemistry|biology)\b/i,
  /\b(quantum|blockchain|crypto|bitcoin|ethereum|nft)\b/i,
  /\b(stock (market|price)|forex|trading)\b/i,
  /\b(who (won|is winning)|election|politics|president|prime minister)\b/i,
  /\b(sports score|nfl|nba|premier league|world cup score)\b/i,
  /\bwrite (a |an )?song\b/i,
  /\btranslate (this |the )?text\b/i,
  /\bcode (a |an |me )?(program|app|website|function)\b/i,
  /\bmath (problem|question)\b/i,
  /^\s*\d+\s*[\+\-\*\/]\s*\d+\s*=?\s*\??\s*$/,
];

const SCOPE_REFUSAL =
  "That's outside what I can help with — I'm focused on your kitchen and food. Is there something I can help you with there?";

const MODE_CONTEXT_PROMPTS: Record<string, string> = {
  [ConversationMode.onboarding]: ONBOARDING_CONTEXT_PROMPT,
  [ConversationMode.inventory]: INVENTORY_CONTEXT_PROMPT,
  [ConversationMode.recipe]: RECIPE_CONTEXT_PROMPT,
};

export async function handleChat(request: ChatRequest, supabase: SupabaseClient): Promise<ChatResponse> {
  const { householdId, userId, message } = request;
  console.log(`[Tina] → message: "${message}" | household: ${householdId} | mode: ${request.mode}`);

  const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

  // Zero-cost heuristic pre-check
  if (OFF_TOPIC_PATTERNS.some((p) => p.test(message))) {
    console.log('[Tina] Pre-check blocked off-topic message');
    const conversationId = await resolveConversation(supabase, request);
    await persistMessage(supabase, conversationId, 'user', message);
    const messageId = await persistMessage(supabase, conversationId, 'assistant', SCOPE_REFUSAL);
    const mode = await resolveMode(supabase, request, conversationId);
    return { conversationId, messageId, reply: SCOPE_REFUSAL, mode, actions: [], suggestedQuickReplies: buildQuickReplies(mode) };
  }

  const conversationId = await resolveConversation(supabase, request);
  const mode = await resolveMode(supabase, request, conversationId);

  await persistMessage(supabase, conversationId, 'user', message);

  const history = await loadConversationHistory(supabase, conversationId);

  const modeContext = MODE_CONTEXT_PROMPTS[mode] ?? '';
  const systemPrompt = modeContext ? `${TINA_SYSTEM_PROMPT}\n\n${modeContext}` : TINA_SYSTEM_PROMPT;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history,
  ];

  const actions: TinaAction[] = [];
  let finalReply = '';
  let loopCount = 0;

  while (true) {
    loopCount++;
    console.log(`[Tina] OpenAI call #${loopCount} | messages: ${messages.length}`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools: TINA_TOOLS as OpenAI.Chat.Completions.ChatCompletionTool[],
      tool_choice: 'auto',
      max_tokens: 1024,
      temperature: 0.4,
    });

    const choice = response.choices[0];
    const assistantMessage = choice.message;
    console.log(`[Tina] finish_reason: ${choice.finish_reason} | tool_calls: ${assistantMessage.tool_calls?.length ?? 0}`);
    messages.push(assistantMessage);

    if (choice.finish_reason === 'tool_calls' && assistantMessage.tool_calls) {
      for (const toolCall of assistantMessage.tool_calls) {
        let toolArgs: Record<string, unknown>;
        try { toolArgs = JSON.parse(toolCall.function.arguments); } catch { toolArgs = {}; }

        console.log(`[Tina] → tool: ${toolCall.function.name}`);
        const result = await dispatchToolCall(toolCall.function.name, toolArgs, { householdId, userId, conversationId, actions, supabase });
        console.log(`[Tina] ← tool result: ${JSON.stringify(result)}`);

        messages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) });
      }
    } else {
      finalReply = assistantMessage.content ?? '';
      break;
    }
  }

  const assistantMessageId = await persistMessage(supabase, conversationId, 'assistant', finalReply);

  await supabase
    .from('conversations')
    .update({ last_active_at: new Date().toISOString(), mode })
    .eq('id', conversationId);

  return {
    conversationId,
    messageId: assistantMessageId,
    reply: finalReply,
    mode,
    actions,
    suggestedQuickReplies: buildQuickReplies(mode),
  };
}

async function dispatchToolCall(
  toolName: string,
  args: Record<string, unknown>,
  ctx: { householdId: string; userId: string; conversationId: string; actions: TinaAction[]; supabase: SupabaseClient },
): Promise<unknown> {
  const { householdId, userId, conversationId, actions, supabase } = ctx;

  try {
    switch (toolName) {
      case 'get_household_profile': {
        const profile = await getHouseholdProfile(supabase, householdId);
        return { success: true, profile };
      }

      case 'update_household_profile': {
        const profile = await upsertHouseholdProfile(supabase, householdId, {
          householdSize: args.householdSize as number | undefined,
          cookingStyle: args.cookingStyle as string[] | undefined,
          dietaryPreferences: args.dietaryPreferences as string[] | undefined,
          healthGoals: args.healthGoals as string[] | undefined,
          storePreferences: args.storePreferences as string[] | undefined,
          foodWastePainPoints: args.foodWastePainPoints as string[] | undefined,
          notificationTolerance: args.notificationTolerance as string | undefined,
          automationReadiness: args.automationReadiness as string | undefined,
          onboardingStatus: args.onboardingStatus as string | undefined,
          primaryDriver: args.primaryDriver as string | undefined,
          decisionHour: args.decisionHour as string | undefined,
          avoidIngredients: args.avoidIngredients as string[] | undefined,
          pickyEaters: args.pickyEaters as boolean | undefined,
        });
        actions.push({ type: 'profile_updated', payload: { profile } });
        return { success: true, profile };
      }

      case 'get_inventory_snapshot': {
        const snapshot = await getInventorySnapshot(supabase, householdId);
        return { success: true, snapshot };
      }

      case 'add_inventory_items': {
        const rawItems = args.items as Array<Record<string, unknown>>;
        const items = rawItems.map((item) => ({
          name: item.name as string,
          category: item.category as string | undefined,
          quantity: item.quantity as number | undefined,
          unit: item.unit as string | undefined,
          brand: item.brand as string | undefined,
          expiryEstimate: item.expiryEstimate as string | undefined,
          confidence: item.confidence as string,
          sourceType: ExtractionType.manual,
          notes: item.notes as string | undefined,
        }));
        const addedItems = await addInventoryItems(supabase, householdId, items);
        actions.push({ type: 'inventory_updated', payload: { addedItems } });
        return { success: true, addedItems };
      }

      case 'reconcile_extraction_items': {
        const confirmed = (args.confirmedItems as Array<Record<string, unknown>>) ?? [];
        const rejected = (args.rejectedItemIds as string[]) ?? [];
        const addedItems = await addInventoryItems(supabase, householdId, confirmed.map((item) => ({
          name: item.name as string,
          category: item.category as string | undefined,
          quantity: item.quantity as number | undefined,
          unit: item.unit as string | undefined,
          brand: item.brand as string | undefined,
          expiryEstimate: item.expiryEstimate as string | undefined,
          confidence: (item.confidence as string) ?? 'confirmed',
          sourceType: ExtractionType.receipt_ocr,
        })));
        actions.push({ type: 'inventory_updated', payload: { confirmed: addedItems, rejected } });
        return { success: true, confirmed: addedItems, rejected };
      }

      case 'find_recipes_by_inventory': {
        const suggestions = await findRecipesByInventory(supabase, {
          householdId,
          maxMissingIngredients: args.maxMissingIngredients as number | undefined,
          maxPrepMinutes: args.maxPrepMinutes as number | undefined,
          preferredTags: args.preferredTags as string[] | undefined,
          limit: args.limit as number | undefined,
        });
        actions.push({ type: 'recipe_suggested', payload: { suggestions } });
        return { success: true, suggestions };
      }

      case 'create_shopping_list': {
        const list = await createShoppingList(supabase, {
          householdId,
          title: args.title as string,
          recipeId: args.recipeId as string | undefined,
          items: args.items as { name: string; quantity?: number; unit?: string; category?: string; note?: string }[],
        });
        actions.push({ type: 'shopping_list_updated', payload: { list } });
        return { success: true, list };
      }

      case 'log_interaction_event': {
        await logInteractionEvent(supabase, householdId, userId, conversationId, args.eventType as string, args.payload as Record<string, unknown>);
        return { success: true };
      }

      case 'schedule_nudge': {
        const nudge = await scheduleNudge(supabase, {
          householdId,
          nudgeType: args.nudgeType as string,
          title: args.title as string,
          body: args.body as string,
          scheduledFor: args.scheduledFor as string | undefined,
        });
        actions.push({ type: 'nudge_scheduled', payload: { nudge } });
        return { success: true, nudge };
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Tool execution failed' };
  }
}

async function resolveConversation(supabase: SupabaseClient, request: ChatRequest): Promise<string> {
  if (request.conversationId) {
    const { data } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', request.conversationId)
      .eq('household_id', request.householdId)
      .single();
    if (data) return data.id as string;
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({ household_id: request.householdId, user_id: request.userId, mode: request.mode ?? ConversationMode.general })
    .select()
    .single();

  if (error) throw new Error(`Failed to create conversation: ${error.message}`);
  return data.id as string;
}

async function resolveMode(supabase: SupabaseClient, request: ChatRequest, conversationId: string): Promise<string> {
  if (request.mode) return request.mode;

  const profile = await getHouseholdProfile(supabase, request.householdId);
  if (!profile || profile.onboardingStatus === OnboardingStatus.not_started) {
    return ConversationMode.onboarding;
  }

  const { data } = await supabase.from('conversations').select('mode').eq('id', conversationId).single();
  return (data?.mode as string) ?? ConversationMode.general;
}

async function loadConversationHistory(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('role, content, tool_call_id, tool_name, tool_input, tool_output')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(40);

  if (error) return [];

  return (data ?? []).map((row) => {
    if (row.role === 'tool') {
      return { role: 'tool' as const, tool_call_id: row.tool_call_id as string, content: JSON.stringify(row.tool_output ?? {}) };
    }
    return { role: row.role as 'user' | 'assistant', content: row.content as string };
  });
}

async function persistMessage(supabase: SupabaseClient, conversationId: string, role: 'user' | 'assistant', content: string): Promise<string> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role, content })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to persist message: ${error.message}`);
  return data.id as string;
}

function buildQuickReplies(mode: string): string[] {
  switch (mode) {
    case ConversationMode.onboarding:
      return [];
    case ConversationMode.inventory:
      return ["What's expiring soon?", 'Add new items', 'Check my pantry'];
    case ConversationMode.recipe:
      return ['What can I make tonight?', 'Something quick', 'Use expiring items'];
    case ConversationMode.shopping:
      return ['Build a shopping list', 'Add missing items', 'View current list'];
    default:
      return ['Check my inventory', 'Suggest a recipe', 'Build a shopping list'];
  }
}
