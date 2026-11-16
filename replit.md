# ProofTrack

A habit tracker where every task requires photo or video proof of completion, verified by AI. Tasks earn points, and users set a daily point goal to stay on track.

## Pip's Nest (artifacts/bird-world)

A little 3D island where Pip, an AI-driven bird, walks between a computer, a synth and a 3D printer,
makes websites / music / prints, places prints around the island, and writes a daily diary.

- `pnpm --filter @workspace/bird-world run dev` — run it (served at `/bird/`; dev proxies `/api` to `API_URL`, default http://localhost:8080)
- Brain: `POST /api/bird/think` → `artifacts/api-server/src/lib/birdBrain.ts` (gpt-4o-mini, JSON mode). If the API is unreachable, the front end falls back to an offline procedural brain (`src/brain.ts`), so it always runs.
- `src/world.ts` — three.js scene, bird animation, stations; `src/prints.ts` — print recipe → geometry; `src/music.ts` — Web Audio sequencer; `src/main.ts` — Pip's life loop + diary/things UI
- Diary and creations are saved in the browser's localStorage (key `pips-nest-v1`)

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/habit-tracker run dev` — run the frontend (port assigned by artifact)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `OPENAI_API_KEY` — OpenAI API key for AI proof verification

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind (artifact: `habit-tracker`)
- API: Express 5 (artifact: `api-server`)
- DB: PostgreSQL + Drizzle ORM
- AI: OpenAI GPT-4o-mini vision for proof verification
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Routing: wouter (frontend)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle schema: `tasks.ts`, `completions.ts`, `settings.ts`
- `artifacts/api-server/src/routes/` — route handlers: tasks, completions, settings, summary
- `artifacts/api-server/src/lib/openai.ts` — AI proof verification logic (verifyProof())
- `artifacts/habit-tracker/src/pages/` — frontend pages: Home, Tasks, History, Settings, ProofSubmit
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — generated Zod schemas (do not edit)

## Architecture decisions

- Base64 images sent in JSON body for proof; Express body limit raised to 15MB
- AI verification uses `gpt-4o-mini` vision with a lenient prompt (accept if plausibly related)
- Settings table uses single row (id=1 always); auto-created on first GET
- One-off tasks remain in daily list until archived; daily tasks reset each day
- Completions are date-keyed (YYYY-MM-DD) to support backdating

## Product

Users create tasks (daily habits or one-off to-dos) with point values. To complete a task, they must submit a photo as proof. GPT-4o-mini verifies the image matches the task. Points accumulate toward a user-set daily goal. History and streak views track past performance.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing `lib/db/src/schema/`, run `pnpm run typecheck:libs` before checking artifact packages
- Proof images must be base64-encoded before sending to POST /completions
- The settings row (id=1) is auto-created lazily on first GET /settings

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
