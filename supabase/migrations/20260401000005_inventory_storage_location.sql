-- Migration 008: Add storage_location to inventory_items
-- Separate migration because 006 was already applied without this column.

ALTER TABLE inventory_items
    ADD COLUMN IF NOT EXISTS storage_location TEXT DEFAULT 'pantry';

CREATE INDEX IF NOT EXISTS idx_inventory_household_location
    ON inventory_items(household_id, storage_location)
    WHERE status = 'available';
