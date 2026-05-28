import { createFileRoute, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/shell/AppShell";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: ({ context }) => {
		if (!context.auth.isAuthenticated) {
			throw redirect({ to: "/login" });
		}
	},
	component: AppShell,
});
