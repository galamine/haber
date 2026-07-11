import { Button } from "@haber-final/ui/components/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@haber-final/ui/components/dialog";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute(
	"/_authenticated/settings/deleted-records/",
)({
	beforeLoad: () => {
		const role = useAuthStore.getState().role;
		if (role !== "CLINIC_ADMIN" && role !== "SUPER_ADMIN") {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: DeletedRecordsPage,
});

type DeletedChild = {
	id: string;
	fullName: string;
	dob: string | Date;
	opNumber: string;
	deletedAt: string | Date;
	retentionExpiresAt: string | Date;
	pastRetentionWindow: boolean;
};

function DeleteChildDialog({
	child,
	open,
	onOpenChange,
	onDelete,
	isPending,
}: {
	child: DeletedChild | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDelete: () => void;
	isPending: boolean;
}) {
	const [deleteConfirmText, setDeleteConfirmText] = useState("");
	const canDelete = deleteConfirmText === "DELETE";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Permanently delete record?</DialogTitle>
					<DialogDescription>
						This will permanently delete the record for{" "}
						<span className="font-medium">{child?.fullName}</span>. This action
						cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<p className="text-on-surface-variant text-sm">
						This record has passed the 7-year retention window and is eligible
						for permanent deletion.
					</p>
					<div>
						<label
							htmlFor="delete-confirm"
							className="text-on-surface-variant text-xs"
						>
							Type{" "}
							<span className="font-semibold text-red-600 text-sm">DELETE</span>{" "}
							to confirm
						</label>
						<input
							id="delete-confirm"
							type="text"
							value={deleteConfirmText}
							onChange={(e) => setDeleteConfirmText(e.target.value)}
							className="mt-1 w-full rounded-lg border border-outline-variant bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brown-600"
							placeholder="DELETE"
						/>
					</div>
				</div>
				<DialogFooter>
					<DialogClose>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button
						variant="destructive"
						disabled={!canDelete || isPending}
						onClick={onDelete}
					>
						Permanently Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function DeletedRecordsPage() {
	const queryClient = useQueryClient();
	const { role } = useAuthStore();
	const [deleteTarget, setDeleteTarget] = useState<DeletedChild | null>(null);
	const [deleteOpen, setDeleteOpen] = useState(false);

	const { data: deletedRecords, isLoading } = useQuery(
		trpc.dpdp.retentionReport.queryOptions({}),
	);

	const permanentDeleteMutation = useMutation(
		trpc.child.permanentDelete.mutationOptions({
			onSuccess: () => {
				toast.success("Record permanently deleted");
				setDeleteOpen(false);
				setDeleteTarget(null);
				queryClient.invalidateQueries({
					queryKey: trpc.dpdp.retentionReport.queryOptions().queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const isSuperAdmin = role === "SUPER_ADMIN";
	const gridCols = isSuperAdmin
		? "grid-cols-[2fr_100px_120px_120px_140px_100px_80px]"
		: "grid-cols-[2fr_100px_120px_120px_140px_100px]";

	function openDelete(child: DeletedChild) {
		setDeleteTarget(child);
		setDeleteOpen(true);
	}

	return (
		<div className="p-8">
			<div className="mb-6">
				<h1 className="font-semibold text-2xl text-on-surface">
					Deleted Records
				</h1>
				<p className="mt-1 text-on-surface-variant text-sm">
					View and manage soft-deleted child records for DPDP compliance
				</p>
			</div>

			{isLoading ? (
				<div className="divide-y divide-outline-variant overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={i}
							className={`grid ${gridCols} items-center gap-4 px-4 py-3`}
						>
							<div className="flex items-center gap-3">
								<Skeleton className="h-9 w-9 shrink-0 rounded-full" />
								<div className="space-y-1.5">
									<Skeleton className="h-3.5 w-32" />
									<Skeleton className="h-3 w-20" />
								</div>
							</div>
							<Skeleton className="h-3.5 w-16" />
							<Skeleton className="h-3.5 w-24" />
							<Skeleton className="h-3.5 w-24" />
							<Skeleton className="h-5 w-20 rounded-full" />
							{isSuperAdmin && <Skeleton className="h-8 w-16" />}
						</div>
					))}
				</div>
			) : !deletedRecords?.items?.length ? (
				<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest py-16 text-on-surface-variant">
					<Trash2 className="h-8 w-8" />
					<p className="text-sm">No deleted records found.</p>
				</div>
			) : (
				<div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
					<div
						className={`grid ${gridCols} gap-4 border-outline-variant border-b bg-surface-container-low px-4 py-3`}
					>
						<span className="font-medium text-on-surface-variant text-xs">
							Child Name
						</span>
						<span className="font-medium text-on-surface-variant text-xs">
							OP Number
						</span>
						<span className="font-medium text-on-surface-variant text-xs">
							Date of Birth
						</span>
						<span className="font-medium text-on-surface-variant text-xs">
							Deleted On
						</span>
						<span className="font-medium text-on-surface-variant text-xs">
							Retention Expires
						</span>
						<span className="font-medium text-on-surface-variant text-xs">
							Status
						</span>
						{isSuperAdmin && (
							<span className="font-medium text-on-surface-variant text-xs">
								Actions
							</span>
						)}
					</div>

					<div className="divide-y divide-outline-variant">
						{deletedRecords.items.map((record) => {
							const child = record as unknown as DeletedChild;
							return (
								<div
									key={child.id}
									className={`grid ${gridCols} items-center gap-4 px-4 py-3`}
								>
									<div className="flex items-center gap-3">
										<div>
											<Link
												to="/children/$childId"
												params={{ childId: child.id }}
												className="font-medium text-on-surface text-sm hover:underline"
											>
												{child.fullName}
											</Link>
										</div>
									</div>
									<span className="text-on-surface text-sm">
										{child.opNumber}
									</span>
									<span className="text-on-surface text-sm">
										{new Date(child.dob).toLocaleDateString()}
									</span>
									<span className="text-on-surface text-sm">
										{new Date(child.deletedAt).toLocaleDateString()}
									</span>
									<span className="text-on-surface text-sm">
										{new Date(child.retentionExpiresAt).toLocaleDateString()}
									</span>
									<span
										className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
											child.pastRetentionWindow
												? "bg-red-100 text-red-700"
												: "bg-[#FEF08A] text-[#854D0E]"
										}`}
									>
										{child.pastRetentionWindow
											? "Eligible for Permanent Delete"
											: "Retention Window"}
									</span>
									{isSuperAdmin && (
										<div>
											<Button
												size="sm"
												variant="ghost"
												disabled={!child.pastRetentionWindow}
												onClick={() => openDelete(child)}
											>
												<Trash2 className="h-3.5 w-3.5 text-destructive" />
											</Button>
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>
			)}

			<DeleteChildDialog
				child={deleteTarget}
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				onDelete={() =>
					deleteTarget &&
					permanentDeleteMutation.mutate({ childId: deleteTarget.id })
				}
				isPending={permanentDeleteMutation.isPending}
			/>
		</div>
	);
}
