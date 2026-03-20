// Edge Function: household
// Handles household profile, push token registration, and daily nudge scheduling.
// Routes on URL path since Supabase Edge Functions are single-entry HTTP handlers.

import { createServiceClient, resolveAuth, json, CORS_HEADERS } from '../_shared/client.ts';

const NudgeStatus = { pending: 'pending' } as const;
const OnboardingStatus = { completed: 'completed' } as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  const supabase = createServiceClient();
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/functions\/v1\/household\/?/, '').replace(/^\//, '');

  // --- GET /household/profile ---
  if (req.method === 'GET' && path === 'profile') {
    const auth = await resolveAuth(req, supabase);
    if (!auth) return json({ success: false, error: 'Unauthorized' }, 401);

    const { data, error } = await supabase
      .from('household_profiles')
      .select('*')
      .eq('household_id', auth.householdId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return json({ success: false, error: error.message }, 500);
    }

    return json({ success: true, data: data ?? null });
  }

  // --- PATCH /household/profile ---
  if (req.method === 'PATCH' && path === 'profile') {
    const auth = await resolveAuth(req, supabase);
    if (!auth) return json({ success: false, error: 'Unauthorized' }, 401);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ success: false, error: 'Invalid JSON' }, 400); }

    const updates: Record<string, unknown> = { household_id: auth.householdId, updated_at: new Date().toISOString() };

    if (body.householdSize !== undefined) updates.household_size = body.householdSize;
    if (body.cookingStyle !== undefined) updates.cooking_style = body.cookingStyle;
    if (body.dietaryPreferences !== undefined) updates.dietary_preferences = body.dietaryPreferences;
    if (body.healthGoals !== undefined) updates.health_goals = body.healthGoals;
    if (body.storePreferences !== undefined) updates.store_preferences = body.storePreferences;
    if (body.foodWastePainPoints !== undefined) updates.food_waste_pain_points = body.foodWastePainPoints;
    if (body.notificationTolerance !== undefined) updates.notification_tolerance = body.notificationTolerance;
    if (body.automationReadiness !== undefined) updates.automation_readiness = body.automationReadiness;
    if (body.primaryDriver !== undefined) updates.primary_driver = body.primaryDriver;
    if (body.decisionHour !== undefined) updates.decision_hour = body.decisionHour;
    if (body.avoidIngredients !== undefined) updates.avoid_ingredients = body.avoidIngredients;
    if (body.pickyEaters !== undefined) updates.picky_eaters = body.pickyEaters;
    if (body.onboardingStatus !== undefined) {
      updates.onboarding_status = body.onboardingStatus;
      if (body.onboardingStatus === OnboardingStatus.completed) {
        updates.onboarding_completed_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from('household_profiles')
      .upsert(updates, { onConflict: 'household_id' })
      .select()
      .single();

    if (error) return json({ success: false, error: error.message }, 500);
    return json({ success: true, data });
  }

  // --- POST /household/push-token ---
  if (req.method === 'POST' && path === 'push-token') {
    const auth = await resolveAuth(req, supabase);
    if (!auth) return json({ success: false, error: 'Unauthorized' }, 401);

    let body: { token?: string; platform?: string };
    try { body = await req.json(); } catch { return json({ success: false, error: 'Invalid JSON' }, 400); }

    if (!body.token || !body.platform) return json({ success: false, error: 'token and platform required' }, 400);
    if (!['ios', 'android'].includes(body.platform)) return json({ success: false, error: 'platform must be ios or android' }, 400);

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        { household_id: auth.householdId, token: body.token, platform: body.platform, is_active: true, updated_at: new Date().toISOString() },
        { onConflict: 'household_id,token' },
      );

    if (error) return json({ success: false, error: error.message }, 500);
    return json({ success: true });
  }

  // --- POST /household/schedule-daily-nudge ---
  if (req.method === 'POST' && path === 'schedule-daily-nudge') {
    const auth = await resolveAuth(req, supabase);
    if (!auth) return json({ success: false, error: 'Unauthorized' }, 401);

    const { data: profile } = await supabase
      .from('household_profiles')
      .select('decision_hour')
      .eq('household_id', auth.householdId)
      .single();

    if (!profile?.decision_hour) return json({ success: true, data: null });

    const [hours, minutes] = (profile.decision_hour as string).split(':').map(Number);
    const nudgeTime = new Date();
    nudgeTime.setHours(hours, minutes - 30, 0, 0);

    const { data, error } = await supabase
      .from('nudge_candidates')
      .insert({
        household_id: auth.householdId,
        nudge_type: 'daily_meal_nudge',
        title: 'Time to think about dinner',
        body: "Looking at your kitchen, I have ideas for tonight. Open FoodStorii to see what Tina suggests.",
        scheduled_for: nudgeTime.toISOString(),
        status: NudgeStatus.pending,
      })
      .select()
      .single();

    if (error) return json({ success: false, error: error.message }, 500);
    return json({ success: true, data });
  }

  return json({ success: false, error: 'Not found' }, 404);
});
