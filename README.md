# Haber

A multi-tenant SaaS platform for child development clinics. Haber runs a complete clinical workflow: student intake and guardian consent → doctor assessment with milestone tagging → treatment plan builder → in-room game sessions → progress review and plan revision.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Express.js, Passport JWT, Prisma ORM, PostgreSQL |
| Frontend | React 18, React Router v6, Zustand, TanStack Query |
| Shared | Zod schemas, TypeScript DTOs |
| Infra | Docker Compose, PM2, pnpm workspaces |
| Tooling | Biome (lint/format), Vitest, Husky |

## Monorepo Layout

```
apps/
  backend/    @haber/backend  — Express API (SWC build, tsx for dev)
  frontend/   @haber/frontend — React 18 (Vite)
packages/
  shared/     @haber/shared   — Zod schemas, DTOs, constants
```

`@haber/shared` must be built before either app can compile. It exports three sub-paths: `@haber/shared/schemas`, `@haber/shared/dtos`, `@haber/shared/constants`.

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker (for PostgreSQL or full-stack environments)

## Getting Started

**1. Install dependencies**

```bash
pnpm install
```

**2. Configure environment**

```bash
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env with your values (see Environment Variables below)
```

**3. Start PostgreSQL**

```bash
pnpm docker:postgres
```

**4. Run database migrations**

```bash
cd apps/backend && pnpm prisma:migrate
```

**5. Start the dev server**

```bash
pnpm dev   # starts backend + frontend concurrently
```

The backend runs on `http://localhost:3000` and the frontend on `http://localhost:5173` by default.

## Environment Variables

Backend reads from `apps/backend/.env`.

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | Yes | `development` \| `test` \| `production` |
| `DATABASE_URL` | Yes | Postgres connection string |
| `JWT_SECRET` | Yes | Minimum 32 characters |
| `PORT` | No | Defaults to `3000` |
| `JWT_ACCESS_EXPIRATION_MINUTES` | No | Defaults to `30` |
| `JWT_REFRESH_EXPIRATION_DAYS` | No | Defaults to `30` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_PASSWORD` | No | Email delivery |
| `EMAIL_FROM` | No | Sender address for outgoing emails |

## Commands

```bash
# Development
pnpm dev                          # backend + frontend (hot reload)
pnpm dev:backend                  # backend only
pnpm dev:frontend                 # frontend only

# Build (shared must build first)
pnpm build                        # all packages in order
pnpm build:shared                 # shared package only
pnpm build:backend                # backend only
pnpm build:frontend               # frontend only

# Tests (Vitest, backend only)
pnpm test                         # all tests
pnpm test:watch                   # watch mode
pnpm test:coverage                # coverage report
cd apps/backend && pnpm test -- auth.test.ts   # single file

# Lint / format (Biome)
pnpm lint                         # check
pnpm lint:fix                     # auto-fix
pnpm format                       # format in place

# Database
pnpm docker:postgres              # start Postgres container
cd apps/backend && pnpm prisma:migrate    # run migrations
cd apps/backend && pnpm prisma:generate  # regenerate client
cd apps/backend && pnpm prisma:push      # push schema without migration

# Docker environments
pnpm docker:dev                   # development (hot reload)
pnpm docker:prod                  # production build
```

## Backend Architecture

```
src/
  index.ts / app.ts    — Express app, middleware stack, routes at /v1
  routes/v1/           — Thin route definitions
  controllers/         — Request handlers (catchAsync wrapper)
  services/            — Business logic, barrel-exported from services/index.ts
  validations/         — Zod schemas per route (body / query / params)
  middlewares/         — auth, validate, error, rateLimiter
  config/              — Zod-validated env, Passport, roles, tokens, Prisma singleton
  utils/               — ApiError, catchAsync, pick
```

**Auth** (`middlewares/auth.ts`): validates JWT via Passport, then checks `roleRights` from `@haber/shared`. Own-resource access is granted when the `userId` param matches the caller's ID even without the required right.

**Error handling**: throw `new ApiError(httpStatus.XXX, message)` for operational errors. `errorConverter` + `errorHandler` middlewares handle serialisation.

## Frontend Architecture

- **Routing**: React Router v6. `ProtectedRoute` checks `useAuthStore` for `accessToken`; redirects to `/login` if absent.
- **State**: Zustand (`store/authStore.ts`) persisted to `localStorage` as `haber-auth`. Server state via TanStack Query.
- **API client**: `api/client.ts` — thin fetch wrapper reading the token from the Zustand store. Base URL from `VITE_API_URL` (defaults to `/api`).
- **UI**: shadcn/ui components (Radix primitives + Tailwind). Utility helper `cn` from `lib/utils.ts`.

## Testing

Integration tests run against a real Postgres database named `<DATABASE_NAME>_test` (the config module appends `_test` when `NODE_ENV=test`). `tests/utils/setupTestDB.ts` connects before tests and clears relevant tables between each test.

Test parallelism is disabled (`fileParallelism: false`) to avoid DB race conditions. Ensure a Postgres instance is running before executing tests:

```bash
pnpm docker:postgres
pnpm test
```

## API Documentation

Swagger docs are served at `http://localhost:3000/v1/docs` when running in development mode.
