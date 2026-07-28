import { createEnv } from "@t3-oss/env-core";
import { config as dotenvConfig } from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenvConfig({ path: join(__dirname, "..", ".env") });

export const env = createEnv({
	server: {
		SARVAM_SUBSCRIPTION_KEY: z
			.string()
			.min(1, "SARVAM_SUBSCRIPTION_KEY is required"),
		SARVAM_API_URL: z.string().url().default("https://api.sarvam.ai"),
		LLM_PROVIDER: z.enum(["gemini"]).default("gemini"),
		GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
		GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
