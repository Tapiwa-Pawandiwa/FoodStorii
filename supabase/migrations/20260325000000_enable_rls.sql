-- Migration: Enable Row Level Security on all public tables
--
-- All Edge Functions use the service-role key which bypasses RLS entirely,
-- so this migration does not affect any backend behaviour.
--
-- This closes the Supabase security alert: tables were accessible via
-- PostgREST using the anon key without any access controls.
--
-- The only direct client-side query (non-service-role) is:
--   api.ts signIn → users.select(household_id).eq(id, userId)
-- A SELECT policy for that is included below. Everything else is locked.

-- ── Enable RLS ───────────────────────────────────────────────────────────────

ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nudge_candidates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interaction_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages             ENABLE ROW LEVEL SECURITY;

-- ── Policies ─────────────────────────────────────────────────────────────────

-- Allow authenticated users to read their own row in users.
-- Required by the sign-in flow in api.ts which queries this table directly
-- via the Supabase JS client (authenticated role, not service role).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'users'
      AND policyname = 'users_select_own'
  ) THEN
    CREATE POLICY "users_select_own"
      ON public.users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

-- No other direct-client policies are needed.
-- All other table access goes through Edge Functions (service role → bypasses RLS).
