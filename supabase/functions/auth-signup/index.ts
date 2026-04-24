// Edge Function: auth-signup
// Registers a new user using the standard auth.signUp API (no service role).
// Supabase sends a confirmation email — the user must confirm before signing in.
// A Postgres trigger auto-creates the household, users, and household_profiles
// rows on auth.users INSERT (fires immediately, before email confirmation).

import { createAnonClient, json, CORS_HEADERS } from '../_shared/client.ts';

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

  const supabase = createAnonClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { display_name: displayName ?? null },
      emailRedirectTo: 'foodstorii://',
    },
  });

  if (authError || !authData.user) {
    return json({ success: false, error: authError?.message ?? 'Failed to create user' }, 400);
  }

  // The Postgres trigger fires on auth.users INSERT (synchronous), so the
  // household is created immediately — before the user confirms their email.
  // Use the SECURITY DEFINER RPC to read household_id without a session.
  const { data: householdId } = await supabase
    .rpc('sf_get_user_household', { p_user_id: authData.user.id });

  return json({
    success: true,
    data: {
      userId: authData.user.id,
      householdId: householdId ?? null,
      confirmationRequired: !authData.session,
    },
  }, 201);
});
