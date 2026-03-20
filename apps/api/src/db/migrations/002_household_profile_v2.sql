-- Migration: 002_household_profile_v2
-- Adds wizard-captured fields and push token table

ALTER TABLE household_profiles
  ADD COLUMN IF NOT EXISTS primary_driver TEXT,
  ADD COLUMN IF NOT EXISTS decision_hour TIME,
  ADD COLUMN IF NOT EXISTS avoid_ingredients TEXT[],
  ADD COLUMN IF NOT EXISTS picky_eaters BOOLEAN;

CREATE TABLE IF NOT EXISTS push_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  token        TEXT NOT NULL,
  platform     TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, token)
);

CREATE INDEX IF NOT EXISTS push_tokens_household_id_idx ON push_tokens (household_id);
CREATE INDEX IF NOT EXISTS push_tokens_is_active_idx ON push_tokens (is_active) WHERE is_active = TRUE;
