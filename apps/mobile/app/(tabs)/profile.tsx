import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
  TextInput, Modal, Share, Animated, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/auth.store';
import { useChatStore } from '../../src/stores/chat.store';
import { supabaseClient } from '../../src/services/supabaseClient';
import { getProfile, updateProfile } from '../../src/services/api';
import { colors, spacing, typography, radius, shadows, TAB_BAR_BOTTOM_PADDING } from '../../src/theme';
import { usePostHog } from 'posthog-react-native';

interface UserInfo {
  name: string;
  email: string;
}

interface HouseholdMember {
  id: string;
  displayName: string | null;
  email: string;
}

interface Stats {
  itemsTracked: number;
  householdSize: number;
  wastageScore: number;
  listsCreated: number;
}

const STAT_CONFIG = [
  { key: 'itemsTracked',  label: 'Items tracked',   icon: 'cube-outline' as const,      color: colors.brand.green },
  { key: 'householdSize', label: 'Household size',  icon: 'people-outline' as const,    color: colors.brand.blue },
  { key: 'wastageScore',  label: 'Waste score',     icon: 'leaf-outline' as const,      color: colors.brand.yellow },
  { key: 'listsCreated',  label: 'Lists created',   icon: 'cart-outline' as const,      color: colors.brand.orange },
] as const;

