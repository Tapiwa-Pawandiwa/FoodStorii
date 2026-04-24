// Edge Function: inventory
// Handles inventory snapshot reads and item additions.

import { resolveAuth, json, CORS_HEADERS } from '../_shared/client.ts';

const InventoryItemStatus = { available: 'available', consumed: 'consumed' } as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  const url = new URL(req.url);
  const path = url.pathname.split('/').filter(Boolean).pop() ?? '';

  // --- GET /inventory/snapshot ---
  if (req.method === 'GET' && path === 'snapshot') {
    const auth = await resolveAuth(req);
    if (!auth) return json({ success: false, error: 'Unauthorized' }, 401);

    const { data, error } = await auth.db
      .from('inventory_items')
      .select('*')
      .eq('household_id', auth.householdId)
      .eq('status', InventoryItemStatus.available)
      .order('created_at', { ascending: false });

    if (error) return json({ success: false, error: error.message }, 500);

    const items = data ?? [];
    const now = new Date();
    const threeDaysOut = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    return json({
      success: true,
      data: {
        items,
        totalItems: items.length,
        expiringWithin3Days: items.filter((i) => i.expiry_estimate && new Date(i.expiry_estimate) <= threeDaysOut),
        lowConfidenceItems: items.filter((i) => i.confidence === 'pending_confirmation' || i.confidence === 'inferred_low_confidence'),
        snapshotAt: now.toISOString(),
      },
    });
  }

  // --- POST /inventory/items ---
  if (req.method === 'POST' && path === 'items') {
    const auth = await resolveAuth(req);
    if (!auth) return json({ success: false, error: 'Unauthorized' }, 401);

    let body: { items?: unknown[] };
    try { body = await req.json(); } catch { return json({ success: false, error: 'Invalid JSON' }, 400); }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return json({ success: false, error: 'items array is required' }, 400);
    }

    const rows = (body.items as Record<string, unknown>[]).map((item) => ({
      household_id: auth.householdId,
      name: item.name,
      category: item.category ?? null,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
      brand: item.brand ?? null,
      expiry_estimate: item.expiryEstimate ?? null,
      confidence: item.confidence,
      status: InventoryItemStatus.available,
      source_type: item.sourceType ?? 'manual',
      notes: item.notes ?? null,
    }));

    const { data, error } = await auth.db.from('inventory_items').insert(rows).select();
    if (error) return json({ success: false, error: error.message }, 500);

    return json({ success: true, data });
  }

  return json({ success: false, error: 'Not found' }, 404);
});
