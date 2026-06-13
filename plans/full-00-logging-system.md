# Plan: Structured Logging + Frontend Sonner Notifications

## Context

The project currently has no structured logging — only Hono's built-in `logger()` which prints raw HTTP lines. There's no visibility into what data flows through tRPC procedures, no auth event audit trail, and no way to correlate errors back to a specific request. On the frontend, the existing `QueryCache.onError` covers query errors, but mutation errors (todo CRUD, logout) have no global fallback, and there are no success notifications.

This plan adds **Pino** as the structured logger on the backend, wires a tRPC logging middleware to cover all procedure calls, adds targeted auth event logs, and adds per-mutation Sonner toasts on the frontend for the three mutation call sites.

---

## Backend Logging — Options

| Option | Pros | Cons |
|--------|------|------|
| **Pino** ✓ | Fastest (~5× Winston), JSON-structured, pino-pretty for dev, low overhead, TS-native | — |
| Winston | Flexible transports, big ecosystem | Heavier, more boilerplate |
| Hono built-in | Already present | Not structured, not extensible |
| tslog | TS-first, readable DX | Less production-proven |

**Recommendation: Pino.** JSON output is ready for any log aggregator (Datadog, Loki, Cloudwatch). `pino-pretty` makes local dev readable. Minimal config.

---

## Implementation Steps

### 1. Install dependencies

Add to **`packages/api/package.json`**:
```json
"pino": "^9.x"          // runtime dep
"pino-pretty": "^13.x"  // devDependency
```

### 2. Create logger singleton — `packages/api/src/lib/logger.ts` (new file)

```ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" },
    },
  }),
});
```

### 3. tRPC logging middleware — `packages/api/src/index.ts`

Add a `loggingMiddleware` and attach it to `publicProcedure` so ALL derived procedures (`protectedProcedure`, `adminProcedure`) inherit it automatically.

```ts
import { logger } from "./lib/logger";

const SENSITIVE_KEYS = new Set(["code", "password", "refreshToken", "token"]);

function sanitizeInput(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).map(([k, v]) => [
      k,
      SENSITIVE_KEYS.has(k) ? "[redacted]" : v,
    ])
  );
}

const loggingMiddleware = t.middleware(async ({ path, type, input, next }) => {
  const start = Date.now();
  const result = await next();
  const ms = Date.now() - start;
  if (result.ok) {
    logger.info({ path, type, input: sanitizeInput(input), ms }, "trpc ok");
  } else {
    logger.error({ path, type, input: sanitizeInput(input), ms, err: result.error }, "trpc error");
  }
  return result;
});

export const publicProcedure = t.procedure.use(loggingMiddleware);
// protectedProcedure and adminProcedure already use publicProcedure as base — no change needed
```

### 4. Replace Hono's `logger()` — `apps/server/src/index.ts`

Replace `app.use(logger())` with a custom middleware using the Pino instance:

```ts
import { logger } from "@haber-final/api/lib/logger";

// replace: app.use(logger());
app.use(async (c, next) => {
  const start = Date.now();
  await next();
  logger.info(
    { method: c.req.method, path: c.req.path, status: c.res.status, ms: Date.now() - start },
    "http"
  );
});
```

### 5. Auth event logging — `packages/api/src/routers/auth.ts`

Import `logger` and add targeted log calls at key events:

| Event | Level | What to log |
|-------|-------|-------------|
| Rate limit hit | `warn` | masked email |
| OTP requested | `info` | masked email |
| OTP invalid attempt | `warn` | userId, attemptCount |
| OTP max attempts exceeded | `warn` | userId |
| Login success | `info` | userId |
| Refresh token reuse detected | `warn` | familyId (security event) |
| Refresh idle expired | `info` | sessionId |
| Refresh success | `debug` | userId |
| Logout | `info` | userId |
| Logout all | `info` | userId |

Email masking helper (inline): `email.replace(/(.{2}).*(@.*)/, "$1***$2")`

---

## Frontend: Sonner Notifications

The `QueryCache.onError` already covers query errors. The login page uses inline `setError` state which is better UX for auth — leave it untouched.

Add success + error toasts at the three mutation call sites:

### `apps/web/src/routes/todos.tsx`
- `createMutation.onSuccess`: add `toast.success("Task added")`
- `createMutation.onError`: add `(err) => toast.error(err.message)`
- `deleteMutation.onSuccess`: add `toast.success("Task deleted")`
- `deleteMutation.onError`: add `(err) => toast.error(err.message)`
- `toggleMutation.onError`: add `(err) => toast.error(err.message)` (no success toast — toggle is a silent action)

### `apps/web/src/components/shell/AppShell.tsx`
- `handleLogout`: add `toast.success("Logged out")` before navigation
- `handleLogoutAll`: add `toast.success("Logged out everywhere")` before navigation
- Both logout `catch` blocks: show `toast.error(...)` instead of silently swallowing errors

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `packages/api/package.json` | Add `pino` dep, `pino-pretty` devDep |
| `packages/api/src/lib/logger.ts` | **New** — Pino singleton |
| `packages/api/src/index.ts` | Add `loggingMiddleware`, attach to `publicProcedure` |
| `packages/api/src/routers/auth.ts` | Import logger, add auth event logs |
| `apps/server/src/index.ts` | Replace `logger()` with Pino HTTP middleware |
| `apps/web/src/routes/todos.tsx` | Add success/error toasts to mutations |
| `apps/web/src/components/shell/AppShell.tsx` | Add success/error toasts to logout |

---

## Verification

1. `pnpm dev:server` — start server, observe structured Pino output (pino-pretty colored logs in dev)
2. Hit `GET /` — should see `http` log line with method/path/status/ms
3. Call `auth.requestOtp` via the login page — should see `trpc ok` log with sanitized input + auth event log
4. Call `auth.verifyOtp` with wrong code — should see `trpc error` + `warn` OTP invalid attempt
5. Create/delete a todo — should see Sonner toast in the browser + `trpc ok` on server
6. `pnpm check-types` — no TypeScript errors
