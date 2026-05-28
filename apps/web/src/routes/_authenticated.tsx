import { createFileRoute, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/shell/AppShell";
import { useAuthStore } from "@/stores/auth";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: () => {
		if (!useAuthStore.getState().isAuthenticated) {
			throw redirect({ to: "/login" });
		}
	},
	component: AppShell,
});
