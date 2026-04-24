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

export default function SignUpScreen() {
  const { signIn } = useAuthStore();
  const posthog = usePostHog();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [confirmed, setConfirmed] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignUp = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await api.signInWithGoogle();
      posthog.capture('user_signed_up', { method: 'google' });
      // _layout.tsx SIGNED_IN handler routes to onboarding
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      if (msg !== 'Sign-in cancelled') setError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password) return;
    setError('');
    setLoading(true);
    try {
      const result = await api.signUp(email.trim().toLowerCase(), password, name.trim() || undefined);
      if (result.confirmationRequired) {
        // Email confirmation is enabled — user must confirm before signing in.
        posthog.capture('user_signed_up', {
          confirmation_required: true,
          household_id: result.householdId ?? null,
        });
        setConfirmed(true);
      } else {
        // Email confirmation is off — sign in immediately.
      const session = await api.signIn(email.trim().toLowerCase(), password);
        await signIn(session.accessToken, session.userId, result.householdId ?? session.householdId ?? '');
        posthog.identify(session.userId, {
          $set: { email: email.trim().toLowerCase(), name: name.trim() },
          $set_once: { sign_up_date: new Date().toISOString() },
        });
        posthog.capture('user_signed_up', {
          confirmation_required: false,
          household_id: result.householdId ?? session.householdId ?? null,
        });
      router.replace('/(onboarding)/intro');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign up failed');
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
        screen: 'SignUp',
      });
    } finally {
      setLoading(false);
    }
  };

  if (confirmed) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.confirmWrap}>
          <FoodStoriiWordmark size="md" />
          <Text style={styles.confirmTitle}>Check your email</Text>
          <Text style={styles.confirmBody}>
            We sent a confirmation link to{'\n'}
            <Text style={styles.confirmEmail}>{email.trim().toLowerCase()}</Text>
            {'\n\n'}Click the link to activate your account, then come back to sign in.
          </Text>
          <Button
            label="Go to sign in"
            onPress={() => router.replace('/(auth)/signin')}
            style={styles.btn}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <FoodStoriiWordmark size="md" />
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Join FoodStorii and meet Tina, your household food assistant.</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              label="Your name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
              placeholder="Alex"
            />
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
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
              placeholder="8+ characters"
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button
              label="Create account"
              onPress={handleSignUp}
              loading={loading}
              disabled={!name.trim() || !email.trim() || password.length < 8}
              style={styles.btn}
            />

            <Text style={styles.terms}>
              By signing up you agree to FoodStorii's terms of use and privacy policy.
            </Text>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google sign-up */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleSignUp}
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
  back: { marginBottom: spacing.xl },
  backText: { fontSize: typography.size.base, color: colors.green[600], fontWeight: typography.weight.medium },
  header: { marginBottom: spacing.xl, gap: spacing.sm },
  title: { fontSize: typography.size['2xl'], fontWeight: typography.weight.bold, color: colors.text.primary },
  subtitle: { fontSize: typography.size.base, color: colors.text.secondary, lineHeight: typography.size.base * 1.5 },
  form: { gap: spacing.base },
  errorText: { fontSize: typography.size.sm, color: colors.red[600], textAlign: 'center' },
  btn: { marginTop: spacing.sm },
  terms: { fontSize: typography.size.xs, color: colors.text.tertiary, textAlign: 'center', lineHeight: 18 },
  confirmWrap: { flex: 1, padding: spacing.xl, justifyContent: 'center', gap: spacing.lg },
  confirmTitle: { fontSize: typography.size['2xl'], fontWeight: typography.weight.bold, color: colors.text.primary },
  confirmBody: { fontSize: typography.size.base, color: colors.text.secondary, lineHeight: typography.size.base * 1.6 },
  confirmEmail: { fontWeight: typography.weight.semibold, color: colors.text.primary },

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