function StatCard({ label, value, icon, color }: {
  label: string; value: number; icon: keyof typeof Ionicons.glyphMap; color: string;
}) {
  return (
    <View style={S.statCard}>
      <View style={[S.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={S.statValue}>{value}</Text>
      <Text style={S.statLabel}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const posthog = usePostHog();
  const { userId, signOut, resetOnboarding } = useAuthStore();
  const { reset } = useChatStore();
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: '', email: '' });
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [stats, setStats] = useState<Stats>({ itemsTracked: 0, householdSize: 1, wastageScore: 0, listsCreated: 0 });
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: Math.min(100, stats.wastageScore),
      duration: 1000,
      delay: 500,
      useNativeDriver: false,
    }).start();
  }, [stats.wastageScore]);

  async function loadData() {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        setUserInfo({
          name: (user.user_metadata?.displayName as string) ?? '',
          email: user.email ?? '',
        });
      }

      const profile = await getProfile();
      if (profile) {
        setStats((s) => ({ ...s, householdSize: profile.householdSize ?? 1 }));
        if ((profile as any).whatsappNumber) setWhatsappNumber((profile as any).whatsappNumber);
      }

      if (user) {
        const { data: userRow } = await supabaseClient
          .from('users').select('household_id').eq('id', user.id).single();
        const hId = userRow?.household_id as string | null;

        if (hId) {
          const { count: itemCount } = await supabaseClient
            .from('inventory_items').select('id', { count: 'exact', head: true })
            .eq('household_id', hId).eq('status', 'active');

          const { count: listCount } = await supabaseClient
            .from('shopping_lists').select('id', { count: 'exact', head: true }).eq('household_id', hId);

          setStats((s) => ({
            ...s,
            itemsTracked: itemCount ?? 0,
            listsCreated: listCount ?? 0,
            wastageScore: Math.min(100, (itemCount ?? 0) * 3),
          }));

          const { data: membersData } = await supabaseClient
            .from('users').select('id, display_name, email').eq('household_id', hId);

          setMembers((membersData ?? []).map((m) => ({
            id: m.id as string,
            displayName: m.display_name as string | null,
            email: m.email as string,
          })));
        }
      }
    } catch {
      // Non-critical
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    try {
      await Share.share({
        message: `Join my household on FoodStorii! Sign up at foodstorii.app`,
        title: 'FoodStorii Household Invite',
      });
      setInviteEmail('');
      setShowInviteModal(false);
    } catch { /* cancelled */ }
  }

  async function saveWhatsappNumber() {
    const trimmed = whatsappNumber.trim();
    if (!trimmed) return;
    if (!/^\+\d{7,15}$/.test(trimmed)) {
      Alert.alert('Invalid number', 'Please use international format, e.g. +447911123456');
      return;
    }
    setSavingWhatsapp(true);
    try {
      await updateProfile({ whatsappNumber: trimmed });
      Alert.alert('Saved', 'Your WhatsApp number has been linked.');
    } catch {
      Alert.alert('Error', 'Could not save your number — please try again.');
    } finally {
      setSavingWhatsapp(false);
    }
  }

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          posthog.capture('user_signed_out');
          posthog.reset();
          reset();
          supabaseClient.auth.signOut().catch(() => null);
          await signOut();
        },
      },
    ]);
  };

  const initials = userInfo.name
    ? userInfo.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : (userInfo.email[0] ?? '?').toUpperCase();

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Profile header ── */}
        <View style={S.headerCard}>
          <View style={S.avatar}>
            <Text style={S.avatarText}>{initials}</Text>
          </View>
          <Text style={S.userName}>{userInfo.name || 'Your Account'}</Text>
          <Text style={S.userEmail}>{userInfo.email}</Text>
        </View>

        {/* ── Stats ── */}
        <Text style={S.sectionLabel}>Dashboard</Text>
        <View style={S.statsGrid}>
          {STAT_CONFIG.map(({ key, label, icon, color }) => (
            <StatCard
              key={key}
              label={label}
              value={stats[key as keyof Stats]}
              icon={icon}
              color={color}
            />
          ))}
        </View>

        {/* ── Waste progress ── */}
        <View style={S.card}>
          <View style={S.cardRow}>
            <View style={[S.cardIconWrap, { backgroundColor: colors.brand.green + '18' }]}>
              <Ionicons name="analytics-outline" size={18} color={colors.brand.green} />
            </View>
            <Text style={S.cardTitle}>Food waste prevented</Text>
          </View>
          <View style={S.progressBg}>
            <Animated.View
              style={[S.progressFill, {
                width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              }]}
            />
          </View>
          <Text style={S.progressHint}>
            {stats.wastageScore < 10
              ? 'Add items to your pantry to start tracking'
              : stats.wastageScore < 50
              ? 'Good start — keep logging what you have'
              : 'Great! Tina is actively helping reduce waste'}
          </Text>
        </View>

        {/* ── Household members ── */}
        <Text style={S.sectionLabel}>Household</Text>
        <View style={S.listCard}>
          {members.map((m, idx) => (
            <View key={m.id}>
              <View style={S.memberRow}>
                <View style={S.memberAvatar}>
                  <Text style={S.memberAvatarText}>{(m.displayName ?? m.email)[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.memberName}>{m.displayName ?? m.email}</Text>
                  {m.displayName ? <Text style={S.memberEmail}>{m.email}</Text> : null}
                </View>
                {m.id === userId && (
                  <View style={S.youBadge}><Text style={S.youBadgeText}>You</Text></View>
                )}
              </View>
              {idx < members.length - 1 && <View style={S.rowDivider} />}
            </View>
          ))}
          {members.length > 0 && <View style={S.rowDivider} />}
          <TouchableOpacity style={S.memberRow} activeOpacity={0.7} onPress={() => setShowInviteModal(true)}>
            <View style={[S.memberAvatar, { backgroundColor: colors.brand.orange + '18' }]}>
              <Ionicons name="person-add-outline" size={16} color={colors.brand.orange} />
            </View>
            <Text style={[S.memberName, { color: colors.brand.orange }]}>Invite a household member</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.gray[400]} />
          </TouchableOpacity>
        </View>

        {/* ── WhatsApp ── */}
        <Text style={S.sectionLabel}>WhatsApp</Text>
        <View style={[S.card, { gap: spacing.md }]}>
          <View style={S.cardRow}>
            <View style={[S.cardIconWrap, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="logo-whatsapp" size={18} color="#25d366" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.cardTitle}>Link your WhatsApp</Text>
              <Text style={S.cardSub}>Tina will use this for daily check-ins</Text>
            </View>
          </View>
          <TextInput
            style={S.input}
            value={whatsappNumber}
            onChangeText={setWhatsappNumber}
            placeholder="+447911123456"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="phone-pad"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[S.orangeBtn, (!whatsappNumber.trim() || savingWhatsapp) && { opacity: 0.5 }]}
            onPress={saveWhatsappNumber}
            disabled={!whatsappNumber.trim() || savingWhatsapp}
            activeOpacity={0.85}
          >
            {savingWhatsapp
              ? <ActivityIndicator size="small" color={colors.white} />
              : <Text style={S.orangeBtnText}>Save number</Text>}
          </TouchableOpacity>
        </View>

        {/* ── Settings ── */}
        <Text style={S.sectionLabel}>Settings</Text>
        <View style={S.listCard}>
          <TouchableOpacity
            style={S.settingRow}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert('Restart onboarding', 'Your data is kept.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Restart',
                  onPress: async () => {
                    reset();
                    await resetOnboarding();
                    router.replace('/(welcome)/slides');
                  },
                },
              ])
            }
          >
            <Ionicons name="refresh-outline" size={20} color={colors.text.secondary} />
            <Text style={S.settingLabel}>Restart onboarding</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.gray[400]} />
          </TouchableOpacity>
          <View style={S.rowDivider} />
          <TouchableOpacity style={S.settingRow} onPress={handleSignOut} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color={colors.red[600]} />
            <Text style={[S.settingLabel, { color: colors.red[600] }]}>Sign out</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.gray[400]} />
          </TouchableOpacity>
        </View>

        {/* ── Dev tools ── */}
        {__DEV__ && (
          <>
            <Text style={S.devLabel}>⚙ DEV TOOLS</Text>
            <View style={S.devCard}>
              <Text style={S.devCardTitle}>Test as new user</Text>
              <Text style={S.devCardSub}>Clears all auth, onboarding flags, and chat state.</Text>
              <TouchableOpacity
                style={S.devBtn}
                activeOpacity={0.8}
                onPress={() =>
                  Alert.alert('Reset: New user', 'This clears all state.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset', style: 'destructive',
                      onPress: async () => {
                        reset();
                        await resetOnboarding();
                        await signOut();
                        router.replace('/(welcome)/slides');
                      },
                    },
                  ])
                }
              >
                <Ionicons name="person-add-outline" size={16} color="#fff" />
                <Text style={S.devBtnText}>Reset → New user</Text>
              </TouchableOpacity>
            </View>

            <View style={[S.devCard, { marginTop: spacing.sm }]}>
              <Text style={S.devCardTitle}>Test as existing user (signed out)</Text>
              <Text style={S.devCardSub}>Clears the session only. Onboarding stays complete.</Text>
              <TouchableOpacity
                style={[S.devBtn, { backgroundColor: '#4b5563' }]}
                activeOpacity={0.8}
                onPress={() =>
                  Alert.alert('Reset: Existing user', 'You will be signed out.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset', style: 'destructive',
                      onPress: async () => {
                        reset();
                        await signOut();
                      },
                    },
                  ])
                }
              >
                <Ionicons name="log-in-outline" size={16} color="#fff" />
                <Text style={S.devBtnText}>Reset → Existing user</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Invite modal ── */}
      <Modal visible={showInviteModal} transparent animationType="slide">
        <View style={S.modalOverlay}>
          <View style={S.modalSheet}>
            <Text style={S.modalTitle}>Invite household member</Text>
            <Text style={S.modalSub}>Enter their email address to send an invite.</Text>
            <TextInput
              style={S.input}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="their@email.com"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <TouchableOpacity
              style={[S.orangeBtn, !inviteEmail.trim() && { opacity: 0.5 }]}
              onPress={handleInvite}
              disabled={!inviteEmail.trim()}
              activeOpacity={0.85}
            >
              <Text style={S.orangeBtnText}>Send Invite</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowInviteModal(false)} style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
              <Text style={{ fontSize: typography.size.base, color: colors.text.secondary }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: TAB_BAR_BOTTOM_PADDING },

  // Header
  headerCard: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.brand.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    ...shadows.md,
  },
  avatarText: { fontSize: 28, fontWeight: typography.weight.bold, color: colors.white },
  userName: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  userEmail: { fontSize: typography.size.sm, color: colors.text.tertiary, textAlign: 'center' },

  // Section label
  sectionLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginHorizontal: spacing.base,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.base,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.sm,
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  statLabel: { fontSize: typography.size.xs, color: colors.text.tertiary, textAlign: 'center' },

  // Cards
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    marginHorizontal: spacing.base,
    padding: spacing.base,
    gap: spacing.sm,
    ...shadows.sm,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  cardSub: { fontSize: typography.size.xs, color: colors.text.tertiary, marginTop: 1 },

  // Progress bar
  progressBg: { height: 8, borderRadius: 4, backgroundColor: colors.gray[100], overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.brand.green },
  progressHint: { fontSize: typography.size.xs, color: colors.text.tertiary },

  // List card (members + settings)
  listCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    marginHorizontal: spacing.base,
    overflow: 'hidden',
    ...shadows.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand.blue + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: { fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.brand.green },
  memberName: { fontSize: typography.size.sm, fontWeight: typography.weight.medium, color: colors.text.primary },
  memberEmail: { fontSize: typography.size.xs, color: colors.text.tertiary, marginTop: 1 },
  youBadge: {
    backgroundColor: colors.brand.yellow + '40',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  youBadgeText: { fontSize: typography.size.xs, color: colors.brand.darkGreen, fontWeight: typography.weight.semibold },
  rowDivider: { height: 1, backgroundColor: colors.gray[100], marginLeft: spacing.base + 38 + spacing.sm },

  // Settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
  },
  settingLabel: { flex: 1, fontSize: typography.size.base, color: colors.text.primary },

  // Input
  input: {
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: typography.size.base,
    color: colors.text.primary,
    backgroundColor: colors.white,
  },

  // Orange primary button
  orangeBtn: {
    backgroundColor: colors.brand.orange,
    borderRadius: radius.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orangeBtnText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.white,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  modalTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.text.primary },
  modalSub: { fontSize: typography.size.sm, color: colors.text.secondary },

  // Dev tools
  devLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: '#f59e0b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: spacing.base,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  devCard: {
    backgroundColor: '#1f2937',
    borderRadius: radius.lg,
    marginHorizontal: spacing.base,
    padding: spacing.base,
    gap: spacing.sm,
  },
  devCardTitle: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: '#f9fafb' },
  devCardSub: { fontSize: typography.size.xs, color: '#9ca3af', lineHeight: typography.size.xs * 1.6 },
  devBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: '#dc2626', borderRadius: radius.md,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    alignSelf: 'flex-start', marginTop: spacing.xs,
  },
  devBtnText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: '#fff' },
});
