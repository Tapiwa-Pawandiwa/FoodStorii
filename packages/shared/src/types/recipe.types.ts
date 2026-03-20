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

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  optional: boolean;
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
