-- Migration 007: Performance indexes and pgvector semantic memory table
-- Run AFTER migrations 003-006.

-- Critical composite index for all inventory queries
CREATE INDEX IF NOT EXISTS idx_inventory_household_location_expiry
    ON inventory_items(household_id, storage_location, expiry_date)
    WHERE status = 'available';

-- Thread lookup
CREATE INDEX IF NOT EXISTS idx_threads_household_status
    ON conversation_threads(household_id, status);

-- Semantic memory table (create if not already in initial migration)
CREATE TABLE IF NOT EXISTS embeddings_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id),
    source_type TEXT NOT NULL,          -- 'interaction_event' | 'memory_summary' | 'preference'
    source_id UUID,
    content TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE embeddings_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "embeddings_index_member" ON embeddings_index
    FOR ALL TO authenticated
    USING (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()))
    WITH CHECK (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()));

-- HNSW index for pgvector semantic memory — requires pgvector extension
-- The extension must already be enabled (done in migration 001)
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw
    ON embeddings_index USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_embeddings_household
    ON embeddings_index(household_id, source_type, created_at DESC);
