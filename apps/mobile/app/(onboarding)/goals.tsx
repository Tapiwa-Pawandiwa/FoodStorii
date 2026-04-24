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
import { useAuthStore } from '../../src/stores/auth.store';
import * as api from '../../src/services/api';

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

// ── Goal option ───────────────────────────────────────────────────────────────

const GOALS = [
  {
    key: 'saving_money',
    emoji: '💸',
    title: 'Save money on food',
    subtitle: 'Track spend, reduce waste, shop smarter',
  },
  {
    key: 'improving_health',
    emoji: '🥗',
    title: 'Eat better, stress less',
    subtitle: 'Healthy meals without the overthinking',
  },
  {
    key: 'pure_convenience',
    emoji: '📋',
    title: 'Get organised',
    subtitle: 'Always know what\'s in your kitchen',
  },
] as const;

type GoalKey = typeof GOALS[number]['key'];

// ── Screen ────────────────────────────────────────────────────────────────────

export default function GoalsScreen() {
  const [selected, setSelected] = useState<GoalKey | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleNext() {
    if (!selected || saving) return;
    setSaving(true);
    try {
      // Save goal to household profile — best effort, continue if fails
      await api.updateProfile({ primary_driver: selected }).catch(() => {});
    } finally {
      setSaving(false);
    }
    router.push('/(onboarding)/household');
  }

  return (
    <SafeAreaView style={S.safe}>
      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

        <ProgressDots step={1} total={4} />

        <Text style={S.headline}>What matters most{'\n'}to you?</Text>
        <Text style={S.subtitle}>Pick the one that fits you best.</Text>

        <View style={S.cards}>
          {GOALS.map((g) => {
            const isSelected = selected === g.key;
            return (
              <TouchableOpacity
                key={g.key}
                style={[S.card, isSelected && S.cardSelected]}
                onPress={() => setSelected(g.key)}
                activeOpacity={0.85}
              >
                <View style={S.emojiCircle}>
                  <Text style={S.emoji}>{g.emoji}</Text>
                </View>
                <View style={S.cardText}>
                  <Text style={S.cardTitle}>{g.title}</Text>
                  <Text style={S.cardSub}>{g.subtitle}</Text>
                </View>
                <View style={[S.radio, isSelected && S.radioSelected]}>
                  {isSelected && <View style={S.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Pinned next button */}
      <View style={S.footer}>
        <TouchableOpacity
          style={[S.nextBtn, !selected && S.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!selected || saving}
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
  dots: { flexDirection: 'row', gap: 6, marginBottom: 0 },
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

  cards: {
    marginTop: 24,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAE4E4',
    borderRadius: 20,
    padding: 20,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardSelected: {
    borderWidth: 1.5,
    borderColor: '#25671E',
    backgroundColor: '#F0F8EC',
  },

  emojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },

  cardText: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A18',
  },
  cardSub: {
    fontSize: 12,
    color: '#5A5A52',
    marginTop: 2,
    lineHeight: 17,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#EAE4E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#48A111',
    backgroundColor: '#48A111',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
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
