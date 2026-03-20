// The Express API server has been decommissioned.
// All routes have been moved to Supabase Edge Functions:
//
//   auth-signup          → supabase/functions/auth-signup/
//   auth-reset-password  → supabase/functions/auth-reset-password/
//   household            → supabase/functions/household/
//   inventory            → supabase/functions/inventory/
//   tina (chat)          → supabase/functions/tina/
//   nudge-dispatch       → supabase/functions/nudge-dispatch/
//
// This folder is kept for the database migrations in src/db/migrations/.
// The apps/api directory can be removed once migrations are applied.
