import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleChat } from './orchestrator.ts';

// CORS headers — mobile apps don't enforce CORS but include them for any
// future web dashboard or local testing via browser.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  try {
    // Validate Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ success: false, error: 'Missing authorization header' }, 401);
    }
    const token = authHeader.slice(7);

    // Create service-role client for all DB operations.
    // SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Validate the user's JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return json({ success: false, error: 'Invalid or expired token' }, 401);
    }

    // Resolve household for this user
    const { data: userRow } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', user.id)
      .single();

    if (!userRow?.household_id) {
      return json({ success: false, error: 'No household found for this user' }, 403);
    }

    // Parse request body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ success: false, error: 'Invalid JSON body' }, 400);
    }

    if (!body.message || typeof body.message !== 'string') {
      return json({ success: false, error: 'message is required' }, 400);
    }

    const result = await handleChat(
      {
        householdId: userRow.household_id as string,
        userId: user.id,
        message: body.message,
        conversationId: body.conversationId as string | undefined,
        mode: body.mode as string | undefined,
      },
      supabase,
    );

    return json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[tina] error:', message);
    return json({ success: false, error: message }, 500);
  }
});
