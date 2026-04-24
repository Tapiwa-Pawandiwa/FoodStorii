// _shared/spoonacular.ts
// Spoonacular API wrapper + ingredient normalization + FoodStorii scoring.
// Shared between the recipes Edge Function and the Tina orchestrator.
// NEVER imported from mobile — SPOONACULAR_API_KEY is server-side only.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const SPOONACULAR_BASE = 'https://api.spoonacular.com';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SpoonacularIngredient {
  name: string;
  amount: number;
  unit: string;
  original: string;
}

export interface SpoonacularStep {
  number: number;
  step: string;
}

export interface RecipeNutrition {
  calories: number | null;
  protein: string | null;
  carbs: string | null;
  fat: string | null;
  fiber: string | null;
}

export interface NormalizedRecipe {
  externalId: string;
  source: 'spoonacular';
  title: string;
  imageUrl: string | null;
  summary: string | null;
  cuisineType: string | null;
  readyInMinutes: number | null;
  servings: number | null;
  diets: string[];
  dishTypes: string[];
  ingredients: SpoonacularIngredient[];
  instructions: SpoonacularStep[];
  nutrition: RecipeNutrition | null;
}

export interface RecipeSuggestion {
  externalId: string;
  source: 'spoonacular';
  title: string;
  imageUrl: string | null;
  summary: string | null;
  cuisineType: string | null;
  readyInMinutes: number | null;
  servings: number | null;
  diets: string[];
  dishTypes: string[];
  nutrition: RecipeNutrition | null;
  availableIngredients: string[];
  missingIngredients: { name: string; original: string }[];
  missingCount: number;
  canMakeNow: boolean;
  fitScore: number;
  fitReasons: string[];
  ingredients?: SpoonacularIngredient[];
  instructions?: SpoonacularStep[];
}

export interface ScoringContext {
  pantryIngredients: string[];
  expiringIngredients: string[];
  primaryDriver: string | null;
  dietaryPreferences: string[] | null;
  avoidIngredients: string[] | null;
}

// ── Ingredient normalization ─────────────────────────────────────────────────

const NOISE_WORDS = new Set([
  'fresh', 'frozen', 'dried', 'baby', 'whole', 'large', 'medium', 'small',
  'extra', 'organic', 'raw', 'cooked', 'chopped', 'sliced', 'diced', 'minced',
  'grated', 'shredded', 'packed', 'washed', 'trimmed', 'peeled', 'pitted',
  'brown', 'white', 'red', 'yellow', 'green', 'black', 'dark', 'light',
  'plain', 'natural', 'unsalted', 'salted', 'sweet', 'hot', 'mild', 'spicy',
  'creamy', 'low', 'fat', 'reduced', 'full', 'semi', 'skimmed', 'skimmed',
]);

const UNIT_WORDS = new Set([
  'g', 'kg', 'ml', 'l', 'oz', 'lb', 'lbs', 'cup', 'cups', 'tbsp', 'tsp',
  'tablespoon', 'tablespoons', 'teaspoon', 'teaspoons', 'litre', 'litres',
  'gram', 'grams', 'kilogram', 'kilograms', 'pack', 'packs', 'can', 'cans',
  'jar', 'jars', 'bag', 'bags', 'box', 'boxes', 'bottle', 'bottles',
  'piece', 'pieces', 'item', 'items', 'bunch', 'bunches', 'head', 'heads',
  'clove', 'cloves', 'stalk', 'stalks', 'slice', 'slices', 'leaf', 'leaves',
  'portion', 'portions', 'serving', 'servings',
]);

