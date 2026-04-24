import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import * as api from '../../src/services/api';

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Halal', 'Kosher', 'Nut-free',
];

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

export default function HouseholdScreen() {
  const [size, setSize] = useState(2);
  const [pickyEaters, setPickyEaters] = useState(false);
  const [dietary, setDietary] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggleDietary(item: string) {
    setDietary((prev) =>
      prev.includes(item) ? prev.filter((d) => d !== item) : [...prev, item]
    );
  }

  async function handleNext() {
    if (saving) return;
    setSaving(true);
    try {
      await api.updateProfile({
        household_size: size,
        has_picky_eaters: pickyEaters,
        dietary_preferences: dietary,
      }).catch(() => {});
    } finally {
      setSaving(false);
    }
    router.push('/(onboarding)/kitchen');
  }

  return (
    <SafeAreaView style={S.safe}>
      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

        <ProgressDots step={2} total={4} />

        <Text style={S.headline}>Tell us about your{'\n'}household.</Text>
        <Text style={S.subtitle}>We'll adjust portions and suggestions.</Text>

        {/* Household size */}
        <View style={S.card}>
          <Text style={S.cardLabel}>HOW MANY PEOPLE?</Text>
          <View style={S.stepper}>
            <TouchableOpacity
              style={[S.stepBtn, S.stepBtnMinus]}
              onPress={() => setSize(Math.max(1, size - 1))}
              activeOpacity={0.8}
            >
              <Text style={S.stepBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={S.stepCount}>{size}</Text>
            <TouchableOpacity
              style={[S.stepBtn, S.stepBtnPlus]}
              onPress={() => setSize(Math.min(12, size + 1))}
              activeOpacity={0.8}
            >
              <Text style={[S.stepBtnText, { color: '#FFFFFF' }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Picky eaters */}
        <View style={[S.card, { marginTop: 10, flexDirection: 'row', alignItems: 'center' }]}>
          <View style={{ flex: 1 }}>
            <Text style={S.pickyTitle}>Any picky eaters?</Text>
            <Text style={S.pickySub}>We'll flag complex recipes</Text>
          </View>
          <Switch
            value={pickyEaters}
            onValueChange={setPickyEaters}
            trackColor={{ false: '#EAE4E4', true: '#48A111' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Dietary preferences */}
        <View style={S.dietSection}>
          <Text style={S.sectionLabel}>DIETARY PREFERENCES</Text>
          <View style={S.chips}>
            {DIETARY_OPTIONS.map((item) => {
              const active = dietary.includes(item);
              return (
                <TouchableOpacity
                  key={item}
                  style={[S.chip, active && S.chipActive]}
                  onPress={() => toggleDietary(item)}
                  activeOpacity={0.85}
                >
                  <Text style={[S.chipText, active && S.chipTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={S.footer}>
        <TouchableOpacity style={S.nextBtn} onPress={handleNext} disabled={saving} activeOpacity={0.88}>
          <Text style={S.nextBtnText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

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
    fontSize: 12,
    color: '#5A5A52',
    marginTop: 4,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginTop: 24,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#5A5A52',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAE4E4',
    backgroundColor: '#F7F0F0',
  },
  stepBtnMinus: {},
  stepBtnPlus: {
    backgroundColor: '#48A111',
    borderColor: '#48A111',
  },
  stepBtnText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A18',
  },
  stepCount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A18',
    minWidth: 40,
    textAlign: 'center',
  },

  pickyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A18',
  },
  pickySub: {
    fontSize: 12,
    color: '#5A5A52',
    marginTop: 2,
  },

  dietSection: { marginTop: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#5A5A52',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#EAE4E4',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#25671E',
    borderColor: '#25671E',
  },
  chipText: {
    fontSize: 13,
    color: '#5A5A52',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#F7F0F0',
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
  nextBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
