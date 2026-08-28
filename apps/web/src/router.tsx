import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";

import Loader from "./components/loader";
import { routeTree } from "./routeTree.gen";
import { useAuthStore } from "./stores/auth";
import { queryClient, trpc } from "./utils/trpc";

export const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	scrollRestoration: true,
	defaultPendingComponent: () => <Loader />,
	context: { trpc, queryClient, auth: useAuthStore.getState() },
	Wrap: function WrapComponent({ children }: { children: React.ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	},
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
