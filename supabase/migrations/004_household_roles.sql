-- Migration 004: Add role and shopper fields to household_members
-- role values: organiser | logger | viewer

ALTER TABLE household_members
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'viewer',
    ADD COLUMN IF NOT EXISTS is_shopper BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS notification_tolerance TEXT DEFAULT 'moderate';

CREATE INDEX IF NOT EXISTS idx_household_members_role
    ON household_members(household_id, role);
