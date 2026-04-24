-- Migration: WhatsApp one-tap account linking tokens
--
-- When a user completes onboarding, the app generates a short-lived token
-- and opens WhatsApp with "link <TOKEN>" pre-filled. The whatsapp Edge Function
-- validates the token, links the phone number to the household, and starts
-- the conversation.

CREATE TABLE IF NOT EXISTS public.whatsapp_link_tokens (
  token        TEXT        PRIMARY KEY,
  household_id UUID        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 minutes'),
  used_at      TIMESTAMPTZ
);

ALTER TABLE public.whatsapp_link_tokens ENABLE ROW LEVEL SECURITY;
-- All access goes through Edge Functions (service role), so no client policies needed.
