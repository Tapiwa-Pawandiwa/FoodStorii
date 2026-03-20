// Edge Function: auth-signup
// Registers a new user. Uses auth.admin.createUser (service role auto-injected)
// so email confirmation is bypassed for mobile-first UX.
// A Postgres trigger (004_signup_trigger.sql) auto-creates the household,
// users, and household_profiles rows — this function just initiates auth.

import { createServiceClient, json, CORS_HEADERS } from '../_shared/client.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const { email, password, displayName } = body as {
    email?: string;
    password?: string;
    displayName?: string;
  };

  if (!email || typeof email !== 'string') return json({ success: false, error: 'email is required' }, 400);
  if (!password || typeof password !== 'string') return json({ success: false, error: 'password is required' }, 400);
  if (password.length < 8) return json({ success: false, error: 'Password must be at least 8 characters' }, 400);

  const supabase = createServiceClient();

  // Create the auth user — the Postgres trigger handles household/user row creation.
  // email_confirm: true skips the email verification step for mobile UX.
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName ?? null },
  });

  if (authError || !authData.user) {
    return json({ success: false, error: authError?.message ?? 'Failed to create user' }, 400);
  }

  const userId = authData.user.id;

  // The trigger runs synchronously inside the INSERT transaction, so the
  // users row is available immediately after createUser returns.
  const { data: userRow, error: userRowError } = await supabase
    .from('users')
    .select('household_id')
    .eq('id', userId)
    .single();

  if (userRowError || !userRow?.household_id) {
    return json({ success: false, error: 'User created but household setup failed' }, 500);
  }

  return json({ success: true, data: { userId, householdId: userRow.household_id } }, 201);
});
