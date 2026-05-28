import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
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
