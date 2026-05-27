import { publicProcedure, router } from "../index";
import { authRouter } from "./auth";
import { todoRouter } from "./todo";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	auth: authRouter,
	todo: todoRouter,
});
export type AppRouter = typeof appRouter;
