import { authRouter } from './router/auth';
import { userRouter } from './router/user';
import { router } from './trpc';

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
