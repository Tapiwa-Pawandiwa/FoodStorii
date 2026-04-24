import React, { useState, useEffect } from 'react';
import {
  View,
  Text,

  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FoodStoriiWordmark } from '../../src/components/common/FoodStoriiWordmark';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Button } from '../../src/components/common/Button';
import { SelectableChip } from '../../src/components/common/SelectableChip';
import { useAuthStore } from '../../src/stores/auth.store';
import * as api from '../../src/services/api';
import { requestPushPermissionsAndGetToken } from '../../src/services/notifications';
import { PrimaryDriver, OnboardingStatus } from '@foodstorii/shared';
import { colors, spacing, radius, typography, shadows } from '../../src/theme';
import { usePostHog } from 'posthog-react-native';

// ---------------------------------------------------------------------------
// Kitchen item catalogue
// ---------------------------------------------------------------------------

const KITCHEN_ITEMS = {
  Proteins: ['Chicken', 'Beef', 'Lamb', 'Fish', 'Eggs', 'Tofu', 'Lentils'],
  Carbs: ['Rice', 'Pasta', 'Bread', 'Potatoes', 'Oats', 'Tortillas'],
  Vegetables: ['Broccoli', 'Spinach', 'Carrots', 'Onions', 'Tomatoes', 'Peppers'],
};

// ---------------------------------------------------------------------------
// Wizard state types
// ---------------------------------------------------------------------------

interface WizardData {
  primaryDrivers: PrimaryDriver[];
  householdSize: number;
  pickyEaters: boolean;
  avoidIngredients: string[];
  selectedKitchenItems: Set<string>;
  customItems: Record<string, string>;
  decisionHour: Date;
}

const DEFAULT_DECISION_HOUR = (() => {
  const d = new Date();
  d.setHours(17, 0, 0, 0);
  return d;
})();

