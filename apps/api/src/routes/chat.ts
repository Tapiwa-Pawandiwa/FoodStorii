import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { handleChat } from '../orchestrator/tina.orchestrator';
import { ChatRequestSchema } from '@foodstorii/shared';

const router = Router();

router.post('/', requireAuth, async (req, res: Response): Promise<void> => {
  const auth = req as AuthenticatedRequest;

  const parsed = ChatRequestSchema.safeParse({
    ...req.body,
    householdId: auth.householdId,
    userId: auth.userId,
  });

  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await handleChat(parsed.data);
    res.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[chat] error:', err);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
