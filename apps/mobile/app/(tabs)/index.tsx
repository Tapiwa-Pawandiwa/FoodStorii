import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Linking,
  ScrollView,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FoodStoriiWordmark } from '../../src/components/common/FoodStoriiWordmark';
import * as api from '../../src/services/api';
import { useAuthStore } from '../../src/stores/auth.store';
import type { RecipeSuggestion } from '@foodstorii/shared';
import { colors, spacing, typography, radius, shadows, TAB_BAR_BOTTOM_PADDING } from '../../src/theme';
import { usePostHog } from 'posthog-react-native';

const WHATSAPP_NUMBER = '14155238886';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

interface ExpiringItem {
  name: string;
  expiry_estimate: string | null;
}

interface HomeContext {
  whatsappLinked: boolean;
  expiringItems: ExpiringItem[];
  totalPantryItems: number;
}

// ── Expiry banner ────────────────────────────────────────────────────────────

function ExpiryBanner({ items, onPress }: { items: ExpiringItem[]; onPress: () => void }) {
  const names = items.slice(0, 3).map((i) => i.name).join(', ');
  const extra = items.length > 3 ? ` +${items.length - 3} more` : '';
  return (
    <TouchableOpacity style={S.expiryCard} onPress={onPress} activeOpacity={0.8}>
      <View style={S.expiryIconWrap}>
        <Ionicons name="time-outline" size={18} color={colors.brand.orange} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={S.expiryTitle}>Use these soon</Text>
        <Text style={S.expirySub} numberOfLines={1}>{names}{extra}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.gray[400]} />
    </TouchableOpacity>
  );
}

// ── WhatsApp card ────────────────────────────────────────────────────────────

function WhatsAppConnectCard({ onPress }: { onPress: () => void }) {
  return (
    <View style={S.waCard}>
      <View style={S.waTop}>
        <View style={S.waIconCircle}>
          <Ionicons name="logo-whatsapp" size={22} color="#25d366" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={S.waHeadline}>Chat with Tina on WhatsApp</Text>
          <Text style={S.waSub}>Get daily check-ins and recipe ideas in WhatsApp</Text>
        </View>
      </View>
      <TouchableOpacity style={S.waBtn} onPress={onPress} activeOpacity={0.85}>
        <Ionicons name="logo-whatsapp" size={15} color={colors.white} />
        <Text style={S.waBtnText}>Link WhatsApp</Text>
      </TouchableOpacity>
    </View>
  );
}

function WhatsAppLinkedRow({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={S.waLinkedRow} onPress={onPress} activeOpacity={0.8}>
      <View style={S.waLinkedIcon}>
        <Ionicons name="logo-whatsapp" size={18} color="#25d366" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={S.waLinkedTitle}>Chat with Tina on WhatsApp</Text>
        <Text style={S.waLinkedSub}>Recipes, shopping, and food tips</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.gray[400]} />
    </TouchableOpacity>
  );
}

// ── Recipe card (home teaser) ────────────────────────────────────────────────

