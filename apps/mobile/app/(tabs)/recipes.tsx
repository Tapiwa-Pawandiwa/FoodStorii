import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, Modal, ScrollView, Image,
  KeyboardAvoidingView, Platform, Keyboard, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { RecipeSuggestion } from '@foodstorii/shared';
import { RecipeCard } from '../../src/components/recipe/RecipeCard';
import * as api from '../../src/services/api';
import { colors, spacing, typography, radius, shadows, TAB_BAR_BOTTOM_PADDING } from '../../src/theme';
import { usePostHog } from 'posthog-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 300;

// ── Recipe detail modal ───────────────────────────────────────────────────────

function RecipeDetailModal({
  recipe,
  visible,
  onClose,
  onAddMissing,
  addingToList,
}: {
  recipe: RecipeSuggestion | null;
  visible: boolean;
  onClose: () => void;
  onAddMissing: (recipe: RecipeSuggestion) => void;
  addingToList: boolean;
}) {
  const insets = useSafeAreaInsets();
  if (!recipe) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={D.root}>
        <ScrollView
          style={D.scroll}
          showsVerticalScrollIndicator={false}
          bounces
          contentContainerStyle={{ paddingBottom: recipe.missingIngredients.length > 0 ? 100 : 40 }}
        >
          {/* Hero */}
          <View style={D.heroWrap}>
            {recipe.imageUrl ? (
              <Image source={{ uri: recipe.imageUrl }} style={D.hero} resizeMode="cover" />
            ) : (
              <View style={[D.hero, D.heroPlaceholder]}>
                <Ionicons name="restaurant-outline" size={52} color={colors.gray[300]} />
              </View>
            )}
            <View style={D.heroScrim} />
          </View>

          {/* Close button */}
          <TouchableOpacity
            style={[D.closeBtn, { top: insets.top + 12 }]}
            onPress={onClose}
            activeOpacity={0.8}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-down" size={22} color={colors.white} />
          </TouchableOpacity>

          {/* Content card */}
          <View style={D.contentCard}>
            <Text style={D.title}>{recipe.title}</Text>

            {/* Meta chips */}
            <View style={D.chips}>
              {recipe.readyInMinutes != null && (
                <View style={D.chip}>
                  <Ionicons name="time-outline" size={13} color={colors.brand.orange} />
                  <Text style={D.chipText}>{recipe.readyInMinutes} min</Text>
                </View>
              )}
              {recipe.servings != null && (
                <View style={D.chip}>
                  <Ionicons name="people-outline" size={13} color={colors.brand.orange} />
                  <Text style={D.chipText}>{recipe.servings} servings</Text>
                </View>
              )}
              {recipe.cuisineType && (
                <View style={D.chip}>
                  <Ionicons name="globe-outline" size={13} color={colors.brand.orange} />
                  <Text style={D.chipText}>{recipe.cuisineType}</Text>
                </View>
              )}
              {recipe.canMakeNow && (
                <View style={[D.chip, D.chipReady]}>
                  <Ionicons name="checkmark-circle-outline" size={13} color={colors.brand.green} />
                  <Text style={[D.chipText, { color: colors.brand.green }]}>Can make now</Text>
                </View>
              )}
            </View>

            {/* Nutrition grid */}
            {recipe.nutrition && (
              <View style={D.nutritionGrid}>
                {recipe.nutrition.calories != null && (
                  <View style={D.nutritionBox}>
                    <Text style={D.nutritionVal}>{recipe.nutrition.calories}</Text>
                    <Text style={D.nutritionLabel}>calories</Text>
                  </View>
                )}
                {recipe.nutrition.protein && (
                  <View style={D.nutritionBox}>
                    <Text style={D.nutritionVal}>{recipe.nutrition.protein}</Text>
                    <Text style={D.nutritionLabel}>protein</Text>
                  </View>
                )}
                {recipe.nutrition.carbs && (
                  <View style={D.nutritionBox}>
                    <Text style={D.nutritionVal}>{recipe.nutrition.carbs}</Text>
                    <Text style={D.nutritionLabel}>carbs</Text>
                  </View>
                )}
                {recipe.nutrition.fat && (
                  <View style={D.nutritionBox}>
                    <Text style={D.nutritionVal}>{recipe.nutrition.fat}</Text>
                    <Text style={D.nutritionLabel}>fat</Text>
                  </View>
                )}
              </View>
            )}

            <View style={D.divider} />

            {/* Ingredients */}
            {recipe.ingredients && recipe.ingredients.length > 0 && (
              <View style={D.section}>
                <Text style={D.sectionTitle}>Ingredients</Text>
                {recipe.ingredients.map((ing, idx) => {
                  const have = recipe.availableIngredients.some(
                    (a) => a.toLowerCase().includes(ing.name.toLowerCase()) ||
                           ing.name.toLowerCase().includes(a.toLowerCase()),
                  );
                  return (
                    <View key={idx} style={D.ingRow}>
                      <View style={[D.ingDot, have ? D.ingDotHave : D.ingDotMiss]} />
                      <Text style={D.ingText}>{ing.original}</Text>
                      {have && <Ionicons name="checkmark" size={13} color={colors.brand.green} />}
                    </View>
                  );
                })}
                <View style={D.legend}>
                  <View style={D.legendItem}>
                    <View style={[D.ingDot, D.ingDotHave]} />
                    <Text style={D.legendText}>In your pantry</Text>
                  </View>
                  <View style={D.legendItem}>
                    <View style={[D.ingDot, D.ingDotMiss]} />
                    <Text style={D.legendText}>Need to buy</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={D.divider} />

            {/* Instructions */}
            {recipe.instructions && recipe.instructions.length > 0 && (
              <View style={D.section}>
                <Text style={D.sectionTitle}>Instructions</Text>
                {recipe.instructions.map((step) => (
                  <View key={step.number} style={D.stepRow}>
                    <View style={D.stepCircle}>
                      <Text style={D.stepNum}>{step.number}</Text>
                    </View>
                    <Text style={D.stepText}>{step.step}</Text>
                  </View>
                ))}
              </View>
            )}

            {(!recipe.instructions || recipe.instructions.length === 0) && recipe.summary && (
              <View style={D.section}>
                <Text style={D.sectionTitle}>About</Text>
                <Text style={D.summaryText}>{recipe.summary}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Sticky CTA */}
        {recipe.missingIngredients.length > 0 && (
          <View style={[D.stickyFooter, { paddingBottom: insets.bottom + spacing.md }]}>
            <TouchableOpacity
              style={[D.ctaBtn, addingToList && { opacity: 0.6 }]}
              onPress={() => onAddMissing(recipe)}
              disabled={addingToList}
              activeOpacity={0.85}
            >
              {addingToList ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="cart-outline" size={20} color={colors.white} />
                  <Text style={D.ctaText}>
                    Add {recipe.missingIngredients.length} missing item{recipe.missingIngredients.length > 1 ? 's' : ''} to list
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

type Mode = 'pantry' | 'search';

export default function RecipesScreen() {
  const posthog = usePostHog();
  const [mode, setMode] = useState<Mode>('pantry');
  const [pantryResults, setPantryResults] = useState<RecipeSuggestion[]>([]);
  const [searchResults, setSearchResults] = useState<RecipeSuggestion[]>([]);
  const [pantryEmpty, setPantryEmpty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeSuggestion | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [addingToList, setAddingToList] = useState(false);
  const [error, setError] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPantryRecipes = useCallback(async () => {
    try {
      setError('');
      const result = await api.searchRecipesByPantry({ maxMissing: 4, limit: 12 });
      setPantryEmpty(result.pantryEmpty);
      if (result.suggestions.length > 0) {
        setPantryResults(result.suggestions);
      } else {
        // Pantry empty or no matches — load popular recipes to always show something
        const popular = await api.searchRecipes('quick healthy easy dinner', { limit: 12 });
        setPantryResults(popular.suggestions);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load recipes.');
    }
  }, []);

  useEffect(() => {
    loadPantryRecipes().finally(() => setLoading(false));
  }, []);

  async function runSearch(q: string) {
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    setError('');
    try {
      const result = await api.searchRecipes(q.trim(), { limit: 12 });
      setSearchResults(result.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      setSearching(false);
    }
  }

  function handleSearchChange(text: string) {
    setSearchQuery(text);
    if (text.trim().length === 0) { setMode('pantry'); setSearchResults([]); return; }
    setMode('search');
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => runSearch(text), 500);
  }

  async function handleCardPress(suggestion: RecipeSuggestion) {
    setDetailLoading(true);
    posthog.capture('recipe_viewed', {
      recipe_id: suggestion.externalId,
      recipe_title: suggestion.title,
      missing_count: suggestion.missingCount,
      can_make_now: suggestion.canMakeNow ?? false,
      source: mode,
    });
    try {
      const detail = await api.getRecipeDetail(suggestion.externalId);
      setSelectedRecipe({
        ...suggestion,
        ingredients: detail.ingredients,
        instructions: detail.instructions,
        summary: detail.summary ?? suggestion.summary,
        nutrition: detail.nutrition ?? suggestion.nutrition,
      });
    } catch {
      setSelectedRecipe(suggestion);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleAddMissing(recipe: RecipeSuggestion) {
    if (!recipe.missingIngredients.length) return;
    setAddingToList(true);
    try {
      const missing = recipe.missingIngredients.map((i) => i.name).join(', ');
      await api.sendMessage({
        message: `Add the missing ingredients for ${recipe.title} to my shopping list: ${missing}`,
        mode: 'shopping',
      });
      posthog.capture('recipe_missing_ingredients_added', {
        recipe_id: recipe.externalId,
        recipe_title: recipe.title,
        missing_count: recipe.missingIngredients.length,
      });
    } catch { /* silent */ } finally {
      setAddingToList(false);
    }
  }

  const displayedResults = mode === 'pantry' ? pantryResults : searchResults;

  if (loading) {
    return (
      <SafeAreaView style={S.safe} edges={['top']}>
        <View style={S.center}>
          <ActivityIndicator color={colors.brand.orange} size="large" />
          <Text style={S.loadingText}>Finding recipes…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Header */}
        <View style={S.header}>
          <View style={S.headerTop}>
            <Text style={S.pageTitle}>Recipes</Text>
            {detailLoading && <ActivityIndicator size="small" color={colors.brand.orange} />}
          </View>

          {/* Search */}
          <View style={S.searchBar}>
            <Ionicons name="search-outline" size={17} color={colors.text.tertiary} />
            <TextInput
              style={S.searchInput}
              placeholder="Search any recipe…"
              placeholderTextColor={colors.text.tertiary}
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              onSubmitEditing={() => { if (searchQuery.trim().length >= 2) runSearch(searchQuery); }}
              clearButtonMode="while-editing"
              autoCorrect={false}
            />
            {searching && <ActivityIndicator size="small" color={colors.brand.orange} />}
          </View>

          {/* Mode pills */}
          <View style={S.modeRow}>
            <TouchableOpacity
              style={[S.modePill, mode === 'pantry' && S.modePillActive]}
              onPress={() => { setMode('pantry'); setSearchQuery(''); Keyboard.dismiss(); }}
              activeOpacity={0.7}
            >
              <Ionicons name="basket-outline" size={13} color={mode === 'pantry' ? colors.brand.orange : colors.text.tertiary} />
              <Text style={[S.modePillText, mode === 'pantry' && S.modePillTextActive]}>From pantry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.modePill, mode === 'search' && S.modePillActive]}
              onPress={() => setMode('search')}
              activeOpacity={0.7}
            >
              <Ionicons name="search-outline" size={13} color={mode === 'search' ? colors.brand.orange : colors.text.tertiary} />
              <Text style={[S.modePillText, mode === 'search' && S.modePillTextActive]}>Search</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cards */}
        {displayedResults.length > 0 ? (
          <View style={S.cardsArea}>
            <Text style={S.sectionLabel}>
              {mode === 'pantry'
                ? pantryEmpty ? 'Popular recipes' : 'Based on your pantry'
                : `Results for "${searchQuery}"`}
            </Text>
            <FlatList
              data={displayedResults}
              keyExtractor={(item) => item.externalId}
              renderItem={({ item }) => (
                <RecipeCard suggestion={item} onPress={() => handleCardPress(item)} />
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={S.cardsList}
              ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        ) : (
          <View style={S.empty}>
            {error ? (
              <>
                <Ionicons name="alert-circle-outline" size={40} color={colors.red[400]} />
                <Text style={S.emptyTitle}>Something went wrong</Text>
                <Text style={S.emptySub}>{error}</Text>
                <TouchableOpacity
                  style={S.retryBtn}
                  onPress={() => mode === 'pantry' ? loadPantryRecipes() : runSearch(searchQuery)}
                  activeOpacity={0.8}
                >
                  <Text style={S.retryText}>Try again</Text>
                </TouchableOpacity>
              </>
            ) : mode === 'search' && searchQuery.length === 0 ? (
              <>
                <View style={S.emptyIconCircle}>
                  <Ionicons name="search-outline" size={28} color={colors.brand.blue} />
                </View>
                <Text style={S.emptyTitle}>Search for a recipe</Text>
                <Text style={S.emptySub}>Try "pasta", "chicken stir fry", or "quick dinner".</Text>
              </>
            ) : mode === 'search' && !searching ? (
              <>
                <View style={S.emptyIconCircle}>
                  <Ionicons name="restaurant-outline" size={28} color={colors.brand.blue} />
                </View>
                <Text style={S.emptyTitle}>No results for "{searchQuery}"</Text>
                <Text style={S.emptySub}>Try a different search term.</Text>
              </>
            ) : null}
          </View>
        )}
      </KeyboardAvoidingView>

      <RecipeDetailModal
        recipe={selectedRecipe}
        visible={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onAddMissing={handleAddMissing}
        addingToList={addingToList}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { fontSize: typography.size.sm, color: colors.text.secondary },

  header: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  searchInput: { flex: 1, fontSize: typography.size.base, color: colors.text.primary },

  modeRow: { flexDirection: 'row', gap: spacing.sm },
  modePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  modePillActive: { borderColor: colors.brand.orange, backgroundColor: colors.brand.orange + '12' },
  modePillText: { fontSize: typography.size.sm, color: colors.text.tertiary, fontWeight: typography.weight.medium },
  modePillTextActive: { color: colors.brand.orange },

  cardsArea: { flex: 1, paddingTop: spacing.base },
  sectionLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  cardsList: { paddingHorizontal: spacing.base, paddingBottom: TAB_BAR_BOTTOM_PADDING },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingHorizontal: spacing.xl,
  },
  emptyIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.brand.blue + '25',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.size.lg, fontWeight: typography.weight.bold,
    color: colors.text.primary, textAlign: 'center',
  },
  emptySub: {
    fontSize: typography.size.sm, color: colors.text.secondary,
    textAlign: 'center', lineHeight: typography.size.sm * 1.6,
  },
  retryBtn: {
    marginTop: spacing.md, backgroundColor: colors.brand.orange,
    borderRadius: radius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    height: 48, alignItems: 'center', justifyContent: 'center',
  },
  retryText: { color: colors.white, fontWeight: typography.weight.bold, fontSize: typography.size.base },
});

// ── Detail modal styles ───────────────────────────────────────────────────────

const D = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  scroll: { flex: 1 },

  heroWrap: { position: 'relative' },
  hero: { width: SCREEN_WIDTH, height: HERO_HEIGHT },
  heroPlaceholder: { backgroundColor: colors.gray[100], alignItems: 'center', justifyContent: 'center' },
  heroScrim: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 90,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  closeBtn: {
    position: 'absolute', left: spacing.base,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },

  contentCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.base,
  },

  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    lineHeight: typography.size['2xl'] * 1.2,
    marginBottom: spacing.md,
  },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.base },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.bg, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.gray[100],
  },
  chipReady: { backgroundColor: colors.brand.green + '12', borderColor: colors.brand.green + '30' },
  chipText: { fontSize: typography.size.sm, color: colors.text.secondary, fontWeight: typography.weight.medium },

  nutritionGrid: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.gray[100],
    marginBottom: spacing.base,
    overflow: 'hidden',
  },
  nutritionBox: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.md,
    borderRightWidth: 1, borderRightColor: colors.gray[100],
  },
  nutritionVal: { fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.text.primary },
  nutritionLabel: { fontSize: 10, color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },

  divider: { height: 1, backgroundColor: colors.gray[100], marginVertical: spacing.base },

  section: { marginBottom: spacing.base, gap: spacing.sm },
  sectionTitle: {
    fontSize: typography.size.base, fontWeight: typography.weight.bold,
    color: colors.text.primary, marginBottom: spacing.xs,
  },

  ingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 5 },
  ingDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  ingDotHave: { backgroundColor: colors.brand.green },
  ingDotMiss: { backgroundColor: colors.gray[300] },
  ingText: { flex: 1, fontSize: typography.size.sm, color: colors.text.primary, lineHeight: typography.size.sm * 1.4 },

  legend: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: typography.size.xs, color: colors.text.tertiary },

  stepRow: { flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.md, alignItems: 'flex-start' },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.brand.orange,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  stepNum: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.white },
  stepText: { flex: 1, fontSize: typography.size.sm, color: colors.text.primary, lineHeight: typography.size.sm * 1.6 },

  summaryText: { fontSize: typography.size.sm, color: colors.text.secondary, lineHeight: typography.size.sm * 1.6 },

  stickyFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.gray[100],
    paddingHorizontal: spacing.base, paddingTop: spacing.md,
    ...shadows.lg,
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.brand.orange,
    borderRadius: radius.xl, height: 54,
    ...shadows.md,
  },
  ctaText: { fontSize: typography.size.base, fontWeight: typography.weight.bold, color: colors.white },
});
