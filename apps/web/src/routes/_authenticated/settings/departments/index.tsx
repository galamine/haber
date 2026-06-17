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
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/settings/departments/")({
	beforeLoad: () => {
		if (useAuthStore.getState().role !== "CLINIC_ADMIN") {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: DepartmentsPage,
});

type Department = {
	id: string;
	name: string;
	description: string | null;
	headUserId: string | null;
	createdAt: string;
};

function DeleteDepartmentDialog({
	dept,
	open,
	onOpenChange,
}: {
	dept: Department | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const queryClient = useQueryClient();

	const deleteMutation = useMutation(
		trpc.clinic.deleteDepartment.mutationOptions({
			onSuccess: () => {
				toast.success("Department deleted");
				onOpenChange(false);
				queryClient.invalidateQueries({
					queryKey: trpc.clinic.listDepartments.queryOptions().queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete department?</DialogTitle>
					<DialogDescription>
						This will permanently delete{" "}
						<span className="font-medium">{dept?.name}</span>. This action
						cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button
						variant="destructive"
						disabled={deleteMutation.isPending}
						onClick={() => dept && deleteMutation.mutate({ id: dept.id })}
					>
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function DepartmentCard({
	dept,
	headEmail,
	onEdit,
	onDelete,
}: {
	dept: Department;
	headEmail?: string;
	onEdit: () => void;
	onDelete: () => void;
}) {
	return (
		<div className="group relative rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
			<div className="absolute top-4 right-4 hidden items-center gap-1 group-hover:flex">
				<Button size="sm" variant="ghost" onClick={onEdit}>
					<Pencil className="h-3.5 w-3.5" />
				</Button>
				<Button size="sm" variant="ghost" onClick={onDelete}>
					<Trash2 className="h-3.5 w-3.5 text-destructive" />
				</Button>
			</div>

			<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-brown-50">
				<Building2 className="h-6 w-6 text-brown-600" />
			</div>

			<h3 className="mb-1 font-medium text-on-surface">{dept.name}</h3>
			{dept.description && (
				<p className="mb-4 line-clamp-2 text-on-surface-variant text-xs">
					{dept.description}
				</p>
			)}

			<div className="border-outline-variant border-t pt-4">
				<p className="text-on-surface-variant text-xs">
					Head: {headEmail ?? "Unassigned"}
				</p>
			</div>
		</div>
	);
}

function DepartmentsPage() {
	const router = useRouter();
	const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
	const [deleteOpen, setDeleteOpen] = useState(false);

	const { data: departments, isLoading } = useQuery(
		trpc.clinic.listDepartments.queryOptions(),
	);

	const { data: therapistsData } = useQuery(
		trpc.staff.list.queryOptions({ role: "THERAPIST", pageSize: 100 }),
	);
	const therapists = therapistsData?.items ?? [];

	const headEmailMap = Object.fromEntries(
		therapists.map((t) => [t.id, t.email]),
	);

	function openDelete(dept: Department) {
		setDeleteTarget(dept);
		setDeleteOpen(true);
	}

	return (
		<div className="p-8">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-semibold text-2xl text-on-surface">Departments</h1>
				<Button
					onClick={() => router.navigate({ to: "/settings/departments/new" })}
				>
					<Plus className="h-4 w-4" />
					Add Department
				</Button>
			</div>

			{isLoading ? (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-48 rounded-xl" />
					))}
				</div>
			) : !departments?.length ? (
				<div className="flex flex-col items-center justify-center gap-3 py-16 text-on-surface-variant">
					<Building2 className="h-8 w-8" />
					<p className="text-sm">No departments yet. Add one to get started.</p>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{departments.map((dept) => (
						<DepartmentCard
							key={dept.id}
							dept={dept}
							headEmail={
								dept.headUserId ? headEmailMap[dept.headUserId] : undefined
							}
							onEdit={() =>
								router.navigate({
									to: "/settings/departments/$departmentId",
									params: { departmentId: dept.id },
								})
							}
							onDelete={() => openDelete(dept)}
						/>
					))}
				</div>
			)}

			<DeleteDepartmentDialog
				dept={deleteTarget}
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
			/>
		</div>
	);
}
