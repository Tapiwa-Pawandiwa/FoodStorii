-- Migration 003: Row Level Security policies
-- The backend API uses the service_role key which bypasses RLS (intentional).
-- RLS protects against misconfigured queries, direct dashboard access, and
-- any future mobile-direct Supabase queries.

-- households
ALTER TABLE households ENABLE ROW LEVEL SECURITY;

CREATE POLICY "households_select" ON households
  FOR SELECT USING (
    id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "households_update" ON households
  FOR UPDATE USING (
    id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (id = auth.uid());

-- household_profiles
ALTER TABLE household_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household_profiles_all" ON household_profiles
  FOR ALL USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

-- inventory_items
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_items_all" ON inventory_items
  FOR ALL USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

-- conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_all" ON conversations
  FOR ALL USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

-- messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_all" ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    )
  );

-- shopping_lists
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shopping_lists_all" ON shopping_lists
  FOR ALL USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

-- shopping_list_items
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shopping_list_items_all" ON shopping_list_items
  FOR ALL USING (
    list_id IN (
      SELECT id FROM shopping_lists
      WHERE household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    )
  );

-- nudge_candidates
ALTER TABLE nudge_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nudge_candidates_all" ON nudge_candidates
  FOR ALL USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

-- push_tokens
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_tokens_all" ON push_tokens
  FOR ALL USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

-- interaction_events
ALTER TABLE interaction_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interaction_events_all" ON interaction_events
  FOR ALL USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

-- retrieval_memory
ALTER TABLE retrieval_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "retrieval_memory_all" ON retrieval_memory
  FOR ALL USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );
