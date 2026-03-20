import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/common/Button';
import * as api from '../../src/services/api';
import { colors, spacing, typography, radius } from '../../src/theme';

export default function VerifyOtpScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const code = digits.join('');

  const handleDigit = (value: string, index: number) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError('');
    if (digit && index < 5) {
      inputs.current[index + 1]?.focus();
    }
    if (next.join('').length === 6) {
      submitCode(next.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const submitCode = async (otp: string) => {
    if (otp.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      const { accessToken } = await api.verifyOtp(email, otp);
      router.replace({ pathname: '/(auth)/reset-password', params: { access_token: accessToken } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code. Please try again.');
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => inputs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      await api.forgotPassword(email);
      setResent(true);
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => inputs.current[0]?.focus(), 100);
    } catch {
      setError('Could not resend code. Please try again.');
    } finally {
      setResending(false);
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
            <Text style={styles.title}>Enter your code</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to{' '}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>
          </View>

          <View style={styles.codeRow}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={(r) => { inputs.current[i] = r; }}
                style={[styles.codeBox, d ? styles.codeBoxFilled : null, error ? styles.codeBoxError : null]}
                value={d}
                onChangeText={(v) => handleDigit(v, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                selectTextOnFocus
                autoFocus={i === 0}
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button
            label="Verify"
            onPress={() => submitCode(code)}
            loading={loading}
            disabled={code.length !== 6}
            style={styles.btn}
          />

          <View style={styles.resendRow}>
            <Text style={styles.resendText}>
              {resent ? 'Code resent. ' : "Didn't get it? "}
            </Text>
            <TouchableOpacity onPress={handleResend} disabled={resending}>
              <Text style={styles.resendLink}>{resending ? 'Sending...' : 'Resend code'}</Text>
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
  header: { gap: spacing.sm, marginBottom: spacing['2xl'] },
  title: { fontSize: typography.size['2xl'], fontWeight: typography.weight.bold, color: colors.text.primary },
  subtitle: { fontSize: typography.size.base, color: colors.text.secondary, lineHeight: typography.size.base * 1.5 },
  emailHighlight: { fontWeight: typography.weight.semibold, color: colors.text.primary },
  codeRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginBottom: spacing.xl },
  codeBox: {
    width: 48,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    textAlign: 'center',
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    backgroundColor: colors.gray[50],
  },
  codeBoxFilled: {
    borderColor: colors.green[600],
    backgroundColor: colors.white,
  },
  codeBoxError: {
    borderColor: colors.red[500],
    backgroundColor: colors.red[50],
  },
  errorText: { fontSize: typography.size.sm, color: colors.red[600], textAlign: 'center', marginBottom: spacing.sm },
  btn: {},
  resendRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  resendText: { fontSize: typography.size.sm, color: colors.text.secondary },
  resendLink: { fontSize: typography.size.sm, color: colors.green[600], fontWeight: typography.weight.semibold },
});
