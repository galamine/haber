import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_SERVER_URL: z.url(),
		VITE_GAME_SERVER_URL: z.url(),
	},
	runtimeEnv: (
		import.meta as unknown as {
			env: { VITE_SERVER_URL: string; VITE_GAME_SERVER_URL: string };
		}
	).env,
	emptyStringAsUndefined: true,
});
