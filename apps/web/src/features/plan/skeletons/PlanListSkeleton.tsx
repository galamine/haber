import { Skeleton } from "@haber-final/ui/components/skeleton";

export function PlanListSkeleton() {
	return (
		<div className="space-y-4">
			{[1, 2].map((groupIndex) => (
				<div
					key={groupIndex}
					className="rounded-xl border border-outline-variant bg-surface-container-low p-4"
				>
					<div className="mb-3 flex items-center justify-between border-outline-variant border-b pb-3">
						<Skeleton className="h-5 w-40" />
						<Skeleton className="h-6 w-20 rounded" />
					</div>
					<div className="flex flex-col gap-2">
						{[1, 2].map((rowIndex) => (
							<div
								key={rowIndex}
								className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-lowest p-3"
							>
								<div className="flex items-center gap-3">
									<Skeleton className="h-5 w-5 rounded-full" />
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-5 w-16 rounded" />
								</div>
								<Skeleton className="h-5 w-5 rounded" />
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
