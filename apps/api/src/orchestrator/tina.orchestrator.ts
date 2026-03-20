import OpenAI from 'openai';
import { supabase } from '../db/client';
import { TINA_SYSTEM_PROMPT, ONBOARDING_CONTEXT_PROMPT, INVENTORY_CONTEXT_PROMPT, RECIPE_CONTEXT_PROMPT } from './tina.prompts';
import { TINA_TOOLS } from './tina.tools';
import { getHouseholdProfile, upsertHouseholdProfile } from '../services/household-profile';
import { getInventorySnapshot, addInventoryItems } from '../services/inventory';
import { findRecipesByInventory } from '../services/recipe';
import { createShoppingList } from '../services/grocery';
import { scheduleNudge } from '../services/nudge';
import { logInteractionEvent } from '../services/events';
import type { ChatRequest, ChatResponse, TinaAction, UpdateHouseholdProfileInput } from '@foodstorii/shared';
import { ConversationMode, ExtractionType, OnboardingStatus, NotificationTolerance, AutomationReadiness, PrimaryDriver } from '@foodstorii/shared';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SCOPE_REFUSAL =
  "That's outside what I can help with — I'm focused on your kitchen and food. Is there something I can help you with there?";

// Patterns that are obviously off-topic — checked before spending an OpenAI call.
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
  /^\s*\d+\s*[\+\-\*\/]\s*\d+\s*=?\s*\??\s*$/,  // pure arithmetic like "847 * 23 = ?"
];

function isObviouslyOffTopic(message: string): boolean {
  return OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(message));
}

const MODE_CONTEXT_PROMPTS: Record<string, string> = {
  [ConversationMode.onboarding]: ONBOARDING_CONTEXT_PROMPT,
  [ConversationMode.inventory]: INVENTORY_CONTEXT_PROMPT,
  [ConversationMode.recipe]: RECIPE_CONTEXT_PROMPT,
};

export async function handleChat(request: ChatRequest): Promise<ChatResponse> {
  const { householdId, userId, message } = request;
  console.log(`[Tina] → message: "${message}" | household: ${householdId} | mode: ${request.mode}`);

  // Zero-cost heuristic pre-check — no OpenAI call for obvious off-topic messages
  if (isObviouslyOffTopic(message)) {
    console.log('[Tina] Pre-check blocked off-topic message');
    const conversationId = await resolveConversation(request);
    await persistMessage(conversationId, 'user', message);
    const refusalId = await persistMessage(conversationId, 'assistant', SCOPE_REFUSAL);
    const mode = await resolveMode(request, conversationId);
    return {
      conversationId,
      messageId: refusalId,
      reply: SCOPE_REFUSAL,
      mode: mode as ConversationMode,
      actions: [],
      suggestedQuickReplies: buildQuickReplies(mode as ConversationMode),
    };
  }

  // Resolve or create conversation
  const conversationId = await resolveConversation(request);
  const mode = await resolveMode(request, conversationId);

  // Persist user message
  await persistMessage(conversationId, 'user', message);

  // Build message history for OpenAI
  const history = await loadConversationHistory(conversationId);

  // Build system prompt with mode context
  const modeContext = MODE_CONTEXT_PROMPTS[mode] ?? '';
  const systemPrompt = modeContext ? `${TINA_SYSTEM_PROMPT}\n\n${modeContext}` : TINA_SYSTEM_PROMPT;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history,
  ];

  // Tool-use loop
  const actions: TinaAction[] = [];
  let finalReply = '';

  let loopCount = 0;
  let continueLoop = true;
  while (continueLoop) {
    loopCount++;
    console.log(`[Tina] OpenAI call #${loopCount} | messages: ${messages.length} | mode: ${mode}`);
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools: TINA_TOOLS,
      tool_choice: 'auto',
      max_tokens: 1024,
      temperature: 0.4,
    });

    const choice = response.choices[0];
    const assistantMessage = choice.message;
    console.log(`[Tina] finish_reason: ${choice.finish_reason} | tool_calls: ${assistantMessage.tool_calls?.length ?? 0}`);
    messages.push(assistantMessage);

    if (choice.finish_reason === 'tool_calls' && assistantMessage.tool_calls) {
      // Process each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        let toolArgs: Record<string, unknown>;
        try {
          toolArgs = JSON.parse(toolCall.function.arguments);
        } catch {
          toolArgs = {};
        }

        console.log(`[Tina] → tool: ${toolName} | args: ${JSON.stringify(toolArgs)}`);
        const toolResult = await dispatchToolCall(toolName, toolArgs, {
          householdId,
          userId,
          conversationId,
          actions,
        });

        console.log(`[Tina] ← tool result: ${JSON.stringify(toolResult)}`);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }
    } else {
      finalReply = assistantMessage.content ?? '';
      console.log(`[Tina] ← final reply (${finalReply.length} chars): "${finalReply.slice(0, 120)}..."`);
      continueLoop = false;
    }
  }

  // Persist assistant reply
  const assistantMessageId = await persistMessage(conversationId, 'assistant', finalReply);

  // Update conversation last_active_at
  await supabase
    .from('conversations')
    .update({ last_active_at: new Date().toISOString(), mode })
    .eq('id', conversationId);

  return {
    conversationId,
    messageId: assistantMessageId,
    reply: finalReply,
    mode: mode as ConversationMode,
    actions,
    suggestedQuickReplies: buildQuickReplies(mode as ConversationMode),
  };
}

