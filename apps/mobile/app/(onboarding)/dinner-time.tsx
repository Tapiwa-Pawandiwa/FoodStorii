import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as api from '../../src/services/api';
import { useAuthStore } from '../../src/stores/auth.store';

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

const FREQUENCIES = ['Every day', 'A few times a week', 'Weekends only'];

const HOURS = Array.from({ length: 12 }, (_, i) => i + 12); // 12–23
const MINUTES = ['00', '15', '30', '45'];

export default function DinnerTimeScreen() {
  const { markOnboardingComplete } = useAuthStore();
  const [frequency, setFrequency] = useState<string | null>('A few times a week');
  const [hour, setHour] = useState(18);
  const [minute, setMinute] = useState('00');
  const [saving, setSaving] = useState(false);

  async function handleFinish() {
    if (saving) return;
    setSaving(true);
    try {
      const dinnerTime = `${hour.toString().padStart(2, '0')}:${minute}`;
      await api.updateProfile({
        cooking_frequency: frequency,
        decision_hour: dinnerTime,
      }).catch(() => {});
      await markOnboardingComplete();
    } finally {
      setSaving(false);
    }
    router.replace('/(onboarding)/tina-preview');
  }

  return (
    <SafeAreaView style={S.safe}>
      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

        <ProgressDots step={4} total={4} />

        <Text style={S.headline}>When do you{'\n'}usually eat?</Text>
        <Text style={S.subtitle}>We'll remind you in time to start prepping.</Text>

        {/* Cooking frequency */}
        <View style={S.section}>
          <Text style={S.sectionLabel}>HOW OFTEN DO YOU COOK?</Text>
          <View style={S.frequencyChips}>
            {FREQUENCIES.map((f) => {
              const active = frequency === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[S.freqChip, active && S.freqChipActive]}
                  onPress={() => setFrequency(f)}
                  activeOpacity={0.85}
                >
                  <Text style={[S.freqChipText, active && S.freqChipTextActive]}>{f}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Time picker */}
        <View style={S.section}>
          <Text style={S.sectionLabel}>USUAL DINNER TIME</Text>
          <View style={S.timePicker}>
            {/* Hour selector */}
            <ScrollView style={S.pickerCol} showsVerticalScrollIndicator={false}>
              {HOURS.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[S.pickerItem, hour === h && S.pickerItemActive]}
                  onPress={() => setHour(h)}
                >
                  <Text style={[S.pickerText, hour === h && S.pickerTextActive]}>
                    {h.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={S.colon}>:</Text>

            {/* Minute selector */}
            <ScrollView style={S.pickerCol} showsVerticalScrollIndicator={false}>
              {MINUTES.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[S.pickerItem, minute === m && S.pickerItemActive]}
                  onPress={() => setMinute(m)}
                >
                  <Text style={[S.pickerText, minute === m && S.pickerTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Text style={S.timeDisplay}>
            {hour.toString().padStart(2, '0')}:{minute}
          </Text>
        </View>
      </ScrollView>

      <View style={S.footer}>
        <TouchableOpacity
          style={S.nextBtn}
          onPress={handleFinish}
          disabled={saving}
          activeOpacity={0.88}
        >
          <Text style={S.nextBtnText}>See what Tina found →</Text>
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
    marginBottom: 12,
  },

  frequencyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#EAE4E4',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqChipActive: {
    backgroundColor: '#25671E',
    borderColor: '#25671E',
  },
  freqChipText: {
    fontSize: 13,
    color: '#5A5A52',
    fontWeight: '500',
  },
  freqChipTextActive: {
    color: '#F7F0F0',
  },

  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
  },
  pickerCol: {
    flex: 1,
    maxHeight: 140,
  },
  pickerItem: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  pickerItemActive: {
    backgroundColor: '#F0F8EC',
  },
  pickerText: {
    fontSize: 20,
    color: '#C4BEB8',
    fontWeight: '400',
  },
  pickerTextActive: {
    fontSize: 28,
    color: '#25671E',
    fontWeight: '700',
  },
  colon: {
    fontSize: 28,
    fontWeight: '700',
    color: '#25671E',
  },

  timeDisplay: {
    fontSize: 32,
    fontWeight: '700',
    color: '#25671E',
    textAlign: 'center',
    marginTop: 12,
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
