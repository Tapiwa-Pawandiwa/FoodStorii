import { useEffect, useRef } from 'react';
import { Stack, router, usePathname, useGlobalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, Linking } from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { PostHogProvider } from 'posthog-react-native';
import { useAuthStore } from '../src/stores/auth.store';
import { supabaseClient } from '../src/services/supabaseClient';
import { posthog } from '../src/config/posthog';

export default function RootLayout() {
  const [fontsLoaded] = useFonts(Ionicons.font);
  const { load, signOut, accessToken, isLoaded, hasSeenSlides, hasCompletedOnboarding } = useAuthStore();
  const initialRouteHandled = useRef(false);
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const previousPathname = useRef<string | undefined>(undefined);

  // Manual screen tracking for Expo Router
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      posthog.screen(pathname, {
        previous_screen: previousPathname.current ?? null,
        ...params,
      });
      previousPathname.current = pathname;
    }
  }, [pathname, params]);

  useEffect(() => {
    load();

    // Sync Supabase auth events → auth store.
    // Do NOT navigate here — the effects below handle all routing.
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth] event: ${event}`);
      if (event === 'SIGNED_IN' && session) {
        // Fired after email confirmation deep link is processed.
        // Read household_id then store the session.
        const { data: userRow } = await supabaseClient
          .from('users')
          .select('household_id')
          .eq('id', session.user.id)
          .single();
        const householdId = (userRow?.household_id as string) ?? '';
        await useAuthStore.getState().signIn(session.access_token, session.user.id, householdId);
      } else if (event === 'SIGNED_OUT') {
        // Confirm session is truly gone (avoid spurious SIGNED_OUT during refresh)
        const { data } = await supabaseClient.auth.getSession();
        if (!data.session) {
          await signOut(); // clears accessToken in store → triggers routing effect below
        }
      }
    });

    // Handle deep link when app is already open
    const linkingSub = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('code=')) {
        supabaseClient.auth.exchangeCodeForSession(url).catch((e) =>
          console.warn('[Auth] exchangeCodeForSession error:', e.message),
        );
      }
    });

    // Handle deep link that launched the app from a cold start
    Linking.getInitialURL().then((url) => {
      if (url?.includes('code=')) {
        supabaseClient.auth.exchangeCodeForSession(url).catch((e) =>
          console.warn('[Auth] exchangeCodeForSession (initial) error:', e.message),
        );
      }
    });

    return () => {
      subscription.unsubscribe();
      linkingSub.remove();
    };
  }, []);

  // Initial routing — runs once after the store is loaded from AsyncStorage.
  // When a stored token exists, we VERIFY the Supabase session is still valid
  // before granting access. getSession() auto-attempts token refresh — if that
  // also fails (e.g. refresh token expired or revoked), session is null and we
  // force the user back to sign-in. This prevents stale tokens from showing the
  // main app.
  useEffect(() => {
    if (!isLoaded || !fontsLoaded || initialRouteHandled.current) return;

    async function determineInitialRoute() {
      initialRouteHandled.current = true;

      if (accessToken) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
          console.log('[Auth] stored token found but Supabase session invalid — signing out');
          await signOut();
          router.replace('/(auth)/signin');
          return;
        }
        console.log('[Auth] session valid | onboarding:', hasCompletedOnboarding);
        router.replace(hasCompletedOnboarding ? '/(tabs)' : '/(onboarding)/intro');
      } else if (!hasSeenSlides) {
        router.replace('/(welcome)/slides');
      } else {
        router.replace('/(auth)/signin');
      }
    }

    determineInitialRoute();
  }, [isLoaded, fontsLoaded]);

  // Reactive sign-out routing — fires whenever accessToken is cleared AFTER
  // initial load (i.e. the user signed out mid-session or a 401 was caught)
  useEffect(() => {
    if (!initialRouteHandled.current) return; // ignore before initial route is set
    if (!accessToken) {
      router.replace('/(auth)/signin');
    }
  }, [accessToken]);

  // Don't render until fonts are ready — prevents icon question marks
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <PostHogProvider
          client={posthog}
          autocapture={{
            captureScreens: false,
            captureTouches: true,
            propsToCapture: ['testID'],
            maxElementsCaptured: 20,
          }}
        >
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(welcome)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </PostHogProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
