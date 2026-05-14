import { protectedProcedure, router } from '../trpc';

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),
});
