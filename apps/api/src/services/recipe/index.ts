import { supabase } from '../../db/client';
import type { Recipe, RecipeIngredient, RecipeSuggestion, FindRecipesInput } from '@foodstorii/shared';
import { getInventorySnapshot } from '../inventory';

export async function findRecipesByInventory(input: FindRecipesInput): Promise<RecipeSuggestion[]> {
  const { householdId, maxMissingIngredients = 3, maxPrepMinutes, preferredTags, limit = 5 } = input;

  const snapshot = await getInventorySnapshot(householdId);
  const availableNames = new Set(
    snapshot.items.map((i) => i.name.toLowerCase().trim()),
  );

  // Fetch candidate recipes
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

    const requiredIngredients = ingredients.filter((i) => !i.optional);
    const available: string[] = [];
    const missing: RecipeIngredient[] = [];

    for (const ingredient of requiredIngredients) {
      const normalized = ingredient.name.toLowerCase().trim();
      const found = [...availableNames].some((name) => name.includes(normalized) || normalized.includes(name));
      if (found) {
        available.push(ingredient.name);
      } else {
        missing.push(ingredient);
      }
    }

    if (missing.length > maxMissingIngredients) continue;

    // Prefer recipes using expiring items
    const usesExpiring = snapshot.expiringWithin3Days.some((expItem) =>
      available.some((a) => a.toLowerCase().includes(expItem.name.toLowerCase())),
    );

    const matchScore = available.length / Math.max(requiredIngredients.length, 1) + (usesExpiring ? 0.2 : 0);

    suggestions.push({
      recipe,
      matchScore,
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
