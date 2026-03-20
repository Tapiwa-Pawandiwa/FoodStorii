import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/common/Button';
import { colors, spacing, typography } from '../../src/theme';

export default function JoinScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.top}>
          <View style={styles.logoMark}>
            <Text style={styles.logoLetter}>F</Text>
          </View>
          <Text style={styles.headline}>Join FoodStorii</Text>
          <Text style={styles.subtext}>Your household food assistant</Text>
        </View>

        <View style={styles.actions}>
          <Button
            label="Create account"
            onPress={() => router.push('/(auth)/signup')}
            style={styles.primaryBtn}
          />
          <Button
            label="Sign in"
            onPress={() => router.push('/(auth)/signin')}
            variant="secondary"
            style={styles.secondaryBtn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1, justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing['3xl'] },
  top: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.base },
  logoMark: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.green[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoLetter: { fontSize: 40, fontWeight: typography.weight.bold, color: colors.white },
  headline: { fontSize: typography.size['3xl'], fontWeight: typography.weight.bold, color: colors.text.primary },
  subtext: { fontSize: typography.size.base, color: colors.text.secondary },
  actions: { gap: spacing.md },
  primaryBtn: {},
  secondaryBtn: {},
});
