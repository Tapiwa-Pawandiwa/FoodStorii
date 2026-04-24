import React, { useEffect, useState, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, Text, TouchableOpacity, RefreshControl,
  ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabaseClient } from '../../src/services/supabaseClient';
import { useAuthStore } from '../../src/stores/auth.store';
import { colors, spacing, radius, typography, TAB_BAR_BOTTOM_PADDING } from '../../src/theme';
import { ShoppingListItemStatus } from '@foodstorii/shared';
import { usePostHog } from 'posthog-react-native';

const QUICK_ADD_CHIPS = [
  'Milk', 'Eggs', 'Bread', 'Butter', 'Cheese', 'Chicken', 'Pasta',
  'Rice', 'Onions', 'Tomatoes', 'Apples', 'Bananas', 'Coffee', 'Salt',
];

const CATEGORIES = ['Produce', 'Dairy & Eggs', 'Meat', 'Bakery', 'Pantry', 'Frozen', 'Snacks', 'Drinks', 'Other'];

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

// ---- Add item modal --------------------------------------------------------

function AddItemModal({ listId, visible, onClose, onAdded }: {
  listId: string;
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const posthog = usePostHog();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState('Other');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await supabaseClient.from('shopping_list_items').insert({
        shopping_list_id: listId,
        name: name.trim(),
        quantity: quantity ? parseFloat(quantity) : null,
        unit: unit.trim() || null,
        category,
        status: ShoppingListItemStatus.pending,
      });
      posthog.capture('shopping_item_added', {
        item_name: name.trim(),
        category,
        has_quantity: !!quantity,
        source: 'manual',
      });
      setName(''); setQuantity(''); setUnit('');
      onAdded();
      onClose();
    } catch (err) {
      console.error('[Shopping] addItem failed:', err);
    } finally {
      setSaving(false);
    }
  }

  async function quickAdd(item: string) {
    await supabaseClient.from('shopping_list_items').insert({
      shopping_list_id: listId,
      name: item,
      status: ShoppingListItemStatus.pending,
    });
    posthog.capture('shopping_item_added', { item_name: item, source: 'quick_add' });
    onAdded();
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.handle} />
          <Text style={modal.title}>Add item</Text>

          <Text style={modal.sectionLabel}>Quick add</Text>
          <View style={modal.chipRow}>
            {QUICK_ADD_CHIPS.map((chip) => (
              <TouchableOpacity key={chip} style={modal.chip} onPress={() => quickAdd(chip)} activeOpacity={0.7}>
                <Text style={modal.chipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={modal.sectionLabel}>Custom item</Text>
          <TextInput
            style={modal.input}
            value={name}
            onChangeText={setName}
            placeholder="Item name"
            placeholderTextColor={colors.text.tertiary}
            autoFocus
          />
          <View style={modal.row}>
            <TextInput
              style={[modal.input, modal.inputHalf]}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="Qty"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="numeric"
            />
            <TextInput
              style={[modal.input, modal.inputHalf]}
              value={unit}
              onChangeText={setUnit}
              placeholder="Unit (kg, L…)"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
          <Text style={modal.sectionLabel}>Category</Text>
          <View style={modal.chipRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[modal.chip, category === cat && modal.chipActive]}
                onPress={() => setCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[modal.chipText, category === cat && modal.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={modal.footer}>
            <TouchableOpacity style={modal.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={modal.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modal.addBtn, (!name.trim() || saving) && modal.addBtnDisabled]}
              onPress={save}
              disabled={!name.trim() || saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator size="small" color={colors.white} />
                : <Text style={modal.addBtnText}>Add</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---- New list modal --------------------------------------------------------

function NewListModal({ householdId, visible, onClose, onCreated }: {
  householdId: string;
  visible: boolean;
  onClose: () => void;
  onCreated: (listId: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const { data } = await supabaseClient
        .from('shopping_lists')
        .insert({ household_id: householdId, title: title.trim(), status: 'active' })
        .select('id')
        .single();
      setTitle('');
      onCreated(data?.id as string);
      onClose();
    } catch {
      // silently fail — list query will refresh
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modal.overlay}>
        <View style={modal.sheetSmall}>
          <View style={modal.handle} />
          <Text style={modal.title}>New shopping list</Text>
          <TextInput
            style={modal.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Weekly shop, Dinner party…"
            placeholderTextColor={colors.text.tertiary}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={create}
          />
          <View style={modal.footer}>
            <TouchableOpacity style={modal.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={modal.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modal.addBtn, (!title.trim() || saving) && modal.addBtnDisabled]}
              onPress={create}
              disabled={!title.trim() || saving}
            >
              {saving
                ? <ActivityIndicator size="small" color={colors.white} />
                : <Text style={modal.addBtnText}>Create</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---- Main screen -----------------------------------------------------------

export default function ShoppingScreen() {
  const posthog = usePostHog();
  const { householdId } = useAuthStore();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showNewList, setShowNewList] = useState(false);
  const [addItemListId, setAddItemListId] = useState<string | null>(null);

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

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const toggleItem = useCallback(async (listId: string, item: ShoppingListItem) => {
    const newStatus = item.status === ShoppingListItemStatus.checked
      ? ShoppingListItemStatus.pending
      : ShoppingListItemStatus.checked;

    if (newStatus === ShoppingListItemStatus.checked) {
      posthog.capture('shopping_item_checked', {
        item_name: item.name,
        category: item.category ?? null,
        list_id: listId,
      });
    }

    setLists((prev) =>
      prev.map((list) =>
        list.id !== listId ? list
          : { ...list, items: list.items.map((i) => i.id === item.id ? { ...i, status: newStatus } : i) },
      ),
    );
    await supabaseClient.from('shopping_list_items').update({ status: newStatus }).eq('id', item.id);
  }, [posthog]);

  const saveForLater = useCallback(async (listId: string, item: ShoppingListItem) => {
    const newStatus = item.status === ShoppingListItemStatus.saved_for_later
      ? ShoppingListItemStatus.pending
      : ShoppingListItemStatus.saved_for_later;

    setLists((prev) =>
      prev.map((list) =>
        list.id !== listId ? list
          : { ...list, items: list.items.map((i) => i.id === item.id ? { ...i, status: newStatus } : i) },
      ),
    );
    await supabaseClient.from('shopping_list_items').update({ status: newStatus }).eq('id', item.id);
  }, []);

  const deleteItem = useCallback(async (listId: string, itemId: string) => {
    setLists((prev) =>
      prev.map((list) =>
        list.id !== listId ? list : { ...list, items: list.items.filter((i) => i.id !== itemId) },
      ),
    );
    await supabaseClient.from('shopping_list_items').delete().eq('id', itemId);
  }, []);

  const deleteList = useCallback(async (listId: string) => {
    Alert.alert('Delete list', 'Delete this shopping list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLists((prev) => prev.filter((l) => l.id !== listId));
          await supabaseClient.from('shopping_lists').delete().eq('id', listId);
        },
      },
    ]);
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
        <View>
          <Text style={styles.pageTitle}>Shopping</Text>
          <Text style={styles.pageSubtitle}>Manage your shopping lists</Text>
        </View>
        <TouchableOpacity
          style={styles.newListBtn}
          onPress={() => setShowNewList(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color={colors.white} />
          <Text style={styles.newListText}>New list</Text>
        </TouchableOpacity>
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
            <ShoppingListView
              list={list}
              onToggle={(item) => toggleItem(list.id, item)}
              onSaveForLater={(item) => saveForLater(list.id, item)}
              onDelete={(itemId) => deleteItem(list.id, itemId)}
              onDeleteList={() => deleteList(list.id)}
              onAddItem={() => setAddItemListId(list.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="cart-outline" size={40} color={colors.gray[300]} />
              </View>
              <Text style={styles.emptyTitle}>No shopping lists yet</Text>
              <Text style={styles.emptySubtitle}>Create a list or ask Tina to build one for you.</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => setShowNewList(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={18} color={colors.green[600]} />
                <Text style={styles.emptyBtnText}>Create a list</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green[600]} />}
        />
      )}

      <NewListModal
        householdId={householdId ?? ''}
        visible={showNewList}
        onClose={() => setShowNewList(false)}
        onCreated={() => load()}
      />

      {addItemListId && (
        <AddItemModal
          listId={addItemListId}
          visible={!!addItemListId}
          onClose={() => setAddItemListId(null)}
          onAdded={() => load()}
        />
      )}
    </SafeAreaView>
  );
}

// ---- Shopping list card ----------------------------------------------------

function ShoppingListView({ list, onToggle, onSaveForLater, onDelete, onDeleteList, onAddItem }: {
  list: ShoppingList;
  onToggle: (item: ShoppingListItem) => void;
  onSaveForLater: (item: ShoppingListItem) => void;
  onDelete: (itemId: string) => void;
  onDeleteList: () => void;
  onAddItem: () => void;
}) {
  const pending = list.items.filter((i) => i.status === ShoppingListItemStatus.pending);
  const checked = list.items.filter((i) => i.status === ShoppingListItemStatus.checked);
  const saved = list.items.filter((i) => i.status === ShoppingListItemStatus.saved_for_later);

  const grouped = pending.reduce<Record<string, ShoppingListItem[]>>((acc, item) => {
    const cat = item.category ?? 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <View style={styles.listCard}>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>{list.title}</Text>
        <View style={styles.listHeaderActions}>
          <Text style={styles.listMeta}>{pending.length} remaining</Text>
          <TouchableOpacity onPress={onDeleteList} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={16} color={colors.red[500]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Pending items grouped by category */}
      {Object.entries(grouped).map(([cat, items]) => (
        <View key={cat} style={styles.categoryGroup}>
          <Text style={styles.categoryLabel}>{cat}</Text>
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onToggle={() => onToggle(item)}
              onSaveForLater={() => onSaveForLater(item)}
              onDelete={() => onDelete(item.id)}
            />
          ))}
        </View>
      ))}

      {/* Saved for later */}
      {saved.length > 0 && (
        <View style={styles.categoryGroup}>
          <Text style={[styles.categoryLabel, { color: '#f59e0b' }]}>Saved for later</Text>
          {saved.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onToggle={() => onToggle(item)}
              onSaveForLater={() => onSaveForLater(item)}
              onDelete={() => onDelete(item.id)}
            />
          ))}
        </View>
      )}

      {/* Checked off */}
      {checked.length > 0 && (
        <View style={styles.categoryGroup}>
          <Text style={[styles.categoryLabel, styles.checkedLabel]}>In basket ({checked.length})</Text>
          {checked.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onToggle={() => onToggle(item)}
              onSaveForLater={() => onSaveForLater(item)}
              onDelete={() => onDelete(item.id)}
            />
          ))}
        </View>
      )}

      {/* Add item */}
      <TouchableOpacity style={styles.addItemRow} onPress={onAddItem} activeOpacity={0.7}>
        <Ionicons name="add-circle-outline" size={18} color={colors.green[600]} />
        <Text style={styles.addItemText}>Add item</Text>
      </TouchableOpacity>
    </View>
  );
}

function ItemRow({ item, onToggle, onSaveForLater, onDelete }: {
  item: ShoppingListItem;
  onToggle: () => void;
  onSaveForLater: () => void;
  onDelete: () => void;
}) {
  const isChecked = item.status === ShoppingListItemStatus.checked;
  const isSaved = item.status === ShoppingListItemStatus.saved_for_later;

  return (
    <View style={styles.itemRow}>
      <TouchableOpacity onPress={onToggle} style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
        {isChecked && <Ionicons name="checkmark" size={12} color={colors.white} />}
      </TouchableOpacity>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, isChecked && styles.itemNameChecked, isSaved && styles.itemNameSaved]}>
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
      <View style={styles.itemActions}>
        <TouchableOpacity
          onPress={onSaveForLater}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.actionIcon, isSaved && styles.actionIconActive]}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={15}
            color={isSaved ? '#f59e0b' : colors.text.tertiary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.actionIcon}
        >
          <Ionicons name="close" size={15} color={colors.text.tertiary} />
        </TouchableOpacity>
      </View>
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
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text.primary },
  pageSubtitle: { fontSize: typography.size.xs, color: colors.text.tertiary, marginTop: 1 },
  newListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.green[600],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  newListText: { fontSize: typography.size.sm, color: colors.white, fontWeight: typography.weight.semibold },
  listContent: { padding: spacing.base, paddingBottom: TAB_BAR_BOTTOM_PADDING },
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
  listHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
  checkedLabel: { color: colors.green[600] },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[50],
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: colors.green[600], borderColor: colors.green[600] },
  itemInfo: { flex: 1, gap: 1 },
  itemName: { fontSize: typography.size.base, color: colors.text.primary },
  itemNameChecked: { color: colors.text.tertiary, textDecorationLine: 'line-through' },
  itemNameSaved: { color: '#f59e0b' },
  itemMeta: { fontSize: typography.size.sm, color: colors.text.tertiary },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionIcon: { padding: 2 },
  actionIconActive: {},
  addItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[50],
  },
  addItemText: { fontSize: typography.size.sm, color: colors.green[600], fontWeight: typography.weight.medium },
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
  emptySubtitle: { fontSize: typography.size.base, color: colors.text.secondary, textAlign: 'center', lineHeight: typography.size.base * 1.6 },
  emptyBtn: {
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
  emptyBtnText: { fontSize: typography.size.sm, color: colors.green[600], fontWeight: typography.weight.semibold },
  errorText: { color: colors.red[500], fontSize: typography.size.base },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  sheetSmall: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray[200],
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  chip: {
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
  input: {
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: typography.size.base,
    color: colors.text.primary,
    marginHorizontal: spacing.xl,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  inputHalf: { flex: 1, marginHorizontal: 0 },
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
