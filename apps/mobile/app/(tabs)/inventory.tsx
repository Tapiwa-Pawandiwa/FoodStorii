import React, { useEffect, useState, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, Text, RefreshControl, ActivityIndicator,
  TouchableOpacity, Modal, TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { InventorySnapshot } from '@foodstorii/shared';
import { InventoryItemCard } from '../../src/components/inventory/InventoryItemCard';
import { InventorySnapshotHeader } from '../../src/components/inventory/InventorySnapshot';
import { getInventorySnapshot, addInventoryItems } from '../../src/services/api';
import { colors, spacing, typography, radius } from '../../src/theme';
import { usePostHog } from 'posthog-react-native';

const QUICK_ADD_ITEMS = [
  { label: 'Milk', category: 'Dairy' },
  { label: 'Eggs', category: 'Dairy' },
  { label: 'Bread', category: 'Carbs' },
  { label: 'Butter', category: 'Dairy' },
  { label: 'Rice', category: 'Carbs' },
  { label: 'Pasta', category: 'Carbs' },
  { label: 'Chicken', category: 'Proteins' },
  { label: 'Beef', category: 'Proteins' },
  { label: 'Salmon', category: 'Proteins' },
  { label: 'Onions', category: 'Vegetables' },
  { label: 'Tomatoes', category: 'Vegetables' },
  { label: 'Spinach', category: 'Vegetables' },
  { label: 'Carrots', category: 'Vegetables' },
  { label: 'Garlic', category: 'Vegetables' },
  { label: 'Potatoes', category: 'Carbs' },
  { label: 'Cheese', category: 'Dairy' },
  { label: 'Yoghurt', category: 'Dairy' },
  { label: 'Apples', category: 'Fruit' },
  { label: 'Bananas', category: 'Fruit' },
  { label: 'Olive Oil', category: 'Condiments' },
];

function AddItemModal({ visible, onClose, onAdded }: {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const posthog = usePostHog();
  const [customText, setCustomText] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  function toggleChip(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function handleAdd() {
    const custom = customText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const items = [
      ...Array.from(selected).map((name) => ({
        name,
        category: QUICK_ADD_ITEMS.find((i) => i.label === name)?.category,
      })),
      ...custom.map((name) => ({ name })),
    ];

    if (items.length === 0) return;
    setSaving(true);
    try {
      await addInventoryItems(items);
      posthog.capture('pantry_items_added', {
        item_count: items.length,
        quick_add_count: selected.size,
        custom_add_count: custom.length,
      });
      setSelected(new Set());
      setCustomText('');
      onAdded();
      onClose();
    } catch (err) {
      console.error('[Pantry] addItems failed:', err instanceof Error ? err.message : err);
    } finally {
      setSaving(false);
    }
  }

  const hasItems = selected.size > 0 || customText.trim().length > 0;

  // Group chips by category
  const categories = Array.from(new Set(QUICK_ADD_ITEMS.map((i) => i.category)));

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.handle} />
          <Text style={modal.title}>Add to pantry</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={modal.scroll}
            keyboardShouldPersistTaps="always"
            contentContainerStyle={modal.scrollContent}
          >
            {categories.map((cat) => (
              <View key={cat} style={modal.catGroup}>
                <Text style={modal.catLabel}>{cat}</Text>
                <View style={modal.chips}>
                  {QUICK_ADD_ITEMS.filter((i) => i.category === cat).map((item) => {
                    const active = selected.has(item.label);
                    return (
                      <TouchableOpacity
                        key={item.label}
                        onPress={() => toggleChip(item.label)}
                        activeOpacity={0.7}
                        style={[modal.chip, active && modal.chipActive]}
                      >
                        {active && <Ionicons name="checkmark" size={12} color={colors.green[600]} style={{ marginRight: 3 }} />}
                        <Text style={[modal.chipText, active && modal.chipTextActive]}>{item.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            <View style={modal.customSection}>
              <Text style={modal.catLabel}>Custom items</Text>
              <TextInput
                style={modal.input}
                value={customText}
                onChangeText={setCustomText}
                placeholder="e.g. Mango, Tahini, Sourdough…"
                placeholderTextColor={colors.text.tertiary}
                returnKeyType="done"
              />
            </View>
          </ScrollView>

          <View style={modal.footer}>
            <TouchableOpacity style={modal.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={modal.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modal.addBtn, (!hasItems || saving) && modal.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!hasItems || saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator size="small" color={colors.white} />
                : <Text style={modal.addBtnText}>Add {selected.size + (customText.trim() ? 1 : 0) || ''} items</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function InventoryScreen() {
  const [snapshot, setSnapshot] = useState<InventorySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getInventorySnapshot();
      setSnapshot(data);
      setError('');
    } catch (err) {
      setError('Could not load pantry right now.');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.green[600]} size="large" />
      </SafeAreaView>
    );
  }

  const items = snapshot?.items ?? [];
  const expiring = snapshot?.expiringWithin3Days ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Pantry</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <InventoryItemCard item={item} />}
          ListHeaderComponent={
            snapshot ? (
              <View>
                <InventorySnapshotHeader snapshot={snapshot} />
                {expiring.length > 0 && (
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Expiring soon</Text>
                  </View>
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="cube-outline" size={40} color={colors.gray[300]} />
              </View>
              <Text style={styles.emptyTitle}>Your pantry is empty</Text>
              <Text style={styles.emptySubtitle}>Tap the + button to add items, or tell Tina what you have.</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowAdd(true)} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={18} color={colors.green[600]} />
                <Text style={styles.emptyAddText}>Add pantry items</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green[600]} />
          }
        />
      )}

      <AddItemModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={() => setTimeout(load, 1500)} // slight delay so Tina finishes writing
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white, gap: spacing.md },
  pageHeader: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text.primary },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.green[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: spacing.base, paddingBottom: spacing['2xl'] },
  sectionHeader: { paddingTop: spacing.base, paddingBottom: spacing.sm },
  sectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  empty: { paddingTop: spacing['3xl'], alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.gray[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.text.primary },
  emptySubtitle: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.size.base * 1.6,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.green[600],
  },
  emptyAddText: { fontSize: typography.size.sm, color: colors.green[600], fontWeight: typography.weight.semibold },
  retryBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.base },
  retryText: { fontSize: typography.size.sm, color: colors.green[600] },
  errorText: { color: colors.red[500], fontSize: typography.size.base },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray[200],
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  scroll: { paddingHorizontal: spacing.xl },
  scrollContent: { paddingBottom: spacing['2xl'] },
  catGroup: { marginBottom: spacing.base },
  catLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  chipActive: { borderColor: colors.green[600], backgroundColor: colors.green[50] },
  chipText: { fontSize: typography.size.sm, color: colors.text.secondary, fontWeight: typography.weight.medium },
  chipTextActive: { color: colors.green[700] },
  customSection: { marginBottom: spacing.xl },
  input: {
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: typography.size.base,
    color: colors.text.primary,
    backgroundColor: colors.white,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.xl,
    paddingBottom: spacing['2xl'],
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: typography.size.base, color: colors.text.secondary, fontWeight: typography.weight.medium },
  addBtn: {
    flex: 2,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.green[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: colors.white },
});
