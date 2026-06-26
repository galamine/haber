import { Skeleton } from "@haber-final/ui/components/skeleton";

export function PlanListSkeleton() {
	return (
		<div className="space-y-4">
			<div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
				<div className="mb-3 flex items-center justify-between border-outline-variant border-b pb-3">
					<Skeleton className="h-6 w-32" />
					<Skeleton className="h-5 w-16" />
				</div>
				<div className="flex flex-col gap-2">
					<Skeleton className="h-16 w-full rounded-lg" />
					<Skeleton className="h-16 w-full rounded-lg" />
				</div>
			</div>
		</div>
	);
}
