-- Migration: meal_preferences
-- Replaces decision_hour on household_profiles with per-meal scheduling.
-- Each household can have one row per meal_type.

CREATE TABLE IF NOT EXISTS meal_preferences (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  meal_type       TEXT        NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'meal_prep')),
  days            TEXT[]      NOT NULL DEFAULT '{}',
  nudge_time      TIME,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (household_id, meal_type)
);

-- Index for nudge-dispatch and household queries
CREATE INDEX IF NOT EXISTS idx_meal_preferences_household
  ON meal_preferences (household_id);

-- RLS: each household member can read/write their own meal preferences
ALTER TABLE meal_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY meal_preferences_select ON meal_preferences
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY meal_preferences_insert ON meal_preferences
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT household_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY meal_preferences_update ON meal_preferences
  FOR UPDATE USING (
    household_id IN (
      SELECT household_id FROM users WHERE id = auth.uid()
    )
  );

-- Remove decision_hour from household_profiles (replaced by meal_preferences)
ALTER TABLE household_profiles DROP COLUMN IF EXISTS decision_hour;
