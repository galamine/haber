import { createFileRoute, redirect } from "@tanstack/react-router";

import { useAuthStore } from "@/stores/auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
	beforeLoad: () => {
		if (useAuthStore.getState().role === "SUPER_ADMIN") {
			throw redirect({ to: "/platform/clinics" });
		}
	},
	component: DashboardPage,
});

function DashboardPage() {
	return (
		<div className="p-8">
			<h1 className="font-semibold text-2xl text-on-surface">Dashboard</h1>
			<p className="mt-2 text-on-surface-variant">
				Welcome back. More content coming soon.
			</p>
		</div>
	);
}
