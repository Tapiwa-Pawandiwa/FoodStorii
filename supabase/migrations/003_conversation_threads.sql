-- Migration 003: Conversation threads, memory summaries, and recipes_cooked
-- These tables support the FastAPI agent service replacing the tina Edge Function.

CREATE TABLE IF NOT EXISTS conversation_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id),
    user_id UUID NOT NULL REFERENCES users(id),
    current_mode TEXT NOT NULL DEFAULT 'idle',
    message_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS thread_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES conversation_threads(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text_bubble',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thread_messages_thread
    ON thread_messages(thread_id, created_at);

CREATE INDEX IF NOT EXISTS idx_threads_household
    ON conversation_threads(household_id, status, updated_at);

-- Memory summaries: one summary per thread after 20 messages
CREATE TABLE IF NOT EXISTS memory_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES conversation_threads(id),
    household_id UUID NOT NULL REFERENCES households(id),
    summary TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_summaries_thread
    ON memory_summaries(thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_memory_summaries_household
    ON memory_summaries(household_id, created_at DESC);

-- Recipes cooked: append-only log of what the household has cooked
CREATE TABLE IF NOT EXISTS recipes_cooked (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id),
    user_id UUID REFERENCES users(id),
    thread_id UUID REFERENCES conversation_threads(id),
    recipe_source TEXT,                -- 'external_cache' | 'manual'
    recipe_external_id TEXT,           -- FK-by-convention to external_recipes_cache.external_id
    recipe_name TEXT NOT NULL,
    cooked_at TIMESTAMPTZ DEFAULT NOW(),
    payload JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_recipes_cooked_household
    ON recipes_cooked(household_id, cooked_at DESC);

-- RLS
ALTER TABLE conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes_cooked ENABLE ROW LEVEL SECURITY;

-- Service role (FastAPI) bypasses RLS entirely — these policies are for JS client safety only
CREATE POLICY "conversation_threads_member" ON conversation_threads
    FOR ALL TO authenticated
    USING (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()))
    WITH CHECK (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()));

CREATE POLICY "thread_messages_member" ON thread_messages
    FOR ALL TO authenticated
    USING (thread_id IN (SELECT id FROM conversation_threads WHERE household_id IN (SELECT household_id FROM users WHERE id = auth.uid())))
    WITH CHECK (thread_id IN (SELECT id FROM conversation_threads WHERE household_id IN (SELECT household_id FROM users WHERE id = auth.uid())));

CREATE POLICY "memory_summaries_member" ON memory_summaries
    FOR ALL TO authenticated
    USING (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()))
    WITH CHECK (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()));

CREATE POLICY "recipes_cooked_member" ON recipes_cooked
    FOR ALL TO authenticated
    USING (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()))
    WITH CHECK (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()));
