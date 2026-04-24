-- Migration 004: household_members table with role and shopper fields
-- Creates the table if it doesn't exist (initial schema may not have included it),
-- then adds role columns idempotently.
-- role values: organiser | logger | viewer

CREATE TABLE IF NOT EXISTS household_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT,
    primary_driver TEXT,
    dietary_preferences TEXT[] DEFAULT '{}',
    role TEXT NOT NULL DEFAULT 'viewer',
    is_shopper BOOLEAN NOT NULL DEFAULT FALSE,
    notification_tolerance TEXT DEFAULT 'moderate',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns idempotently in case the table already existed without them
ALTER TABLE household_members
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'viewer',
    ADD COLUMN IF NOT EXISTS is_shopper BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS notification_tolerance TEXT DEFAULT 'moderate',
    ADD COLUMN IF NOT EXISTS primary_driver TEXT,
    ADD COLUMN IF NOT EXISTS dietary_preferences TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_household_members_role
    ON household_members(household_id, role);

CREATE INDEX IF NOT EXISTS idx_household_members_household
    ON household_members(household_id);

ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'household_members' AND policyname = 'household_members_member'
  ) THEN
    CREATE POLICY "household_members_member" ON household_members
      FOR ALL TO authenticated
      USING (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()))
      WITH CHECK (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;
