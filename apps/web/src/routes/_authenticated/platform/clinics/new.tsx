import { CreateClinicInput } from "@haber-final/api/schemas/clinic";
import { Button } from "@haber-final/ui/components/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@haber-final/ui/components/form";
import { Input } from "@haber-final/ui/components/input";
import { Textarea } from "@haber-final/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/platform/clinics/new")({
	beforeLoad: () => {
		if (useAuthStore.getState().role !== "SUPER_ADMIN") {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: NewClinicPage,
});

type ClinicFormValues = z.infer<typeof CreateClinicInput>;
const InviteAdminInput = z.object({
	email: z.string().email("Enter a valid email"),
});
type InviteAdminValues = z.infer<typeof InviteAdminInput>;

function NewClinicPage() {
	const router = useRouter();
	const [clinicId, setClinicId] = useState<string | null>(null);
	const [clinicName, setClinicName] = useState("");

	const clinicForm = useForm<ClinicFormValues>({
		resolver: zodResolver(CreateClinicInput),
		defaultValues: {
			name: "",
			address: "",
			contactName: "",
			contactPhone: "",
			contactEmail: "",
			timezone: "",
		},
	});

	const inviteForm = useForm<InviteAdminValues>({
		resolver: zodResolver(InviteAdminInput),
		defaultValues: { email: "" },
	});

	const createMutation = useMutation(
		trpc.clinic.create.mutationOptions({
			onSuccess: (clinic) => {
				toast.success("Clinic registered");
				setClinicName(clinic.name);
				setClinicId(clinic.id);
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const inviteMutation = useMutation(
		trpc.clinic.inviteAdmin.mutationOptions({
			onSuccess: () => {
				toast.success("Invite sent");
				router.navigate({ to: "/platform/clinics" });
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	function onClinicSubmit(values: ClinicFormValues) {
		createMutation.mutate({
			...values,
			timezone: values.timezone || undefined,
		});
	}

	function onInviteSubmit(values: InviteAdminValues) {
		inviteMutation.mutate({ clinicId: clinicId!, email: values.email });
	}

	return (
		<div className="p-8">
			<button
				type="button"
				onClick={() => router.navigate({ to: "/platform/clinics" })}
				className="mb-6 flex items-center gap-1.5 text-on-surface-variant text-sm hover:text-on-surface"
			>
				<ArrowLeft className="h-4 w-4" />
				Back to Clinics
			</button>

			{!clinicId ? (
				<>
					<h1 className="mb-6 font-semibold text-2xl text-on-surface">
						Register New Clinic
					</h1>

					<div className="max-w-lg">
						<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
							<Form {...clinicForm}>
								<form
									onSubmit={clinicForm.handleSubmit(onClinicSubmit)}
									className="flex flex-col gap-5"
								>
									<FormField
										control={clinicForm.control}
										name="name"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Clinic Name</FormLabel>
												<FormControl>
													<Input
														placeholder="e.g. Sunrise Therapy Centre"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={clinicForm.control}
										name="address"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Address</FormLabel>
												<FormControl>
													<Textarea
														placeholder="Full address"
														rows={3}
														{...(field as React.ComponentProps<"textarea">)}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={clinicForm.control}
										name="contactName"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Contact Name</FormLabel>
												<FormControl>
													<Input
														placeholder="Primary contact person"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={clinicForm.control}
										name="contactPhone"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Contact Phone</FormLabel>
												<FormControl>
													<Input
														type="tel"
														placeholder="+91 98765 43210"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={clinicForm.control}
										name="contactEmail"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Contact Email</FormLabel>
												<FormControl>
													<Input
														type="email"
														placeholder="contact@clinic.com"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={clinicForm.control}
										name="timezone"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Timezone (optional)</FormLabel>
												<FormControl>
													<Input placeholder="Asia/Kolkata" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<div className="flex gap-3 pt-2">
										<Button
											type="button"
											variant="outline"
											onClick={() =>
												router.navigate({ to: "/platform/clinics" })
											}
										>
											Cancel
										</Button>
										<Button type="submit" disabled={createMutation.isPending}>
											{createMutation.isPending
												? "Registering…"
												: "Register Clinic"}
										</Button>
									</div>
								</form>
							</Form>
						</div>
					</div>
				</>
			) : (
				<>
					<h1 className="mb-1 font-semibold text-2xl text-on-surface">
						Invite Clinic Admin
					</h1>
					<p className="mb-6 text-on-surface-variant text-sm">
						{clinicName} has been registered. Invite the admin who will manage
						this clinic.
					</p>

					<div className="max-w-lg">
						<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
							<Form {...inviteForm}>
								<form
									onSubmit={inviteForm.handleSubmit(onInviteSubmit)}
									className="flex flex-col gap-5"
								>
									<FormField
										control={inviteForm.control}
										name="email"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Admin Email</FormLabel>
												<FormControl>
													<Input
														type="email"
														placeholder="admin@clinic.com"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<div className="flex gap-3 pt-2">
										<Button
											type="button"
											variant="outline"
											onClick={() =>
												router.navigate({ to: "/platform/clinics" })
											}
										>
											Skip
										</Button>
										<Button type="submit" disabled={inviteMutation.isPending}>
											{inviteMutation.isPending ? "Sending…" : "Send Invite"}
										</Button>
									</div>
								</form>
							</Form>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
