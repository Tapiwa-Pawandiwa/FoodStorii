# FoodStorii

A mobile app that helps households reduce food waste, understand what food they have, decide what to cook, and coordinate grocery actions — powered by Tina, a calm and domain-specific household food assistant.

---

## Architecture

FoodStorii has no traditional backend server. All logic runs in Supabase Edge Functions. No API keys live in any file or `.env` — they are injected automatically by Supabase's infrastructure at runtime.

```
Mobile App (Expo React Native)
        │
        ├── Supabase JS client (auth, direct DB reads)
        │
        └── Supabase Edge Functions
              ├── tina              ← Conversational AI agent (OpenAI gpt-4o)
              ├── auth-signup       ← User registration + household setup
              ├── auth-reset-password ← Password reset (admin API)
              ├── household         ← Profile, push tokens, nudge scheduling
              ├── inventory         ← Inventory reads and writes
              └── nudge-dispatch    ← Push notification cron (every 15 min)
                        │
                        └── Supabase (Postgres + Auth + Storage + pgvector)
```

### How Tina works

1. User sends a message from the mobile app
2. `tina` Edge Function validates the JWT, resolves the household
3. Tina calls OpenAI `gpt-4o` with a tool list (inventory, recipes, shopping, nudges, profile)
4. OpenAI decides which tools to call; Tina dispatches them to Supabase DB
5. Final reply is persisted and returned to the app

---

## Tech stack

| Layer | Technology |
|---|---|
| Mobile | Expo React Native (TypeScript) |
| AI Agent | OpenAI gpt-4o via Supabase Edge Functions (Deno) |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Semantic search | pgvector inside Postgres |
| Push notifications | Expo Push API |

---

## Security model

- **No server to manage.** All compute runs in Supabase Edge Functions.
- **No secrets in files.** `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` are auto-injected by Supabase. They never appear in `.env`, git, or any deployment config.
- **Only public values in the mobile app.** `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are the only env vars in the mobile app — both are designed to be public (the anon key is protected by Row Level Security).
- **Row Level Security on every table.** Direct database queries are scoped to the authenticated user's household.
- **CORS restricted** on all Edge Functions.

---

## Project structure

```
FoodStorii/Agent/
├── apps/
│   ├── mobile/                    Expo React Native app
│   │   └── src/
│   │       ├── services/
│   │       │   ├── api.ts         All API calls (Edge Functions + Supabase JS)
│   │       │   └── supabaseClient.ts
│   │       └── stores/            Zustand state (auth, chat)
│   └── api/
│       └── src/db/migrations/     Postgres migrations (run in Supabase SQL editor)
├── supabase/
│   └── functions/
│       ├── _shared/client.ts      Shared Supabase client + auth helpers
│       ├── tina/                  AI agent (orchestrator, services, tools, prompts)
│       ├── auth-signup/
│       ├── auth-reset-password/
│       ├── household/
│       ├── inventory/
│       └── nudge-dispatch/
└── packages/
    └── shared/                    Shared TypeScript types and schemas
```

---

## Setup

### Prerequisites

- Node.js 20+
- Supabase CLI (`npm install -g supabase`)
- Expo CLI (`npm install -g expo`)
- A Supabase project

### 1. Run database migrations

In the Supabase SQL editor, run these in order:

```
apps/api/src/db/migrations/001_initial.sql
apps/api/src/db/migrations/002_household_profile_v2.sql
apps/api/src/db/migrations/003_rls_policies.sql
apps/api/src/db/migrations/004_signup_trigger.sql
```

### 2. Set Edge Function secrets

In the Supabase dashboard → **Edge Functions → Secrets**, add:

| Secret | Where to get it |
|---|---|
| `OPENAI_API_KEY` | platform.openai.com → API keys |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are **automatically available** in every Edge Function — do not set them manually.

### 3. Deploy Edge Functions

```bash
supabase functions deploy tina
supabase functions deploy auth-signup
supabase functions deploy auth-reset-password
supabase functions deploy household
supabase functions deploy inventory
supabase functions deploy nudge-dispatch
```

### 4. Configure the mobile app

Copy `apps/mobile/.env.example` to `apps/mobile/.env` and fill in:

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
```

Both values are in the Supabase dashboard → **Settings → API**.

### 5. Run the mobile app

```bash
cd apps/mobile
npm install
npx expo start
```

---

## Nudge dispatch (push notifications)

The `nudge-dispatch` Edge Function runs every 15 minutes via `pg_cron`. Set it up in the Supabase SQL editor:

```sql
SELECT cron.schedule(
  'nudge-dispatch',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/nudge-dispatch',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )
  $$
);
```

---

## Development notes

- Tina is not a generic chatbot. She is scoped strictly to household food management.
- All state changes go through structured tool calls — Tina never mutates data freeform.
- Inventory confidence levels: `confirmed`, `inferred_high_confidence`, `inferred_low_confidence`, `user_stated_preference`, `pending_confirmation`.
- The LLM is never the source of truth. All facts live in Postgres.
