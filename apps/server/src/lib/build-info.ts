declare const __BUILD_VERSION__: string;
declare const __BUILD_DATE__: string;
declare const __GIT_SHA__: string;

export const BUILD_VERSION =
	typeof __BUILD_VERSION__ !== "undefined" ? __BUILD_VERSION__ : "dev";
export const BUILD_DATE =
	typeof __BUILD_DATE__ !== "undefined" ? __BUILD_DATE__ : "unknown";
export const GIT_SHA =
	typeof __GIT_SHA__ !== "undefined" ? __GIT_SHA__ : "unknown";
