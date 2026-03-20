-- Migration 004: Post-signup trigger
-- Automatically creates a household, users row, and household_profiles row
-- whenever a new user is inserted into auth.users.
-- This fires for all user creation paths: Edge Function, Supabase dashboard,
-- social auth, magic link, etc. — ensuring data consistency everywhere.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs as postgres, bypasses RLS
SET search_path = public
AS $$
DECLARE
  v_household_id UUID;
  v_display_name TEXT;
BEGIN
  v_display_name := NEW.raw_user_meta_data->>'display_name';

  -- Create the household
  INSERT INTO public.households (name)
  VALUES (
    CASE
      WHEN v_display_name IS NOT NULL AND v_display_name <> ''
      THEN v_display_name || '''s Household'
      ELSE 'My Household'
    END
  )
  RETURNING id INTO v_household_id;

  -- Link the auth user to the household
  INSERT INTO public.users (id, household_id, display_name, email)
  VALUES (NEW.id, v_household_id, v_display_name, NEW.email);

  -- Create an empty household profile ready for onboarding
  INSERT INTO public.household_profiles (household_id, onboarding_status)
  VALUES (v_household_id, 'not_started');

  RETURN NEW;
END;
$$;

-- Drop if exists to allow re-running this migration safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
