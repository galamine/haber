import type { AppRouter } from "@haber-final/api/routers/index";
import { env } from "@haber-final/env/web";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/auth";

const shownErrors = new Map<string, number>();

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
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
