import { publicProcedure, router } from "../index";
import { authRouter } from "./auth";
import { milestoneRouter } from "./milestone";
import { taxonomyRouter } from "./taxonomy";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	auth: authRouter,
	taxonomy: taxonomyRouter,
	milestone: milestoneRouter,
});
export type AppRouter = typeof appRouter;
