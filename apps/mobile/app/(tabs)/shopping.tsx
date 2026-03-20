import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabaseClient } from '../../src/services/supabaseClient';
import { useAuthStore } from '../../src/stores/auth.store';
import { colors, spacing, radius, typography } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingListItemStatus } from '@foodstorii/shared';

interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  note: string | null;
  status: ShoppingListItemStatus;
}

interface ShoppingList {
  id: string;
  title: string;
  status: string;
  items: ShoppingListItem[];
  createdAt: string;
}

export default function ShoppingScreen() {
  const { householdId } = useAuthStore();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!householdId) return;
    try {
      const { data, error: dbError } = await supabaseClient
        .from('shopping_lists')
        .select('*, shopping_list_items(*)')
        .eq('household_id', householdId)
        .in('status', ['draft', 'active'])
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      const mapped: ShoppingList[] = (data ?? []).map((row) => ({
        id: row.id as string,
        title: row.title as string,
        status: row.status as string,
        items: ((row.shopping_list_items as ShoppingListItem[]) ?? []).sort((a, b) =>
          (a.category ?? '').localeCompare(b.category ?? ''),
        ),
        createdAt: row.created_at as string,
      }));

      setLists(mapped);
      setError('');
    } catch {
      setError('Could not load shopping lists right now.');
    }
  }, [householdId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const toggleItem = useCallback(async (listId: string, item: ShoppingListItem) => {
    const newStatus = item.status === ShoppingListItemStatus.checked
      ? ShoppingListItemStatus.pending
      : ShoppingListItemStatus.checked;

    setLists((prev) =>
      prev.map((list) =>
        list.id !== listId
          ? list
          : { ...list, items: list.items.map((i) => i.id === item.id ? { ...i, status: newStatus } : i) },
      ),
    );

    await supabaseClient
      .from('shopping_list_items')
      .update({ status: newStatus })
      .eq('id', item.id);
  }, []);

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
        <Text style={styles.pageTitle}>Shopping</Text>
        <Text style={styles.pageSubtitle}>Ask Tina to build or update your list</Text>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => item.id}
          renderItem={({ item: list }) => (
            <ShoppingListView list={list} onToggle={(item) => toggleItem(list.id, item)} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No shopping lists yet</Text>
              <Text style={styles.emptySubtitle}>Ask Tina to build a shopping list based on a recipe or what you need.</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green[600]} />}
        />
      )}
    </SafeAreaView>
  );
}

function ShoppingListView({ list, onToggle }: { list: ShoppingList; onToggle: (item: ShoppingListItem) => void }) {
  const pendingCount = list.items.filter((i) => i.status === ShoppingListItemStatus.pending).length;
  const totalCount = list.items.length;

  // Group by category
  const grouped = list.items.reduce<Record<string, ShoppingListItem[]>>((acc, item) => {
    const cat = item.category ?? 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <View style={styles.listCard}>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>{list.title}</Text>
        <Text style={styles.listMeta}>{pendingCount} of {totalCount} remaining</Text>
      </View>

      {Object.entries(grouped).map(([category, items]) => (
        <View key={category} style={styles.categoryGroup}>
          <Text style={styles.categoryLabel}>{category}</Text>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.itemRow}
              onPress={() => onToggle(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, item.status === ShoppingListItemStatus.checked && styles.checkboxChecked]}>
                {item.status === ShoppingListItemStatus.checked && (
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                )}
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, item.status === ShoppingListItemStatus.checked && styles.itemNameChecked]}>
                  {item.name}
                </Text>
                {(item.quantity != null || item.note) && (
                  <Text style={styles.itemMeta}>
                    {item.quantity != null ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : ''}
                    {item.quantity != null && item.note ? ' · ' : ''}
                    {item.note ?? ''}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
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
  listContent: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  listCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[100],
    marginBottom: spacing.base,
    overflow: 'hidden',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    backgroundColor: colors.gray[50],
  },
  listTitle: { fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: colors.text.primary },
  listMeta: { fontSize: typography.size.xs, color: colors.text.tertiary },
  categoryGroup: { paddingHorizontal: spacing.base },
  categoryLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[50],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: colors.green[600],
    borderColor: colors.green[600],
  },
  itemInfo: { flex: 1, gap: 1 },
  itemName: { fontSize: typography.size.base, color: colors.text.primary },
  itemNameChecked: { color: colors.text.tertiary, textDecorationLine: 'line-through' },
  itemMeta: { fontSize: typography.size.sm, color: colors.text.tertiary },
  empty: { paddingTop: spacing['3xl'], alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.text.primary },
  emptySubtitle: { fontSize: typography.size.base, color: colors.text.secondary, textAlign: 'center', lineHeight: typography.size.base * 1.6, paddingHorizontal: spacing.lg },
  errorText: { color: colors.red[500], fontSize: typography.size.base },
});
