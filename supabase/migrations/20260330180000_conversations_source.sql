-- Migration: Add source column to conversations
--
-- Tags each conversation with the channel it came from ('app' | 'whatsapp').
-- Used by the WhatsApp Edge Function to look up the persisted conversation for
-- a household across messages (so Tina retains context across the session).

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'app';

-- Index so the WhatsApp function can efficiently find the latest conversation
-- for a household by source.
CREATE INDEX IF NOT EXISTS idx_conversations_household_source
  ON public.conversations (household_id, source, last_active_at DESC);
