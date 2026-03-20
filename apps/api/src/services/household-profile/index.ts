import { supabase } from '../../db/client';
import type { HouseholdProfile, UpdateHouseholdProfileInput } from '@foodstorii/shared';
import { OnboardingStatus, PrimaryDriver } from '@foodstorii/shared';

export async function getHouseholdProfile(householdId: string): Promise<HouseholdProfile | null> {
  const { data, error } = await supabase
    .from('household_profiles')
    .select('*')
    .eq('household_id', householdId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // no row found
    throw new Error(`Failed to get household profile: ${error.message}`);
  }

  return mapRow(data);
}

export async function upsertHouseholdProfile(
  householdId: string,
  input: UpdateHouseholdProfileInput,
): Promise<HouseholdProfile> {
  const updates: Record<string, unknown> = { household_id: householdId, updated_at: new Date().toISOString() };

  if (input.householdSize !== undefined) updates.household_size = input.householdSize;
  if (input.cookingStyle !== undefined) updates.cooking_style = input.cookingStyle;
  if (input.dietaryPreferences !== undefined) updates.dietary_preferences = input.dietaryPreferences;
  if (input.healthGoals !== undefined) updates.health_goals = input.healthGoals;
  if (input.storePreferences !== undefined) updates.store_preferences = input.storePreferences;
  if (input.foodWastePainPoints !== undefined) updates.food_waste_pain_points = input.foodWastePainPoints;
  if (input.notificationTolerance !== undefined) updates.notification_tolerance = input.notificationTolerance;
  if (input.automationReadiness !== undefined) updates.automation_readiness = input.automationReadiness;
  if (input.primaryDriver !== undefined) updates.primary_driver = input.primaryDriver;
  if (input.decisionHour !== undefined) updates.decision_hour = input.decisionHour;
  if (input.avoidIngredients !== undefined) updates.avoid_ingredients = input.avoidIngredients;
  if (input.pickyEaters !== undefined) updates.picky_eaters = input.pickyEaters;
  if (input.onboardingStatus !== undefined) {
    updates.onboarding_status = input.onboardingStatus;
    if (input.onboardingStatus === OnboardingStatus.completed) {
      updates.onboarding_completed_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from('household_profiles')
    .upsert(updates, { onConflict: 'household_id' })
    .select()
    .single();

  if (error) throw new Error(`Failed to upsert household profile: ${error.message}`);
  return mapRow(data);
}

function mapRow(row: Record<string, unknown>): HouseholdProfile {
  return {
    id: row.id as string,
    householdId: row.household_id as string,
    householdSize: row.household_size as number | null,
    cookingStyle: row.cooking_style as string[] | null,
    dietaryPreferences: row.dietary_preferences as string[] | null,
    healthGoals: row.health_goals as string[] | null,
    storePreferences: row.store_preferences as string[] | null,
    foodWastePainPoints: row.food_waste_pain_points as string[] | null,
    notificationTolerance: row.notification_tolerance as HouseholdProfile['notificationTolerance'],
    automationReadiness: row.automation_readiness as HouseholdProfile['automationReadiness'],
    onboardingStatus: (row.onboarding_status as HouseholdProfile['onboardingStatus']) ?? OnboardingStatus.not_started,
    onboardingCompletedAt: row.onboarding_completed_at as string | null,
    primaryDriver: (row.primary_driver as PrimaryDriver) ?? null,
    decisionHour: row.decision_hour as string | null,
    avoidIngredients: row.avoid_ingredients as string[] | null,
    pickyEaters: row.picky_eaters as boolean | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function registerPushToken(
  householdId: string,
  token: string,
  platform: 'ios' | 'android',
): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      { household_id: householdId, token, platform, is_active: true, updated_at: new Date().toISOString() },
      { onConflict: 'household_id,token' },
    );

  if (error) throw new Error(`Failed to register push token: ${error.message}`);
}
