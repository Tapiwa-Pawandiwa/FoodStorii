import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { getInventorySnapshot, addInventoryItems } from '../services/inventory';
import { AddInventoryItemsSchema } from '@foodstorii/shared';

const router = Router();

// GET /inventory/snapshot
router.get('/snapshot', requireAuth, async (req, res: Response): Promise<void> => {
  const auth = req as AuthenticatedRequest;
  try {
    const snapshot = await getInventorySnapshot(auth.householdId);
    res.json({ success: true, data: snapshot });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    res.status(500).json({ success: false, error: message });
  }
});

// POST /inventory/items
router.post('/items', requireAuth, async (req, res: Response): Promise<void> => {
  const auth = req as AuthenticatedRequest;

  const parsed = AddInventoryItemsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  try {
    const items = await addInventoryItems(auth.householdId, parsed.data.items);
    res.json({ success: true, data: items });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
