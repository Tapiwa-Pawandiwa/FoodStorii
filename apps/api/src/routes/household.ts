import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { getHouseholdProfile, upsertHouseholdProfile, registerPushToken } from '../services/household-profile';
import { scheduleDailyMealNudge } from '../services/nudge';
import { UpdateHouseholdProfileSchema } from '@foodstorii/shared';

const router = Router();

// GET /household/profile
router.get('/profile', requireAuth, async (req, res: Response): Promise<void> => {
  const auth = req as AuthenticatedRequest;
  try {
    const profile = await getHouseholdProfile(auth.householdId);
    res.json({ success: true, data: profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    res.status(500).json({ success: false, error: message });
  }
});

// PATCH /household/profile
router.patch('/profile', requireAuth, async (req, res: Response): Promise<void> => {
  const auth = req as AuthenticatedRequest;

  const parsed = UpdateHouseholdProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  try {
    const profile = await upsertHouseholdProfile(auth.householdId, parsed.data);
    res.json({ success: true, data: profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    res.status(500).json({ success: false, error: message });
  }
});

const PushTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']),
});

// POST /household/push-token
router.post('/push-token', requireAuth, async (req, res: Response): Promise<void> => {
  const auth = req as AuthenticatedRequest;

  const parsed = PushTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  try {
    await registerPushToken(auth.householdId, parsed.data.token, parsed.data.platform);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    res.status(500).json({ success: false, error: message });
  }
});

// POST /household/schedule-daily-nudge
router.post('/schedule-daily-nudge', requireAuth, async (req, res: Response): Promise<void> => {
  const auth = req as AuthenticatedRequest;
  try {
    const nudge = await scheduleDailyMealNudge(auth.householdId);
    res.json({ success: true, data: nudge });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
