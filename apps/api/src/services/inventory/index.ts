import { supabase } from '../../db/client';
import type { InventoryItem, InventorySnapshot, AddInventoryItemInput } from '@foodstorii/shared';
import { InventoryItemStatus, ExtractionType } from '@foodstorii/shared';

export async function getInventorySnapshot(householdId: string): Promise<InventorySnapshot> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('household_id', householdId)
    .eq('status', InventoryItemStatus.available)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to get inventory: ${error.message}`);

  const items = (data ?? []).map(mapRow);
  const now = new Date();
  const threeDaysOut = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const expiringWithin3Days = items.filter((item) => {
    if (!item.expiryEstimate) return false;
    const expiry = new Date(item.expiryEstimate);
    return expiry <= threeDaysOut;
  });

  const lowConfidenceItems = items.filter(
    (item) =>
      item.confidence === 'pending_confirmation' || item.confidence === 'inferred_low_confidence',
  );

  return {
    items,
    totalItems: items.length,
    expiringWithin3Days,
    lowConfidenceItems,
    snapshotAt: now.toISOString(),
  };
}

export async function addInventoryItems(
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
  return (data ?? []).map(mapRow);
}

export async function confirmInventoryItem(itemId: string): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('inventory_items')
    .update({
      confidence: 'confirmed',
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw new Error(`Failed to confirm inventory item: ${error.message}`);
  return mapRow(data);
}

export async function rejectInventoryItems(itemIds: string[]): Promise<void> {
  const { error } = await supabase
    .from('inventory_items')
    .update({ status: InventoryItemStatus.consumed, updated_at: new Date().toISOString() })
    .in('id', itemIds);

  if (error) throw new Error(`Failed to reject inventory items: ${error.message}`);
}

function mapRow(row: Record<string, unknown>): InventoryItem {
  return {
    id: row.id as string,
    householdId: row.household_id as string,
    name: row.name as string,
    category: row.category as string | null,
    quantity: row.quantity as number | null,
    unit: row.unit as string | null,
    brand: row.brand as string | null,
    expiryEstimate: row.expiry_estimate as string | null,
    confidence: row.confidence as InventoryItem['confidence'],
    status: row.status as InventoryItemStatus,
    sourceType: (row.source_type as ExtractionType) ?? ExtractionType.manual,
    sourceId: row.source_id as string | null,
    notes: row.notes as string | null,
    confirmedAt: row.confirmed_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
