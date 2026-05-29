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
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@haber-final/ui/components/form";
import { Input } from "@haber-final/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@haber-final/ui/components/select";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@haber-final/ui/components/sheet";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { Textarea } from "@haber-final/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/settings/departments")({
	component: DepartmentsPage,
});

type Department = {
	id: string;
	name: string;
	description: string | null;
	headUserId: string | null;
	createdAt: string;
};

type StaffItem = {
	id: string;
	email: string;
};

// Single schema covering both create and edit
const DeptFormSchema = z.object({
	id: z.string().optional(),
	name: z.string().min(1).max(200),
	description: z.string().optional(),
	headUserId: z.string().optional(),
});

type DeptFormValues = z.infer<typeof DeptFormSchema>;

function DepartmentFormSheet({
	open,
	onOpenChange,
	initial,
	therapists,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initial?: Department;
	therapists: StaffItem[];
}) {
	const queryClient = useQueryClient();
	const isEdit = Boolean(initial);

	const form = useForm({
		resolver: zodResolver(DeptFormSchema),
		defaultValues: {
			id: initial?.id,
			name: initial?.name ?? "",
			description: initial?.description ?? "",
			headUserId: initial?.headUserId ?? undefined,
		},
	});

	useEffect(() => {
		form.reset({
			id: initial?.id,
			name: initial?.name ?? "",
			description: initial?.description ?? "",
			headUserId: initial?.headUserId ?? undefined,
		});
	}, [initial, form]);

	const invalidateDepts = () =>
		queryClient.invalidateQueries({
			queryKey: trpc.clinic.listDepartments.queryOptions().queryKey,
		});

	const createMutation = useMutation(
		trpc.clinic.createDepartment.mutationOptions({
			onSuccess: () => {
				toast.success("Department created");
				onOpenChange(false);
				invalidateDepts();
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const updateMutation = useMutation(
		trpc.clinic.updateDepartment.mutationOptions({
			onSuccess: () => {
				toast.success("Department updated");
				onOpenChange(false);
				invalidateDepts();
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	function onSubmit(values: DeptFormValues) {
		const headUserId =
			values.headUserId === "none" || !values.headUserId
				? undefined
				: values.headUserId;

		if (isEdit && values.id) {
			updateMutation.mutate({
				id: values.id,
				name: values.name,
				description: values.description,
				headUserId,
			});
		} else {
			createMutation.mutate({
				name: values.name,
				description: values.description,
				headUserId,
			});
		}
	}

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>
						{isEdit ? "Edit Department" : "Add Department"}
					</SheetTitle>
				</SheetHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="mt-4 flex flex-col gap-4"
					>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input placeholder="e.g. Occupational Therapy" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Brief description…"
											rows={3}
											{...(field as React.ComponentProps<"textarea">)}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="headUserId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Head Therapist</FormLabel>
									<FormControl>
										<Select
											value={field.value ?? "none"}
											onValueChange={(val) =>
												field.onChange(val === "none" ? undefined : val)
											}
										>
											<SelectTrigger>
												<SelectValue placeholder="Unassigned" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="none">Unassigned</SelectItem>
												{therapists.map((t) => (
													<SelectItem key={t.id} value={t.id}>
														{t.email}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button type="submit" disabled={isPending} className="mt-2">
							{isEdit ? "Save Changes" : "Create Department"}
						</Button>
					</form>
				</Form>
			</SheetContent>
		</Sheet>
	);
}

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
				<Button size="icon-sm" variant="ghost" onClick={onEdit}>
					<Pencil className="h-3.5 w-3.5" />
				</Button>
				<Button size="icon-sm" variant="ghost" onClick={onDelete}>
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
	const [sheetOpen, setSheetOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<Department | null>(null);
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

	function openCreate() {
		setEditTarget(null);
		setSheetOpen(true);
	}

	function openEdit(dept: Department) {
		setEditTarget(dept);
		setSheetOpen(true);
	}

	function openDelete(dept: Department) {
		setDeleteTarget(dept);
		setDeleteOpen(true);
	}

	return (
		<div className="p-8">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-semibold text-2xl text-on-surface">Departments</h1>
				<Button onClick={openCreate}>
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
							onEdit={() => openEdit(dept)}
							onDelete={() => openDelete(dept)}
						/>
					))}
				</div>
			)}

			<DepartmentFormSheet
				open={sheetOpen}
				onOpenChange={(o) => {
					setSheetOpen(o);
					if (!o) setEditTarget(null);
				}}
				initial={editTarget ?? undefined}
				therapists={therapists}
			/>

			<DeleteDepartmentDialog
				dept={deleteTarget}
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
			/>
		</div>
	);
}
