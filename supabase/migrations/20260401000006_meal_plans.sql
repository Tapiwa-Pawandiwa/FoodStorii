-- Migration 009: Meal plans table + shopping_lists.created_by column
-- meal_plans supports the agent's weekly meal planning workflow.
-- shopping_lists.created_by is used by the agent when creating new lists.

CREATE TABLE IF NOT EXISTS meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    recipe_name TEXT NOT NULL,
    recipe_external_id TEXT,
    slot_date DATE NOT NULL,
    meal_type TEXT NOT NULL DEFAULT 'dinner',  -- breakfast | lunch | dinner | snack
    status TEXT NOT NULL DEFAULT 'planned',    -- planned | cooked | skipped
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_plans_household_date
    ON meal_plans(household_id, slot_date);

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'meal_plans' AND policyname = 'meal_plans_member'
  ) THEN
    CREATE POLICY "meal_plans_member" ON meal_plans
      FOR ALL TO authenticated
      USING (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()))
      WITH CHECK (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- shopping_lists.created_by may not exist in the initial schema
ALTER TABLE shopping_lists
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
