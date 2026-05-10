# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Haber

HaberApp is a multi-tenant SaaS platform for child development clinics. It runs a full clinical workflow: student intake → assessment → treatment plan → in-room game sessions → progress review. The domain model lives in `HaberApp-Technical-PRD.md`; detailed agent coding conventions are in `AGENTS.md`.

## Commands

```bash
# Development (runs backend + frontend concurrently)
pnpm dev

# Build (always build shared first — it's a workspace dependency)
pnpm build:shared && pnpm build:backend
pnpm build                    # all packages in correct order

# Tests (backend only; Vitest)
pnpm test                     # all tests
cd apps/backend && pnpm test -- auth.test.ts   # single file
cd apps/backend && pnpm test:watch             # watch mode
cd apps/backend && pnpm coverage

# Lint / format (Biome across the whole monorepo)
pnpm lint
pnpm lint:fix
pnpm format

# Database
pnpm docker:postgres                        # start Postgres only
cd apps/backend && pnpm prisma:migrate      # run migrations
cd apps/backend && pnpm prisma:generate     # regenerate client after schema change
cd apps/backend && pnpm prisma:push         # push schema without migration

# Full Docker environments
pnpm docker:dev    # development (hot reload)
pnpm docker:prod   # production
```

## Monorepo Layout

```
apps/
  backend/   @haber/backend  — Express.js API (SWC build, tsx for dev)
  frontend/  @haber/frontend — React 18 (Vite)
packages/
  shared/    @haber/shared   — Zod schemas, DTOs, constants (dual ESM/CJS build)
```

`@haber/shared` must be built before either app can compile. It exports three sub-paths: `@haber/shared/schemas`, `@haber/shared/dtos`, `@haber/shared/constants`. When running locally without Docker, Vitest resolves it directly from source via the alias in `vitest.config.ts`.

## Backend Architecture (`apps/backend/src/`)

| Layer | Path | Notes |
|---|---|---|
| Entry | `index.ts` → `app.ts` | Express app, middleware stack, routes mounted at `/v1` |
| Routes | `routes/v1/` | Thin — delegate to controllers |
| Controllers | `controllers/` | `catchAsync` wrapper; one default export per file |
| Services | `services/` | Business logic; barrel-exported from `services/index.ts` |
| Validations | `validations/` | Objects with Zod schemas per body/query/params; used by `validate` middleware |
| Middlewares | `middlewares/` | `auth`, `validate`, `error`, `rateLimiter` |
| Config | `config/` | `config.ts` (Zod-validated env), `passport.ts`, `roles.ts`, `tokens.ts`, `prisma.ts` |
| Utils | `utils/` | `ApiError`, `catchAsync`, `pick` |

**Prisma client** is a singleton at `config/prisma.ts`. Schema lives at `apps/backend/prisma/schema.prisma`. Primary keys are UUID v4.

**Auth middleware** (`middlewares/auth.ts`): `auth(...requiredRights)` — validates JWT via Passport, then checks `roleRights` map from `@haber/shared`. If the user's role doesn't have the required rights, it allows the request only if the `userId` param matches the caller's own ID.

**Error handling**: throw `ApiError(httpStatus.XXX, message)` for operational errors. The `errorConverter` + `errorHandler` middlewares in `middlewares/error.ts` handle serialisation.

**Transactions**: Use `prisma.$transaction([...])` or the interactive `prisma.$transaction(async (tx) => { ... })` form whenever a service operation touches multiple tables or must be atomic. Pass the `tx` client through to every Prisma call inside the callback instead of the global `prisma` singleton.

## Frontend Architecture (`apps/frontend/src/`)

- **Routing**: React Router v6. Protected routes check `useAuthStore` for `accessToken`. Layout wraps authenticated pages in `PageShell`.
- **State**: Zustand (`store/authStore.ts`) for auth (persisted to `localStorage` as `haber-auth`). Server state via TanStack Query (`hooks/`).
- **API client**: `api/client.ts` — thin fetch wrapper that reads the token from the Zustand store at request time. Base URL from `VITE_API_URL` env var (defaults to `/api`).
- **UI / design system**: See `apps/frontend/DESIGN.md`. Primitives (Radix + CVA) live in `components/ui/`; layout and product chrome in `components/`. Global tokens and Tailwind v4 entry are in `styles/globals.css`. `lib/utils.ts` exports `cn` (clsx + tailwind-merge).

## Shared Package (`packages/shared/src/`)

Exports Zod schemas (`schemas/`), inferred TypeScript DTOs (`dtos/`), and constants including `allRoles` (`constants/`). The backend imports the role map from here; the frontend imports types for the auth store.

## Testing

Tests live in `apps/backend/tests/`. Integration tests use Supertest against a real Postgres database named `<DATABASE_NAME>_test` (the config module automatically appends `_test` when `NODE_ENV=test`). `tests/utils/setupTestDB.ts` connects before tests and clears `users` + `tokens` tables between each test. `tests/utils/setup.ts` sets env vars globally.

Run tests against a live Postgres instance (local or `pnpm docker:postgres`). Test parallelism is disabled (`fileParallelism: false`) to avoid DB race conditions.

## Environment Variables

Backend reads from `apps/backend/.env`. Required vars:

| Var | Notes |
|---|---|
| `NODE_ENV` | `development` \| `test` \| `production` |
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Min 32 chars |
| `PORT` | Default 3000 |

Optional: `JWT_*_EXPIRATION_*`, `SMTP_*`, `EMAIL_FROM`. Config validation fails fast at startup if required vars are missing.

## Code Style

Enforced by Biome (`biome.json`):
- 2-space indentation, 125-char line width
- Single quotes in TS/JS, double quotes in JSX
- ES5 trailing commas

TypeScript is strict (`tsconfig.base.json`): `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns` are all errors. `noExplicitAny` is disabled in Biome (but prefer explicit types).
