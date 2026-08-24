import { execSync } from "node:child_process";

export function getBuildInfo() {
	const buildDate = new Date().toISOString();
	let gitSha = "unknown";
	try {
		gitSha = execSync("git rev-parse --short HEAD", {
			stdio: ["ignore", "pipe", "ignore"],
		})
			.toString()
			.trim();
	} catch {
		// not a git checkout — keep "unknown"
	}
	const version = `${buildDate.slice(0, 10).replace(/-/g, "")}-${gitSha}`;
	return { version, buildDate, gitSha };
}
