import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'fs_access_token';
const USER_ID_KEY = 'fs_user_id';
const HOUSEHOLD_ID_KEY = 'fs_household_id';
const SLIDES_SEEN_KEY = 'fs_has_seen_slides';
const ONBOARDING_COMPLETE_KEY = 'fs_onboarding_complete';

interface AuthState {
  accessToken: string | null;
  userId: string | null;
  householdId: string | null;
  isLoaded: boolean;
  hasSeenSlides: boolean;
  hasCompletedOnboarding: boolean;
  signIn: (token: string, userId: string, householdId: string) => Promise<void>;
  signOut: () => Promise<void>;
  load: () => Promise<void>;
  markSlidesSeen: () => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  userId: null,
  householdId: null,
  isLoaded: false,
  hasSeenSlides: false,
  hasCompletedOnboarding: false,

  load: async () => {
    const [token, userId, householdId, slidesSeen, onboardingDone] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(USER_ID_KEY),
      SecureStore.getItemAsync(HOUSEHOLD_ID_KEY),
      AsyncStorage.getItem(SLIDES_SEEN_KEY),
      AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY),
    ]);
    set({
      accessToken: token,
      userId,
      householdId,
      isLoaded: true,
      hasSeenSlides: slidesSeen === 'true',
      hasCompletedOnboarding: onboardingDone === 'true',
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
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_ID_KEY),
      SecureStore.deleteItemAsync(HOUSEHOLD_ID_KEY),
    ]);
    set({ accessToken: null, userId: null, householdId: null });
  },

  markSlidesSeen: async () => {
    await AsyncStorage.setItem(SLIDES_SEEN_KEY, 'true');
    set({ hasSeenSlides: true });
  },

  markOnboardingComplete: async () => {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    set({ hasCompletedOnboarding: true });
  },
}));

// Standalone getter used by the API client (outside React)
export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}
