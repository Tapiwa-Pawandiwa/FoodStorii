import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { RecipeSuggestion } from '@foodstorii/shared';
import { Chip } from '../common/Chip';
import { colors, spacing, radius, typography, shadows } from '../../theme';

interface RecipeCardProps {
  suggestion: RecipeSuggestion;
  onPress?: () => void;
}

export function RecipeCard({ suggestion, onPress }: RecipeCardProps) {
  const { recipe, canMakeNow, missingIngredients, availableIngredients, fitReason } = suggestion;
  const totalTime = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.card, shadows.sm]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>{recipe.title}</Text>
        </View>
        <View style={styles.statusBadge}>
          {canMakeNow ? (
            <View style={styles.canMake}>
              <Text style={styles.canMakeText}>✓ Ready</Text>
            </View>
          ) : (
            <View style={styles.almostMake}>
              <Text style={styles.almostMakeText}>+{missingIngredients.length} missing</Text>
            </View>
          )}
        </View>
      </View>

      {recipe.description && (
        <Text style={styles.description} numberOfLines={2}>{recipe.description}</Text>
      )}

      {fitReason && (
        <Text style={styles.fitReason}>{fitReason}</Text>
      )}

      <View style={styles.meta}>
        {totalTime > 0 && (
          <Chip label={`${totalTime} min`} variant="gray" />
        )}
        {recipe.tags.slice(0, 3).map((tag) => (
          <Chip key={tag} label={tag.replace(/_/g, ' ')} variant="green" />
        ))}
      </View>

      {missingIngredients.length > 0 && (
        <View style={styles.missing}>
          <Text style={styles.missingLabel}>Still need: </Text>
          <Text style={styles.missingItems} numberOfLines={1}>
            {missingIngredients.map((i) => i.name).join(', ')}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {availableIngredients.length} of {availableIngredients.length + missingIngredients.length} ingredients on hand
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[100],
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titleRow: {
    flex: 1,
  },
  title: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    lineHeight: typography.size.md * 1.3,
  },
  statusBadge: {
    flexShrink: 0,
  },
  canMake: {
    backgroundColor: colors.green[100],
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  canMakeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.green[700],
  },
  almostMake: {
    backgroundColor: colors.amber[50],
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  almostMakeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.amber[600],
  },
  description: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: typography.size.sm * 1.5,
  },
  fitReason: {
    fontSize: typography.size.sm,
    color: colors.green[600],
    fontWeight: typography.weight.medium,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  missing: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  missingLabel: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  missingItems: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    flex: 1,
  },
  footer: {
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  footerText: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
  },
});
