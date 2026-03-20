import { useEffect, useRef } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { useAuthStore } from '../src/stores/auth.store';

export default function RootLayout() {
  const { load, accessToken, isLoaded, hasSeenSlides, hasCompletedOnboarding } = useAuthStore();
  const hasNavigated = useRef(false);

  useEffect(() => {
    load();
  }, []);

  // Only navigate once on initial load — never interfere with in-app navigation
  useEffect(() => {
    if (!isLoaded || hasNavigated.current) return;
    hasNavigated.current = true;

    if (accessToken && hasCompletedOnboarding) {
      router.replace('/(tabs)');
    } else if (accessToken && !hasCompletedOnboarding) {
      router.replace('/(onboarding)/intro');
    } else if (!hasSeenSlides) {
      router.replace('/(welcome)/slides');
    } else {
      router.replace('/(auth)/signin');
    }
  }, [isLoaded]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(welcome)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
