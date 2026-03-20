import { supabase } from '../../db/client';
import { NudgeStatus } from '@foodstorii/shared';
import { getHouseholdProfile } from '../household-profile';

export interface ScheduleNudgeInput {
  householdId: string;
  nudgeType: string;
  title: string;
  body: string;
  scheduledFor?: string;
}

export interface NudgeResult {
  id: string;
  householdId: string;
  nudgeType: string;
  title: string;
  body: string;
  scheduledFor: string | null;
  status: NudgeStatus;
  createdAt: string;
}

export async function scheduleNudge(input: ScheduleNudgeInput): Promise<NudgeResult> {
  const { data, error } = await supabase
    .from('nudge_candidates')
    .insert({
      household_id: input.householdId,
      nudge_type: input.nudgeType,
      title: input.title,
      body: input.body,
      scheduled_for: input.scheduledFor ?? null,
      status: NudgeStatus.pending,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to schedule nudge: ${error.message}`);

  return {
    id: data.id as string,
    householdId: data.household_id as string,
    nudgeType: data.nudge_type as string,
    title: data.title as string,
    body: data.body as string,
    scheduledFor: data.scheduled_for as string | null,
    status: data.status as NudgeStatus,
    createdAt: data.created_at as string,
  };
}

// Schedules a daily meal nudge 30 minutes before the household's decision hour.
// Inserts into nudge_candidates; actual dispatch is handled by the cron endpoint.
export async function scheduleDailyMealNudge(householdId: string): Promise<NudgeResult | null> {
  const profile = await getHouseholdProfile(householdId);
  if (!profile?.decisionHour) return null;

  const [hours, minutes] = profile.decisionHour.split(':').map(Number);
  const nudgeTime = new Date();
  nudgeTime.setHours(hours, minutes - 30, 0, 0);
  // If 30-min subtraction underflows into previous day, just use 00:00
  if (nudgeTime.getHours() < 0 || (hours === 0 && minutes < 30)) {
    nudgeTime.setHours(0, 0, 0, 0);
  }

  const scheduledFor = nudgeTime.toISOString();

  return scheduleNudge({
    householdId,
    nudgeType: 'daily_meal_nudge',
    title: 'Time to think about dinner',
    body: "Looking at your kitchen, I have ideas for tonight. Open FoodStorii to see what Tina suggests.",
    scheduledFor,
  });
}
