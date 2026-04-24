import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import * as api from '../../src/services/api';
import { useAuthStore } from '../../src/stores/auth.store';

// ── Item categories ───────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    label: 'STAPLES',
    items: ['Eggs', 'Rice', 'Pasta', 'Bread', 'Potatoes', 'Oats'],
    location: 'pantry' as const,
  },
  {
    label: 'PROTEIN',
    items: ['Chicken', 'Mince', 'Canned Tuna', 'Lentils', 'Tofu'],
    location: 'fridge' as const,
  },
  {
    label: 'VEG & AROMATICS',
    items: ['Onion', 'Garlic', 'Tomatoes', 'Spinach', 'Carrots', 'Peppers'],
    location: 'fridge' as const,
  },
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

// ── Screen ────────────────────────────────────────────────────────────────────

export default function KitchenScreen() {
  const { accessToken } = useAuthStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  function toggleItem(item: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  async function handleNext() {
    if (saving) return;
    setSaving(true);
    try {
      if (selected.size > 0 && accessToken) {
        const items = Array.from(selected).map((name) => ({ name }));
        await api.addInventoryItems(items).catch(() => {});
      }
    } finally {
      setSaving(false);
    }
    router.push('/(onboarding)/dinner-time');
  }

  return (
    <SafeAreaView style={S.safe}>
      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

        <ProgressDots step={3} total={4} />

        <Text style={S.headline}>What's in your kitchen{'\n'}right now?</Text>
        <Text style={S.subtitle}>Just pick what you have. We'll handle the rest.</Text>

        {CATEGORIES.map((cat) => (
          <View key={cat.label} style={S.section}>
            <Text style={S.sectionLabel}>{cat.label}</Text>
            <View style={S.chips}>
              {cat.items.map((item) => {
                const active = selected.has(item);
                return (
                  <TouchableOpacity
                    key={item}
                    style={[S.chip, active && S.chipActive]}
                    onPress={() => toggleItem(item)}
                    activeOpacity={0.85}
                  >
                    <Text style={[S.chipText, active && S.chipTextActive]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <TouchableOpacity style={S.addMore} onPress={() => router.push('/(tabs)/inventory')}>
          <Text style={S.addMoreText}>+ Add something else</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={S.footer}>
        <TouchableOpacity
          style={S.nextBtn}
          onPress={handleNext}
          disabled={saving}
          activeOpacity={0.88}
        >
          <Text style={S.nextBtnText}>
            {selected.size > 0 ? `Next → (${selected.size} selected)` : 'Skip for now →'}
          </Text>
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
    lineHeight: 18,
  },

  section: { marginTop: 24 },
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

  addMore: { marginTop: 16 },
  addMoreText: {
    fontSize: 14,
    color: '#48A111',
    fontWeight: '500',
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