export function normalizeIngredient(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[0-9]+(\.[0-9]+)?%?/g, '')
    .split(/[\s,/()-]+/)
    .map((w) => w.replace(/[^a-z]/g, ''))
    .filter((w) => w.length > 1 && !NOISE_WORDS.has(w) && !UNIT_WORDS.has(w))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Spoonacular API wrappers ─────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function extractNutrition(data: Record<string, unknown> | null | undefined): RecipeNutrition | null {
  if (!data?.nutrients) return null;
  const nutrients = data.nutrients as { name: string; amount: number; unit: string }[];
  const get = (name: string) => nutrients.find((n) => n.name.toLowerCase() === name.toLowerCase());
  return {
    calories: get('Calories') ? Math.round(get('Calories')!.amount) : null,
    protein: get('Protein') ? `${Math.round(get('Protein')!.amount)}${get('Protein')!.unit}` : null,
    carbs: get('Carbohydrates') ? `${Math.round(get('Carbohydrates')!.amount)}${get('Carbohydrates')!.unit}` : null,
    fat: get('Fat') ? `${Math.round(get('Fat')!.amount)}${get('Fat')!.unit}` : null,
    fiber: get('Fiber') ? `${Math.round(get('Fiber')!.amount)}${get('Fiber')!.unit}` : null,
  };
}

function mapSpoonacularInfo(info: Record<string, unknown>): NormalizedRecipe {
  const cuisines = info.cuisines as string[] | undefined;
  const steps = ((info.analyzedInstructions as { steps: { number: number; step: string }[] }[] | undefined)?.[0]?.steps) ?? [];
  const extIng = (info.extendedIngredients as { name: string; amount: number; unit: string; original: string }[] | undefined) ?? [];

  return {
    externalId: String(info.id),
    source: 'spoonacular',
    title: (info.title as string) ?? 'Untitled Recipe',
    imageUrl: (info.image as string | null) ?? null,
    summary: info.summary ? stripHtml(info.summary as string).slice(0, 500) : null,
    cuisineType: cuisines?.[0] ?? null,
    readyInMinutes: (info.readyInMinutes as number | null) ?? null,
    servings: (info.servings as number | null) ?? null,
    diets: (info.diets as string[] | undefined) ?? [],
    dishTypes: (info.dishTypes as string[] | undefined) ?? [],
    ingredients: extIng.map((i) => ({ name: i.name, amount: i.amount, unit: i.unit, original: i.original })),
    instructions: steps.map((s) => ({ number: s.number, step: s.step })),
    nutrition: extractNutrition(info.nutrition as Record<string, unknown> | undefined),
  };
}

// Search recipes by pantry ingredients — two API calls (findByIngredients + informationBulk)
export async function spoonacularSearchByIngredients(
  apiKey: string,
  ingredients: string[],
  number = 10,
): Promise<NormalizedRecipe[]> {
  if (!ingredients.length) return [];
  console.log(`[Spoonacular] findByIngredients | ingredients: ${ingredients.slice(0, 5).join(', ')}... | number: ${number}`);

  const p1 = new URLSearchParams({
    ingredients: ingredients.join(',+'),
    number: String(number),
    ranking: '2',
    ignorePantry: 'true',
    apiKey,
  });

  const res1 = await fetch(`${SPOONACULAR_BASE}/recipes/findByIngredients?${p1}`);
  if (!res1.ok) {
    const body = await res1.text();
    throw new Error(`Spoonacular findByIngredients ${res1.status}: ${body}`);
  }

  const found = await res1.json() as { id: number }[];
  console.log(`[Spoonacular] findByIngredients returned ${found.length} ids`);
  if (!found.length) return [];

  const ids = found.map((r) => r.id).join(',');
  const p2 = new URLSearchParams({ ids, includeNutrition: 'true', apiKey });
  const res2 = await fetch(`${SPOONACULAR_BASE}/recipes/informationBulk?${p2}`);
  if (!res2.ok) {
    const body = await res2.text();
    throw new Error(`Spoonacular informationBulk ${res2.status}: ${body}`);
  }

  const bulk = await res2.json() as Record<string, unknown>[];
  console.log(`[Spoonacular] ✓ informationBulk returned ${bulk.length} recipes`);
  return bulk.map(mapSpoonacularInfo);
}

