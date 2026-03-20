import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, radius, typography } from '../../theme';

type ChipVariant = 'green' | 'amber' | 'red' | 'gray' | 'blue';

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  style?: ViewStyle;
}

const variantStyles: Record<ChipVariant, { bg: string; text: string }> = {
  green: { bg: colors.green[100], text: colors.green[700] },
  amber: { bg: colors.amber[100], text: colors.amber[600] },
  red: { bg: colors.red[100], text: colors.red[600] },
  gray: { bg: colors.gray[100], text: colors.gray[600] },
  blue: { bg: '#eff6ff', text: '#2563eb' },
};

export function Chip({ label, variant = 'gray', style }: ChipProps) {
  const v = variantStyles[variant];
  return (
    <View style={[styles.chip, { backgroundColor: v.bg }, style]}>
      <Text style={[styles.label, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.2,
  },
});
