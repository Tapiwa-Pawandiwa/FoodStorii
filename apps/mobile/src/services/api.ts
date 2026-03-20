// API service — all calls go to Supabase Edge Functions or the Supabase JS client directly.
// There is no Express server. No API keys are stored in this app — only the anon key,
// which is a public key designed to be embedded in client applications.

import type { ChatResponse, HouseholdProfile, InventorySnapshot } from '@foodstorii/shared';
import { getAccessToken } from '../stores/auth.store';
import { supabaseClient } from './supabaseClient';

// Base URL for all Edge Functions — derived from the Supabase project URL.
const FUNCTIONS_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;

// ---- Internal helpers ------------------------------------------------------

async function callFunction<T>(
  functionPath: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = await getAccessToken();
  const url = `${FUNCTIONS_URL}/${functionPath}`;
  const method = options.method ?? 'GET';

  console.log(`[API] → ${method} ${url}`);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch (networkErr) {
    console.error(`[API] ✗ Network error on ${method} ${url}:`, networkErr);
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }

  console.log(`[API] ← ${res.status} ${url}`);

  if (res.status === 401) {
    const { useAuthStore } = await import('../stores/auth.store');
    await useAuthStore.getState().signOut();
    const { router } = await import('expo-router');
    router.replace('/(auth)/signin');
    throw new Error('Your session has expired. Please sign in again.');
  }

  let body: { success: boolean; data?: T; error?: string };
  try {
    body = await res.json();
    console.log('[API]   response:', body);
  } catch {
    throw new Error('Unexpected response from server.');
  }

  if (!body.success || !res.ok) {
    throw new Error(body.error ?? 'Something went wrong. Please try again.');
  }

  return body.data as T;
}

// ---- Auth — uses Supabase JS client directly (no Edge Function needed) -----

export async function signUp(
  email: string,
  password: string,
  displayName?: string,
): Promise<{ userId: string; householdId: string }> {
  // Calls the auth-signup Edge Function which uses auth.admin.createUser
  // so email confirmation is bypassed. The Postgres trigger creates the household.
  return callFunction<{ userId: string; householdId: string }>('auth-signup', {
    method: 'POST',
    body: { email, password, displayName },
  });
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string; userId: string; householdId: string | null }> {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(error?.message ?? 'Invalid credentials');

  const userId = data.user.id;
  const { data: userRow } = await supabaseClient
    .from('users')
    .select('household_id')
    .eq('id', userId)
    .single();

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    userId,
    householdId: (userRow?.household_id as string) ?? null,
  };
}

export async function forgotPassword(email: string): Promise<void> {
  // Always resolves — never leaks whether the email exists
  await supabaseClient.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: process.env.EXPO_PUBLIC_SUPABASE_URL, // deep-link redirect for OTP
  });
}

export async function verifyOtp(
  email: string,
  token: string,
): Promise<{ accessToken: string }> {
  const { data, error } = await supabaseClient.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'email',
  });
  if (error || !data.session) throw new Error('Invalid or expired code. Please try again.');
  return { accessToken: data.session.access_token };
}

export async function resetPassword(
  accessToken: string,
  newPassword: string,
): Promise<void> {
  return callFunction<void>('auth-reset-password', {
    method: 'POST',
    body: { accessToken, newPassword },
  });
}

// ---- Chat — calls Tina Edge Function ---------------------------------------

export async function sendMessage(payload: {
  message: string;
  conversationId?: string;
  mode?: string;
}): Promise<ChatResponse> {
  return callFunction<ChatResponse>('tina', { method: 'POST', body: payload });
}

// ---- Household -------------------------------------------------------------

export async function getProfile(): Promise<HouseholdProfile | null> {
  try {
    return await callFunction<HouseholdProfile>('household/profile');
  } catch {
    return null;
  }
}

export async function updateProfile(
  input: Record<string, unknown>,
): Promise<HouseholdProfile> {
  return callFunction<HouseholdProfile>('household/profile', {
    method: 'PATCH',
    body: input,
  });
}

export async function registerPushToken(
  token: string,
  platform: 'ios' | 'android',
): Promise<void> {
  await callFunction<void>('household/push-token', {
    method: 'POST',
    body: { token, platform },
  });
}

export async function scheduleDailyNudge(): Promise<void> {
  await callFunction<void>('household/schedule-daily-nudge', { method: 'POST', body: {} });
}

// ---- Inventory -------------------------------------------------------------

export async function getInventorySnapshot(): Promise<InventorySnapshot> {
  return callFunction<InventorySnapshot>('inventory/snapshot');
}
