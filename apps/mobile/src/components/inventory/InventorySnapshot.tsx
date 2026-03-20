import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { InventorySnapshot as Snapshot } from '@foodstorii/shared';
import { colors, spacing, radius, typography } from '../../theme';

interface InventorySnapshotHeaderProps {
  snapshot: Snapshot;
}

export function InventorySnapshotHeader({ snapshot }: InventorySnapshotHeaderProps) {
  const { totalItems, expiringWithin3Days, lowConfidenceItems } = snapshot;

  return (
    <View style={styles.container}>
      <View style={styles.statRow}>
        <StatBox value={totalItems} label="Items" color={colors.green[600]} />
        <StatBox
          value={expiringWithin3Days.length}
          label="Expiring soon"
          color={expiringWithin3Days.length > 0 ? colors.amber[500] : colors.gray[400]}
        />
        <StatBox
          value={lowConfidenceItems.length}
          label="Need review"
          color={lowConfidenceItems.length > 0 ? colors.gray[500] : colors.gray[300]}
        />
      </View>
    </View>
  );
}

function StatBox({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.gray[50],
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
  },
  statLabel: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
  },
});
