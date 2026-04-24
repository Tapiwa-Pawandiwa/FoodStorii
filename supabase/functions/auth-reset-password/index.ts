// Edge Function: auth-reset-password
// Updates a user's password using auth.updateUser (user-context, no service role).
// The caller passes the access token obtained from verifyOtp.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { json, CORS_HEADERS } from '../_shared/client.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const { accessToken, newPassword } = body as { accessToken?: string; newPassword?: string };

  if (!accessToken || typeof accessToken !== 'string') return json({ success: false, error: 'accessToken is required' }, 400);
  if (!newPassword || typeof newPassword !== 'string') return json({ success: false, error: 'newPassword is required' }, 400);
  if (newPassword.length < 8) return json({ success: false, error: 'Password must be at least 8 characters' }, 400);

  // Create a user-context client with the caller's access token.
  // auth.updateUser updates the currently authenticated user's password —
  // no service role or admin API needed.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } },
  );

  // Validate the token first
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return json({ success: false, error: 'Invalid or expired reset link. Please request a new one.' }, 401);
  }

  // Update password — runs as the authenticated user (no admin privileges needed)
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return json({ success: false, error: error.message }, 400);

  return json({ success: true, data: null });
});
