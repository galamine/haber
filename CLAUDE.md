# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HaberApp is a multi-tenant SaaS platform for child development clinics. It manages a full clinical workflow: child intake → initial assessment → treatment plan → in-room therapy sessions (with embedded web games) → follow-up assessment → plan revision. It must comply with India's DPDP Act.

## Monorepo Structure

pnpm + Turborepo monorepo with three packages:

- `packages/api` — Hono HTTP server exposing tRPC routes, Prisma ORM, PostgreSQL
- `packages/client` — React + Vite SPA, TanStack Router, TanStack Query, Tailwind CSS v4
- `packages/shared` — Shared Zod schemas, TypeScript types, and enums used by both API and client

The client imports `AppRouter` from `@haber-full/api` directly for end-to-end tRPC type safety. Never duplicate type definitions between packages — put them in `packages/shared`.

## Commands

```bash
# Dev (all packages concurrently via Turborepo)
pnpm dev

# Single package dev
pnpm --filter @haber-full/api dev
pnpm --filter @haber-full/client dev

# Lint and format (Biome — not ESLint/Prettier)
pnpm check          # check all packages
pnpm check:fix      # auto-fix
pnpm --filter @haber-full/client check:fix

# Type checking
pnpm typecheck

# Tests
pnpm test                     # unit tests (Vitest), all packages
pnpm test:e2e                 # Playwright e2e (client only)
pnpm --filter @haber-full/api test  # single package

# Database (PostgreSQL via Docker)
pnpm db:dev           # start postgres container
pnpm db:dev:stop      # stop it
pnpm db:migrate       # prisma migrate dev (creates migration + applies)
pnpm db:push          # prisma db push (schema push without migration file)
pnpm db:generate      # regenerate Prisma client after schema changes
pnpm db:studio        # open Prisma Studio
```

## Architecture

### API (`packages/api`)
- **Hono** serves requests; tRPC is mounted at `/api/trpc/*`
- **tRPC procedures**: `publicProcedure` for unauthenticated routes, `protectedProcedure` for authenticated ones (enforces `ctx.user` is non-null)
- **Context** (`src/context.ts`): currently stubs `user: null` — JWT verification and user hydration must be wired here
- **Auth flow**: password hashing via argon2, JWTs via `jose`, OTP emails via Resend, refresh token rotation with revocation stored in `Session` table
- **Env validation**: `@t3-oss/env-core` in `src/env.ts` — all env vars must be declared here

### Client (`packages/client`)
- **Routing**: TanStack Router (file-based route definitions in `src/router.tsx`); auth guards in `beforeLoad`
- **Server state**: tRPC + TanStack Query via `src/lib/trpc.ts` (`trpc` React hooks) and `src/lib/api.ts` (`api` vanilla proxy client for non-React contexts)
- **Client state**: Zustand store in `src/stores/auth.ts` — access/refresh tokens persisted to `localStorage` under key `auth-storage`
- **UI components**: shadcn/ui component library lives in `src/components/ui/` — these are owned source files, not a dependency
- **Styles**: Tailwind CSS v4 with PostCSS; global styles in `src/styles/globals.css`

### Shared (`packages/shared`)
- Zod schemas and inferred TypeScript types for all domain entities
- `UserRole`, `OtpType`, `OtpStatus` enums
- `Context` type used by both the API's tRPC init and the shared tRPC re-export

## Linting Rules (Biome)
- Single quotes for JS/TS, double quotes for JSX, trailing commas (ES5), 2-space indent, 100-char line width
- `noExplicitAny` is a warning — avoid `any`
- `noUnusedVariables` and `noUnusedImports` are errors
- `noDangerouslySetInnerHtml` is an error (except `chart.tsx`)

## Skill Loading
Per `AGENTS.md`: before substantial work on a package, run `npx @tanstack/intent@latest list` from the workspace root and load any matching skill with `npx @tanstack/intent@latest load <package>#<skill>`.

## Environment Setup
Copy `.env.example` files before first run:
```bash
cp packages/api/.env.example packages/api/.env
cp packages/client/.env.example packages/client/.env
```
The API requires a valid `RESEND_API_KEY` and a `JWT_SECRET` of at least 32 characters.

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
