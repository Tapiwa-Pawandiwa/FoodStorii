// All specialist services — same logic as apps/api/src/services/*, but the
// Supabase client is passed in rather than imported from a module singleton.
// This keeps the Edge Function self-contained with no Express dependencies.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  InventoryItemStatus,
  ShoppingListStatus,
  ShoppingListItemStatus,
  NudgeStatus,
  OnboardingStatus,
  ExtractionType,
} from './types.ts';

// ---- Types ----------------------------------------------------------------

export interface HouseholdProfile {
  id: string;
  householdId: string;
  householdSize: number | null;
  cookingStyle: string[] | null;
  dietaryPreferences: string[] | null;
  healthGoals: string[] | null;
  storePreferences: string[] | null;
  foodWastePainPoints: string[] | null;
  notificationTolerance: string;
  automationReadiness: string;
  onboardingStatus: string;
  onboardingCompletedAt: string | null;
  primaryDriver: string | null;
  decisionHour: string | null;
  avoidIngredients: string[] | null;
  pickyEaters: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateHouseholdProfileInput {
  householdSize?: number;
  cookingStyle?: string[];
  dietaryPreferences?: string[];
  healthGoals?: string[];
  storePreferences?: string[];
  foodWastePainPoints?: string[];
  notificationTolerance?: string;
  automationReadiness?: string;
  onboardingStatus?: string;
  primaryDriver?: string;
  decisionHour?: string;
  avoidIngredients?: string[];
  pickyEaters?: boolean;
}

export interface InventoryItem {
  id: string;
  householdId: string;
  name: string;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  brand: string | null;
  expiryEstimate: string | null;
  confidence: string;
  status: string;
  sourceType: string;
  sourceId: string | null;
  notes: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddInventoryItemInput {
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  brand?: string;
  expiryEstimate?: string;
  confidence: string;
  sourceType: string;
  sourceId?: string;
  notes?: string;
}

export interface InventorySnapshot {
  items: InventoryItem[];
  totalItems: number;
  expiringWithin3Days: InventoryItem[];
  lowConfidenceItems: InventoryItem[];
  snapshotAt: string;
}

// ---- Household Profile -----------------------------------------------------

export async function getHouseholdProfile(
  supabase: SupabaseClient,
  householdId: string,
): Promise<HouseholdProfile | null> {
  const { data, error } = await supabase
    .from('household_profiles')
    .select('*')
    .eq('household_id', householdId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get household profile: ${error.message}`);
  }

  return mapProfileRow(data);
}

export async function upsertHouseholdProfile(
  supabase: SupabaseClient,
  householdId: string,
  input: UpdateHouseholdProfileInput,
): Promise<HouseholdProfile> {
  const updates: Record<string, unknown> = {
    household_id: householdId,
    updated_at: new Date().toISOString(),
  };

  if (input.householdSize !== undefined) updates.household_size = input.householdSize;
  if (input.cookingStyle !== undefined) updates.cooking_style = input.cookingStyle;
  if (input.dietaryPreferences !== undefined) updates.dietary_preferences = input.dietaryPreferences;
  if (input.healthGoals !== undefined) updates.health_goals = input.healthGoals;
  if (input.storePreferences !== undefined) updates.store_preferences = input.storePreferences;
  if (input.foodWastePainPoints !== undefined) updates.food_waste_pain_points = input.foodWastePainPoints;
  if (input.notificationTolerance !== undefined) updates.notification_tolerance = input.notificationTolerance;
  if (input.automationReadiness !== undefined) updates.automation_readiness = input.automationReadiness;
  if (input.primaryDriver !== undefined) updates.primary_driver = input.primaryDriver;
  if (input.decisionHour !== undefined) updates.decision_hour = input.decisionHour;
  if (input.avoidIngredients !== undefined) updates.avoid_ingredients = input.avoidIngredients;
  if (input.pickyEaters !== undefined) updates.picky_eaters = input.pickyEaters;
  if (input.onboardingStatus !== undefined) {
    updates.onboarding_status = input.onboardingStatus;
    if (input.onboardingStatus === OnboardingStatus.completed) {
      updates.onboarding_completed_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from('household_profiles')
    .upsert(updates, { onConflict: 'household_id' })
    .select()
    .single();

  if (error) throw new Error(`Failed to upsert household profile: ${error.message}`);
  return mapProfileRow(data);
}

function mapProfileRow(row: Record<string, unknown>): HouseholdProfile {
  return {
    id: row.id as string,
    householdId: row.household_id as string,
    householdSize: row.household_size as number | null,
    cookingStyle: row.cooking_style as string[] | null,
    dietaryPreferences: row.dietary_preferences as string[] | null,
    healthGoals: row.health_goals as string[] | null,
    storePreferences: row.store_preferences as string[] | null,
    foodWastePainPoints: row.food_waste_pain_points as string[] | null,
    notificationTolerance: (row.notification_tolerance as string) ?? 'moderate',
    automationReadiness: (row.automation_readiness as string) ?? 'suggestions_ok',
    onboardingStatus: (row.onboarding_status as string) ?? OnboardingStatus.not_started,
    onboardingCompletedAt: row.onboarding_completed_at as string | null,
    primaryDriver: row.primary_driver as string | null,
    decisionHour: row.decision_hour as string | null,
    avoidIngredients: row.avoid_ingredients as string[] | null,
    pickyEaters: row.picky_eaters as boolean | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ---- Inventory -------------------------------------------------------------

export async function getInventorySnapshot(
  supabase: SupabaseClient,
  householdId: string,
): Promise<InventorySnapshot> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('household_id', householdId)
    .eq('status', InventoryItemStatus.available)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to get inventory: ${error.message}`);

  const items = (data ?? []).map(mapInventoryRow);
  const now = new Date();
  const threeDaysOut = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  return {
    items,
    totalItems: items.length,
    expiringWithin3Days: items.filter((item) => {
      if (!item.expiryEstimate) return false;
      return new Date(item.expiryEstimate) <= threeDaysOut;
    }),
    lowConfidenceItems: items.filter(
      (item) => item.confidence === 'pending_confirmation' || item.confidence === 'inferred_low_confidence',
    ),
    snapshotAt: now.toISOString(),
  };
}

export async function addInventoryItems(
  supabase: SupabaseClient,
  householdId: string,
  items: AddInventoryItemInput[],
): Promise<InventoryItem[]> {
  const rows = items.map((item) => ({
    household_id: householdId,
    name: item.name,
    category: item.category ?? null,
    quantity: item.quantity ?? null,
    unit: item.unit ?? null,
    brand: item.brand ?? null,
    expiry_estimate: item.expiryEstimate ?? null,
    confidence: item.confidence,
    status: InventoryItemStatus.available,
    source_type: item.sourceType,
    source_id: item.sourceId ?? null,
    notes: item.notes ?? null,
  }));

  const { data, error } = await supabase.from('inventory_items').insert(rows).select();
  if (error) throw new Error(`Failed to add inventory items: ${error.message}`);
  return (data ?? []).map(mapInventoryRow);
}

function mapInventoryRow(row: Record<string, unknown>): InventoryItem {
  return {
    id: row.id as string,
    householdId: row.household_id as string,
    name: row.name as string,
    category: row.category as string | null,
    quantity: row.quantity as number | null,
    unit: row.unit as string | null,
    brand: row.brand as string | null,
    expiryEstimate: row.expiry_estimate as string | null,
    confidence: row.confidence as string,
    status: row.status as string,
    sourceType: (row.source_type as string) ?? ExtractionType.manual,
    sourceId: row.source_id as string | null,
    notes: row.notes as string | null,
    confirmedAt: row.confirmed_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ---- Recipe ----------------------------------------------------------------

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  optional: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  description: string | null;
  cuisineType: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number | null;
  tags: string[];
  ingredients: RecipeIngredient[];
  instructions: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  createdAt: string;
}

export interface RecipeSuggestion {
  recipe: Recipe;
  matchScore: number;
  availableIngredients: string[];
  missingIngredients: RecipeIngredient[];
  canMakeNow: boolean;
  fitReason: string | null;
}

export interface FindRecipesInput {
  householdId: string;
  maxMissingIngredients?: number;
  maxPrepMinutes?: number;
  preferredTags?: string[];
  limit?: number;
}

export async function findRecipesByInventory(
  supabase: SupabaseClient,
  input: FindRecipesInput,
): Promise<RecipeSuggestion[]> {
  const { householdId, maxMissingIngredients = 3, maxPrepMinutes, preferredTags, limit = 5 } = input;

  const snapshot = await getInventorySnapshot(supabase, householdId);
  const availableNames = new Set(snapshot.items.map((i) => i.name.toLowerCase().trim()));

  let query = supabase
    .from('recipes')
    .select('*, recipe_ingredients(*)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (maxPrepMinutes) {
    query = query.lte('prep_time_minutes', maxPrepMinutes).lte('cook_time_minutes', maxPrepMinutes);
  }
  if (preferredTags && preferredTags.length > 0) {
    query = query.overlaps('tags', preferredTags);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch recipes: ${error.message}`);

  const suggestions: RecipeSuggestion[] = [];

  for (const row of data ?? []) {
    const recipe = mapRecipeRow(row);
    const ingredients: RecipeIngredient[] = (row.recipe_ingredients ?? []).map(mapIngredientRow);
    const required = ingredients.filter((i) => !i.optional);

    const available: string[] = [];
    const missing: RecipeIngredient[] = [];

    for (const ingredient of required) {
      const normalized = ingredient.name.toLowerCase().trim();
      const found = [...availableNames].some(
        (name) => name.includes(normalized) || normalized.includes(name),
      );
      if (found) available.push(ingredient.name);
      else missing.push(ingredient);
    }

    if (missing.length > maxMissingIngredients) continue;

    const usesExpiring = snapshot.expiringWithin3Days.some((expItem) =>
      available.some((a) => a.toLowerCase().includes(expItem.name.toLowerCase())),
    );

    suggestions.push({
      recipe,
      matchScore: available.length / Math.max(required.length, 1) + (usesExpiring ? 0.2 : 0),
      availableIngredients: available,
      missingIngredients: missing,
      canMakeNow: missing.length === 0,
      fitReason: usesExpiring ? 'Uses ingredients expiring soon' : null,
    });
  }

  suggestions.sort((a, b) => b.matchScore - a.matchScore);
  return suggestions.slice(0, limit);
}

function mapRecipeRow(row: Record<string, unknown>): Recipe {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | null,
    cuisineType: row.cuisine_type as string | null,
    prepTimeMinutes: row.prep_time_minutes as number | null,
    cookTimeMinutes: row.cook_time_minutes as number | null,
    servings: row.servings as number | null,
    tags: (row.tags as string[]) ?? [],
    ingredients: (row.recipe_ingredients as Record<string, unknown>[])?.map(mapIngredientRow) ?? [],
    instructions: row.instructions as string | null,
    imageUrl: row.image_url as string | null,
    sourceUrl: row.source_url as string | null,
    createdAt: row.created_at as string,
  };
}

function mapIngredientRow(row: Record<string, unknown>): RecipeIngredient {
  return {
    id: row.id as string,
    recipeId: row.recipe_id as string,
    name: row.name as string,
    quantity: row.quantity as number | null,
    unit: row.unit as string | null,
    optional: (row.optional as boolean) ?? false,
  };
}

// ---- Grocery ---------------------------------------------------------------

export interface CreateShoppingListInput {
  householdId: string;
  title: string;
  recipeId?: string;
  items: { name: string; quantity?: number; unit?: string; category?: string; note?: string }[];
}

export interface ShoppingListResult {
  id: string;
  householdId: string;
  title: string;
  status: string;
  items: { id: string; name: string; quantity: number | null; unit: string | null; category: string | null; note: string | null; status: string; recipeId: string | null }[];
  createdAt: string;
}

export async function createShoppingList(
  supabase: SupabaseClient,
  input: CreateShoppingListInput,
): Promise<ShoppingListResult> {
  const { data: listData, error: listError } = await supabase
    .from('shopping_lists')
    .insert({ household_id: input.householdId, title: input.title, status: ShoppingListStatus.draft })
    .select()
    .single();

  if (listError) throw new Error(`Failed to create shopping list: ${listError.message}`);

  const itemRows = input.items.map((item) => ({
    list_id: listData.id,
    name: item.name,
    quantity: item.quantity ?? null,
    unit: item.unit ?? null,
    category: item.category ?? null,
    note: item.note ?? null,
    status: ShoppingListItemStatus.pending,
    recipe_id: input.recipeId ?? null,
  }));

  const { data: itemsData, error: itemsError } = await supabase
    .from('shopping_list_items')
    .insert(itemRows)
    .select();

  if (itemsError) throw new Error(`Failed to add shopping list items: ${itemsError.message}`);

  return {
    id: listData.id as string,
    householdId: listData.household_id as string,
    title: listData.title as string,
    status: listData.status as string,
    items: (itemsData ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      quantity: row.quantity as number | null,
      unit: row.unit as string | null,
      category: row.category as string | null,
      note: row.note as string | null,
      status: row.status as string,
      recipeId: row.recipe_id as string | null,
    })),
    createdAt: listData.created_at as string,
  };
}

// ---- Nudge -----------------------------------------------------------------

export interface ScheduleNudgeInput {
  householdId: string;
  nudgeType: string;
  title: string;
  body: string;
  scheduledFor?: string;
}

export interface NudgeResult {
  id: string;
  householdId: string;
  nudgeType: string;
  title: string;
  body: string;
  scheduledFor: string | null;
  status: string;
  createdAt: string;
}

export async function scheduleNudge(
  supabase: SupabaseClient,
  input: ScheduleNudgeInput,
): Promise<NudgeResult> {
  const { data, error } = await supabase
    .from('nudge_candidates')
    .insert({
      household_id: input.householdId,
      nudge_type: input.nudgeType,
      title: input.title,
      body: input.body,
      scheduled_for: input.scheduledFor ?? null,
      status: NudgeStatus.pending,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to schedule nudge: ${error.message}`);

  return {
    id: data.id as string,
    householdId: data.household_id as string,
    nudgeType: data.nudge_type as string,
    title: data.title as string,
    body: data.body as string,
    scheduledFor: data.scheduled_for as string | null,
    status: data.status as string,
    createdAt: data.created_at as string,
  };
}

// ---- Events ----------------------------------------------------------------

export async function logInteractionEvent(
  supabase: SupabaseClient,
  householdId: string,
  userId: string,
  conversationId: string | null,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from('interaction_events').insert({
    household_id: householdId,
    user_id: userId,
    conversation_id: conversationId,
    event_type: eventType,
    payload,
  });

  if (error) throw new Error(`Failed to log interaction event: ${error.message}`);
}
