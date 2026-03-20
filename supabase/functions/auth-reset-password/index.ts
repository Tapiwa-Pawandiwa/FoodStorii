// Edge Function: auth-reset-password
// Updates a user's password using auth.admin.updateUserById (service role auto-injected).
// Called after OTP verification — the caller passes the access token from verifyOtp.

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

  const { accessToken, newPassword } = body as { accessToken?: string; newPassword?: string };

  if (!accessToken || typeof accessToken !== 'string') return json({ success: false, error: 'accessToken is required' }, 400);
  if (!newPassword || typeof newPassword !== 'string') return json({ success: false, error: 'newPassword is required' }, 400);
  if (newPassword.length < 8) return json({ success: false, error: 'Password must be at least 8 characters' }, 400);

  const supabase = createServiceClient();

  // Validate the access token and get the user
  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !user) {
    return json({ success: false, error: 'Invalid or expired reset link. Please request a new one.' }, 401);
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, { password: newPassword });
  if (error) return json({ success: false, error: error.message }, 400);

  return json({ success: true, data: null });
});