async function dispatchToolCall(
  toolName: string,
  args: Record<string, unknown>,
  context: { householdId: string; userId: string; conversationId: string; actions: TinaAction[] },
): Promise<unknown> {
  const { householdId, userId, conversationId, actions } = context;

  try {
    switch (toolName) {
      case 'get_household_profile': {
        const profile = await getHouseholdProfile(householdId);
        return { success: true, profile };
      }

      case 'update_household_profile': {
        const profileInput: UpdateHouseholdProfileInput = {
          householdSize: args.householdSize as number | undefined,
          cookingStyle: args.cookingStyle as string[] | undefined,
          dietaryPreferences: args.dietaryPreferences as string[] | undefined,
          healthGoals: args.healthGoals as string[] | undefined,
          storePreferences: args.storePreferences as string[] | undefined,
          foodWastePainPoints: args.foodWastePainPoints as string[] | undefined,
          notificationTolerance: args.notificationTolerance as NotificationTolerance | undefined,
          automationReadiness: args.automationReadiness as AutomationReadiness | undefined,
          onboardingStatus: args.onboardingStatus as OnboardingStatus | undefined,
          primaryDriver: args.primaryDriver as PrimaryDriver | undefined,
          decisionHour: args.decisionHour as string | undefined,
          avoidIngredients: args.avoidIngredients as string[] | undefined,
          pickyEaters: args.pickyEaters as boolean | undefined,
        };
        const profile = await upsertHouseholdProfile(householdId, profileInput);
        actions.push({ type: 'profile_updated', payload: { profile } });
        return { success: true, profile };
      }

      case 'get_inventory_snapshot': {
        const snapshot = await getInventorySnapshot(householdId);
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
        const addedItems = await addInventoryItems(householdId, items as Parameters<typeof addInventoryItems>[1]);
        actions.push({ type: 'inventory_updated', payload: { addedItems } });
        return { success: true, addedItems };
      }

      case 'reconcile_extraction_items': {
        // Confirm or reject items from a prior extraction
        const confirmed = args.confirmedItems as Array<Record<string, unknown>> ?? [];
        const rejected = args.rejectedItemIds as string[] ?? [];
        const addedItems = await addInventoryItems(householdId, confirmed.map((item) => ({
          name: item.name as string,
          category: item.category as string | undefined,
          quantity: item.quantity as number | undefined,
          unit: item.unit as string | undefined,
          brand: item.brand as string | undefined,
          expiryEstimate: item.expiryEstimate as string | undefined,
          confidence: item.confidence as string ?? 'confirmed',
          sourceType: ExtractionType.receipt_ocr,
          notes: undefined,
        })) as Parameters<typeof addInventoryItems>[1]);
        actions.push({ type: 'inventory_updated', payload: { confirmed: addedItems, rejected } });
        return { success: true, confirmed: addedItems, rejected };
      }

      case 'find_recipes_by_inventory': {
        const suggestions = await findRecipesByInventory({
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
        const list = await createShoppingList({
          householdId,
          title: args.title as string,
          recipeId: args.recipeId as string | undefined,
          items: args.items as Parameters<typeof createShoppingList>[0]['items'],
        });
        actions.push({ type: 'shopping_list_updated', payload: { list } });
        return { success: true, list };
      }

      case 'log_interaction_event': {
        await logInteractionEvent(
          householdId,
          userId,
          conversationId,
          args.eventType as string,
          args.payload as Record<string, unknown>,
        );
        return { success: true };
      }

      case 'schedule_nudge': {
        const nudge = await scheduleNudge({
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
    const message = err instanceof Error ? err.message : 'Tool execution failed';
    return { success: false, error: message };
  }
}

async function resolveConversation(request: ChatRequest): Promise<string> {
  if (request.conversationId) {
    // Verify it belongs to this household
    const { data } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', request.conversationId)
      .eq('household_id', request.householdId)
      .single();
    if (data) return data.id as string;
  }

  // Create a new conversation
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      household_id: request.householdId,
      user_id: request.userId,
      mode: request.mode ?? ConversationMode.general,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create conversation: ${error.message}`);
  return data.id as string;
}

async function resolveMode(request: ChatRequest, conversationId: string): Promise<string> {
  if (request.mode) return request.mode;

  // Check if household needs onboarding
  const profile = await getHouseholdProfile(request.householdId);
  if (!profile || profile.onboardingStatus === OnboardingStatus.not_started) {
    return ConversationMode.onboarding;
  }

  // Fall back to conversation mode
  const { data } = await supabase
    .from('conversations')
    .select('mode')
    .eq('id', conversationId)
    .single();

  return (data?.mode as string) ?? ConversationMode.general;
}

async function loadConversationHistory(
  conversationId: string,
): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('role, content, tool_call_id, tool_name, tool_input, tool_output')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(40); // Keep context window manageable

  if (error) return [];

  return (data ?? [])
    .map((row) => {
      if (row.role === 'tool') {
        return {
          role: 'tool' as const,
          tool_call_id: row.tool_call_id as string,
          content: JSON.stringify(row.tool_output ?? {}),
        };
      }
      return {
        role: row.role as 'user' | 'assistant',
        content: row.content as string,
      };
    })
    .filter(Boolean);
}

async function persistMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role, content })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to persist message: ${error.message}`);
  return data.id as string;
}

function buildQuickReplies(mode: ConversationMode): string[] {
  switch (mode) {
    case ConversationMode.onboarding:
      return [];
    case ConversationMode.inventory:
      return ['What\'s expiring soon?', 'Add new items', 'Check my pantry'];
    case ConversationMode.recipe:
      return ['What can I make tonight?', 'Something quick', 'Use expiring items'];
    case ConversationMode.shopping:
      return ['Build a shopping list', 'Add missing items', 'View current list'];
    default:
      return ['Check my inventory', 'Suggest a recipe', 'Build a shopping list'];
  }
}
