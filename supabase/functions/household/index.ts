// Edge Function: household
// Handles household profile, push token registration, and daily nudge scheduling.
// Routes on URL path since Supabase Edge Functions are single-entry HTTP handlers.

import { resolveAuth, resolveUser, json, CORS_HEADERS } from '../_shared/client.ts';

const NudgeStatus = { pending: 'pending' } as const;
const OnboardingStatus = { completed: 'completed' } as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  const url = new URL(req.url);
  const path = url.pathname.split('/').filter(Boolean).pop() ?? '';

  // --- GET /household/profile ---
  if (req.method === 'GET' && path === 'profile') {
    // Use resolveUser first so we can distinguish "not authenticated" (401)
    // from "authenticated but no household yet" (200 with null data).
    const user = await resolveUser(req);
    if (!user) return json({ success: false, error: 'Unauthorized' }, 401);

    const { data: userRow } = await user.db
      .from('users')
      .select('household_id')
      .eq('id', user.userId)
      .single();

    if (!userRow?.household_id) return json({ success: true, data: null });

    const { data, error } = await user.db
      .from('household_profiles')
      .select('*')
      .eq('household_id', userRow.household_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return json({ success: false, error: error.message }, 500);
    }

    return json({ success: true, data: data ?? null });
  }

  // --- PATCH /household/profile ---
  if (req.method === 'PATCH' && path === 'profile') {
    const auth = await resolveAuth(req);
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
    if (body.avoidIngredients !== undefined) updates.avoid_ingredients = body.avoidIngredients;
    if (body.pickyEaters !== undefined) updates.picky_eaters = body.pickyEaters;
    if (body.whatsappNumber !== undefined) updates.whatsapp_number = body.whatsappNumber;
    if (body.onboardingStatus !== undefined) {
      updates.onboarding_status = body.onboardingStatus;
      if (body.onboardingStatus === OnboardingStatus.completed) {
        updates.onboarding_completed_at = new Date().toISOString();
      }
    }

    const { data, error } = await auth.db
      .from('household_profiles')
      .upsert(updates, { onConflict: 'household_id' })
      .select()
      .single();

    if (error) return json({ success: false, error: error.message }, 500);
    return json({ success: true, data });
  }

  // --- POST /household/push-token ---
  if (req.method === 'POST' && path === 'push-token') {
    const auth = await resolveAuth(req);
    if (!auth) return json({ success: false, error: 'Unauthorized' }, 401);

    let body: { token?: string; platform?: string };
    try { body = await req.json(); } catch { return json({ success: false, error: 'Invalid JSON' }, 400); }

    if (!body.token || !body.platform) return json({ success: false, error: 'token and platform required' }, 400);
    if (!['ios', 'android'].includes(body.platform)) return json({ success: false, error: 'platform must be ios or android' }, 400);

    const { error } = await auth.db
      .from('push_tokens')
      .upsert(
        { household_id: auth.householdId, token: body.token, platform: body.platform, is_active: true, updated_at: new Date().toISOString() },
        { onConflict: 'household_id,token' },
      );

    if (error) return json({ success: false, error: error.message }, 500);
    return json({ success: true });
  }

  // --- POST /household/schedule-daily-nudge ---
  // Reads nudge_time from meal_preferences (dinner first, then any meal)
  // and creates a nudge_candidates row 30 minutes before that time.
  if (req.method === 'POST' && path === 'schedule-daily-nudge') {
    const auth = await resolveAuth(req);
    if (!auth) return json({ success: false, error: 'Unauthorized' }, 401);

    const { data: mealPrefs } = await auth.db
      .from('meal_preferences')
      .select('nudge_time, meal_type')
      .eq('household_id', auth.householdId)
      .in('meal_type', ['dinner', 'lunch', 'breakfast'])
      .not('nudge_time', 'is', null)
      .order('nudge_time')
      .limit(1);

    if (!mealPrefs?.[0]?.nudge_time) return json({ success: true, data: null });

    const [hours, minutes] = (mealPrefs[0].nudge_time as string).split(':').map(Number);
    const nudgeTime = new Date();
    nudgeTime.setHours(hours, minutes - 30, 0, 0);

    const mealLabel = mealPrefs[0].meal_type === 'breakfast' ? 'breakfast'
      : mealPrefs[0].meal_type === 'lunch' ? 'lunch'
      : 'dinner';

    const { data, error } = await auth.db
      .from('nudge_candidates')
      .insert({
        household_id: auth.householdId,
        nudge_type: 'daily_meal_nudge',
        title: `Time to think about ${mealLabel}`,
        body: `Looking at your kitchen, I have ideas for tonight. Open FoodStorii to see what Tina suggests.`,
        scheduled_for: nudgeTime.toISOString(),
        status: NudgeStatus.pending,
      })
      .select()
      .single();

    if (error) return json({ success: false, error: error.message }, 500);
    return json({ success: true, data });
  }

  // --- POST /household/meal-preferences ---
  if (req.method === 'POST' && path === 'meal-preferences') {
    const auth = await resolveAuth(req);
    if (!auth) return json({ success: false, error: 'Unauthorized' }, 401);

    let body: { preferences?: Array<{ meal_type: string; days: string[]; nudge_time: string }> };
    try { body = await req.json(); } catch { return json({ success: false, error: 'Invalid JSON' }, 400); }

    if (!body.preferences?.length) return json({ success: false, error: 'preferences array required' }, 400);

    const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'meal_prep'];
    const rows = body.preferences
      .filter((p) => VALID_MEAL_TYPES.includes(p.meal_type))
      .map((p) => ({
        household_id: auth.householdId,
        meal_type: p.meal_type,
        days: p.days ?? [],
        nudge_time: p.nudge_time ?? null,
        updated_at: new Date().toISOString(),
      }));

    if (!rows.length) return json({ success: false, error: 'No valid meal types provided' }, 400);

    const { error } = await auth.db
      .from('meal_preferences')
      .upsert(rows, { onConflict: 'household_id,meal_type' });

    if (error) return json({ success: false, error: error.message }, 500);
    return json({ success: true });
  }

  // --- POST /household/whatsapp-link ---
  if (req.method === 'POST' && path === 'whatsapp-link') {
    const auth = await resolveAuth(req);
    if (!auth) return json({ success: false, error: 'Unauthorized' }, 401);

    // Generate a 6-character alphanumeric token (no confusable chars)
    const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const token = Array.from(bytes).map((b) => CHARS[b % CHARS.length]).join('');

    // Invalidate any existing unused tokens for this household
    await auth.db
      .from('whatsapp_link_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('household_id', auth.householdId)
      .is('used_at', null);

    const { error } = await auth.db
      .from('whatsapp_link_tokens')
      .insert({ token, household_id: auth.householdId });

    if (error) return json({ success: false, error: error.message }, 500);
    return json({ success: true, data: { token } });
  }

  return json({ success: false, error: 'Not found' }, 404);
});
