import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import type { RecipeSuggestion } from '@foodstorii/shared';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadows } from '../../theme';

interface RecipeCardProps {
  suggestion: RecipeSuggestion;
  onPress?: () => void;
}

export function RecipeCard({ suggestion, onPress }: RecipeCardProps) {
  const { title, imageUrl, readyInMinutes, nutrition, canMakeNow, missingIngredients, cuisineType } = suggestion;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={[styles.card, shadows.md]}>
      {/* Food image */}
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="restaurant-outline" size={28} color={colors.gray[300]} />
        </View>
      )}

      {/* Ready badge — floats over image */}
      <View style={[styles.badge, canMakeNow ? styles.badgeReady : styles.badgeMissing]}>
        <Text style={[styles.badgeText, canMakeNow ? styles.badgeTextReady : styles.badgeTextMissing]}>
          {canMakeNow ? '✓ Ready' : `+${missingIngredients.length} missing`}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <View style={styles.meta}>
          {readyInMinutes != null && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={colors.text.tertiary} />
              <Text style={styles.metaText}>{readyInMinutes}m</Text>
            </View>
          )}
          {nutrition?.calories != null && (
            <View style={styles.metaItem}>
              <Ionicons name="flame-outline" size={12} color={colors.text.tertiary} />
              <Text style={styles.metaText}>{nutrition.calories} kcal</Text>
            </View>
          )}
          {cuisineType && !readyInMinutes && (
            <View style={styles.metaItem}>
              <Ionicons name="globe-outline" size={12} color={colors.text.tertiary} />
              <Text style={styles.metaText}>{cuisineType}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const CARD_WIDTH = 185;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  image: {
    width: CARD_WIDTH,
    height: 130,
    backgroundColor: colors.gray[100],
  },
  imagePlaceholder: {
    width: CARD_WIDTH,
    height: 130,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  badgeReady: { backgroundColor: colors.brand.green },
  badgeMissing: { backgroundColor: 'rgba(0,0,0,0.55)' },
  badgeText: { fontSize: 10, fontWeight: typography.weight.bold },
  badgeTextReady: { color: colors.white },
  badgeTextMissing: { color: colors.white },
  content: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    lineHeight: typography.size.sm * 1.35,
  },
  meta: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: colors.text.tertiary },
});
