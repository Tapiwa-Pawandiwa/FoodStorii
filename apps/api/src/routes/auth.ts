import { Router, Request, Response } from 'express';
import { supabase } from '../db/client';
import { z } from 'zod';

const router = Router();

const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100).optional(),
});

// POST /auth/signup
// Creates a Supabase auth user, then creates a household + user row
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  const parsed = SignUpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  const { email, password, displayName } = parsed.data;

  // Create Supabase auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    res.status(400).json({ success: false, error: authError?.message ?? 'Failed to create user' });
    return;
  }

  const userId = authData.user.id;

  // Create household
  const { data: householdData, error: householdError } = await supabase
    .from('households')
    .insert({ name: displayName ? `${displayName}'s Household` : 'My Household' })
    .select()
    .single();

  if (householdError) {
    res.status(500).json({ success: false, error: 'Failed to create household' });
    return;
  }

  const householdId = householdData.id as string;

  // Create user row
  const { error: userError } = await supabase.from('users').insert({
    id: userId,
    household_id: householdId,
    display_name: displayName ?? null,
    email,
  });

  if (userError) {
    res.status(500).json({ success: false, error: 'Failed to link user to household' });
    return;
  }

  // Create empty household profile
  await supabase.from('household_profiles').insert({
    household_id: householdId,
    onboarding_status: 'not_started',
  });

  res.status(201).json({
    success: true,
    data: { userId, householdId },
  });
});

// POST /auth/signin
router.post('/signin', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ success: false, error: 'email and password required' });
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    res.status(401).json({ success: false, error: error?.message ?? 'Invalid credentials' });
    return;
  }

  const userId = data.user.id;

  // Look up householdId from users table
  const { data: userRow } = await supabase
    .from('users')
    .select('household_id')
    .eq('id', userId)
    .single();

  res.json({
    success: true,
    data: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      userId,
      householdId: userRow?.household_id ?? null,
    },
  });
});

// POST /auth/forgot-password — sends a 6-digit OTP to the email
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email || typeof email !== 'string') {
    res.status(400).json({ success: false, error: 'email required' });
    return;
  }

  // Always return success — never leak whether the email exists
  await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: false },
  });

  res.json({ success: true, data: null });
});

// POST /auth/verify-otp — verifies the 6-digit code and returns an access token
router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
  const { email, token } = req.body as { email?: string; token?: string };
  if (!email || !token) {
    res.status(400).json({ success: false, error: 'email and token required' });
    return;
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'email',
  });

  if (error || !data.session) {
    res.status(400).json({ success: false, error: 'Invalid or expired code. Please try again.' });
    return;
  }

  res.json({ success: true, data: { accessToken: data.session.access_token } });
});

// POST /auth/reset-password
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { accessToken, newPassword } = req.body as { accessToken?: string; newPassword?: string };
  if (!accessToken || !newPassword) {
    res.status(400).json({ success: false, error: 'accessToken and newPassword required' });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    return;
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !user) {
    res.status(401).json({ success: false, error: 'Invalid or expired reset link. Please request a new one.' });
    return;
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, { password: newPassword });
  if (error) {
    res.status(400).json({ success: false, error: error.message });
    return;
  }

  res.json({ success: true, data: null });
});

export default router;