// Text search using complexSearch — single API call with full info
export async function spoonacularSearchByQuery(
  apiKey: string,
  query: string,
  options: {
    number?: number;
    diet?: string;
    excludeIngredients?: string[];
    maxReadyTime?: number;
  } = {},
): Promise<NormalizedRecipe[]> {
  console.log(`[Spoonacular] complexSearch | query: "${query}"`);

  const params = new URLSearchParams({
    query,
    number: String(options.number ?? 10),
    addRecipeInformation: 'true',
    addRecipeNutrition: 'true',
    fillIngredients: 'true',
    apiKey,
  });
  if (options.diet) params.set('diet', options.diet);
  if (options.maxReadyTime) params.set('maxReadyTime', String(options.maxReadyTime));
  if (options.excludeIngredients?.length) params.set('excludeIngredients', options.excludeIngredients.join(','));

  const res = await fetch(`${SPOONACULAR_BASE}/recipes/complexSearch?${params}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spoonacular complexSearch ${res.status}: ${body}`);
  }

  const data = await res.json() as { results: Record<string, unknown>[] };
  console.log(`[Spoonacular] ✓ complexSearch returned ${data.results?.length ?? 0} recipes`);
  return (data.results ?? []).map(mapSpoonacularInfo);
}

// Fetch single recipe by ID
export async function spoonacularGetById(
  apiKey: string,
  externalId: string,
): Promise<NormalizedRecipe> {
  console.log(`[Spoonacular] getById | id: ${externalId}`);
  const params = new URLSearchParams({ includeNutrition: 'true', apiKey });
  const res = await fetch(`${SPOONACULAR_BASE}/recipes/${externalId}/information?${params}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spoonacular information ${res.status}: ${body}`);
  }
  return mapSpoonacularInfo(await res.json() as Record<string, unknown>);
}

// ── Cache helpers ────────────────────────────────────────────────────────────

function mapCacheRow(row: Record<string, unknown>): NormalizedRecipe {
  return {
    externalId: row.external_id as string,
    source: 'spoonacular',
    title: row.title as string,
    imageUrl: row.image_url as string | null,
    summary: row.summary as string | null,
    cuisineType: row.cuisine_type as string | null,
    readyInMinutes: row.ready_in_minutes as number | null,
    servings: row.servings as number | null,
    diets: (row.diets as string[]) ?? [],
    dishTypes: (row.dish_types as string[]) ?? [],
    ingredients: (row.ingredients_json as SpoonacularIngredient[]) ?? [],
    instructions: (row.instructions_json as SpoonacularStep[]) ?? [],
    nutrition: (row.nutrition_json as RecipeNutrition | null) ?? null,
  };
}

export async function getCachedRecipes(
  supabase: SupabaseClient,
  externalIds: string[],
): Promise<NormalizedRecipe[]> {
  if (!externalIds.length) return [];
  const { data } = await supabase
    .from('external_recipes_cache')
    .select('*')
    .in('external_id', externalIds)
    .gt('expires_at', new Date().toISOString());
  return (data ?? []).map(mapCacheRow);
}

export async function upsertCachedRecipes(
  supabase: SupabaseClient,
  recipes: NormalizedRecipe[],
): Promise<void> {
  if (!recipes.length) return;
  const rows = recipes.map((r) => ({
    source: r.source,
    external_id: r.externalId,
    title: r.title,
    image_url: r.imageUrl,
    summary: r.summary,
    cuisine_type: r.cuisineType,
    ready_in_minutes: r.readyInMinutes,
    servings: r.servings,
    diets: r.diets,
    dish_types: r.dishTypes,
    ingredients_json: r.ingredients,
    instructions_json: r.instructions,
    nutrition_json: r.nutrition,
    fetched_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }));
  const { error } = await supabase
    .from('external_recipes_cache')
    .upsert(rows, { onConflict: 'source,external_id' });
  if (error) console.warn('[Spoonacular] cache upsert error:', error.message);
}

// ── FoodStorii scoring ───────────────────────────────────────────────────────

