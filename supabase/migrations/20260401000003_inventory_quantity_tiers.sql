-- Migration 006: Add quantity tier and storage location fields to inventory_items
-- quantity_tier: just_opened | mostly_full | more_than_half | about_half |
--                less_than_half | almost_empty | finished
-- measurement_type: PACKAGED_WEIGHT | LIQUID_VOLUME | COUNTABLE | LOOSE_WEIGHT
-- storage_location: fridge | pantry | freezer

ALTER TABLE inventory_items
    ADD COLUMN IF NOT EXISTS quantity_tier TEXT DEFAULT 'mostly_full',
    ADD COLUMN IF NOT EXISTS measurement_type TEXT DEFAULT 'PACKAGED_WEIGHT',
    ADD COLUMN IF NOT EXISTS standard_size_g INTEGER,
    ADD COLUMN IF NOT EXISTS countable_quantity INTEGER,
    ADD COLUMN IF NOT EXISTS storage_location TEXT DEFAULT 'pantry';
