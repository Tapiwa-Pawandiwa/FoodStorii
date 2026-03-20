# FoodStorii

A mobile app that helps households reduce food waste, understand what food they have, decide what to cook, and coordinate grocery actions — powered by Tina, a calm and domain-specific household food assistant.

### How Tina works

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

## Setup

### Prerequisites

- Node.js 20+
- Supabase CLI (`npm install -g supabase`)
- Expo CLI (`npm install -g expo`)
- A Supabase project


### 5. Run the mobile app

```bash
cd apps/mobile
npm install
npx expo start
```

---