export function scoreAndRankRecipes(
  recipes: NormalizedRecipe[],
  ctx: ScoringContext,
  maxMissing = 5,
): RecipeSuggestion[] {
  const suggestions: RecipeSuggestion[] = [];

  for (const recipe of recipes) {
    const available: string[] = [];
    const missing: { name: string; original: string }[] = [];

    for (const ing of recipe.ingredients) {
      const norm = normalizeIngredient(ing.name);
      const found = ctx.pantryIngredients.some((p) => {
        const np = normalizeIngredient(p);
        return (np.length > 2 && norm.includes(np)) || (norm.length > 2 && np.includes(norm));
      });
      if (found) available.push(ing.name);
      else missing.push({ name: ing.name, original: ing.original });
    }

    if (missing.length > maxMissing) continue;

    // Skip recipes containing avoided ingredients
    if (ctx.avoidIngredients?.length) {
      const hasAvoided = recipe.ingredients.some((ing) => {
        const norm = normalizeIngredient(ing.name);
        return ctx.avoidIngredients!.some((avoid) => {
          const na = normalizeIngredient(avoid);
          return na.length > 1 && norm.includes(na);
        });
      });
      if (hasAvoided) continue;
    }

    const total = recipe.ingredients.length;
    const matchPct = total > 0 ? (available.length / total) * 100 : 50;
    const missingPenalty = missing.length * 10;
    const timePenalty = (recipe.readyInMinutes ?? 30) > 60 ? -8 : 0;

    let goalBonus = 0;
    const fitReasons: string[] = [];

    // Expiring ingredient usage bonus
    const usesExpiring = ctx.expiringIngredients.length > 0 && available.some((a) => {
      const na = normalizeIngredient(a);
      return ctx.expiringIngredients.some((e) => {
        const ne = normalizeIngredient(e);
        return ne.length > 2 && (na.includes(ne) || ne.includes(na));
      });
    });
    if (usesExpiring) { goalBonus += 20; fitReasons.push('Uses items expiring soon'); }

    // Primary driver alignment
    if (ctx.primaryDriver === 'saving_money' && total <= 8) goalBonus += 5;
    if (ctx.primaryDriver === 'improving_health') {
      const healthDiets = new Set(['vegetarian', 'vegan', 'whole30', 'paleo', 'gluten free', 'ketogenic', 'primal']);
      if (recipe.diets.some((d) => healthDiets.has(d.toLowerCase()))) {
        goalBonus += 8;
        fitReasons.push('Fits health goals');
      }
    }
    if (ctx.primaryDriver === 'pure_convenience' && (recipe.readyInMinutes ?? 60) <= 30) {
      goalBonus += 8;
      fitReasons.push('Quick to make');
    }

    // Dietary preference alignment
    const prefs = ctx.dietaryPreferences ?? [];
    if (prefs.includes('vegetarian') && recipe.diets.map((d) => d.toLowerCase()).includes('vegetarian')) goalBonus += 5;
    if (prefs.includes('vegan') && recipe.diets.map((d) => d.toLowerCase()).includes('vegan')) goalBonus += 5;

    if (missing.length === 0) fitReasons.push('Can make now');
    else if (missing.length <= 2) fitReasons.push(`Only ${missing.length} item${missing.length > 1 ? 's' : ''} missing`);

    const fitScore = Math.round(Math.max(0, Math.min(100, matchPct - missingPenalty + timePenalty + goalBonus)));

    suggestions.push({
      externalId: recipe.externalId,
      source: 'spoonacular',
      title: recipe.title,
      imageUrl: recipe.imageUrl,
      summary: recipe.summary,
      cuisineType: recipe.cuisineType,
      readyInMinutes: recipe.readyInMinutes,
      servings: recipe.servings,
      diets: recipe.diets,
      dishTypes: recipe.dishTypes,
      nutrition: recipe.nutrition,
      availableIngredients: available,
      missingIngredients: missing,
      missingCount: missing.length,
      canMakeNow: missing.length === 0,
      fitScore,
      fitReasons,
    });
  }

  return suggestions.sort((a, b) => b.fitScore - a.fitScore);
}
