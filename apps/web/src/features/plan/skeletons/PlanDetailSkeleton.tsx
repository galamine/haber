import { Skeleton } from "@haber-final/ui/components/skeleton";

export function PlanDetailSkeleton() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-2 text-sm">
				<Skeleton className="h-8 w-24" />
			</div>

			<Skeleton className="h-32 w-full rounded-xl" />

			<div className="flex gap-2">
				<Skeleton className="h-10 w-24" />
				<Skeleton className="h-10 w-24" />
				<Skeleton className="h-10 w-24" />
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2">
					<Skeleton className="h-64 w-full rounded-xl" />
				</div>
				<div>
					<Skeleton className="h-64 w-full rounded-xl" />
				</div>
			</div>
		</div>
	);
}
