import type { UserRole } from "@habe-final/api/schemas";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type AuthState = {
	accessToken: string | null;
	refreshToken: string | null;
	role: UserRole | null;
	tenantId: string | null;
	userId: string | null;
	isAuthenticated: boolean;
	lastActivity: number;
	setTokens: (accessToken: string, refreshToken: string) => void;
	clearTokens: () => void;
	updateActivity: () => void;
	isIdle: () => boolean;
};

function parseJwt(token: string): Record<string, unknown> | null {
	try {
		return JSON.parse(atob(token.split(".")[1]));
	} catch {
		return null;
	}
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRefresh(accessToken: string, refreshToken: string) {
	if (refreshTimer) clearTimeout(refreshTimer);
	const payload = parseJwt(accessToken);
	if (!payload || typeof payload.exp !== "number") return;
	const msUntilRefresh = payload.exp * 1000 - Date.now() - 60_000;
	if (msUntilRefresh <= 0) return;
	refreshTimer = setTimeout(async () => {
		const { trpcClient } = await import("../utils/trpc");
		try {
			const result = await trpcClient.auth.refreshToken.mutate({
				refreshToken,
			});
			useAuthStore
				.getState()
				.setTokens(result.accessToken, result.refreshToken);
		} catch {
			useAuthStore.getState().clearTokens();
		}
	}, msUntilRefresh);
}

export const useAuthStore = create<AuthState>()(
	persist(
		(set, get) => ({
			accessToken: null,
			refreshToken: null,
			role: null,
			tenantId: null,
			userId: null,
			isAuthenticated: false,
			lastActivity: 0,

			setTokens: (accessToken, refreshToken) => {
				const payload = parseJwt(accessToken);
				set({
					accessToken,
					refreshToken,
					isAuthenticated: true,
					role: (payload?.role as UserRole) ?? null,
					tenantId: (payload?.tenantId as string) ?? null,
					userId: (payload?.sub as string) ?? null,
					lastActivity: Date.now(),
				});
				scheduleRefresh(accessToken, refreshToken);
			},

			clearTokens: () => {
				if (refreshTimer) clearTimeout(refreshTimer);
				refreshTimer = null;
				set({
					accessToken: null,
					refreshToken: null,
					role: null,
					tenantId: null,
					userId: null,
					isAuthenticated: false,
					lastActivity: 0,
				});
			},

			updateActivity: () => set({ lastActivity: Date.now() }),

			isIdle: () => {
				const { lastActivity } = get();
				return Date.now() - lastActivity > 24 * 60 * 60 * 1000;
			},
		}),
		{ name: "haber-auth" },
	),
);
