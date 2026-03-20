import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/auth.store';
import { useChatStore } from '../../src/stores/chat.store';
import { colors, spacing, typography, radius } from '../../src/theme';

export default function ProfileScreen() {
  const { userId, signOut } = useAuthStore();
  const { reset } = useChatStore();

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          reset();
          await signOut();
          router.replace('/(auth)/signin');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <Ionicons name="person-circle-outline" size={20} color={colors.text.secondary} />
          <Text style={styles.rowLabel} numberOfLines={1}>{userId ?? '—'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.row} onPress={handleSignOut} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={colors.red[600]} />
          <Text style={[styles.rowLabel, styles.signOutLabel]}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray[50] },
  header: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
  },
  title: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text.primary },
  section: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
  },
  rowLabel: { fontSize: typography.size.base, color: colors.text.primary, flex: 1 },
  signOutLabel: { color: colors.red[600], fontWeight: typography.weight.medium },
});
