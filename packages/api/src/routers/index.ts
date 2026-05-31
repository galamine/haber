import { publicProcedure, router } from "../index";
import { authRouter } from "./auth";
import { childRouter } from "./child";
import { clinicRouter } from "./clinic";
import { consentRouter } from "./consent";
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
	child: childRouter,
	consent: consentRouter,
});
export type AppRouter = typeof appRouter;
