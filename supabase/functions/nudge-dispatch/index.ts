// Edge Function: nudge-dispatch
// Fetches pending nudge_candidates and delivers them via the Expo push API.
// Called by a pg_cron job every 15 minutes.
//
// Authentication: caller must present INTERNAL_CRON_SECRET as a Bearer token.
// This prevents public calls.
//
// pg_cron setup (run in Supabase SQL editor):
//   SELECT cron.schedule(
//     'nudge-dispatch',
//     '*/15 * * * *',
//     $$ SELECT net.http_post(
//          url := current_setting('app.supabase_url') || '/functions/v1/nudge-dispatch',
//          headers := jsonb_build_object(
//            'Authorization', 'Bearer ' || current_setting('app.cron_secret'),
//            'Content-Type', 'application/json'
//          ),
//          body := '{}'::jsonb
//        ) $$
//   );

import { createInternalClient, json, CORS_HEADERS } from '../_shared/client.ts';

const NudgeStatus = { pending: 'pending', sent: 'sent' } as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  // Authenticate: caller must present INTERNAL_CRON_SECRET as Bearer token.
  const authHeader = req.headers.get('Authorization');
  const cronSecret = Deno.env.get('INTERNAL_CRON_SECRET');
  if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  const supabase = createInternalClient();
  const now = new Date().toISOString();

  try {
    const { data: candidates, error: fetchErr } = await supabase
      .from('nudge_candidates')
      .select('id, household_id, title, body')
      .eq('status', NudgeStatus.pending)
      .lte('scheduled_for', now)
      .limit(100);

    if (fetchErr) throw new Error(`Failed to fetch nudge candidates: ${fetchErr.message}`);
    if (!candidates || candidates.length === 0) return json({ success: true, dispatched: 0 });

    const householdIds = [...new Set(candidates.map((c) => c.household_id as string))];

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
        messages.push({ to: token, title: candidate.title as string, body: candidate.body as string });
      }
      sentIds.push(candidate.id as string);
    }

    if (messages.length > 0) {
      const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      });
      if (!expoRes.ok) {
        throw new Error(`Expo push API error: ${expoRes.status} ${await expoRes.text()}`);
      }
    }

    if (sentIds.length > 0) {
      const { error: updateErr } = await supabase
        .from('nudge_candidates')
        .update({ status: NudgeStatus.sent, sent_at: now })
        .in('id', sentIds);

      if (updateErr) throw new Error(`Failed to mark nudges sent: ${updateErr.message}`);
    }

    console.log(`[nudge-dispatch] Dispatched ${sentIds.length} nudges (${messages.length} push messages)`);
    return json({ success: true, dispatched: sentIds.length, messages: messages.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[nudge-dispatch] Error:', message);
    return json({ success: false, error: message }, 500);
  }
});
