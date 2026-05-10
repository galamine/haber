# Agent Guidelines for Haber Repository

## Project Overview

This is a monorepo (pnpm workspaces) with three main packages:
- `@haber/backend` (Express.js API in `apps/backend/src`)
- `@haber/frontend` (React in `apps/frontend`)
- `@haber/shared` (Shared Zod schemas, DTOs, constants in `packages/shared`)

## Build Commands

```bash
# Root level - build all packages
pnpm build

# Build specific packages
pnpm build:shared
pnpm build:backend
pnpm build:frontend

# Development mode (both backend and frontend)
pnpm dev

# Docker
pnpm docker:dev      # Development
pnpm docker:prod     # Production
```

## Test Commands

```bash
# Run all backend tests
pnpm test

# Run tests in backend package directly (for single test execution)
cd apps/backend && pnpm test

# Single test file (Jest pattern)
cd apps/backend && pnpm test -- auth.controller.test.ts

# Single test with watch mode
cd apps/backend && pnpm test --watch auth

# Coverage
cd apps/backend && pnpm coverage
```

## Lint and Format

```bash
# Lint all (Biome)
pnpm lint

# Auto-fix lint issues
pnpm lint:fix

# Format code
pnpm format
```

## Code Style (Biome)

- **Indentation**: 2 spaces
- **Line width**: 125 characters
- **Quotes**: Single quotes (`'`) for JS/TS, double quotes (`"`) for JSX
- **Trailing commas**: ES5 style
- **Import sorting**: Biome handles this automatically

## TypeScript Guidelines

Base config in `tsconfig.base.json` with strict mode enabled:
- `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`
- `noUnusedLocals: true`, `noUnusedParameters: true`
- `noImplicitOverride: true`

Always use explicit types for function parameters and return values.

## Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `auth.controller.ts` |
| Classes | PascalCase | `ApiError`, `UserService` |
| Functions | camelCase | `createUser`, `generateAuthTokens` |
| Constants | PascalCase | `TOKEN_EXPIRY`, `USER_ROLES` |
| Interfaces | PascalCase | `AuthRequest`, `UserDto` |
| Variables | camelCase | `refreshToken`, `userData` |

## Import Patterns

```typescript
// External packages
import express from 'express';
import httpStatus from 'http-status';

// Internal aliases
import config from '@/config/config';           // src/* imports
import { ApiError } from '@/utils/ApiError';    // for backend src utils
import { authService } from '@/services';       // barrel exports

// Shared package (from packages/shared/src)
import { RegisterDtoSchema } from '@haber/shared';
import { USER_ROLES } from '@haber/shared/constants';
```

## Transactions

Use `prisma.$transaction` whenever a service operation must be atomic across multiple tables:

```typescript
// Sequential operations (array form — simpler, no interdependency)
const [user, token] = await prisma.$transaction([
  prisma.user.create({ data: userData }),
  prisma.token.create({ data: tokenData }),
]);

// Interactive form — use when later steps depend on earlier results
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  await tx.profile.create({ data: { userId: user.id, ...profileData } });
  return user;
});
```

Always pass the `tx` client through to every Prisma call inside the callback instead of the module-level `prisma` singleton. Never mix `tx` and `prisma` inside the same transaction callback.

## Error Handling

Use the `ApiError` class for operational errors:

```typescript
import { ApiError } from '@/utils/ApiError';
import httpStatus from 'http-status';

// Throw errors in controllers
throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
```

Non-operational errors (programming bugs) should not set `isOperational`.

## Async Route Handlers

Use the `catchAsync` wrapper for all controller functions:

```typescript
import { catchAsync } from '@/utils/catchAsync';

const register = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).send({ user });
});
```

## Validation

Use Zod schemas from `@haber/shared` for request validation. Define validation objects in `src/validations/` and use the `validate` middleware:

```typescript
// src/validations/auth.validation.ts
const register = { body: RegisterDtoSchema };
export default { register };

// In routes
router.route('/register').post(validate(authValidation.register), authController.register);
```

## File Structure (Backend)

```
apps/backend/src/
├── config/         # Configuration (config.ts, logger.ts, passport.ts)
├── controllers/    # Route handlers (default export per file)
├── docs/           # Swagger definitions
├── middlewares/    # Express middleware (auth, validate, error, rateLimiter)
├── models/         # Prisma models barrel
├── routes/v1/      # API routes
├── services/       # Business logic (barrel exports)
├── types/          # TypeScript types and declarations
├── utils/          # Utility functions (ApiError, catchAsync, pick)
├── validations/    # Validation schemas
└── app.ts          # Express app setup
```

## API Response Patterns

```typescript
// Success
res.status(httpStatus.CREATED).send({ user, tokens });
res.send({ user, tokens });
res.status(httpStatus.NO_CONTENT).send();

// Error
throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid input');
```

## Commit Guidelines

- Use Husky pre-commit hooks (lint-staged)
- Commits are linted via Biome before commit
- Follow conventional commits format

## Environment Variables

- Copy `.env` to `.env.local` for local development
- Never commit secrets to repository
- Use `config.ts` in `apps/backend/src/config/` to access env vars

## Frontend Component Reference

For all frontend tasks involving UI components, refer to `apps/frontend/DESIGN_SYSTEM_COMPONENTS.md` for:
- Component purpose and use cases
- Import paths and variant APIs
- Design token usage
- Dark mode patterns