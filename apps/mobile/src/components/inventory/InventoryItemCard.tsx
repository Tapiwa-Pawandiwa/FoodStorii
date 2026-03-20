import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { InventoryItem } from '@foodstorii/shared';
import { Card } from '../common/Card';
import { Chip } from '../common/Chip';
import { colors, spacing, typography } from '../../theme';

interface InventoryItemCardProps {
  item: InventoryItem;
}

function getDaysUntilExpiry(expiryDate: string): number {
  const diff = new Date(expiryDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getExpiryChip(expiryDate: string | null): { label: string; variant: 'red' | 'amber' | 'green' } | null {
  if (!expiryDate) return null;
  const days = getDaysUntilExpiry(expiryDate);
  if (days < 0) return { label: 'Expired', variant: 'red' };
  if (days === 0) return { label: 'Expires today', variant: 'red' };
  if (days <= 3) return { label: `${days}d left`, variant: 'amber' };
  if (days <= 7) return { label: `${days}d left`, variant: 'green' };
  return null;
}

function getConfidenceChip(confidence: InventoryItem['confidence']): { label: string; variant: 'gray' | 'amber' } | null {
  if (confidence === 'pending_confirmation') return { label: 'Needs review', variant: 'amber' };
  if (confidence === 'inferred_low_confidence') return { label: 'Inferred', variant: 'gray' };
  return null;
}

export function InventoryItemCard({ item }: InventoryItemCardProps) {
  const expiryChip = getExpiryChip(item.expiryEstimate);
  const confidenceChip = getConfidenceChip(item.confidence);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          {item.brand && <Text style={styles.brand}>{item.brand}</Text>}
        </View>
        {item.quantity != null && (
          <Text style={styles.quantity}>
            {item.quantity}{item.unit ? ` ${item.unit}` : ''}
          </Text>
        )}
      </View>

      {(expiryChip || confidenceChip || item.category) && (
        <View style={styles.chips}>
          {item.category && <Chip label={item.category} variant="gray" />}
          {expiryChip && <Chip label={expiryChip.label} variant={expiryChip.variant} />}
          {confidenceChip && <Chip label={confidenceChip.label} variant={confidenceChip.variant} />}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  nameRow: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  brand: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  quantity: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    flexShrink: 0,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
