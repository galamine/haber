import { CreateDepartmentInput } from "@haber-final/api/schemas/clinic";
import { Button } from "@haber-final/ui/components/button";
import { Input } from "@haber-final/ui/components/input";
import { Label } from "@haber-final/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@haber-final/ui/components/select";
import { Textarea } from "@haber-final/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute(
	"/_authenticated/settings/departments/new",
)({
	beforeLoad: () => {
		if (useAuthStore.getState().role !== "CLINIC_ADMIN") {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: NewDepartmentPage,
});

type FormValues = z.infer<typeof CreateDepartmentInput>;

function NewDepartmentPage() {
	const router = useRouter();
	const queryClient = useQueryClient();

	const { data: therapistsData } = useQuery(
		trpc.staff.list.queryOptions({ role: "THERAPIST", pageSize: 100 }),
	);
	const therapists = therapistsData?.items ?? [];

	const {
		register,
		handleSubmit,
		control,
		formState: { errors },
	} = useForm<FormValues>({
		resolver: zodResolver(CreateDepartmentInput),
		defaultValues: {
			name: "",
			description: "",
			headUserId: undefined,
		},
	});

	const mutation = useMutation(
		trpc.clinic.createDepartment.mutationOptions({
			onSuccess: () => {
				toast.success("Department created");
				queryClient.invalidateQueries({
					queryKey: trpc.clinic.listDepartments.queryOptions().queryKey,
				});
				router.navigate({ to: "/settings/departments" });
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	function onSubmit(values: FormValues) {
		const headUserId =
			values.headUserId === "none" || !values.headUserId
				? undefined
				: values.headUserId;
		mutation.mutate({ ...values, headUserId });
	}

	return (
		<div className="p-8">
			<button
				type="button"
				onClick={() => router.navigate({ to: "/settings/departments" })}
				className="mb-6 flex items-center gap-1.5 text-on-surface-variant text-sm hover:text-on-surface"
			>
				<ArrowLeft className="h-4 w-4" />
				Back to Departments
			</button>

			<h1 className="mb-6 font-semibold text-2xl text-on-surface">
				Add Department
			</h1>

			<div className="max-w-lg">
				<form onSubmit={handleSubmit(onSubmit)}>
					<div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
						<div className="space-y-6 p-6">
							<div>
								<Label htmlFor="name">Name</Label>
								<Input
									id="name"
									placeholder="e.g. Occupational Therapy"
									className={
										errors.name ? "border-red-500 focus:ring-red-500" : ""
									}
									{...register("name")}
								/>
								{errors.name && (
									<p className="mt-1 text-red-600 text-xs">
										{errors.name.message}
									</p>
								)}
							</div>

							<div>
								<Label htmlFor="description">Description</Label>
								<Textarea
									id="description"
									placeholder="Brief description…"
									rows={3}
									className={
										errors.description
											? "border-red-500 focus:ring-red-500"
											: ""
									}
									{...register("description")}
								/>
								{errors.description && (
									<p className="mt-1 text-red-600 text-xs">
										{errors.description.message}
									</p>
								)}
							</div>

							<div>
								<Label htmlFor="headUserId">Head Therapist</Label>
								<Controller
									control={control}
									name="headUserId"
									render={({ field }) => (
										<Select
											value={field.value ?? "none"}
											onValueChange={(val) =>
												field.onChange(val === "none" ? undefined : val)
											}
										>
											<SelectTrigger id="headUserId">
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
									)}
								/>
							</div>
						</div>

						<div className="flex gap-3 border-outline-variant border-t px-6 py-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => router.navigate({ to: "/settings/departments" })}
							>
								Cancel
							</Button>
							<Button
								size="lg"
								type="submit"
								disabled={mutation.isPending}
								className="w-full"
							>
								{mutation.isPending ? "Creating…" : "Create Department"}
							</Button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