function HomeRecipeCard({ recipe, onPress }: { recipe: RecipeSuggestion; onPress: () => void }) {
  return (
    <TouchableOpacity style={S.recipeCard} onPress={onPress} activeOpacity={0.82} {...shadows.md}>
      {recipe.imageUrl ? (
        <Image source={{ uri: recipe.imageUrl }} style={S.recipeImg} resizeMode="cover" />
      ) : (
        <View style={S.recipeImgPlaceholder}>
          <Ionicons name="restaurant-outline" size={24} color={colors.gray[300]} />
        </View>
      )}
      <View style={S.recipeBody}>
        <Text style={S.recipeTitle} numberOfLines={2}>{recipe.title}</Text>
        <View style={S.recipeMeta}>
          {recipe.readyInMinutes ? (
            <View style={S.metaChip}>
              <Ionicons name="time-outline" size={10} color={colors.text.secondary} />
              <Text style={S.metaChipText}>{recipe.readyInMinutes}m</Text>
            </View>
          ) : null}
          {recipe.missingCount > 0 ? (
            <View style={S.metaChip}>
              <Text style={S.metaChipText}>{recipe.missingCount} missing</Text>
            </View>
          ) : (
            <View style={[S.metaChip, S.metaChipReady]}>
              <Ionicons name="checkmark" size={10} color={colors.green[600]} />
              <Text style={[S.metaChipText, { color: colors.green[600] }]}>Ready</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Quick actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: 'basket-outline' as const,            label: 'Pantry',   route: '/(tabs)/inventory' as const, iconColor: colors.brand.green },
  { icon: 'restaurant-outline' as const,        label: 'Recipes',  route: '/(tabs)/recipes' as const,   iconColor: colors.brand.orange },
  { icon: 'cart-outline' as const,              label: 'Shopping', route: '/(tabs)/shopping' as const,  iconColor: colors.brand.blue },
  { icon: 'chatbubble-ellipses-outline' as const, label: 'Ask Tina', route: '/(tabs)/index' as const,  iconColor: colors.brand.yellow },
] as const;

// ── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const { isFirstVisit, markFirstVisitSeen } = useAuthStore();

  const [context, setContext] = useState<HomeContext>({
    whatsappLinked: false,
    expiringItems: [],
    totalPantryItems: 0,
  });
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([]);
  const [pantryEmpty, setPantryEmpty] = useState(false);
  const [contextLoading, setContextLoading] = useState(true);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadContext = useCallback(async () => {
    try {
      const [profile, snapshot] = await Promise.all([
        api.getProfile(),
        api.getInventorySnapshot().catch(() => null),
      ]);
      const whatsappLinked = !!(profile as unknown as Record<string, unknown>)?.whatsapp_number;
      const rawExpiring = (snapshot as unknown as Record<string, unknown>)?.expiringWithin3Days as ExpiringItem[] ?? [];
      const totalPantryItems = (snapshot as unknown as Record<string, unknown>)?.totalItems as number ?? 0;
      setContext({ whatsappLinked, expiringItems: rawExpiring, totalPantryItems });
    } catch {
      // silent
    } finally {
      setContextLoading(false);
    }
  }, []);

  const loadRecipes = useCallback(async () => {
    try {
      const result = await api.searchRecipesByPantry({ maxMissing: 3, limit: 6 });
      setPantryEmpty(result.pantryEmpty);
      if (result.suggestions.length > 0) {
        setRecipes(result.suggestions);
      } else {
        // Pantry empty or no matches — show popular suggestions
        const popular = await api.searchRecipes('quick healthy dinner', { limit: 6 });
        setRecipes(popular.suggestions);
      }
    } catch {
      // silent — section stays empty
    } finally {
      setRecipesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContext();
    loadRecipes();
    if (isFirstVisit) markFirstVisitSeen();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadContext(), loadRecipes()]);
    setRefreshing(false);
  }, []);

  function handleWhatsAppPress() {
    posthog.capture('whatsapp_link_pressed', {
      already_linked: context.whatsappLinked,
    });
    if (context.whatsappLinked) {
      const url = `https://wa.me/${WHATSAPP_NUMBER}`;
      Linking.canOpenURL(url).then((ok) => {
        if (ok) Linking.openURL(url);
        else Alert.alert('WhatsApp not found', 'Please install WhatsApp to chat with Tina.');
      });
    } else {
      router.push('/(onboarding)/whatsapp-link');
    }
  }

  function getSubtitle(): string {
    if (context.totalPantryItems > 0)
      return `${context.totalPantryItems} item${context.totalPantryItems !== 1 ? 's' : ''} in your pantry`;
    return 'What would you like to cook today?';
  }

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <ScrollView
        style={S.scroll}
        contentContainerStyle={S.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.orange} />
        }
      >
        {/* ── Header ── */}
        <View style={S.header}>
          <FoodStoriiWordmark size="sm" />
          <Text style={S.greeting}>{getGreeting()}</Text>
          {!contextLoading && <Text style={S.subtitle}>{getSubtitle()}</Text>}
        </View>

        {/* ── Expiry warning ── */}
        {!contextLoading && context.expiringItems.length > 0 && (
          <View style={S.block}>
            <ExpiryBanner items={context.expiringItems} onPress={() => router.push('/(tabs)/recipes')} />
          </View>
        )}

        {/* ── WhatsApp CTA ── */}
        {!contextLoading && !context.whatsappLinked && (
          <View style={S.block}>
            <WhatsAppConnectCard onPress={handleWhatsAppPress} />
          </View>
        )}

        {/* ── Recipe suggestions ── */}
        <View style={S.sectionBlock}>
          <View style={S.sectionHeader}>
            <Text style={S.sectionTitle}>
              {pantryEmpty ? 'Popular recipes' : 'From your pantry'}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/recipes')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={S.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {recipesLoading ? (
            <View style={S.skeletonRow}>
              {[1, 2, 3].map((i) => <View key={i} style={S.skeleton} />)}
            </View>
          ) : recipes.length === 0 ? (
            <TouchableOpacity
              style={S.emptyCard}
              onPress={() => router.push('/(tabs)/inventory')}
              activeOpacity={0.8}
            >
              <View style={S.emptyIconCircle}>
                <Ionicons name="basket-outline" size={28} color={colors.brand.blue} />
              </View>
              <Text style={S.emptyTitle}>Your pantry is empty</Text>
              <Text style={S.emptySub}>Add items and Tina will find recipes you can make today.</Text>
              <TouchableOpacity style={S.orangeBtn} onPress={() => router.push('/(tabs)/inventory')} activeOpacity={0.85}>
                <Text style={S.orangeBtnText}>Add pantry items</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ) : (
            <FlatList
              data={recipes}
              keyExtractor={(item) => item.externalId}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={S.recipeList}
              ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
              renderItem={({ item }) => (
                <HomeRecipeCard recipe={item} onPress={() => router.push('/(tabs)/recipes')} />
              )}
            />
          )}
        </View>

        {/* ── Quick actions ── */}
        <View style={S.sectionBlock}>
          <Text style={[S.sectionTitle, { paddingHorizontal: spacing.base }]}>Quick actions</Text>
          <View style={S.quickGrid}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={S.quickItem}
                onPress={() => router.push(action.route as never)}
                activeOpacity={0.75}
              >
                <View style={[S.quickCircle, { backgroundColor: action.iconColor + '18' }]}>
                  <Ionicons name={action.icon} size={22} color={action.iconColor} />
                </View>
                <Text style={S.quickLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── WhatsApp linked row ── */}
        {!contextLoading && context.whatsappLinked && (
          <View style={S.block}>
            <WhatsAppLinkedRow onPress={handleWhatsAppPress} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: TAB_BAR_BOTTOM_PADDING },

  // Header
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: 2,
  },
  greeting: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginTop: spacing.sm,
    lineHeight: typography.size['2xl'] * 1.2,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 3,
  },

  block: { marginHorizontal: spacing.base, marginBottom: spacing.base },

  // Section
  sectionBlock: { marginBottom: spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  seeAll: {
    fontSize: typography.size.sm,
    color: colors.brand.orange,
    fontWeight: typography.weight.semibold,
  },

  // Expiry
  expiryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[100],
    gap: spacing.sm,
    ...shadows.sm,
  },
  expiryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand.orange + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiryTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  expirySub: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // WhatsApp connect card
  waCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[100],
    ...shadows.md,
  },
  waTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  waIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  waHeadline: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  waSub: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    lineHeight: typography.size.xs * 1.5,
  },
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brand.orange,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    height: 48,
  },
  waBtnText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.white,
  },

  // WhatsApp linked row
  waLinkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[100],
    gap: spacing.md,
    ...shadows.sm,
  },
  waLinkedIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waLinkedTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  waLinkedSub: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginTop: 1,
  },

  // Recipe cards
  recipeList: { paddingLeft: spacing.base, paddingRight: spacing.sm },
  recipeCard: {
    width: 158,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  recipeImg: { width: '100%', height: 100 },
  recipeImgPlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeBody: { padding: spacing.sm, gap: 4 },
  recipeTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    lineHeight: typography.size.sm * 1.35,
  },
  recipeMeta: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 2 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.gray[100],
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  metaChipReady: { backgroundColor: colors.green[50] },
  metaChipText: { fontSize: typography.size.xs, color: colors.text.secondary },

  // Skeleton
  skeletonRow: { flexDirection: 'row', paddingHorizontal: spacing.base, gap: spacing.sm },
  skeleton: { width: 158, height: 160, borderRadius: radius.lg, backgroundColor: colors.gray[100] },

  // Empty pantry
  emptyCard: {
    marginHorizontal: spacing.base,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brand.blue + '25',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  emptySub: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.size.sm * 1.5,
  },
  orangeBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.brand.orange,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orangeBtnText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.white,
  },

  // Quick actions
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.base,
    marginTop: spacing.md,
  },
  quickItem: { alignItems: 'center', gap: spacing.xs },
  quickCircle: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  quickLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginTop: 2,
  },
});
