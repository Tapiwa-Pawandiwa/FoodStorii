import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Text, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { InventorySnapshot } from '@foodstorii/shared';
import { InventoryItemCard } from '../../src/components/inventory/InventoryItemCard';
import { InventorySnapshotHeader } from '../../src/components/inventory/InventorySnapshot';
import { getInventorySnapshot } from '../../src/services/api';
import { colors, spacing, typography } from '../../src/theme';

export default function InventoryScreen() {
  const [snapshot, setSnapshot] = useState<InventorySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

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

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  const items = snapshot?.items ?? [];
  const expiring = snapshot?.expiringWithin3Days ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Pantry</Text>
      </View>

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
            <Text style={styles.emptyTitle}>Your pantry is empty</Text>
            <Text style={styles.emptySubtitle}>Tell Tina what you have or upload a receipt to get started.</Text>
          </View>
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
  },
  pageTitle: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text.primary },
  list: { paddingHorizontal: spacing.base, paddingBottom: spacing['2xl'] },
  sectionHeader: { paddingTop: spacing.base, paddingBottom: spacing.sm },
  sectionTitle: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  empty: { paddingTop: spacing['3xl'], alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.text.primary },
  emptySubtitle: { fontSize: typography.size.base, color: colors.text.secondary, textAlign: 'center', lineHeight: typography.size.base * 1.6, paddingHorizontal: spacing.lg },
  errorText: { color: colors.red[500], fontSize: typography.size.base },
});
