-- Migration: RLS policies for user-context Edge Function access
--
-- All user-facing Edge Functions (household, inventory, recipes, tina) now use
-- a user-context Supabase client (ANON_KEY + user JWT) instead of service role.
-- These policies allow authenticated users to access their own household data.
--
-- Pattern: household membership check via
--   household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
-- This is safe — auth.uid() is set by Supabase from the verified JWT.

-- ── users ─────────────────────────────────────────────────────────────────────
-- users_select_own already exists (migration 20260325000000_enable_rls.sql)
-- Add an update policy so users can update their own display_name etc.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'users' AND policyname = 'users_update_own'
  ) THEN
    CREATE POLICY "users_update_own" ON public.users
      FOR UPDATE TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

-- ── households ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'households' AND policyname = 'households_select_member'
  ) THEN
    CREATE POLICY "households_select_member" ON public.households
      FOR SELECT TO authenticated
      USING (id IN (SELECT household_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;

-- ── household_profiles ────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'household_profiles' AND policyname = 'household_profiles_select_member'
  ) THEN
    CREATE POLICY "household_profiles_select_member" ON public.household_profiles
      FOR SELECT TO authenticated
      USING (household_id IN (SELECT household_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'household_profiles' AND policyname = 'household_profiles_insert_member'
  ) THEN
    CREATE POLICY "household_profiles_insert_member" ON public.household_profiles
      FOR INSERT TO authenticated
      WITH CHECK (household_id IN (SELECT household_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'household_profiles' AND policyname = 'household_profiles_update_member'
  ) THEN
    CREATE POLICY "household_profiles_update_member" ON public.household_profiles
      FOR UPDATE TO authenticated
      USING (household_id IN (SELECT household_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;

-- ── inventory_items ───────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'inventory_items' AND policyname = 'inventory_items_select_member'
  ) THEN
    CREATE POLICY "inventory_items_select_member" ON public.inventory_items
      FOR SELECT TO authenticated
      USING (household_id IN (SELECT household_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'inventory_items' AND policyname = 'inventory_items_insert_member'
  ) THEN
    CREATE POLICY "inventory_items_insert_member" ON public.inventory_items
      FOR INSERT TO authenticated
      WITH CHECK (household_id IN (SELECT household_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'inventory_items' AND policyname = 'inventory_items_update_member'
  ) THEN
    CREATE POLICY "inventory_items_update_member" ON public.inventory_items
      FOR UPDATE TO authenticated
      USING (household_id IN (SELECT household_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;

-- ── conversations ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'conversations' AND policyname = 'conversations_select_member'
  ) THEN
    CREATE POLICY "conversations_select_member" ON public.conversations
      FOR SELECT TO authenticated
      USING (household_id IN (SELECT household_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'conversations' AND policyname = 'conversations_insert_member'
  ) THEN
    CREATE POLICY "conversations_insert_member" ON public.conversations
      FOR INSERT TO authenticated
      WITH CHECK (household_id IN (SELECT household_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'conversations' AND policyname = 'conversations_update_member'
  ) THEN
    CREATE POLICY "conversations_update_member" ON public.conversations
      FOR UPDATE TO authenticated
      USING (household_id IN (SELECT household_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;

-- ── messages ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'messages' AND policyname = 'messages_select_member'
  ) THEN
    CREATE POLICY "messages_select_member" ON public.messages
      FOR SELECT TO authenticated
      USING (
        conversation_id IN (
          SELECT c.id FROM public.conversations c
          JOIN public.users u ON u.household_id = c.household_id
          WHERE u.id = auth.uid()
        )
      );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'messages' AND policyname = 'messages_insert_member'
  ) THEN
    CREATE POLICY "messages_insert_member" ON public.messages
      FOR INSERT TO authenticated
      WITH CHECK (
        conversation_id IN (
          SELECT c.id FROM public.conversations c
          JOIN public.users u ON u.household_id = c.household_id
          WHERE u.id = auth.uid()
        )
      );
  END IF;
END $$;

-- ── push_tokens ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'push_tokens' AND policyname = 'push_tokens_member'
  ) THEN
    CREATE POLICY "push_tokens_member" ON public.push_tokens
      FOR ALL TO authenticated
      USING (household_id IN (SELECT household_id FROM public.users WHERE id = auth.uid()))
      WITH CHECK (household_id IN (SELECT household_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;

-- ── nudge_candidates ──────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'nudge_candidates' AND policyname = 'nudge_candidates_member'
  ) THEN
    CREATE POLICY "nudge_candidates_member" ON public.nudge_candidates
      FOR ALL TO authenticated
      USING (household_id IN (SELECT household_id FROM public.users WHERE id = auth.uid()))
      WITH CHECK (household_id IN (SELECT household_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;

-- ── whatsapp_link_tokens ──────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'whatsapp_link_tokens' AND policyname = 'whatsapp_link_tokens_member'
  ) THEN
    CREATE POLICY "whatsapp_link_tokens_member" ON public.whatsapp_link_tokens
      FOR ALL TO authenticated
      USING (household_id IN (SELECT household_id FROM public.users WHERE id = auth.uid()))
      WITH CHECK (household_id IN (SELECT household_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;

-- ── shopping_lists ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'shopping_lists' AND policyname = 'shopping_lists_member'
  ) THEN
    CREATE POLICY "shopping_lists_member" ON public.shopping_lists
      FOR ALL TO authenticated
      USING (household_id IN (SELECT household_id FROM public.users WHERE id = auth.uid()))
      WITH CHECK (household_id IN (SELECT household_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;

-- ── shopping_list_items ───────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'shopping_list_items' AND policyname = 'shopping_list_items_member'
  ) THEN
    CREATE POLICY "shopping_list_items_member" ON public.shopping_list_items
      FOR ALL TO authenticated
      USING (
        list_id IN (
          SELECT sl.id FROM public.shopping_lists sl
          JOIN public.users u ON u.household_id = sl.household_id
          WHERE u.id = auth.uid()
        )
      )
      WITH CHECK (
        list_id IN (
          SELECT sl.id FROM public.shopping_lists sl
          JOIN public.users u ON u.household_id = sl.household_id
          WHERE u.id = auth.uid()
        )
      );
  END IF;
END $$;

-- ── interaction_events ────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'interaction_events' AND policyname = 'interaction_events_member'
  ) THEN
    CREATE POLICY "interaction_events_member" ON public.interaction_events
      FOR ALL TO authenticated
      USING (household_id IN (SELECT household_id FROM public.users WHERE id = auth.uid()))
      WITH CHECK (household_id IN (SELECT household_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;

-- ── external_recipes_cache ────────────────────────────────────────────────────
-- Shared cache readable and writable by all authenticated users.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'external_recipes_cache' AND policyname = 'external_recipes_cache_select'
  ) THEN
    CREATE POLICY "external_recipes_cache_select" ON public.external_recipes_cache
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'external_recipes_cache' AND policyname = 'external_recipes_cache_insert'
  ) THEN
    CREATE POLICY "external_recipes_cache_insert" ON public.external_recipes_cache
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'external_recipes_cache' AND policyname = 'external_recipes_cache_update'
  ) THEN
    CREATE POLICY "external_recipes_cache_update" ON public.external_recipes_cache
      FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

-- ── recipe_recommendation_events ──────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'recipe_recommendation_events' AND policyname = 'rec_events_member'
  ) THEN
    CREATE POLICY "rec_events_member" ON public.recipe_recommendation_events
      FOR ALL TO authenticated
      USING (household_id IN (SELECT household_id FROM public.users WHERE id = auth.uid()))
      WITH CHECK (household_id IN (SELECT household_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- SECURITY DEFINER functions
-- Called by Edge Functions that have no user JWT.
-- Run with the function owner's privileges, bypassing RLS.
-- ============================================================

-- Used by auth-signup: look up household_id after user creation.
-- The caller has a valid user ID from auth.signUp but no session yet.
CREATE OR REPLACE FUNCTION public.sf_get_user_household(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT household_id FROM users WHERE id = p_user_id;
$$;

COMMENT ON FUNCTION public.sf_get_user_household IS
  'Called by auth-signup Edge Function after signUp to resolve household_id without a user JWT.';
