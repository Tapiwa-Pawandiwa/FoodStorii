// API service — calls go to Supabase Edge Functions, the Supabase JS client, or the FastAPI agent service.
// No API keys are stored in this app — only the anon key (public) and the agent service URL (public).

import type { ChatResponse, HouseholdProfile, InventorySnapshot, RecipeSuggestion } from '@foodstorii/shared';
import { supabaseClient } from './supabaseClient';

// ---- FastAPI Agent Service (Tina streaming chat) ----------------------------

const AGENT_SERVICE_URL = process.env.EXPO_PUBLIC_AGENT_SERVICE_URL

export async function* streamTinaChat(
  message: string,
  threadId: string,
  householdId: string,
  accessToken: string
) {
  const response = await fetch(`${AGENT_SERVICE_URL}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      message,
      thread_id: threadId,
      household_id: householdId,
    }),
  })

  if (!response.ok) throw new Error(`Agent service error: ${response.status}`)

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value)
    const lines = chunk.split('\n\n').filter(l => l.startsWith('data:'))
    for (const line of lines) {
      try {
        const data = JSON.parse(line.replace('data: ', ''))
        yield data
      } catch {}
    }
  }
}

// Stream event types:
// { type: 'token', content: string }        → append to message bubble
// { type: 'tool_start', tool: string }      → show "thinking..." indicator
// { type: 'tool_end', tool: string }        → hide indicator
// { type: 'done', message_type, quick_replies } → render chips, finalise
// { type: 'error', content: string }        → show error with retry button

// ---- Internal helper -------------------------------------------------------
// Uses supabaseClient.functions.invoke() so the SDK handles authentication
// headers (apikey + Bearer token) correctly, including the new sb_publishable_
// key format and automatic token refresh.

async function callFunction<T>(
  functionPath: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const method = options.method ?? 'GET';

  // Ensure the session is fresh before each call. getSession() auto-refreshes
  // an expired access token using the stored refresh token.
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
  const hasToken = !!sessionData.session?.access_token;
  console.log(`[API] → ${method} ${functionPath} | hasToken: ${hasToken} | userId: ${sessionData.session?.user?.id ?? 'none'}`);

  if (sessionError) {
    console.error(`[API] session error:`, sessionError.message);
  }

  // The FunctionsClient caches its auth token and does NOT call getSession()
  // internally before each request. Manually sync the current token so the
  // functions client always sends a fresh Bearer header.
  if (sessionData.session?.access_token) {
    supabaseClient.functions.setAuth(sessionData.session.access_token);
  }

  const { data, error } = await supabaseClient.functions.invoke<{
    success: boolean;
    data?: T;
    error?: string;
  }>(functionPath, {
    method: method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    ...(options.body != null ? { body: options.body } : {}),
  });

  if (error) {
    let msg = error.message;
    let statusCode: number | null = null;
    try {
      const ctx = (error as unknown as { context?: unknown }).context;
      if (ctx && typeof (ctx as Response).json === 'function') {
        const resp = ctx as Response;
        statusCode = resp.status;
        const body = await resp.json();
        msg = body?.error ?? body?.message ?? error.message;
        console.error(`[API] ✗ ${functionPath} ${resp.status} —`, msg);
      } else {
        console.error(`[API] ✗ ${functionPath}:`, msg);
      }
    } catch {
      console.error(`[API] ✗ ${functionPath}:`, msg);
    }
    if (statusCode === 401) {
      // The server rejected the JWT. Try refreshing the session once.
      // If the refresh succeeds (token was just expired), the caller can retry.
      // If it fails (password changed, session revoked), sign the user out.
      console.warn('[API] 401 — attempting session refresh...');
      const { error: refreshError } = await supabaseClient.auth.refreshSession();
      if (refreshError) {
        console.warn('[API] session refresh failed — signing out:', refreshError.message);
        const { useAuthStore } = await import('../stores/auth.store');
        await useAuthStore.getState().signOut();
      } else {
        console.log('[API] session refreshed — caller should retry the request');
      }
    }
    throw new Error(msg);
  }

  if (!data?.success) {
    const msg = data?.error ?? 'Something went wrong. Please try again.';
    console.error(`[API] ✗ ${functionPath} (not success):`, msg);
    throw new Error(msg);
  }

  console.log(`[API] ← OK ${functionPath}`);
  return data.data as T;
}

// ---- Auth — uses Supabase JS client directly (no Edge Function needed) -----

export async function signUp(
  email: string,
  password: string,
  displayName?: string,
): Promise<{ userId: string; householdId: string | null; confirmationRequired: boolean }> {
  return callFunction<{ userId: string; householdId: string | null; confirmationRequired: boolean }>('auth-signup', {
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
  await supabaseClient.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: process.env.EXPO_PUBLIC_SUPABASE_URL,
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
  console.log('[API] sendMessage →', payload.mode, '| msg:', payload.message.slice(0, 60));
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

export async function generateWhatsAppLinkToken(): Promise<string> {
  const result = await callFunction<{ token: string }>('household/whatsapp-link', {
    method: 'POST',
    body: {},
  });
  return result.token;
}

// ---- Inventory -------------------------------------------------------------

export async function getInventorySnapshot(): Promise<InventorySnapshot> {
  return callFunction<InventorySnapshot>('inventory/snapshot');
}

export async function addInventoryItems(
  items: { name: string; quantity?: number; unit?: string; category?: string }[],
): Promise<void> {
  const rows = items.map((i) => ({
    name: i.name,
    category: i.category ?? null,
    quantity: i.quantity ?? null,
    unit: i.unit ?? null,
    sourceType: 'manual',
  }));
  await callFunction<void>('inventory/items', { method: 'POST', body: { items: rows } });
}

// ---- Recipes ---------------------------------------------------------------

export async function searchRecipesByPantry(params?: {
  maxMissing?: number;
  limit?: number;
}): Promise<{ suggestions: RecipeSuggestion[]; pantryEmpty: boolean }> {
  const qs = new URLSearchParams();
  if (params?.maxMissing !== undefined) qs.set('maxMissing', String(params.maxMissing));
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  const path = qs.toString() ? `recipes/pantry?${qs}` : 'recipes/pantry';
  return callFunction<{ suggestions: RecipeSuggestion[]; pantryEmpty: boolean }>(path);
}

export async function searchRecipes(
  q: string,
  params?: { limit?: number },
): Promise<{ suggestions: RecipeSuggestion[] }> {
  const qs = new URLSearchParams({ q });
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  return callFunction<{ suggestions: RecipeSuggestion[] }>(`recipes/search?${qs}`);
}

export async function getRecipeDetail(externalId: string): Promise<RecipeSuggestion> {
  return callFunction<RecipeSuggestion>(`recipes/detail?id=${encodeURIComponent(externalId)}`);
}
