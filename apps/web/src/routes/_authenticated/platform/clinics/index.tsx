import { Button } from "@haber-final/ui/components/button";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Building2 } from "lucide-react";

import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/platform/clinics/")({
	beforeLoad: () => {
		if (useAuthStore.getState().role !== "SUPER_ADMIN") {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: ClinicsListPage,
});

type ClinicSummary = {
	name: string;
	createdAt: string;
	activeChildren: number;
	activeTherapists: number;
	sessionsThisMonth: number;
};

function ClinicRow({ clinic }: { clinic: ClinicSummary }) {
	return (
		<div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3">
			<span className="font-medium text-on-surface text-sm">{clinic.name}</span>
			<span className="text-on-surface-variant text-sm">
				{clinic.activeChildren}
			</span>
			<span className="text-on-surface-variant text-sm">
				{clinic.activeTherapists}
			</span>
			<span className="text-on-surface-variant text-sm">
				{clinic.sessionsThisMonth}
			</span>
			<span className="text-on-surface-variant text-sm">
				{new Date(clinic.createdAt).toLocaleDateString("en-US", {
					year: "numeric",
					month: "short",
					day: "numeric",
				})}
			</span>
		</div>
	);
}

function ClinicsListSkeleton() {
	return (
		<div className="divide-y divide-outline-variant">
			{Array.from({ length: 4 }).map((_, i) => (
				<div
					key={i}
					className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3"
				>
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-4 w-10" />
					<Skeleton className="h-4 w-10" />
					<Skeleton className="h-4 w-10" />
					<Skeleton className="h-4 w-24" />
				</div>
			))}
		</div>
	);
}

function ClinicsListPage() {
	const router = useRouter();
	const { data, isLoading } = useQuery(
		trpc.clinic.platformSummary.queryOptions(),
	);

	return (
		<div className="p-8">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-semibold text-2xl text-on-surface">All Clinics</h1>
				<Button
					onClick={() => router.navigate({ to: "/platform/clinics/new" })}
				>
					Register Clinic
				</Button>
			</div>

			<div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
				<div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-outline-variant border-b px-4 py-3">
					<span className="font-medium text-on-surface-variant text-xs">
						Name
					</span>
					<span className="font-medium text-on-surface-variant text-xs">
						Children
					</span>
					<span className="font-medium text-on-surface-variant text-xs">
						Therapists
					</span>
					<span className="font-medium text-on-surface-variant text-xs">
						Sessions (Mo.)
					</span>
					<span className="font-medium text-on-surface-variant text-xs">
						Created
					</span>
				</div>

				{isLoading ? (
					<ClinicsListSkeleton />
				) : !data?.length ? (
					<div className="flex flex-col items-center justify-center gap-3 py-16 text-on-surface-variant">
						<Building2 className="h-8 w-8" />
						<p className="text-sm">No clinics registered.</p>
					</div>
				) : (
					<div className="divide-y divide-outline-variant">
						{data.map((clinic, i) => (
							<ClinicRow key={i} clinic={clinic} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
