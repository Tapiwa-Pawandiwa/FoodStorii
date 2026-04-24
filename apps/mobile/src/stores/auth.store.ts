import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'fs_access_token';
const USER_ID_KEY = 'fs_user_id';
const HOUSEHOLD_ID_KEY = 'fs_household_id';
const SLIDES_SEEN_KEY = 'fs_has_seen_slides';
const ONBOARDING_COMPLETE_KEY = 'fs_onboarding_complete';
const FIRST_VISIT_KEY = 'fs_first_visit';

interface AuthState {
  accessToken: string | null;
  userId: string | null;
  householdId: string | null;
  isLoaded: boolean;
  hasSeenSlides: boolean;
  hasCompletedOnboarding: boolean;
  isFirstVisit: boolean;
  signIn: (token: string, userId: string, householdId: string) => Promise<void>;
  signOut: () => Promise<void>;
  load: () => Promise<void>;
  markSlidesSeen: () => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
  markFirstVisitSeen: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  userId: null,
  householdId: null,
  isLoaded: false,
  hasSeenSlides: false,
  hasCompletedOnboarding: false,
  isFirstVisit: false,

  load: async () => {
    const [token, userId, householdId, slidesSeen, onboardingDone, firstVisit] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(USER_ID_KEY),
      SecureStore.getItemAsync(HOUSEHOLD_ID_KEY),
      AsyncStorage.getItem(SLIDES_SEEN_KEY),
      AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY),
      AsyncStorage.getItem(FIRST_VISIT_KEY),
    ]);
    set({
      accessToken: token,
      userId,
      householdId,
      isLoaded: true,
      hasSeenSlides: slidesSeen === 'true',
      hasCompletedOnboarding: onboardingDone === 'true',
      isFirstVisit: firstVisit === 'true',
    });
  },

  signIn: async (token, userId, householdId) => {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(USER_ID_KEY, userId),
      SecureStore.setItemAsync(HOUSEHOLD_ID_KEY, householdId),
    ]);
    set({ accessToken: token, userId, householdId });
  },

  signOut: async () => {
    // Clear our own SecureStore tokens
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_ID_KEY),
      SecureStore.deleteItemAsync(HOUSEHOLD_ID_KEY),
    ]);
    // Also clear the Supabase session from AsyncStorage directly.
    // supabaseClient.auth.signOut() makes a network call that can hang on
    // expired tokens (especially in Expo Go). Wiping the AsyncStorage keys
    // directly guarantees the session is gone regardless of network state.
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const supabaseKeys = allKeys.filter((k) => k.startsWith('sb-') || k.startsWith('supabase'));
      if (supabaseKeys.length > 0) await AsyncStorage.multiRemove(supabaseKeys);
    } catch {
      // best-effort — don't block sign-out if AsyncStorage fails
    }
    set({ accessToken: null, userId: null, householdId: null });
  },

  markSlidesSeen: async () => {
    await AsyncStorage.setItem(SLIDES_SEEN_KEY, 'true');
    set({ hasSeenSlides: true });
  },

  markOnboardingComplete: async () => {
    await Promise.all([
      AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true'),
      AsyncStorage.setItem(FIRST_VISIT_KEY, 'true'),
    ]);
    set({ hasCompletedOnboarding: true, isFirstVisit: true });
  },

  markFirstVisitSeen: async () => {
    await AsyncStorage.removeItem(FIRST_VISIT_KEY);
    set({ isFirstVisit: false });
  },

  resetOnboarding: async () => {
    await Promise.all([
      AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY),
      AsyncStorage.removeItem(SLIDES_SEEN_KEY),
      AsyncStorage.removeItem(FIRST_VISIT_KEY),
    ]);
    set({ hasCompletedOnboarding: false, hasSeenSlides: false, isFirstVisit: false });
  },
}));

// Standalone getter used by the API client (outside React).
// Always reads from the Supabase client session so the token is auto-refreshed.
// Falls back to SecureStore for the rare case where the Supabase session hasn't
// loaded yet (e.g. very first request immediately after cold boot).
export async function getAccessToken(): Promise<string | null> {
  try {
    const { supabaseClient } = await import('../services/supabaseClient');
    const { data } = await supabaseClient.auth.getSession();
    if (data.session?.access_token) return data.session.access_token;
  } catch {
    // fall through to SecureStore backup
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}
