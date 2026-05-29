import { publicProcedure, router } from "../index";
import { authRouter } from "./auth";
import { clinicRouter } from "./clinic";
import { milestoneRouter } from "./milestone";
import { staffRouter } from "./staff";
import { taxonomyRouter } from "./taxonomy";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	auth: authRouter,
	clinic: clinicRouter,
	taxonomy: taxonomyRouter,
	milestone: milestoneRouter,
	staff: staffRouter,
});
export type AppRouter = typeof appRouter;
