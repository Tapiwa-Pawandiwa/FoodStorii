import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/common/Button';
import { TextInput } from '../../src/components/common/TextInput';
import { colors, spacing, typography } from '../../src/theme';
import * as api from '../../src/services/api';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ access_token?: string; type?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const token = params.access_token;
  const isRecovery = params.type === 'recovery';

  useEffect(() => {
    if (token && !isRecovery) {
      setError('This link is not a password reset link.');
    }
  }, [token, isRecovery]);

  const handleReset = async () => {
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!token) {
      setError('Reset token is missing. Please request a new link.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {done ? (
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.title}>Password updated</Text>
              <Text style={styles.subtitle}>Your password has been changed. You can now sign in.</Text>
              <Button label="Sign in" onPress={() => router.replace('/(auth)/signin')} style={styles.btn} />
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.header}>
                <Text style={styles.title}>Set a new password</Text>
                <Text style={styles.subtitle}>Choose a strong password for your account.</Text>
              </View>

              <TextInput
                label="New password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="next"
                placeholder="8+ characters"
                autoFocus
              />
              <TextInput
                label="Confirm password"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleReset}
                placeholder="Repeat your password"
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Button
                label="Update password"
                onPress={handleReset}
                loading={loading}
                disabled={password.length < 8 || !confirm}
                style={styles.btn}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.xl },
  form: { gap: spacing.base },
  header: { gap: spacing.sm, marginBottom: spacing.sm },
  title: { fontSize: typography.size['2xl'], fontWeight: typography.weight.bold, color: colors.text.primary },
  subtitle: { fontSize: typography.size.base, color: colors.text.secondary, lineHeight: typography.size.base * 1.5 },
  errorText: { fontSize: typography.size.sm, color: colors.red[600], textAlign: 'center' },
  btn: { marginTop: spacing.sm },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.base, paddingTop: spacing['3xl'] },
  successIcon: { fontSize: 64 },
});
