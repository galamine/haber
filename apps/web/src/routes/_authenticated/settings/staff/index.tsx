import { Avatar, AvatarFallback } from "@haber-final/ui/components/avatar";
import { Button } from "@haber-final/ui/components/button";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useState } from "react";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/settings/staff/")({
	component: StaffListPage,
});

function getInitials(email: string) {
	return email.slice(0, 2).toUpperCase();
}

type StaffItem = {
	id: string;
	email: string;
	role: string;
	loginEnabled: boolean;
};

function StaffRow({ row }: { row: StaffItem }) {
	const router = useRouter();
	return (
		<button
			type="button"
			className="grid w-full cursor-pointer grid-cols-[2fr_1fr_1fr] items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/40"
			onClick={() =>
				router.navigate({
					to: "/settings/staff/$staffId",
					params: { staffId: row.id },
				})
			}
		>
			<div className="flex items-center gap-3">
				<Avatar className="h-8 w-8 shrink-0">
					<AvatarFallback className="text-xs">
						{getInitials(row.email)}
					</AvatarFallback>
				</Avatar>
				<span className="truncate text-on-surface text-sm">{row.email}</span>
			</div>
			<span className="text-on-surface-variant text-sm capitalize">
				{row.role.toLowerCase()}
			</span>
			<div>
				{row.loginEnabled ? (
					<span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 font-medium text-green-700 text-xs">
						Active
					</span>
				) : (
					<span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 font-medium text-gray-600 text-xs">
						Inactive
					</span>
				)}
			</div>
		</button>
	);
}

function StaffListSkeleton() {
	return (
		<div className="divide-y divide-outline-variant">
			{Array.from({ length: 5 }).map((_, i) => (
				<div
					key={i}
					className="grid grid-cols-[2fr_1fr_1fr] items-center gap-4 px-4 py-3"
				>
					<div className="flex items-center gap-3">
						<Skeleton className="h-8 w-8 rounded-full" />
						<Skeleton className="h-4 w-40" />
					</div>
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-5 w-14 rounded-full" />
				</div>
			))}
		</div>
	);
}

function StaffListPage() {
	const [page, setPage] = useState(1);
	const router = useRouter();
	const { data, isLoading } = useQuery(
		trpc.staff.list.queryOptions({ page, pageSize: 20 }),
	);

	return (
		<div className="p-8">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-semibold text-2xl text-on-surface">Staff</h1>
				<Button
					onClick={() => router.navigate({ to: "/settings/staff/invite" })}
				>
					Invite Staff
				</Button>
			</div>

			<div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
				<div className="grid grid-cols-[2fr_1fr_1fr] gap-4 border-outline-variant border-b px-4 py-3">
					<span className="font-medium text-on-surface-variant text-xs">
						Name
					</span>
					<span className="font-medium text-on-surface-variant text-xs">
						Role
					</span>
					<span className="font-medium text-on-surface-variant text-xs">
						Status
					</span>
				</div>

				{isLoading ? (
					<StaffListSkeleton />
				) : !data?.items.length ? (
					<div className="flex flex-col items-center justify-center gap-3 py-16 text-on-surface-variant">
						<Users className="h-8 w-8" />
						<p className="text-sm">No staff members yet.</p>
					</div>
				) : (
					<div className="divide-y divide-outline-variant">
						{data.items.map((row) => (
							<StaffRow key={row.id} row={row} />
						))}
					</div>
				)}
			</div>

			{data && data.totalPages > 1 && (
				<div className="mt-4 flex items-center justify-center gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={page <= 1}
						onClick={() => setPage((p) => p - 1)}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<span className="text-on-surface-variant text-sm">
						Page {data.page} of {data.totalPages}
					</span>
					<Button
						variant="outline"
						size="sm"
						disabled={page >= data.totalPages}
						onClick={() => setPage((p) => p + 1)}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			)}
		</div>
	);
}
