import { InviteStaffInput, PERMISSIONS } from "@haber-final/api/schemas/staff";
import { Button } from "@haber-final/ui/components/button";
import { Checkbox } from "@haber-final/ui/components/checkbox";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/settings/staff/invite")({
	component: InviteStaffPage,
});

const PERMISSION_LABELS: Record<string, string> = {
	[PERMISSIONS.CHILD_INTAKE]: "Child Intake",
	[PERMISSIONS.SESSION_RUN]: "Run Sessions",
	[PERMISSIONS.TREATMENT_PLAN_MODIFY]: "Modify Treatment Plans",
};

function toggleArrayItem<T>(arr: T[], item: T): T[] {
	return arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item];
}

function InviteStaffPage() {
	const router = useRouter();

	const { data: departments } = useQuery(
		trpc.clinic.listDepartments.queryOptions(),
	);

	const form = useForm({
		resolver: zodResolver(InviteStaffInput),
		defaultValues: {
			email: "",
			role: "STAFF" as "THERAPIST" | "STAFF",
			permissions: [] as string[],
			departmentIds: [] as string[],
		},
	});

	const mutation = useMutation(
		trpc.staff.invite.mutationOptions({
			onSuccess: () => {
				toast.success("Invite sent");
				router.navigate({ to: "/settings/staff" });
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	return (
		<div className="p-8">
			<button
				type="button"
				onClick={() => router.navigate({ to: "/settings/staff" })}
				className="mb-6 flex items-center gap-1.5 text-on-surface-variant text-sm hover:text-on-surface"
			>
				<ArrowLeft className="h-4 w-4" />
				Back to Staff
			</button>

			<h1 className="mb-6 font-semibold text-2xl text-on-surface">
				Invite Staff Member
			</h1>

			<div className="max-w-lg">
				<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
							className="flex flex-col gap-5"
						>
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email</FormLabel>
										<FormControl>
											<Input
												type="email"
												placeholder="staff@clinic.com"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="role"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Role</FormLabel>
										<FormControl>
											<Select
												value={field.value}
												onValueChange={field.onChange}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select role" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="THERAPIST">Therapist</SelectItem>
													<SelectItem value="STAFF">Staff</SelectItem>
												</SelectContent>
											</Select>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="flex flex-col gap-2">
								<span className="font-medium text-xs">Permissions</span>
								{Object.values(PERMISSIONS).map((value) => {
									const perms = form.watch("permissions") ?? [];
									return (
										// biome-ignore lint/a11y/noLabelWithoutControl: Checkbox (Radix) renders an accessible button; label click propagation works correctly
										<label
											key={value}
											className="flex cursor-pointer items-center gap-2"
										>
											<Checkbox
												checked={perms.includes(value)}
												onCheckedChange={() =>
													form.setValue(
														"permissions",
														toggleArrayItem(perms, value),
													)
												}
											/>
											<span className="text-on-surface text-sm">
												{PERMISSION_LABELS[value]}
											</span>
										</label>
									);
								})}
							</div>

							{departments && departments.length > 0 && (
								<div className="flex flex-col gap-2">
									<span className="font-medium text-xs">Departments</span>
									{departments.map((dept) => {
										const deptIds = form.watch("departmentIds") ?? [];
										return (
											// biome-ignore lint/a11y/noLabelWithoutControl: Checkbox (Radix) renders an accessible button; label click propagation works correctly
											<label
												key={dept.id}
												className="flex cursor-pointer items-center gap-2"
											>
												<Checkbox
													checked={deptIds.includes(dept.id)}
													onCheckedChange={() =>
														form.setValue(
															"departmentIds",
															toggleArrayItem(deptIds, dept.id),
														)
													}
												/>
												<span className="text-on-surface text-sm">
													{dept.name}
												</span>
											</label>
										);
									})}
								</div>
							)}

							<div className="flex gap-3 pt-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => router.navigate({ to: "/settings/staff" })}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={mutation.isPending}>
									{mutation.isPending ? "Sending…" : "Send Invite"}
								</Button>
							</div>
						</form>
					</Form>
				</div>
			</div>
		</div>
	);
}