// ---------------------------------------------------------------------------
// Step 0 — Warm Welcome
// ---------------------------------------------------------------------------

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <FoodStoriiWordmark size="md" />
      </View>
      <View style={styles.top}>
        <View style={styles.avatar}>
          <Ionicons name="chatbubble-ellipses-outline" size={36} color={colors.white} />
        </View>
        <Text style={styles.headline}>
          Hey, I'm Tina — your household food assistant.
        </Text>
        <Text style={styles.body}>I help you track what's in your kitchen, cut waste, and figure out what to cook. Takes about 90 seconds to set up.</Text>
        <View style={styles.featureRow}>
          {[
            { icon: 'cube-outline' as const, label: 'Track your pantry' },
            { icon: 'restaurant-outline' as const, label: 'Get recipe ideas' },
            { icon: 'cart-outline' as const, label: 'Smart shopping lists' },
          ].map((f) => (
            <View key={f.label} style={styles.featureItem}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={f.icon} size={20} color={colors.green[600]} />
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.actions}>
        <Button label="Let's go" onPress={onNext} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Primary Driver
// ---------------------------------------------------------------------------

const DRIVER_OPTIONS: { label: string; value: PrimaryDriver; icon: keyof typeof Ionicons.glyphMap; sub: string }[] = [
  { label: 'Save money', value: PrimaryDriver.saving_money, icon: 'wallet-outline', sub: 'Reduce waste and spend less on groceries' },
  { label: 'Eat better', value: PrimaryDriver.improving_health, icon: 'leaf-outline', sub: 'Healthier choices, diets, and meal plans' },
  { label: 'Make life easier', value: PrimaryDriver.pure_convenience, icon: 'flash-outline', sub: 'Less time thinking about food, faster meals' },
];

function StepPrimaryDriver({
  selected,
  onToggle,
  onNext,
}: {
  selected: PrimaryDriver[];
  onToggle: (v: PrimaryDriver) => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <FoodStoriiWordmark size="md" />
      </View>
      <View style={styles.top}>
        <View style={{ width: '100%' }}>
          <Text style={styles.stepLabel}>Step 1 of 4</Text>
          <Text style={styles.headline}>What matters most to you?</Text>
          <Text style={styles.subHeadline}>Pick everything that applies.</Text>
        </View>
        <View style={styles.cardList}>
          {DRIVER_OPTIONS.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => onToggle(opt.value)}
                activeOpacity={0.7}
                style={[styles.driverCard, isSelected && styles.driverCardSelected]}
              >
                <View style={[styles.driverIconWrap, isSelected && styles.driverIconWrapSelected]}>
                  <Ionicons name={opt.icon} size={22} color={isSelected ? colors.green[600] : colors.text.secondary} />
                </View>
                <View style={styles.driverText}>
                  <Text style={[styles.driverLabel, isSelected && styles.driverLabelSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.driverSub}>{opt.sub}</Text>
                </View>
                <View style={[styles.driverCheck, isSelected && styles.driverCheckSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color={colors.white} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={styles.actions}>
        <Button label="Next" onPress={onNext} disabled={selected.length === 0} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Household & Dietary
// ---------------------------------------------------------------------------

const AVOID_PRESETS = ['Pork', 'Shellfish', 'Gluten', 'Peanuts', 'Dairy', 'Eggs', 'Chicken', 'Sesame', 'Wheat', 'Fish'];

function StepHousehold({
  householdSize,
  pickyEaters,
  avoidIngredients,
  onChangeSize,
  onTogglePicky,
  onToggleAvoid,
  onNext,
}: {
  householdSize: number;
  pickyEaters: boolean;
  avoidIngredients: string[];
  onChangeSize: (n: number) => void;
  onTogglePicky: (v: boolean) => void;
  onToggleAvoid: (item: string) => void;
  onNext: () => void;
}) {
  const [customText, setCustomText] = useState('');

  function commitCustom() {
    const items = customText.split(',').map((s) => s.trim()).filter(Boolean);
    items.forEach((item) => {
      const normalised = item.charAt(0).toUpperCase() + item.slice(1).toLowerCase();
      if (!avoidIngredients.includes(normalised)) onToggleAvoid(normalised);
    });
    setCustomText('');
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <FoodStoriiWordmark size="md" />
      <Text style={styles.stepLabel}>Step 2 of 4</Text>
      <Text style={styles.headline}>Who am I cooking for?</Text>

      {/* Household size stepper */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Household size</Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            onPress={() => onChangeSize(Math.max(1, householdSize - 1))}
            style={styles.stepperBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.stepperBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.stepperValue}>{householdSize}</Text>
          <TouchableOpacity
            onPress={() => onChangeSize(Math.min(10, householdSize + 1))}
            style={styles.stepperBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.stepperBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Picky eaters toggle */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Picky eaters?</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            onPress={() => onTogglePicky(true)}
            style={[styles.toggleBtn, pickyEaters && styles.toggleBtnSelected]}
          >
            <Text style={[styles.toggleBtnText, pickyEaters && styles.toggleBtnTextSelected]}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onTogglePicky(false)}
            style={[styles.toggleBtn, !pickyEaters && styles.toggleBtnSelected]}
          >
            <Text style={[styles.toggleBtnText, !pickyEaters && styles.toggleBtnTextSelected]}>Not really</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Avoid ingredients */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Anything to avoid?</Text>
        <Text style={styles.sectionHint}>Tap to select, or type something specific below.</Text>
        <View style={styles.chipWrap}>
          {AVOID_PRESETS.map((item) => {
            const active = avoidIngredients.includes(item);
            return (
              <TouchableOpacity
                key={item}
                onPress={() => onToggleAvoid(item)}
                activeOpacity={0.7}
                style={[styles.avoidChip, active && styles.avoidChipSelected]}
              >
                {active && <Ionicons name="close-circle" size={14} color={colors.red[500]} style={{ marginRight: 4 }} />}
                <Text style={[styles.avoidChipText, active && styles.avoidChipTextSelected]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TextInput
          style={[styles.textInput, styles.textInputSmall]}
          value={customText}
          onChangeText={setCustomText}
          onSubmitEditing={commitCustom}
          onBlur={commitCustom}
          placeholder="Other (e.g. tree nuts, soy)…"
          placeholderTextColor={colors.text.tertiary}
          returnKeyType="done"
        />
        {avoidIngredients.filter((i) => !AVOID_PRESETS.includes(i)).length > 0 && (
          <View style={[styles.chipWrap, { marginTop: spacing.sm }]}>
            {avoidIngredients.filter((i) => !AVOID_PRESETS.includes(i)).map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => onToggleAvoid(item)}
                activeOpacity={0.7}
                style={[styles.avoidChip, styles.avoidChipSelected]}
              >
                <Ionicons name="close-circle" size={14} color={colors.red[500]} style={{ marginRight: 4 }} />
                <Text style={[styles.avoidChipText, styles.avoidChipTextSelected]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.actions, styles.actionsInline]}>
        <Button label="Next" onPress={onNext} />
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Kitchen Walkthrough
// ---------------------------------------------------------------------------

function StepKitchen({
  selectedItems,
  customItems,
  onToggleItem,
  onChangeCustom,
  onNext,
}: {
  selectedItems: Set<string>;
  customItems: Record<string, string>;
  onToggleItem: (item: string) => void;
  onChangeCustom: (category: string, value: string) => void;
  onNext: () => void;
}) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.stepLabel}>Step 3 of 4</Text>
      <Text style={styles.headline}>What's in your kitchen right now?</Text>
      <Text style={styles.body}>Just a rough idea — Tina refines this over time.</Text>

      {(Object.entries(KITCHEN_ITEMS) as [string, string[]][]).map(([category, items]) => (
        <View key={category} style={styles.section}>
          <Text style={styles.sectionLabel}>{category}</Text>
          <View style={styles.chipWrap}>
            {items.map((item) => (
              <SelectableChip
                key={item}
                label={item}
                selected={selectedItems.has(item)}
                onPress={() => onToggleItem(item)}
                style={styles.chipGap}
              />
            ))}
          </View>
          <TextInput
            style={[styles.textInput, styles.textInputSmall]}
            value={customItems[category] ?? ''}
            onChangeText={(v) => onChangeCustom(category, v)}
            placeholder="Add custom..."
            placeholderTextColor={colors.text.tertiary}
            returnKeyType="done"
          />
        </View>
      ))}

      <View style={[styles.actions, styles.actionsInline]}>
        <Button label="Next" onPress={onNext} />
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Decision Hour
// ---------------------------------------------------------------------------

function StepDecisionHour({
  time,
  showAndroidPicker,
  onTimeChange,
  onShowAndroidPicker,
  onFinish,
  saving,
}: {
  time: Date;
  showAndroidPicker: boolean;
  onTimeChange: (date: Date) => void;
  onShowAndroidPicker: () => void;
  onFinish: () => void;
  saving: boolean;
}) {
  const formatted = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  function handleChange(_event: DateTimePickerEvent, selected?: Date) {
    if (selected) onTimeChange(selected);
  }

  return (
    <View style={styles.stepContainer}>
      <View style={styles.top}>
        <Text style={styles.stepLabel}>Step 4 of 4</Text>
        <Text style={styles.headline}>When do you start thinking about dinner?</Text>
        <Text style={styles.body}>
          I'll check in before this time with ideas based on what you have.
        </Text>

        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={time}
            mode="time"
            display="spinner"
            onChange={handleChange}
            style={styles.iosPicker}
          />
        ) : (
          <>
            <TouchableOpacity style={styles.androidTimeButton} onPress={onShowAndroidPicker}>
              <Text style={styles.androidTimeText}>{formatted}</Text>
              <Text style={styles.androidTimeTap}>Tap to change</Text>
            </TouchableOpacity>
            {showAndroidPicker && (
              <DateTimePicker
                value={time}
                mode="time"
                display="default"
                onChange={(e, d) => {
                  if (d) onTimeChange(d);
                }}
              />
            )}
          </>
        )}
      </View>

      <View style={styles.actions}>
        <Button
          label="Finish setup"
          onPress={onFinish}
          disabled={saving}
          loading={saving}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Wizard
// ---------------------------------------------------------------------------

export default function OnboardingIntroScreen() {
  const { householdId, markOnboardingComplete } = useAuthStore();
  const posthog = usePostHog();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  useEffect(() => {
    posthog.capture('onboarding_step_viewed', { step });
  }, [step]);

  const [data, setData] = useState<WizardData>({
    primaryDrivers: [],
    householdSize: 2,
    pickyEaters: false,
    avoidIngredients: [],
    selectedKitchenItems: new Set(),
    customItems: {},
    decisionHour: DEFAULT_DECISION_HOUR,
  });

  function togglePrimaryDriver(v: PrimaryDriver) {
    setData((prev) => {
      const next = prev.primaryDrivers.includes(v)
        ? prev.primaryDrivers.filter((d) => d !== v)
        : [...prev.primaryDrivers, v];
      return { ...prev, primaryDrivers: next };
    });
  }

  function toggleKitchenItem(item: string) {
    setData((prev) => {
      const next = new Set(prev.selectedKitchenItems);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return { ...prev, selectedKitchenItems: next };
    });
  }

  async function handleFinish() {
    if (!householdId) return;
    setSaving(true);
    try {
      const hours = data.decisionHour.getHours().toString().padStart(2, '0');
      const minutes = data.decisionHour.getMinutes().toString().padStart(2, '0');
      const decisionHour = `${hours}:${minutes}`;

      const avoidIngredients = data.avoidIngredients;

      // Build initial inventory items from kitchen walkthrough
      const allSelected = [
        ...Array.from(data.selectedKitchenItems),
        ...Object.values(data.customItems)
          .flatMap((s) => s.split(',').map((x) => x.trim()))
          .filter(Boolean),
      ];

      // Save profile + inventory + schedule nudge in parallel
      await Promise.all([
        api.updateProfile({
          primaryDriver: data.primaryDrivers[0] ?? undefined,
          householdSize: data.householdSize,
          pickyEaters: data.pickyEaters,
          avoidIngredients: avoidIngredients.length > 0 ? avoidIngredients : undefined,
          decisionHour,
          onboardingStatus: OnboardingStatus.in_progress,
        }),
        allSelected.length > 0
          ? api.addInventoryItems(allSelected.map((name) => ({ name }))).catch(() => null)
          : Promise.resolve(),
      ]);

      // Request push permission + register token
      const token = await requestPushPermissionsAndGetToken();
      if (token) {
        await api.registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
        await api.scheduleDailyNudge();
      }

      posthog.capture('onboarding_completed', {
        household_size: data.householdSize,
        primary_drivers: data.primaryDrivers,
        picky_eaters: data.pickyEaters,
        avoid_ingredients_count: data.avoidIngredients.length,
        kitchen_items_count: data.selectedKitchenItems.size,
      });
      await markOnboardingComplete();
      router.replace('/(onboarding)/whatsapp-link');
    } catch (err) {
      console.error('[OnboardingWizard] handleFinish error:', err);
      // Still proceed — don't block user on API error
      await markOnboardingComplete().catch(() => null);
      router.replace('/(onboarding)/whatsapp-link');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {step === 0 && (
        <StepWelcome
          onNext={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <StepPrimaryDriver
          selected={data.primaryDrivers}
          onToggle={togglePrimaryDriver}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <StepHousehold
          householdSize={data.householdSize}
          pickyEaters={data.pickyEaters}
          avoidIngredients={data.avoidIngredients}
          onChangeSize={(n) => setData((d) => ({ ...d, householdSize: n }))}
          onTogglePicky={(v) => setData((d) => ({ ...d, pickyEaters: v }))}
          onToggleAvoid={(item) =>
            setData((d) => ({
              ...d,
              avoidIngredients: d.avoidIngredients.includes(item)
                ? d.avoidIngredients.filter((i) => i !== item)
                : [...d.avoidIngredients, item],
            }))
          }
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <StepKitchen
          selectedItems={data.selectedKitchenItems}
          customItems={data.customItems}
          onToggleItem={toggleKitchenItem}
          onChangeCustom={(cat, val) =>
            setData((d) => ({ ...d, customItems: { ...d.customItems, [cat]: val } }))
          }
          onNext={() => setStep(4)}
        />
      )}

      {step === 4 && (
        <StepDecisionHour
          time={data.decisionHour}
          showAndroidPicker={showAndroidPicker}
          onTimeChange={(d) => {
            setData((prev) => ({ ...prev, decisionHour: d }));
            setShowAndroidPicker(false);
          }}
          onShowAndroidPicker={() => setShowAndroidPicker(true)}
          onFinish={handleFinish}
          saving={saving}
        />
      )}

      {/* Progress dots */}
      {step > 0 && (
        <View style={styles.progressDots}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, step >= i && styles.dotActive]} />
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },

  stepContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['3xl'],
  },

  stepHeader: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },

  top: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl, paddingTop: spacing.xl },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.green[600],
    alignItems: 'center',
    justifyContent: 'center',
  },

  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  featureItem: { flex: 1, alignItems: 'center', gap: spacing.xs },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: { fontSize: typography.size.xs, color: colors.text.secondary, textAlign: 'center' },

  subHeadline: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 4,
  },

  stepLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },

  headline: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: typography.size['2xl'] * 1.25,
  },
  body: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    lineHeight: typography.size.base * 1.6,
    textAlign: 'center',
  },

  actions: { gap: spacing.sm, paddingBottom: spacing.sm },
  actionsInline: { marginTop: spacing['2xl'] },

  // Primary driver cards
  cardList: { width: '100%', gap: spacing.sm },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
    gap: spacing.md,
    ...shadows.sm,
  },
  driverCardSelected: {
    borderColor: colors.green[600],
    backgroundColor: colors.green[50],
  },
  driverIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  driverIconWrapSelected: {
    backgroundColor: colors.green[100],
  },
  driverText: { flex: 1 },
  driverLabel: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  driverLabelSelected: { color: colors.green[700] },
  driverSub: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
    lineHeight: typography.size.sm * 1.4,
  },
  driverCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  driverCheckSelected: {
    backgroundColor: colors.green[600],
    borderColor: colors.green[600],
  },

  // Stepper
  section: { marginBottom: spacing.xl },
  sectionLabel: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  sectionHint: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 22,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    lineHeight: 26,
  },
  stepperValue: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    minWidth: 40,
    textAlign: 'center',
  },

  // Toggle
  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  toggleBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  toggleBtnSelected: {
    borderColor: colors.green[600],
    backgroundColor: colors.green[50],
  },
  toggleBtnText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
  toggleBtnTextSelected: {
    color: colors.green[700],
    fontWeight: typography.weight.semibold,
  },

  // Text input
  textInput: {
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: typography.size.base,
    color: colors.text.primary,
    backgroundColor: colors.white,
  },
  textInputSmall: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },


  // Chips
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  chipGap: {},

  // Avoid preset pills
  avoidChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  avoidChipSelected: {
    borderColor: colors.red[500],
    backgroundColor: colors.red[50],
  },
  avoidChipText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  avoidChipTextSelected: {
    color: colors.red[600],
  },

  // iOS time picker
  iosPicker: {
    width: '100%',
    marginTop: spacing.md,
  },

  // Android time button
  androidTimeButton: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.green[200],
    backgroundColor: colors.green[50],
    width: '100%',
    marginTop: spacing.md,
  },
  androidTimeText: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.bold,
    color: colors.green[700],
  },
  androidTimeTap: {
    fontSize: typography.size.sm,
    color: colors.green[600],
    marginTop: spacing.xs,
  },

  // Progress dots
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray[200],
  },
  dotActive: {
    backgroundColor: colors.green[600],
  },
});
