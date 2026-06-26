import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/dashboard")({
	beforeLoad: () => {
		const role = useAuthStore.getState().role;
		if (role === "SUPER_ADMIN") {
			throw redirect({ to: "/platform/clinics" });
		}
	},
	component: DashboardPage,
});

function DashboardPage() {
	const router = useRouter();
	const role = useAuthStore((s) => s.role);
	const { data: profile, isFetching } = useQuery({
		...trpc.profile.get.queryOptions(),
		enabled: role !== "SUPER_ADMIN",
	});

	useEffect(() => {
		if (profile === null && !isFetching && role !== "SUPER_ADMIN") {
			router.navigate({ to: "/user-profile" });
		}
	}, [profile, role, router, isFetching]);

	if (profile === null && !isFetching && role !== "SUPER_ADMIN") {
		return null;
	}

	return (
		<div className="p-8">
			<h1 className="font-semibold text-2xl text-on-surface">Dashboard</h1>
			<p className="mt-2 text-on-surface-variant">
				Welcome back. More content coming soon.
			</p>
		</div>
	);
}
