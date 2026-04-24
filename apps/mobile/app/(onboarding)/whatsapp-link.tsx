import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking,
  ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { generateWhatsAppLinkToken } from '../../src/services/api';
import { colors, spacing, typography, radius, shadows } from '../../src/theme';
import { usePostHog } from 'posthog-react-native';

const WHATSAPP_NUMBER = '14155238886'; // Twilio sandbox

const FEATURES = [
  { icon: 'restaurant-outline' as const, text: 'Ask for recipes anytime' },
  { icon: 'leaf-outline' as const, text: 'Weekly waste-reduction check-ins' },
  { icon: 'cart-outline' as const, text: 'Build shopping lists by chat' },
  { icon: 'nutrition-outline' as const, text: 'Nutrition & supermarket tips' },
];

export default function WhatsAppLinkScreen() {
  const posthog = usePostHog();
  const [loading, setLoading] = useState(false);
  const [linked, setLinked] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [webUrl, setWebUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLink() {
    setLoading(true);
    setError(null);
    try {
      const generatedToken = await generateWhatsAppLinkToken();
      setToken(generatedToken);

      const prefilled = `link ${generatedToken}`;
      const waWebUrl = `https://web.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(prefilled)}`;
      setWebUrl(waWebUrl);

      // Try WhatsApp app first (real devices only — whatsapp:// scheme only
      // resolves when the app is actually installed).
      const appUrl = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(prefilled)}`;
      const appSupported = await Linking.canOpenURL(appUrl);
      if (appSupported) {
        await Linking.openURL(appUrl);
      }

      posthog.capture('whatsapp_linked', {
        app_installed: appSupported,
      });
      setLinked(true);
    } catch (err) {
      console.error('[WhatsAppLink] error:', err);
      setError('Could not generate a link. Please try again.');
    } finally {
      setLoading(false);
    }
  }


  function handleContinue() {
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Ionicons name="logo-whatsapp" size={52} color="#25d366" />
        </View>

        {/* Copy */}
        <Text style={styles.headline}>Connect Tina on WhatsApp</Text>
        <Text style={styles.body}>
          Chat with your household food assistant right in WhatsApp — recipes, shopping lists, weekly check-ins, and more.
        </Text>

        {/* Feature list */}
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={16} color={colors.green[600]} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Token — shown as soon as it's generated */}
        {token && (
          <View style={styles.tokenCard}>
            <Text style={styles.tokenLabel}>Your link code</Text>
            <Text style={styles.tokenValue}>{token}</Text>
            <View style={styles.tokenDivider} />
            <Text style={styles.tokenStep}>
              <Text style={styles.tokenStepNum}>1. </Text>
              Open <Text style={styles.bold}>WhatsApp Web</Text> on your Mac
            </Text>
            <Text style={styles.tokenStep}>
              <Text style={styles.tokenStepNum}>2. </Text>
              Open the <Text style={styles.bold}>Twilio sandbox</Text> chat
            </Text>
            <Text style={styles.tokenStep}>
              <Text style={styles.tokenStepNum}>3. </Text>
              Send: <Text style={styles.tokenCommand}>link {token}</Text>
            </Text>
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.red[600]} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Fixed bottom actions */}
      <View style={styles.actions}>
        {linked ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleContinue} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Go to FoodStorii</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.white} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.waBtn, loading && styles.btnDisabled]}
            onPress={handleLink}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons name="logo-whatsapp" size={20} color={colors.white} />
                <Text style={styles.primaryBtnText}>{error ? 'Try again' : 'Link WhatsApp'}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.skipBtn} onPress={handleContinue} activeOpacity={0.7}>
          <Text style={styles.skipText}>I'll do this later</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.lg,
  },

  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    ...shadows.sm,
  },

  headline: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    lineHeight: typography.size['2xl'] * 1.25,
  },
  body: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    lineHeight: typography.size.base * 1.6,
    marginBottom: spacing.xl,
  },

  features: { gap: spacing.md, marginBottom: spacing.xl },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    fontWeight: typography.weight.medium,
  },

  macCard: {
    backgroundColor: colors.green[50],
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.green[200],
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  macHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  macTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.green[700],
  },
  macInstructions: {
    fontSize: typography.size.sm,
    color: colors.green[700],
    lineHeight: typography.size.sm * 1.6,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.green[100],
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  copyBtnText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.green[700],
  },

  tokenCard: {
    backgroundColor: colors.gray[50],
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.gray[200],
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tokenLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tokenValue: {
    fontSize: 36,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    letterSpacing: 6,
    fontVariant: ['tabular-nums'],
  },
  tokenDivider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: spacing.xs,
  },
  tokenStep: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: typography.size.sm * 1.6,
  },
  tokenStepNum: {
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  bold: {
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  tokenCommand: {
    fontWeight: typography.weight.bold,
    color: colors.green[700],
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#fef2f2',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: typography.size.sm,
    color: colors.red[600],
    flex: 1,
    lineHeight: typography.size.sm * 1.5,
  },

  actions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    backgroundColor: colors.white,
  },
  waBtn: {
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: '#25d366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.md,
  },
  primaryBtn: {
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.green[600],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.md,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.white,
  },
  skipBtn: {
    height: 48,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
});
