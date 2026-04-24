import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// Creates a user-context client authenticated with the caller's JWT.
// Uses ANON_KEY (new sb_publishable_* format, set as custom secret).
// The Authorization header overrides the anon role so auth.getUser() and
// RLS policies work correctly for the authenticated user.
function createUserClient(authHeader: string): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
}

// Creates an anon client with no user JWT.
// Used for public/unauthenticated calls — can only reach SECURITY DEFINER
// RPCs or tables with explicit anon-role policies.
export function createAnonClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('ANON_KEY')!);
}

// Creates an internal service client for server-initiated functions that
// have no user JWT (whatsapp webhook, nudge-dispatch cron job).
// Uses S_SERVICE_ROLE_KEY secret (new sb_secret_* format key, set explicitly).
export function createInternalClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('S_SERVICE_ROLE_KEY')!);
}

export interface AuthContext {
  userId: string;
  householdId: string;
  db: SupabaseClient; // user-context client — use for all DB operations
}

export interface UserContext {
  userId: string;
  db: SupabaseClient; // user-context client — use for all DB operations
}

// Validates the JWT, resolves the user's household, and returns a user-context
// Supabase client bound to the caller's JWT. All DB calls through auth.db
// are governed by RLS policies for the authenticated user.
export async function resolveAuth(req: Request): Promise<AuthContext | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const db = createUserClient(authHeader);
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return null;

  const { data: userRow } = await db
    .from('users')
    .select('household_id')
    .eq('id', user.id)
    .single();

  if (!userRow?.household_id) return null;
  return { userId: user.id, householdId: userRow.household_id as string, db };
}

// Validates the JWT only — does not require a household to be linked.
// Returns the userId and db client if authenticated, null otherwise.
export async function resolveUser(req: Request): Promise<UserContext | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const db = createUserClient(authHeader);
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return null;

  return { userId: user.id, db };
}
