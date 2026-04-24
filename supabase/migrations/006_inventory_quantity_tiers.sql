-- Migration 006: Add quantity tier fields to inventory_items
-- quantity_tier: just_opened | mostly_full | more_than_half | about_half |
--                less_than_half | almost_empty | finished
-- measurement_type: PACKAGED_WEIGHT | LIQUID_VOLUME | COUNTABLE | LOOSE_WEIGHT

ALTER TABLE inventory_items
    ADD COLUMN IF NOT EXISTS quantity_tier TEXT DEFAULT 'mostly_full',
    ADD COLUMN IF NOT EXISTS measurement_type TEXT DEFAULT 'PACKAGED_WEIGHT',
    ADD COLUMN IF NOT EXISTS standard_size_g INTEGER,
    ADD COLUMN IF NOT EXISTS countable_quantity INTEGER;

-- Index for expiry queries (used by proactive nudge system)
CREATE INDEX IF NOT EXISTS idx_inventory_expiry_available
    ON inventory_items(household_id, expiry_estimate)
    WHERE status = 'available';
