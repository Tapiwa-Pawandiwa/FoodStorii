-- Migration 005: Waste and rescue event tracking
-- waste_events: items that were thrown out or not used
-- rescue_events: expiring items that were used before going to waste

CREATE TABLE IF NOT EXISTS waste_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id),
    user_id UUID NOT NULL REFERENCES users(id),
    event_type TEXT NOT NULL,           -- waste_thrown | ate_out
    item_id UUID REFERENCES inventory_items(id),
    estimated_loss_eur NUMERIC(8,2),
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rescue_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id),
    user_id UUID NOT NULL REFERENCES users(id),
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    recipe_id UUID,                     -- references external_recipes_cache by convention
    recipe_name TEXT,
    quantity_tier_at_rescue TEXT,
    estimated_saving_eur NUMERIC(8,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rescue_household
    ON rescue_events(household_id, created_at);

CREATE INDEX IF NOT EXISTS idx_waste_household
    ON waste_events(household_id, created_at);

ALTER TABLE waste_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rescue_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waste_events_member" ON waste_events
    FOR ALL TO authenticated
    USING (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()))
    WITH CHECK (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()));

CREATE POLICY "rescue_events_member" ON rescue_events
    FOR ALL TO authenticated
    USING (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()))
    WITH CHECK (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()));
