import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RecipeSuggestion } from '@foodstorii/shared';
import { RecipeCard } from '../../src/components/recipe/RecipeCard';
import * as api from '../../src/services/api';
import { useChatStore } from '../../src/stores/chat.store';
import { useAuthStore } from '../../src/stores/auth.store';
import { ConversationMode } from '@foodstorii/shared';
import { colors, spacing, typography } from '../../src/theme';

export default function RecipesScreen() {
  const { householdId, userId } = useAuthStore();
  const { conversationId, addUserMessage, addAssistantMessage, setLoading: setChatLoading, setConversationId, setMode } = useChatStore();
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!householdId || !userId) return;
    try {
      // Ask Tina to find recipes — gets inventory check + matching
      const response = await api.sendMessage({
        conversationId: conversationId ?? undefined,
        householdId,
        userId,
        message: 'What can I cook based on what I have?',
        mode: ConversationMode.recipe,
      });

      const recipeAction = response.actions?.find((a) => a.type === 'recipe_suggested');
      if (recipeAction) {
        setSuggestions((recipeAction.payload.suggestions as RecipeSuggestion[]) ?? []);
      }
      setError('');
    } catch {
      setError('Could not load recipes right now.');
    }
  }, [householdId, userId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleAddToList = async (suggestion: RecipeSuggestion) => {
    if (!householdId || !userId || suggestion.missingIngredients.length === 0) return;
    const missing = suggestion.missingIngredients.map((i) => i.name).join(', ');
    const message = `Add the missing ingredients for ${suggestion.recipe.title} to my shopping list: ${missing}`;
    addUserMessage(message);
    setChatLoading(true);
    try {
      const response = await api.sendMessage({
        conversationId: conversationId ?? undefined,
        householdId,
        userId,
        message,
        mode: ConversationMode.shopping,
      });
      setConversationId(response.conversationId);
      setMode(response.mode);
      addAssistantMessage(response.messageId, response.reply, response.actions, response.suggestedQuickReplies);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.green[600]} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Recipes</Text>
        <Text style={styles.pageSubtitle}>Based on what's in your pantry</Text>
      </View>

      <FlatList
        data={suggestions}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View>
            <RecipeCard suggestion={item} />
            {item.missingIngredients.length > 0 && (
              <TouchableOpacity
                style={styles.addMissingButton}
                onPress={() => handleAddToList(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.addMissingText}>Add {item.missingIngredients.length} missing items to list</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={
          !error ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No recipes yet</Text>
              <Text style={styles.emptySubtitle}>Add some items to your pantry and Tina will find recipes you can make.</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green[600]} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white },
  pageHeader: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    gap: 2,
  },
  pageTitle: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text.primary },
  pageSubtitle: { fontSize: typography.size.sm, color: colors.text.tertiary },
  list: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  empty: { paddingTop: spacing['3xl'], alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.text.primary },
  emptySubtitle: { fontSize: typography.size.base, color: colors.text.secondary, textAlign: 'center', lineHeight: typography.size.base * 1.6, paddingHorizontal: spacing.lg },
  errorText: { color: colors.red[500], fontSize: typography.size.base },
  addMissingButton: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.green[50],
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderWidth: 1,
    borderColor: colors.green[200],
    alignItems: 'center',
  },
  addMissingText: { fontSize: typography.size.sm, color: colors.green[700], fontWeight: typography.weight.medium },
});
