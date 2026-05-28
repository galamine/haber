# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

**Better-T-Stack** monorepo (pnpm workspaces):
- **Frontend** (`apps/web`): React + Vite + TanStack Router (file-based) + TailwindCSS v4 + tRPC client
- **Backend** (`apps/server`): Hono on Node.js + tRPC adapter, port 3000
- **Shared packages**: `packages/api` (tRPC routers), `packages/db` (Prisma + PostgreSQL), `packages/ui` (shadcn/ui), `packages/env` (type-safe env), `packages/config` (tsconfig base)

## Commands

```bash
# Development
pnpm dev                  # start all apps
pnpm dev:web              # web only (port 5173)
pnpm dev:server           # server only (port 3000)

# Type checking & linting
pnpm check-types          # TypeScript across all packages
pnpm check                # Biome lint + format (auto-fix)

# Database (PostgreSQL via Docker)
pnpm db:start             # start Docker Postgres container
pnpm db:push              # push schema changes (no migration file)
pnpm db:migrate           # create and run a migration
pnpm db:generate          # regenerate Prisma client
pnpm db:studio            # open Prisma Studio UI
pnpm db:stop              # stop container
```

## Architecture

### Request flow
Browser → tRPC `httpBatchLink` (`/trpc/*`) → Hono server → `packages/api` router → Prisma → PostgreSQL

### Adding a tRPC route
1. Create a router in `packages/api/src/routers/<name>.ts` using `publicProcedure` / `router` from `../index`
2. Register it in `packages/api/src/routers/index.ts` under `appRouter`
3. The `AppRouter` type automatically flows to the web client — no extra steps

### Adding a database model
Prisma uses a multi-file schema. Add a new `<model>.prisma` file in `packages/db/prisma/schema/` alongside `schema.prisma` and `todo.prisma`. Then run `pnpm db:push` (dev) or `pnpm db:migrate` (production-style).

The Prisma client is generated into `packages/db/prisma/generated/` — never edit those files manually. Import the singleton client from `@haber-final/db`.

### Adding a frontend route
TanStack Router uses file-based routing. Add a file to `apps/web/src/routes/` — the router plugin auto-regenerates `routeTree.gen.ts`. Never manually edit `routeTree.gen.ts`.

### Environment variables
`packages/env` exports two separate validated env objects:
- `@haber-final/env/server` — `DATABASE_URL`, `CORS_ORIGIN`, `NODE_ENV`
- `@haber-final/env/web` — `VITE_SERVER_URL` (must be prefixed `VITE_`)

Add new vars to the appropriate file and the corresponding `.env` (`apps/server/.env` or `apps/web/.env`).

### UI components
- **Shared primitives** (used across apps): add to `packages/ui` via `npx shadcn@latest add <component> -c packages/ui`, import as `@haber-final/ui/components/<name>`
- **App-specific blocks**: add inside `apps/web` directly

Global styles and design tokens live in `packages/ui/src/styles/globals.css`.

## Code style

Biome enforces:
- **Indentation**: tabs
- **Quotes**: double quotes for JS/TS
- Tailwind class sorting via `cn`, `clsx`, `cva` functions
- `routeTree.gen.ts` is excluded from linting

The pre-commit hook runs Biome on staged files via lint-staged.

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
