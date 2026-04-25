import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ─────────────────────────────────────────────────────────────────────

type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'meal_prep';
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// ── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <View style={P.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[P.dot, i < step ? P.dotDone : i === step - 1 ? P.dotActive : P.dotInactive]}
        />
      ))}
    </View>
  );
}

// ── Meal chips ────────────────────────────────────────────────────────────────

const MEALS: { key: MealKey; label: string; icon: IoniconsName }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
  { key: 'lunch',     label: 'Lunch',     icon: 'fast-food-outline' },
  { key: 'dinner',    label: 'Dinner',    icon: 'restaurant-outline' },
  { key: 'meal_prep', label: 'Meal prep', icon: 'layers-outline' },
];

export const MEAL_TYPES_KEY = 'fs_onboarding_meal_types';

// ── Screen ────────────────────────────────────────────────────────────────────

export default function MealTypesScreen() {
  const [selected, setSelected] = useState<Set<MealKey>>(new Set(['dinner']));

  function toggle(key: MealKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleNext() {
    if (selected.size === 0) return;
    // Persist selection for meal-times screen
    await AsyncStorage.setItem(MEAL_TYPES_KEY, JSON.stringify([...selected]));
    router.push('/(onboarding)/meal-times');
  }

  return (
    <SafeAreaView style={S.safe}>
      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>
        <ProgressDots step={4} total={5} />

        <Text style={S.headline}>Which meals do you{'\n'}usually cook?</Text>
        <Text style={S.subtitle}>We'll only plan around these.</Text>

        <View style={S.chips}>
          {MEALS.map((m) => {
            const active = selected.has(m.key);
            return (
              <TouchableOpacity
                key={m.key}
                style={[S.chip, active && S.chipActive]}
                onPress={() => toggle(m.key)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={m.icon}
                  size={20}
                  color={active ? '#FFFFFF' : '#5A5A52'}
                  style={{ marginRight: 8 }}
                />
                <Text style={[S.chipText, active && S.chipTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={S.footer}>
        <TouchableOpacity
          style={[S.nextBtn, selected.size === 0 && S.nextBtnDisabled]}
          onPress={handleNext}
          disabled={selected.size === 0}
          activeOpacity={0.88}
        >
          <Text style={S.nextBtnText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const P = StyleSheet.create({
  dots: { flexDirection: 'row', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 22, backgroundColor: '#25671E' },
  dotDone: { width: 22, backgroundColor: '#25671E', opacity: 0.4 },
  dotInactive: { width: 6, backgroundColor: '#EAE4E4' },
});

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F0F0' },
  scroll: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 120 },

  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A18',
    marginTop: 28,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    color: '#5A5A52',
    marginTop: 6,
    lineHeight: 20,
  },

  chips: {
    marginTop: 32,
    gap: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAE4E4',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  chipActive: {
    backgroundColor: '#25671E',
    borderColor: '#25671E',
  },
  chipText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A18',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F7F0F0',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#EAE4E4',
  },
  nextBtn: {
    backgroundColor: '#48A111',
    borderRadius: 999,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnDisabled: {
    backgroundColor: '#C4BEB8',
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
