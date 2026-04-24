import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { FoodStoriiWordmark } from '../../src/components/common/FoodStoriiWordmark';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/common/Button';
import { TextInput } from '../../src/components/common/TextInput';
import { useAuthStore } from '../../src/stores/auth.store';
import * as api from '../../src/services/api';
import { colors, spacing, typography, radius } from '../../src/theme';
import { usePostHog } from 'posthog-react-native';

export default function SignInScreen() {
  const { signIn, hasCompletedOnboarding } = useAuthStore();
  const posthog = usePostHog();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await api.signInWithGoogle();
      posthog.capture('user_signed_in', { method: 'google' });
      // Routing is handled by _layout.tsx SIGNED_IN event — no navigation here
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      if (msg !== 'Sign-in cancelled') setError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password) return;
    setError('');
    setLoading(true);
    try {
      const result = await api.signIn(email.trim().toLowerCase(), password);
      console.log('[SignIn] userId:', result.userId, '| householdId:', result.householdId);
      await signIn(result.accessToken, result.userId, result.householdId ?? '');

      posthog.identify(result.userId, {
        $set: { email: email.trim().toLowerCase() },
      });
      posthog.capture('user_signed_in', {
        household_id: result.householdId ?? null,
      });

      // Route based on local onboarding flag (no network call needed here).
      // On a fresh device for an existing user, hasCompletedOnboarding may be
      // false — they'll redo the wizard which is harmless for MVP.
      if (hasCompletedOnboarding) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(onboarding)/intro');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign in failed');
      setError(error.message);
      posthog.capture('$exception', {
        $exception_list: [
          {
            type: error.name,
            value: error.message,
            stacktrace: { type: 'raw', frames: error.stack ?? '' },
          },
        ],
        $exception_source: 'react-native',
        screen: 'SignIn',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <FoodStoriiWordmark size="lg" />
            <Text style={styles.tagline}>Your household food assistant</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>Welcome back</Text>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
              placeholder="you@example.com"
            />
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
              placeholder="••••••••"
            />

            <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotLink}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button label="Sign in" onPress={handleSignIn} loading={loading} style={styles.btn} />

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google sign-in */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color={colors.text.secondary} />
              ) : (
                <Ionicons name="logo-google" size={18} color="#4285F4" />
              )}
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                <Text style={styles.footerLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.xl },
  header: { alignItems: 'center', paddingTop: spacing['3xl'], paddingBottom: spacing['2xl'], gap: spacing.sm },
  tagline: { fontSize: typography.size.sm, color: colors.text.tertiary },
  form: { gap: spacing.base },
  formTitle: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text.primary },
  errorText: { fontSize: typography.size.sm, color: colors.red[600], textAlign: 'center' },
  btn: { marginTop: spacing.sm },
  forgotLink: { alignSelf: 'flex-end' },
  forgotText: { fontSize: typography.size.sm, color: colors.green[600], fontWeight: typography.weight.medium },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md },
  footerText: { fontSize: typography.size.sm, color: colors.text.secondary },
  footerLink: { fontSize: typography.size.sm, color: colors.green[600], fontWeight: typography.weight.semibold },

  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xs },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.gray[200] },
  dividerText: { fontSize: typography.size.sm, color: colors.text.tertiary },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  googleBtnText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
});
