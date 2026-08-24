import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { getBuildInfo } from "../../scripts/build-info.mjs";

const { version, buildDate, gitSha } = getBuildInfo();

export default defineConfig({
	server: {
		port: 3001,
	},
	resolve: {
		tsconfigPaths: true,
	},
	define: {
		__APP_VERSION__: JSON.stringify(version),
		__BUILD_DATE__: JSON.stringify(buildDate),
		__GIT_SHA__: JSON.stringify(gitSha),
	},
	plugins: [
		tailwindcss(),
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
		}),
		react(),
	],
});
