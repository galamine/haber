import { publicProcedure, router } from "../index";
import { assessmentRouter } from "./assessment";
import { authRouter } from "./auth";
import { childRouter } from "./child";
import { clinicRouter } from "./clinic";
import { consentRouter } from "./consent";
import { consentInvitationRouter } from "./consentInvitation";
import { gameRouter } from "./game";
import { milestoneRouter } from "./milestone";
import { profileRouter } from "./profile";
import { staffRouter } from "./staff";
import { taxonomyRouter } from "./taxonomy";

export const appRouter: ReturnType<typeof router> = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	auth: authRouter,
	clinic: clinicRouter,
	game: gameRouter,
	taxonomy: taxonomyRouter,
	milestone: milestoneRouter,
	staff: staffRouter,
	child: childRouter,
	consent: consentRouter,
	consentInvitation: consentInvitationRouter,
	assessment: assessmentRouter,
	profile: profileRouter,
});
export type AppRouter = typeof appRouter;
