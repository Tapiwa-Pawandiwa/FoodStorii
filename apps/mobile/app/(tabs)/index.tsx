import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as api from '../../src/services/api';
import { useAuthStore } from '../../src/stores/auth.store';
import { TAB_BAR_BOTTOM_PADDING } from '../../src/theme';
import { usePostHog } from 'posthog-react-native';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExpiringItem {
  name: string;
  expiry_estimate: string | null;
  days?: number;
}

interface KitchenSnapshot {
  expiringWithin3Days: ExpiringItem[];
  totalItems: number;
  fridgeCount: number;
  pantryCount: number;
  freezerCount: number;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StorageRow({
  emoji,
  label,
  count,
  onPress,
}: {
  emoji: string;
  label: string;
  count: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={R.storageRow} onPress={onPress} activeOpacity={0.8}>
      <View style={R.storageEmoji}>
        <Text style={R.storageEmojiText}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={R.storageLabel}>{label}</Text>
      </View>
      <Text style={R.storageCount}>{count} items</Text>
      <Ionicons name="chevron-forward" size={16} color="#C4BEB8" />
    </TouchableOpacity>
  );
}

function HealthIndicator({ expiringCount }: { expiringCount: number }) {
  let color = '#48A111';
  let message = 'Your kitchen is looking good.';
  let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'checkmark-circle';

  if (expiringCount > 0 && expiringCount <= 2) {
    color = '#FFAA00';
    message = `${expiringCount} item${expiringCount > 1 ? 's' : ''} expiring soon.`;
    iconName = 'warning';
  } else if (expiringCount > 2) {
    color = '#dc2626';
    message = `${expiringCount} items expiring soon!`;
    iconName = 'alert-circle';
  }

  return (
    <View style={R.healthRow}>
      <Ionicons name={iconName} size={20} color={color} />
      <Text style={[R.healthText, { color }]}>{message}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const { isFirstVisit, markFirstVisitSeen } = useAuthStore();

  const [snapshot, setSnapshot] = useState<KitchenSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await api.getInventorySnapshot().catch(() => null);
      if (data) {
        // Derive storage counts from items array
        const items = (data.items ?? []) as Array<{ storage_location?: string }>;
        const fridgeCount = items.filter((i) => i.storage_location === 'fridge').length;
        const pantryCount = items.filter((i) => i.storage_location === 'pantry').length;
        const freezerCount = items.filter((i) => i.storage_location === 'freezer').length;
        setSnapshot({
          expiringWithin3Days: (data.expiringWithin3Days as unknown as ExpiringItem[]) ?? [],
          totalItems: data.totalItems ?? 0,
          fridgeCount,
          pantryCount,
          freezerCount,
        });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    if (isFirstVisit) markFirstVisitSeen();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const expiringCount = snapshot?.expiringWithin3Days.length ?? 0;

  return (
    <SafeAreaView style={R.safe} edges={['top']}>
      <ScrollView
        style={R.scroll}
        contentContainerStyle={[R.scrollContent, { paddingBottom: TAB_BAR_BOTTOM_PADDING + 60 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#48A111" />
        }
      >
        {/* ── Header ── */}
        <View style={R.header}>
          <Text style={R.headerTitle}>Kitchen Inventory</Text>
          <TouchableOpacity style={R.addBtn} onPress={() => router.push('/(tabs)/inventory')}>
            <Text style={R.addBtnText}>+ Add item</Text>
          </TouchableOpacity>
        </View>

        {/* ── Storage navigation rows ── */}
        <View style={R.section}>
          <StorageRow
            emoji="🧊"
            label="Fridge"
            count={snapshot?.fridgeCount ?? 0}
            onPress={() => router.push('/(tabs)/inventory')}
          />
          <StorageRow
            emoji="🥫"
            label="Pantry"
            count={snapshot?.pantryCount ?? 0}
            onPress={() => router.push('/(tabs)/inventory')}
          />
          <StorageRow
            emoji="❄️"
            label="Freezer"
            count={snapshot?.freezerCount ?? 0}
            onPress={() => router.push('/(tabs)/inventory')}
          />
        </View>

        {/* ── Fridge health indicator ── */}
        {!loading && (
          <View style={R.healthCard}>
            <HealthIndicator expiringCount={expiringCount} />
          </View>
        )}

        {/* ── Expiry banner ── */}
        {!loading && expiringCount > 0 && (
          <TouchableOpacity
            style={R.expiryBanner}
            onPress={() => router.push('/(tabs)/recipes')}
            activeOpacity={0.85}
          >
            <Ionicons name="warning" size={20} color="#1A1A18" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={R.expiryBannerTitle}>{expiringCount} item{expiringCount > 1 ? 's' : ''} expiring soon</Text>
              <Text style={R.expiryBannerSub}>Tap to view and use in recipes</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#1A1A18" />
          </TouchableOpacity>
        )}

        {/* ── Suggested Tonight ── */}
        <View style={R.suggestedSection}>
          <Text style={R.sectionTitle}>Suggested Tonight</Text>
          <TouchableOpacity style={R.suggestedCard} onPress={() => router.push('/(tabs)/recipes')} activeOpacity={0.8}>
            <View style={R.suggestedEmptyState}>
              <Ionicons name="restaurant-outline" size={28} color="#C4BEB8" />
              <Text style={R.suggestedEmptyText}>
                {(snapshot?.totalItems ?? 0) > 0
                  ? 'Tap to find recipes matching your kitchen'
                  : 'Add items to get recipe suggestions'}
              </Text>
              <TouchableOpacity style={R.viewRecipesBtn} onPress={() => router.push('/(tabs)/recipes')}>
                <Text style={R.viewRecipesBtnText}>View Recipes</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Ask Tina pill ── */}
        <View style={R.tinaWrap}>
          <TouchableOpacity
            style={R.tinaBtn}
            onPress={() => router.push('/(tabs)/chat')}
            activeOpacity={0.88}
          >
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
            <Text style={R.tinaBtnText}>Ask Tina →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const R = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F0F0' },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 0 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A18',
  },
  addBtn: {},
  addBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#48A111',
  },

  // Storage rows
  section: {
    marginHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAE4E4',
    overflow: 'hidden',
  },
  storageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE4E4',
    gap: 12,
  },
  storageEmoji: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageEmojiText: { fontSize: 22 },
  storageLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A18',
  },
  storageCount: {
    fontSize: 12,
    color: '#5A5A52',
    marginRight: 6,
  },

  // Health indicator
  healthCard: {
    marginHorizontal: 24,
    marginTop: 10,
    alignItems: 'center',
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  healthText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Expiry banner
  expiryBanner: {
    marginHorizontal: 24,
    marginTop: 12,
    backgroundColor: '#FFAA00',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  expiryBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A18',
  },
  expiryBannerSub: {
    fontSize: 12,
    color: '#1A1A18',
    marginTop: 2,
    opacity: 0.75,
  },

  // Suggested Tonight
  suggestedSection: {
    marginHorizontal: 24,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A18',
    marginBottom: 12,
  },
  suggestedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAE4E4',
    overflow: 'hidden',
  },
  suggestedEmptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 8,
  },
  suggestedEmptyText: {
    fontSize: 13,
    color: '#5A5A52',
    textAlign: 'center',
    lineHeight: 19,
  },
  viewRecipesBtn: {
    marginTop: 8,
    backgroundColor: '#48A111',
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  viewRecipesBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Ask Tina pill
  tinaWrap: {
    marginHorizontal: 24,
    marginTop: 24,
  },
  tinaBtn: {
    backgroundColor: '#48A111',
    borderRadius: 999,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tinaBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
