import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../../src/services/api';
import { useAuthStore } from '../../src/stores/auth.store';
import { MEAL_TYPES_KEY } from './meal-types';

// ── Types ─────────────────────────────────────────────────────────────────────

type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'meal_prep';
type FreqOption = 'every_day' | 'specific_days' | 'whenever';

interface MealPref {
  frequency: FreqOption | null;
  days: string[];
  hour: number;
  minute: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MEAL_LABELS: Record<MealKey, string> = {
  breakfast: 'Breakfast',
  lunch:     'Lunch',
  dinner:    'Dinner',
  meal_prep: 'Meal prep',
};

const MEAL_DEFAULTS: Record<MealKey, { hour: number; minute: string }> = {
  breakfast: { hour: 7,  minute: '30' },
  lunch:     { hour: 12, minute: '30' },
  dinner:    { hour: 18, minute: '00' },
  meal_prep: { hour: 10, minute: '00' },
};

const FREQ_OPTIONS: { key: FreqOption; label: string }[] = [
  { key: 'every_day',     label: 'Every day' },
  { key: 'specific_days', label: 'Specific days' },
  { key: 'whenever',      label: 'Whenever I feel like it' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = ['00', '15', '30', '45'];

const PICKER_ITEM_H = 52;

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

// ── Custom scroll wheel ───────────────────────────────────────────────────────

function ScrollPicker<T extends string | number>({
  items,
  selected,
  onSelect,
  formatItem,
}: {
  items: T[];
  selected: T;
  onSelect: (v: T) => void;
  formatItem?: (v: T) => string;
}) {
  const listRef = useRef<FlatList>(null);
  const [ready, setReady] = useState(false);

  const format = formatItem ?? ((v: T) => String(v));

  useEffect(() => {
    if (!ready) return;
    const idx = items.indexOf(selected);
    if (idx >= 0) {
      listRef.current?.scrollToIndex({ index: idx, animated: false, viewPosition: 0.5 });
    }
  }, [ready]);

  return (
    <View style={Picker.col}>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => String(item)}
        showsVerticalScrollIndicator={false}
        snapToInterval={PICKER_ITEM_H}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: PICKER_ITEM_H,
          offset: PICKER_ITEM_H * index,
          index,
        })}
        onLayout={() => setReady(true)}
        renderItem={({ item }) => {
          const isSelected = item === selected;
          return (
            <TouchableOpacity
              style={[Picker.item, isSelected && Picker.itemSelected]}
              onPress={() => onSelect(item)}
              activeOpacity={0.7}
            >
              <Text style={[Picker.text, isSelected && Picker.textSelected]}>
                {format(item)}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

// ── Meal section ──────────────────────────────────────────────────────────────

function MealSection({
  mealKey,
  pref,
  onChange,
}: {
  mealKey: MealKey;
  pref: MealPref;
  onChange: (p: MealPref) => void;
}) {
  const label = MEAL_LABELS[mealKey];
  const isMealPrep = mealKey === 'meal_prep';

  const freqOptions = isMealPrep
    ? FREQ_OPTIONS.filter((f) => f.key !== 'every_day')
    : FREQ_OPTIONS;

  function setFreq(freq: FreqOption) {
    onChange({ ...pref, frequency: freq, days: [] });
  }

  function toggleDay(dayKey: string) {
    const next = pref.days.includes(dayKey)
      ? pref.days.filter((d) => d !== dayKey)
      : [...pref.days, dayKey];
    onChange({ ...pref, days: next });
  }

  const showDays = pref.frequency === 'specific_days' || isMealPrep;
  const showTime = pref.frequency !== null && pref.frequency !== 'whenever';

  return (
    <View style={MS.section}>
      {/* Meal header */}
      <Text style={MS.mealLabel}>{label.toUpperCase()}</Text>
      <Text style={MS.mealSub}>{label} — how often?</Text>

      {/* Frequency chips */}
      <View style={MS.freqRow}>
        {freqOptions.map((f) => {
          const active = pref.frequency === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[MS.freqChip, active && MS.freqChipActive]}
              onPress={() => setFreq(f.key)}
              activeOpacity={0.85}
            >
              <Text style={[MS.freqChipText, active && MS.freqChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Day chips */}
      {showDays && (
        <View style={MS.daysRow}>
          {DAYS.map((day, i) => {
            const dayKey = DAY_KEYS[i];
            const active = pref.days.includes(dayKey);
            return (
              <TouchableOpacity
                key={dayKey}
                style={[MS.dayChip, active && MS.dayChipActive]}
                onPress={() => toggleDay(dayKey)}
                activeOpacity={0.85}
              >
                <Text style={[MS.dayChipText, active && MS.dayChipTextActive]}>{day}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Time picker */}
      {showTime && (
        <View style={MS.pickerWrap}>
          <Text style={MS.pickerLabel}>What time do you want {label.toLowerCase()} ideas?</Text>
          <View style={MS.pickerRow}>
            <ScrollPicker
              items={HOURS}
              selected={pref.hour}
              onSelect={(h) => onChange({ ...pref, hour: h })}
              formatItem={(h) => String(h).padStart(2, '0')}
            />
            <Text style={MS.colon}>:</Text>
            <ScrollPicker
              items={MINUTES}
              selected={pref.minute}
              onSelect={(m) => onChange({ ...pref, minute: m })}
            />
          </View>
          <Text style={MS.timeDisplay}>
            {String(pref.hour).padStart(2, '0')}:{pref.minute}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function MealTimesScreen() {
  const { accessToken } = useAuthStore();
  const [mealKeys, setMealKeys] = useState<MealKey[]>(['dinner']);
  const [prefs, setPrefs] = useState<Record<string, MealPref>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(MEAL_TYPES_KEY).then((raw) => {
      if (!raw) return;
      const keys: MealKey[] = JSON.parse(raw);
      setMealKeys(keys);
      const initial: Record<string, MealPref> = {};
      for (const key of keys) {
        initial[key] = {
          frequency: key === 'meal_prep' ? 'specific_days' : null,
          days: [],
          hour: MEAL_DEFAULTS[key].hour,
          minute: MEAL_DEFAULTS[key].minute,
        };
      }
      setPrefs(initial);
    });
  }, []);

  function updatePref(key: MealKey, p: MealPref) {
    setPrefs((prev) => ({ ...prev, [key]: p }));
  }

  async function handleFinish() {
    if (saving) return;
    setSaving(true);
    try {
      const preferences = mealKeys.map((key) => {
        const p = prefs[key] ?? { frequency: null, days: [], hour: MEAL_DEFAULTS[key].hour, minute: MEAL_DEFAULTS[key].minute };
        const nudge_time = p.frequency !== 'whenever'
          ? `${String(p.hour).padStart(2, '0')}:${p.minute}`
          : '';
        return {
          meal_type: key,
          days: p.frequency === 'specific_days' ? p.days : p.frequency === 'every_day' ? DAY_KEYS : [],
          nudge_time,
        };
      });

      if (accessToken) {
        await api.saveMealPreferences(preferences).catch(() => {});
      }

      // Store locally for post-signup flush
      await AsyncStorage.setItem('fs_pending_meal_prefs', JSON.stringify(preferences));
    } finally {
      setSaving(false);
    }
    router.replace('/(onboarding)/tina-preview');
  }

  return (
    <SafeAreaView style={S.safe}>
      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>
        <ProgressDots step={5} total={5} />

        <Text style={S.headline}>When do you{'\n'}usually eat?</Text>
        <Text style={S.subtitle}>We'll send reminders at the right time.</Text>

        {mealKeys.map((key) => (
          <MealSection
            key={key}
            mealKey={key}
            pref={prefs[key] ?? {
              frequency: null,
              days: [],
              hour: MEAL_DEFAULTS[key].hour,
              minute: MEAL_DEFAULTS[key].minute,
            }}
            onChange={(p) => updatePref(key, p)}
          />
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={S.footer}>
        <TouchableOpacity
          style={[S.nextBtn, saving && S.nextBtnDisabled]}
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

// ── Styles ────────────────────────────────────────────────────────────────────

const P = StyleSheet.create({
  dots: { flexDirection: 'row', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 22, backgroundColor: '#25671E' },
  dotDone: { width: 22, backgroundColor: '#25671E', opacity: 0.4 },
  dotInactive: { width: 6, backgroundColor: '#EAE4E4' },
});

const Picker = StyleSheet.create({
  col: {
    flex: 1,
    height: PICKER_ITEM_H * 3,
    overflow: 'hidden',
  },
  item: {
    height: PICKER_ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  itemSelected: {
    backgroundColor: '#F0F8EC',
  },
  text: {
    fontSize: 22,
    color: '#C4BEB8',
    fontWeight: '400',
  },
  textSelected: {
    fontSize: 32,
    color: '#25671E',
    fontWeight: '700',
  },
});

const MS = StyleSheet.create({
  section: {
    marginTop: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  mealLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#C4BEB8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  mealSub: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A18',
    marginBottom: 16,
  },

  freqRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  freqChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#EAE4E4',
    backgroundColor: '#F7F0F0',
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
    color: '#FFFFFF',
    fontWeight: '600',
  },

  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
  },
  dayChip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#EAE4E4',
    backgroundColor: '#F7F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: {
    backgroundColor: '#25671E',
    borderColor: '#25671E',
  },
  dayChipText: {
    fontSize: 11,
    color: '#5A5A52',
    fontWeight: '500',
  },
  dayChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  pickerWrap: {
    marginTop: 20,
  },
  pickerLabel: {
    fontSize: 13,
    color: '#5A5A52',
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F7F0F0',
    borderRadius: 16,
    padding: 8,
  },
  colon: {
    fontSize: 28,
    fontWeight: '700',
    color: '#25671E',
    marginBottom: 4,
  },
  timeDisplay: {
    fontSize: 28,
    fontWeight: '700',
    color: '#25671E',
    textAlign: 'center',
    marginTop: 10,
  },
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
