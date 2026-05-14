import type { Context } from '@haber-full/shared';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import type { Context as HonoContext } from 'hono';

export function createContext(_opts: FetchCreateContextFnOptions, _c: HonoContext): Context {
  return {
    user: null,
  };
}

export type AppContext = Context & {
  prisma: import('@prisma/client').PrismaClient;
};
