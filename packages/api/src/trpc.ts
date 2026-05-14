import { initTRPC } from '@trpc/server';
import type { AppContext } from './context';

const t = initTRPC.context<AppContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

export const protectedProcedure = t.procedure.use(
  middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new Error('Unauthorized');
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  })
);
