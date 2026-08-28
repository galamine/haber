import type { AppRouter } from "@haber-final/api/routers/index";
import { env } from "@haber-final/env/web";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { toast } from "sonner";

import { router } from "@/router";
import { useAuthStore } from "@/stores/auth";

const shownErrors = new Map<string, number>();

function isUnauthorized(error: unknown) {
	return (
		(error as { data?: { code?: string } } | undefined)?.data?.code ===
		"UNAUTHORIZED"
	);
}

function handleAuthError(error: unknown) {
	if (!isUnauthorized(error)) return false;
	useAuthStore.getState().clearTokens();
	router.navigate({ to: "/login" });
	return true;
}

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: (failureCount, error) => {
				if (isUnauthorized(error)) return false;
				return failureCount < 3;
			},
		},
	},
	queryCache: new QueryCache({
		onError: (error, query) => {
			if (handleAuthError(error)) return;
			if (query.meta?.suppressErrorToast) return;

			const now = Date.now();
			const key = error.message;
			const lastShown = shownErrors.get(key) ?? 0;

			if (now - lastShown < 2000) return;

			shownErrors.set(key, now);
			for (const [k, t] of shownErrors) {
				if (now - t > 5000) shownErrors.delete(k);
			}

			toast.error(error.message, {
				action: {
					label: "retry",
					onClick: query.invalidate,
				},
			});
		},
	}),
	mutationCache: new MutationCache({
		onError: (error) => {
			handleAuthError(error);
		},
	}),
});

export const trpcClient = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: `${env.VITE_SERVER_URL}/trpc`,
			headers: () => {
				const token = useAuthStore.getState().accessToken;
				return token ? { Authorization: `Bearer ${token}` } : {};
			},
		}),
	],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
	client: trpcClient,
	queryClient,
});
