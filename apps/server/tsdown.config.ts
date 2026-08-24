import { defineConfig } from "tsdown";
import { getBuildInfo } from "../../scripts/build-info.mjs";

const { version, buildDate, gitSha } = getBuildInfo();

export default defineConfig({
	entry: "./src/index.ts",
	format: "esm",
	outDir: "./dist",
	clean: true,
	noExternal: [/@haber-final\/.*/],
	define: {
		__BUILD_VERSION__: JSON.stringify(version),
		__BUILD_DATE__: JSON.stringify(buildDate),
		__GIT_SHA__: JSON.stringify(gitSha),
	},
});
