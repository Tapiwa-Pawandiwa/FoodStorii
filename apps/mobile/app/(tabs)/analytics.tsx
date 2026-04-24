import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, radius, shadows } from '../../src/theme';

type Period = 'week' | 'month';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface StatCard {
  icon: IoniconsName;
  iconColor: string;
  iconBg: string;
  label: string;
  week: string;
  month: string;
}

const STATS: StatCard[] = [
  {
    icon: 'cash-outline',
    iconColor: colors.green[600],
    iconBg: colors.green[50],
    label: 'Money Saved',
    week: '€12.40',
    month: '€48.00',
  },
  {
    icon: 'leaf-outline',
    iconColor: '#16a34a',
    iconBg: '#f0fdf4',
    label: 'Waste Prevented',
    week: '3 items',
    month: '11 items',
  },
  {
    icon: 'restaurant-outline',
    iconColor: colors.green[700],
    iconBg: colors.green[50],
    label: 'Meals Cooked',
    week: '5',
    month: '19',
  },
  {
    icon: 'cloud-outline',
    iconColor: '#0891b2',
    iconBg: '#e0f2fe',
    label: 'CO₂ Saved',
    week: '0.8 kg',
    month: '3.1 kg',
  },
];

const TIPS: Record<Period, string[]> = {
  week: [
    'Use up your leafy greens before mid-week — they lose freshness fast.',
    'Batch cook grains on Monday to save time on busy evenings.',
    'Check your fridge before adding items to your shopping list.',
    'Plan one "use-what-you-have" meal this week to cut waste.',
  ],
  month: [
    'Review your most-wasted items and buy smaller quantities next month.',
    'Stocking up on frozen proteins can save €15–20 per month on average.',
    'Setting a weekly meal theme (e.g. pasta Tuesday) reduces decision fatigue.',
    'A pantry audit at the start of each month helps avoid duplicate purchases.',
  ],
};

export default function AnalyticsScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('week');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Toggle */}
        <View style={styles.toggleRow}>
          {(['week', 'month'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.toggleTab, period === p && styles.toggleTabActive]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleText, period === p && styles.toggleTextActive]}>
                {p === 'week' ? 'This Week' : 'This Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {STATS.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: stat.iconBg }]}>
                <Ionicons name={stat.icon} size={20} color={stat.iconColor} />
              </View>
              <Text style={styles.statValue}>{period === 'week' ? stat.week : stat.month}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsHeading}>
            Tips for next {period === 'week' ? 'week' : 'month'}
          </Text>

          {TIPS[period].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={styles.tipBullet}>
                <Ionicons name="bulb-outline" size={14} color={colors.green[600]} />
              </View>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Placeholder note */}
        <Text style={styles.placeholderNote}>
          Data shown is illustrative. Live figures will sync once your usage history builds up.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing['3xl'] },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  backButton: { padding: spacing.xs },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  headerSpacer: { width: 32 },

  // Period toggle
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.base,
    marginTop: spacing.lg,
    backgroundColor: colors.gray[100],
    borderRadius: radius.lg,
    padding: 4,
  },
  toggleTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  toggleTabActive: {
    backgroundColor: colors.green[600],
    ...shadows.sm,
  },
  toggleText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
  toggleTextActive: {
    color: colors.white,
    fontWeight: typography.weight.semibold,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.base,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  statCard: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[100],
    ...shadows.md,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },

  // Tips
  tipsSection: {
    marginHorizontal: spacing.base,
    marginTop: spacing.xl,
    backgroundColor: colors.green[50],
    borderRadius: radius.xl,
    padding: spacing.base,
    gap: spacing.md,
  },
  tipsHeading: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  tipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  tipBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.green[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  tipText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: typography.size.sm * 1.6,
  },

  // Placeholder note
  placeholderNote: {
    marginHorizontal: spacing.base,
    marginTop: spacing.lg,
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: typography.size.xs * 1.6,
  },
});
