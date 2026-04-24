-- Migration: External recipes cache + recommendation events
-- external_recipes_cache: normalized Spoonacular recipe store (7-day TTL per row)
-- recipe_recommendation_events: append-only log of what Tina/app recommended

CREATE TABLE IF NOT EXISTS public.external_recipes_cache (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source            TEXT        NOT NULL DEFAULT 'spoonacular',
  external_id       TEXT        NOT NULL,
  title             TEXT        NOT NULL,
  image_url         TEXT,
  summary           TEXT,
  cuisine_type      TEXT,
  ready_in_minutes  INT,
  servings          INT,
  diets             TEXT[]      NOT NULL DEFAULT '{}',
  dish_types        TEXT[]      NOT NULL DEFAULT '{}',
  ingredients_json  JSONB       NOT NULL DEFAULT '[]',
  instructions_json JSONB       NOT NULL DEFAULT '[]',
  nutrition_json    JSONB,
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  UNIQUE(source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_ext_recipes_source_id
  ON public.external_recipes_cache (source, external_id);

ALTER TABLE public.external_recipes_cache ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.recipe_recommendation_events (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id        UUID        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id             UUID        REFERENCES public.users(id),
  conversation_id     UUID        REFERENCES public.conversations(id),
  source_channel      TEXT        NOT NULL DEFAULT 'app',   -- 'app' | 'whatsapp'
  trigger_type        TEXT        NOT NULL,                  -- 'pantry_match' | 'search' | 'tina_suggestion'
  query_ingredients   TEXT[]      NOT NULL DEFAULT '{}',
  search_query        TEXT,
  recommended_ids     TEXT[]      NOT NULL DEFAULT '{}',     -- external_ids
  opened_external_id  TEXT,
  added_to_list_ids   TEXT[]      NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipe_rec_events_household
  ON public.recipe_recommendation_events (household_id, created_at DESC);

ALTER TABLE public.recipe_recommendation_events ENABLE ROW LEVEL SECURITY;
