-- Migration: Add whatsapp_number to household_profiles
--
-- Stores the linked WhatsApp phone number (E.164 format, e.g. +263771234567)
-- for each household. Used by the whatsapp Edge Function to route incoming
-- messages to the correct household without requiring a JWT.

ALTER TABLE public.household_profiles
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Enforce uniqueness so one number cannot be linked to two households.
CREATE UNIQUE INDEX IF NOT EXISTS idx_household_profiles_whatsapp_number
  ON public.household_profiles (whatsapp_number)
  WHERE whatsapp_number IS NOT NULL;
