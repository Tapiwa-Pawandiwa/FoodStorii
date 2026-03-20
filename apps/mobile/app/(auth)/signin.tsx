import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/common/Button';
import { TextInput } from '../../src/components/common/TextInput';
import { useAuthStore } from '../../src/stores/auth.store';
import * as api from '../../src/services/api';
import { getProfile } from '../../src/services/api';
import { OnboardingStatus } from '@foodstorii/shared';
import { colors, spacing, typography } from '../../src/theme';

export default function SignInScreen() {
  const { signIn } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) return;
    setError('');
    setLoading(true);
    try {
      const result = await api.signIn(email.trim().toLowerCase(), password);
      const householdId = result.householdId ?? '';
      console.log('[SignIn] userId:', result.userId, '| householdId:', householdId);
      await signIn(result.accessToken, result.userId, householdId);

      // Check onboarding status using the profile (token is now stored)
      const profile = await getProfile();
      if (!profile || profile.onboardingStatus === OnboardingStatus.not_started) {
        router.replace('/(onboarding)');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logoMark}>
              <Text style={styles.logoLetter}>F</Text>
            </View>
            <Text style={styles.appName}>FoodStorii</Text>
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
  header: { alignItems: 'center', paddingTop: spacing['3xl'], paddingBottom: spacing['2xl'] },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.green[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  logoLetter: { fontSize: 32, fontWeight: typography.weight.bold, color: colors.white },
  appName: { fontSize: typography.size['2xl'], fontWeight: typography.weight.bold, color: colors.text.primary },
  tagline: { fontSize: typography.size.sm, color: colors.text.tertiary, marginTop: 4 },
  form: { gap: spacing.base },
  formTitle: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text.primary, marginBottom: spacing.sm },
  errorText: { fontSize: typography.size.sm, color: colors.red[600], textAlign: 'center' },
  btn: { marginTop: spacing.sm },
  forgotLink: { alignSelf: 'flex-end' },
  forgotText: { fontSize: typography.size.sm, color: colors.green[600], fontWeight: typography.weight.medium },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md },
  footerText: { fontSize: typography.size.sm, color: colors.text.secondary },
  footerLink: { fontSize: typography.size.sm, color: colors.green[600], fontWeight: typography.weight.semibold },
});
