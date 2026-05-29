import { PERMISSIONS } from "@haber-final/api/schemas/staff";
import { Avatar, AvatarFallback } from "@haber-final/ui/components/avatar";
import { Button } from "@haber-final/ui/components/button";
import { Checkbox } from "@haber-final/ui/components/checkbox";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@haber-final/ui/components/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@haber-final/ui/components/select";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { ChevronRight, Mail, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/settings/staff/$staffId")(
	{
		beforeLoad: () => {
			if (useAuthStore.getState().role !== "CLINIC_ADMIN") {
				throw redirect({ to: "/dashboard" });
			}
		},
		component: StaffDetailPage,
	},
);

const PERMISSION_LABELS: Record<string, string> = {
	[PERMISSIONS.CHILD_INTAKE]: "Child Intake",
	[PERMISSIONS.SESSION_RUN]: "Run Sessions",
	[PERMISSIONS.TREATMENT_PLAN_MODIFY]: "Modify Treatment Plans",
};

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
	[PERMISSIONS.CHILD_INTAKE]: "Create and manage child intake records",
	[PERMISSIONS.SESSION_RUN]: "Conduct and log therapy sessions",
	[PERMISSIONS.TREATMENT_PLAN_MODIFY]: "Edit and update treatment plans",
};

type StaffData = {
	id: string;
	email: string;
	role: string;
	loginEnabled: boolean;
	credentialsRegistrationNumber: string | null;
	createdAt: string;
	permissions?: { permission: string }[];
};

