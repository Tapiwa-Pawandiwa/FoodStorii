-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- households
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- users (references Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,  -- matches auth.users.id
  household_id UUID REFERENCES households(id),
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- household_profiles
CREATE TABLE IF NOT EXISTS household_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  household_size INT,
  cooking_style TEXT[],
  dietary_preferences TEXT[],
  health_goals TEXT[],
  store_preferences TEXT[],
  food_waste_pain_points TEXT[],
  notification_tolerance TEXT DEFAULT 'moderate',
  automation_readiness TEXT DEFAULT 'suggestions_ok',
  onboarding_status TEXT DEFAULT 'not_started',
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id)
);

-- conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id),
  user_id UUID REFERENCES users(id),
  mode TEXT DEFAULT 'general',
  summary TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tool_call_id TEXT,
  tool_name TEXT,
  tool_input JSONB,
  tool_output JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- inventory_items
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id),
  name TEXT NOT NULL,
  category TEXT,
  quantity NUMERIC,
  unit TEXT,
  brand TEXT,
  expiry_estimate DATE,
  confidence TEXT NOT NULL DEFAULT 'pending_confirmation',
  status TEXT NOT NULL DEFAULT 'available',
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_id UUID,
  notes TEXT,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_household ON inventory_items(household_id);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_items(status);

-- media_uploads
CREATE TABLE IF NOT EXISTS media_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id),
  user_id UUID REFERENCES users(id),
  storage_key TEXT NOT NULL,
  public_url TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  upload_type TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'uploading',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- extraction_results
CREATE TABLE IF NOT EXISTS extraction_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id UUID NOT NULL REFERENCES media_uploads(id),
  extraction_type TEXT NOT NULL,
  raw_output JSONB,
  candidate_items JSONB,
  confidence NUMERIC,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- recipes
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  cuisine_type TEXT,
  prep_time_minutes INT,
  cook_time_minutes INT,
  servings INT,
  tags TEXT[],
  instructions TEXT,
  image_url TEXT,
  source_url TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_embedding ON recipes USING ivfflat (embedding vector_cosine_ops);

-- recipe_ingredients
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  optional BOOLEAN DEFAULT FALSE
);

-- shopping_lists
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id),
  title TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- shopping_list_items
CREATE TABLE IF NOT EXISTS shopping_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  category TEXT,
  note TEXT,
  status TEXT DEFAULT 'pending',
  recipe_id UUID REFERENCES recipes(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- nudge_candidates
CREATE TABLE IF NOT EXISTS nudge_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id),
  nudge_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- interaction_events (audit/episodic log)
CREATE TABLE IF NOT EXISTS interaction_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id),
  user_id UUID REFERENCES users(id),
  conversation_id UUID REFERENCES conversations(id),
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- retrieval_memory (embedding-backed semantic recall)
CREATE TABLE IF NOT EXISTS retrieval_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id),
  content TEXT NOT NULL,
  embedding vector(1536),
  memory_type TEXT NOT NULL,  -- 'preference', 'habit', 'fact'
  source_event_id UUID REFERENCES interaction_events(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retrieval_embedding ON retrieval_memory USING ivfflat (embedding vector_cosine_ops);
