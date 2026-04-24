// Spoonacular-backed recipe types (used across mobile and edge functions)

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
  fitScore: number;        // 0–100
  fitReasons: string[];
  ingredients?: SpoonacularIngredient[];
  instructions?: SpoonacularStep[];
}

// Legacy internal recipe types (kept for existing DB schema)
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

export interface FindRecipesInput {
  householdId: string;
  maxMissingIngredients?: number;
  maxPrepMinutes?: number;
  preferredTags?: string[];
  limit?: number;
}