function ProfileCard({ staff }: { staff: StaffData }) {
	return (
		<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
			<div className="mb-6 flex flex-col items-center gap-3">
				<div className="relative">
					<Avatar className="h-20 w-20">
						<AvatarFallback className="text-2xl">
							{staff.email.slice(0, 2).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					{staff.loginEnabled && (
						<span className="absolute right-1 bottom-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-green-500" />
					)}
				</div>
				<div className="text-center">
					<p className="font-semibold text-on-surface">{staff.email}</p>
					<p className="font-medium text-primary text-sm capitalize">
						{staff.role.toLowerCase()}
					</p>
				</div>
			</div>

			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-2 text-on-surface-variant text-sm">
					<Mail className="h-4 w-4 shrink-0" />
					<span className="truncate">{staff.email}</span>
				</div>
				{staff.credentialsRegistrationNumber && (
					<div className="flex items-center gap-2 text-on-surface-variant text-sm">
						<Shield className="h-4 w-4 shrink-0" />
						<span>{staff.credentialsRegistrationNumber}</span>
					</div>
				)}
				<p className="mt-1 text-on-surface-variant text-xs">
					Joined{" "}
					{new Date(staff.createdAt).toLocaleDateString("en-US", {
						year: "numeric",
						month: "short",
					})}
				</p>
			</div>
		</div>
	);
}

function DepartmentAssignmentCard({ staff }: { staff: StaffData }) {
	const queryClient = useQueryClient();
	const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
	const [addValue, setAddValue] = useState("");

	const { data: departments } = useQuery(
		trpc.clinic.listDepartments.queryOptions(),
	);

	const assignMutation = useMutation(
		trpc.staff.assignDepartments.mutationOptions({
			onSuccess: () => {
				toast.success("Departments updated");
				queryClient.invalidateQueries({
					queryKey: trpc.staff.get.queryOptions({ userId: staff.id }).queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const available =
		departments?.filter((d) => !selectedDeptIds.includes(d.id)) ?? [];
	const selected =
		departments?.filter((d) => selectedDeptIds.includes(d.id)) ?? [];

	return (
		<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
			<h3 className="mb-4 font-medium text-on-surface">Departments</h3>

			<div className="mb-3 flex flex-wrap gap-2">
				{selected.map((dept) => (
					<span
						key={dept.id}
						className="inline-flex items-center gap-1 rounded-md bg-brown-100 px-2 py-1 text-brown-800 text-xs"
					>
						{dept.name}
						<button
							type="button"
							onClick={() =>
								setSelectedDeptIds((ids) => ids.filter((id) => id !== dept.id))
							}
							className="ml-0.5 hover:text-brown-900"
						>
							×
						</button>
					</span>
				))}
				{selected.length === 0 && (
					<span className="text-on-surface-variant text-xs">
						No departments assigned
					</span>
				)}
			</div>

			{available.length > 0 && (
				<Select
					value={addValue}
					onValueChange={(val) => {
						if (val) {
							setSelectedDeptIds((ids) => [...ids, val]);
							setAddValue("");
						}
					}}
				>
					<SelectTrigger className="mb-3">
						<SelectValue placeholder="Add department…" />
					</SelectTrigger>
					<SelectContent>
						{available.map((dept) => (
							<SelectItem key={dept.id} value={dept.id}>
								{dept.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}

			<Button
				size="sm"
				disabled={assignMutation.isPending}
				onClick={() =>
					assignMutation.mutate({
						userId: staff.id,
						departmentIds: selectedDeptIds,
					})
				}
			>
				Save
			</Button>
		</div>
	);
}

function DangerZoneCard({ staff }: { staff: StaffData }) {
	const queryClient = useQueryClient();

	const deactivateMutation = useMutation(
		trpc.staff.deactivate.mutationOptions({
			onSuccess: () => {
				toast.success("Staff member deactivated");
				queryClient.invalidateQueries({
					queryKey: trpc.staff.get.queryOptions({ userId: staff.id }).queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const reactivateMutation = useMutation(
		trpc.staff.reactivate.mutationOptions({
			onSuccess: () => {
				toast.success("Staff member reactivated");
				queryClient.invalidateQueries({
					queryKey: trpc.staff.get.queryOptions({ userId: staff.id }).queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	return (
		<div className="rounded-xl border border-red-200 bg-red-50/20 p-6">
			<h3 className="mb-1 font-medium text-on-surface">Danger Zone</h3>
			<p className="mb-4 text-on-surface-variant text-xs">
				{staff.loginEnabled
					? "Deactivating will prevent this staff member from logging in."
					: "This staff member is currently deactivated."}
			</p>

			{staff.loginEnabled ? (
				<Dialog>
					<DialogTrigger>
						<Button variant="destructive" size="sm">
							Deactivate Staff Member
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Deactivate staff member?</DialogTitle>
							<DialogDescription>
								{staff.email} will no longer be able to log in. You can
								reactivate them later.
							</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<DialogClose>
								<Button variant="outline">Cancel</Button>
							</DialogClose>
							<Button
								variant="destructive"
								disabled={deactivateMutation.isPending}
								onClick={() => deactivateMutation.mutate({ userId: staff.id })}
							>
								Deactivate
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			) : (
				<Button
					size="sm"
					className="bg-green-600 text-white hover:bg-green-700"
					disabled={reactivateMutation.isPending}
					onClick={() => reactivateMutation.mutate({ userId: staff.id })}
				>
					Reactivate
				</Button>
			)}
		</div>
	);
}

function PermissionsEditor({ staff }: { staff: StaffData }) {
	const queryClient = useQueryClient();
	const original = new Set((staff.permissions ?? []).map((p) => p.permission));
	const [activePerms, setActivePerms] = useState<Set<string>>(
		new Set(original),
	);

	const updateMutation = useMutation(
		trpc.staff.updatePermissions.mutationOptions({
			onSuccess: () => {
				toast.success("Permissions saved");
				queryClient.invalidateQueries({
					queryKey: trpc.staff.get.queryOptions({ userId: staff.id }).queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	function toggle(perm: string) {
		setActivePerms((prev) => {
			const next = new Set(prev);
			if (next.has(perm)) next.delete(perm);
			else next.add(perm);
			return next;
		});
	}

	return (
		<div className="h-full rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
			<div className="mb-6">
				<h3 className="font-medium text-on-surface">Access & Permissions</h3>
				<p className="mt-1 text-on-surface-variant text-xs">
					Control what this staff member can do in the system.
				</p>
			</div>

			<div className="flex flex-col gap-4">
				{Object.values(PERMISSIONS).map((perm) => (
					// biome-ignore lint/a11y/noLabelWithoutControl: Checkbox (Radix) renders an accessible button; label click propagation works correctly
					<label
						key={perm}
						className="flex cursor-pointer items-start gap-3 rounded-lg border border-outline-variant p-3 transition-colors hover:bg-muted/30"
					>
						<Checkbox
							checked={activePerms.has(perm)}
							onCheckedChange={() => toggle(perm)}
							className="mt-0.5"
						/>
						<div>
							<p className="font-medium text-on-surface text-sm">
								{PERMISSION_LABELS[perm]}
							</p>
							<p className="mt-0.5 text-on-surface-variant text-xs">
								{PERMISSION_DESCRIPTIONS[perm]}
							</p>
						</div>
					</label>
				))}
			</div>

			<div className="mt-6 flex gap-3 border-outline-variant border-t pt-6">
				<Button
					variant="outline"
					onClick={() => setActivePerms(new Set(original))}
				>
					Discard Changes
				</Button>
				<Button
					disabled={updateMutation.isPending}
					onClick={() =>
						updateMutation.mutate({
							userId: staff.id,
							permissions: [...activePerms],
						})
					}
				>
					{updateMutation.isPending ? "Saving…" : "Save Permissions"}
				</Button>
			</div>
		</div>
	);
}

function StaffDetailPage() {
	const { staffId } = Route.useParams();
	const router = useRouter();

	const {
		data: staff,
		isLoading,
		isError,
	} = useQuery(trpc.staff.get.queryOptions({ userId: staffId }));

	if (isLoading) {
		return (
			<div className="p-8">
				<Skeleton className="mb-6 h-6 w-48" />
				<div className="grid gap-6 xl:grid-cols-3">
					<div className="flex flex-col gap-4">
						<Skeleton className="h-64 rounded-xl" />
						<Skeleton className="h-40 rounded-xl" />
					</div>
					<div className="xl:col-span-2">
						<Skeleton className="h-80 rounded-xl" />
					</div>
				</div>
			</div>
		);
	}

	if (isError || !staff) {
		return (
			<div className="p-8">
				<p className="text-on-surface-variant text-sm">
					Staff member not found.
				</p>
				<button
					type="button"
					onClick={() => router.navigate({ to: "/settings/staff" })}
					className="mt-2 text-primary text-sm hover:underline"
				>
					Back to Staff
				</button>
			</div>
		);
	}

	return (
		<div className="p-8">
			{/* Breadcrumb */}
			<div className="mb-6 flex items-center gap-1.5 text-sm">
				<Link
					to="/settings/staff"
					className="text-on-surface-variant hover:text-on-surface"
				>
					Staff
				</Link>
				<ChevronRight className="h-3.5 w-3.5 text-on-surface-variant" />
				<span className="text-on-surface">{staff.email}</span>
			</div>

			<div className="grid gap-6 xl:grid-cols-3">
				{/* Left column */}
				<div className="flex flex-col gap-4">
					<ProfileCard staff={staff} />
					<DepartmentAssignmentCard staff={staff} />
					<DangerZoneCard staff={staff} />
				</div>

				{/* Right column */}
				<div className="xl:col-span-2">
					<PermissionsEditor staff={staff} />
				</div>
			</div>
		</div>
	);
}
