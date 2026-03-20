import { supabase } from '../../db/client';
import { ShoppingListStatus, ShoppingListItemStatus } from '@foodstorii/shared';

export interface CreateShoppingListInput {
  householdId: string;
  title: string;
  recipeId?: string;
  items: {
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
    note?: string;
  }[];
}

export interface ShoppingListResult {
  id: string;
  householdId: string;
  title: string;
  status: ShoppingListStatus;
  items: ShoppingListItemResult[];
  createdAt: string;
}

export interface ShoppingListItemResult {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  note: string | null;
  status: ShoppingListItemStatus;
  recipeId: string | null;
}

export async function createShoppingList(input: CreateShoppingListInput): Promise<ShoppingListResult> {
  const { data: listData, error: listError } = await supabase
    .from('shopping_lists')
    .insert({
      household_id: input.householdId,
      title: input.title,
      status: ShoppingListStatus.draft,
    })
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
    status: listData.status as ShoppingListStatus,
    items: (itemsData ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      quantity: row.quantity as number | null,
      unit: row.unit as string | null,
      category: row.category as string | null,
      note: row.note as string | null,
      status: row.status as ShoppingListItemStatus,
      recipeId: row.recipe_id as string | null,
    })),
    createdAt: listData.created_at as string,
  };
}
