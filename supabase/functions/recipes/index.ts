// Edge Function: recipes
// Routes:
//   GET /recipes/pantry       — pantry-based suggestions via Spoonacular
//   GET /recipes/search?q=    — text search via Spoonacular complexSearch
//   GET /recipes/detail?id=   — single recipe detail (cache-first)

import { resolveAuth, json, CORS_HEADERS } from '../_shared/client.ts';
import {
  normalizeIngredient,
  spoonacularSearchByIngredients,
  spoonacularSearchByQuery,
  spoonacularGetById,
  getCachedRecipes,
  upsertCachedRecipes,
  scoreAndRankRecipes,
} from '../_shared/spoonacular.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  const url = new URL(req.url);
  const path = url.pathname.split('/').filter(Boolean).pop() ?? '';

  const apiKey = Deno.env.get('SPOONACULAR_API_KEY');
  if (!apiKey) {
    console.error('[recipes] SPOONACULAR_API_KEY not set');
    return json({ success: false, error: 'Recipe service not configured' }, 500);
  }

  const auth = await resolveAuth(req);
  if (!auth) return json({ success: false, error: 'Unauthorized' }, 401);
  const { householdId, userId, db } = auth;

  // ── GET /recipes/pantry ────────────────────────────────────────────────────
  if (req.method === 'GET' && path === 'pantry') {
    const maxMissing = Math.min(parseInt(url.searchParams.get('maxMissing') ?? '4', 10), 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '8', 10), 20);

    console.log(`[recipes/pantry] household: ${householdId} | maxMissing: ${maxMissing} | limit: ${limit}`);

    // Load profile and inventory in parallel
    const [profileResult, inventoryResult] = await Promise.all([
      db.from('household_profiles').select('primary_driver, dietary_preferences, avoid_ingredients').eq('household_id', householdId).single(),
      db.from('inventory_items').select('name, expiry_estimate').eq('household_id', householdId).eq('status', 'available'),
    ]);

    const profile = profileResult.data as Record<string, unknown> | null;
    const inventoryItems = (inventoryResult.data ?? []) as { name: string; expiry_estimate: string | null }[];

    if (!inventoryItems.length) {
      console.log(`[recipes/pantry] pantry empty for household ${householdId}`);
      return json({ success: true, data: { suggestions: [], pantryEmpty: true } });
    }

    const now = new Date();
    const threeDaysOut = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const pantryNames = inventoryItems.map((i) => i.name);
    const expiringNames = inventoryItems
      .filter((i) => i.expiry_estimate && new Date(i.expiry_estimate) <= threeDaysOut)
      .map((i) => i.name);

    // Normalize and dedupe pantry names for Spoonacular
    const normalizedIngredients = [...new Set(pantryNames.map(normalizeIngredient).filter((n) => n.length > 1))];
    console.log(`[recipes/pantry] normalized pantry: ${normalizedIngredients.slice(0, 8).join(', ')}...`);

    let recipes;
    try {
      recipes = await spoonacularSearchByIngredients(apiKey, normalizedIngredients, Math.min(limit * 2, 16));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[recipes/pantry] Spoonacular error:', msg);
      return json({ success: false, error: 'Could not fetch recipes. Please try again.' }, 502);
    }

    // Cache results async — don't block response
    upsertCachedRecipes(db, recipes).catch((e) =>
      console.warn('[recipes/pantry] cache write failed:', e.message),
    );

    const scoringCtx = {
      pantryIngredients: pantryNames,
      expiringIngredients: expiringNames,
      primaryDriver: (profile?.primary_driver as string | null) ?? null,
      dietaryPreferences: (profile?.dietary_preferences as string[] | null) ?? null,
      avoidIngredients: (profile?.avoid_ingredients as string[] | null) ?? null,
    };

    const suggestions = scoreAndRankRecipes(recipes, scoringCtx, maxMissing).slice(0, limit);
    console.log(`[recipes/pantry] ✓ returning ${suggestions.length} suggestions`);

    // Log recommendation event
    if (suggestions.length > 0) {
      db.from('recipe_recommendation_events').insert({
        household_id: householdId,
        user_id: userId,
        source_channel: 'app',
        trigger_type: 'pantry_match',
        query_ingredients: pantryNames.slice(0, 20),
        recommended_ids: suggestions.map((s) => s.externalId),
      }).then(({ error }) => { if (error) console.warn('[recipes/pantry] rec event error:', error.message); });
    }

    return json({ success: true, data: { suggestions, pantryEmpty: false } });
  }

  // ── GET /recipes/search?q= ─────────────────────────────────────────────────
  if (req.method === 'GET' && path === 'search') {
    const q = url.searchParams.get('q')?.trim() ?? '';
    if (q.length < 2) return json({ success: false, error: 'q must be at least 2 characters' }, 400);

    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '8', 10), 20);

    console.log(`[recipes/search] household: ${householdId} | query: "${q}"`);

    const [profileResult, inventoryResult] = await Promise.all([
      db.from('household_profiles').select('avoid_ingredients, dietary_preferences').eq('household_id', householdId).single(),
      db.from('inventory_items').select('name, expiry_estimate').eq('household_id', householdId).eq('status', 'available'),
    ]);

    const profile = profileResult.data as Record<string, unknown> | null;
    const avoidIngredients = (profile?.avoid_ingredients as string[] | null) ?? [];
    const inventoryItems = (inventoryResult.data ?? []) as { name: string; expiry_estimate: string | null }[];
    const pantryNames = inventoryItems.map((i) => i.name);
    const now = new Date();
    const threeDaysOut = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const expiringNames = inventoryItems
      .filter((i) => i.expiry_estimate && new Date(i.expiry_estimate) <= threeDaysOut)
      .map((i) => i.name);

    let recipes;
    try {
      recipes = await spoonacularSearchByQuery(apiKey, q, {
        number: Math.min(limit * 2, 16),
        excludeIngredients: avoidIngredients.slice(0, 5),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[recipes/search] Spoonacular error:', msg);
      return json({ success: false, error: 'Search failed. Please try again.' }, 502);
    }

    upsertCachedRecipes(db, recipes).catch((e) =>
      console.warn('[recipes/search] cache write failed:', e.message),
    );

    const scoringCtx = {
      pantryIngredients: pantryNames,
      expiringIngredients: expiringNames,
      primaryDriver: null,
      dietaryPreferences: (profile?.dietary_preferences as string[] | null) ?? null,
      avoidIngredients,
    };
    const suggestions = scoreAndRankRecipes(recipes, scoringCtx, 20).slice(0, limit);
    console.log(`[recipes/search] ✓ returning ${suggestions.length} results for "${q}"`);

    if (suggestions.length > 0) {
      db.from('recipe_recommendation_events').insert({
        household_id: householdId,
        user_id: userId,
        source_channel: 'app',
        trigger_type: 'search',
        search_query: q,
        query_ingredients: [],
        recommended_ids: suggestions.map((s) => s.externalId),
      }).then(({ error }) => { if (error) console.warn('[recipes/search] rec event error:', error.message); });
    }

    return json({ success: true, data: { suggestions } });
  }

  // ── GET /recipes/detail?id= ────────────────────────────────────────────────
  if (req.method === 'GET' && path === 'detail') {
    const externalId = url.searchParams.get('id');
    if (!externalId) return json({ success: false, error: 'id parameter required' }, 400);

    console.log(`[recipes/detail] id: ${externalId}`);

    const cached = await getCachedRecipes(db, [externalId]);
    if (cached.length > 0) {
      console.log(`[recipes/detail] cache hit: ${externalId}`);
      return json({ success: true, data: cached[0] });
    }

    console.log(`[recipes/detail] cache miss — fetching from Spoonacular`);
    let recipe;
    try {
      recipe = await spoonacularGetById(apiKey, externalId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[recipes/detail] Spoonacular error:', msg);
      return json({ success: false, error: 'Could not load recipe details.' }, 502);
    }

    upsertCachedRecipes(db, [recipe]).catch(() => null);
    return json({ success: true, data: recipe });
  }

  return json({ success: false, error: 'Not found' }, 404);
});
