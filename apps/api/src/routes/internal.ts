import { Router, Request, Response } from 'express';
import { supabase } from '../db/client';
import { NudgeStatus } from '@foodstorii/shared';

const router = Router();

// Shared-secret guard for internal cron endpoints
function requireInternalSecret(req: Request, res: Response, next: () => void): void {
  const secret = process.env.INTERNAL_CRON_SECRET;
  if (!secret) {
    // If no secret configured, block all access
    res.status(503).json({ success: false, error: 'Internal endpoint not configured' });
    return;
  }
  if (req.headers['x-internal-secret'] !== secret) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  next();
}

// POST /internal/nudge/dispatch
// Called by Supabase Edge Function cron (or external cron) every 15 min.
// Fetches pending nudge_candidates due now and delivers them via Expo push API.
router.post('/nudge/dispatch', requireInternalSecret, async (_req, res: Response): Promise<void> => {
  try {
    const now = new Date().toISOString();

    // Fetch due pending nudges
    const { data: candidates, error: fetchErr } = await supabase
      .from('nudge_candidates')
      .select('id, household_id, title, body')
      .eq('status', NudgeStatus.pending)
      .lte('scheduled_for', now)
      .limit(100);

    if (fetchErr) throw new Error(`Failed to fetch nudge candidates: ${fetchErr.message}`);
    if (!candidates || candidates.length === 0) {
      res.json({ success: true, dispatched: 0 });
      return;
    }

    const householdIds = [...new Set(candidates.map((c) => c.household_id as string))];

    // Fetch active push tokens for all relevant households
    const { data: tokenRows, error: tokenErr } = await supabase
      .from('push_tokens')
      .select('household_id, token')
      .in('household_id', householdIds)
      .eq('is_active', true);

    if (tokenErr) throw new Error(`Failed to fetch push tokens: ${tokenErr.message}`);

    const tokensByHousehold: Record<string, string[]> = {};
    for (const row of tokenRows ?? []) {
      const hid = row.household_id as string;
      if (!tokensByHousehold[hid]) tokensByHousehold[hid] = [];
      tokensByHousehold[hid].push(row.token as string);
    }

    const messages: Array<{ to: string; title: string; body: string }> = [];
    const sentIds: string[] = [];

    for (const candidate of candidates) {
      const tokens = tokensByHousehold[candidate.household_id as string] ?? [];
      if (tokens.length === 0) continue;

      for (const token of tokens) {
        messages.push({
          to: token,
          title: candidate.title as string,
          body: candidate.body as string,
        });
      }
      sentIds.push(candidate.id as string);
    }

    // Send to Expo push API in batches of 100
    if (messages.length > 0) {
      const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      });
      if (!expoRes.ok) {
        const errText = await expoRes.text();
        throw new Error(`Expo push API error: ${expoRes.status} ${errText}`);
      }
    }

    // Mark dispatched nudges as sent
    if (sentIds.length > 0) {
      const { error: updateErr } = await supabase
        .from('nudge_candidates')
        .update({ status: NudgeStatus.sent, sent_at: now })
        .in('id', sentIds);

      if (updateErr) throw new Error(`Failed to mark nudges sent: ${updateErr.message}`);
    }

    console.log(`[NudgeDispatch] Dispatched ${sentIds.length} nudges (${messages.length} push messages)`);
    res.json({ success: true, dispatched: sentIds.length, messages: messages.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[NudgeDispatch] Error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
