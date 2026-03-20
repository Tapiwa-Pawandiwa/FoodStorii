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
import { colors, spacing, typography } from '../../src/theme';

export default function SignUpScreen() {
  const { signIn } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email.trim() || !password) return;
    setError('');
    setLoading(true);
    try {
      const result = await api.signUp(email.trim().toLowerCase(), password, name.trim() || undefined);
      // Sign in with the new credentials
      const session = await api.signIn(email.trim().toLowerCase(), password);
      await signIn(session.accessToken, session.userId, result.householdId);
      router.replace('/(onboarding)/intro');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Join FoodStorii and meet Tina, your household food assistant.</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              label="Your name (optional)"
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
              disabled={!email.trim() || password.length < 8}
              style={styles.btn}
            />

            <Text style={styles.terms}>
              By signing up you agree to FoodStorii's terms of use and privacy policy.
            </Text>
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
});
