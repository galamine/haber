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
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

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

type FormValues = z.infer<typeof CreateClinicInput>;

function NewClinicPage() {
	const router = useRouter();

	const form = useForm<FormValues>({
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

	const mutation = useMutation(
		trpc.clinic.create.mutationOptions({
			onSuccess: () => {
				toast.success("Clinic registered");
				router.navigate({ to: "/platform/clinics" });
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	function onSubmit(values: FormValues) {
		mutation.mutate({
			...values,
			timezone: values.timezone || undefined,
		});
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

			<h1 className="mb-6 font-semibold text-2xl text-on-surface">
				Register New Clinic
			</h1>

			<div className="max-w-lg">
				<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="flex flex-col gap-5"
						>
							<FormField
								control={form.control}
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
								control={form.control}
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
								control={form.control}
								name="contactName"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Contact Name</FormLabel>
										<FormControl>
											<Input placeholder="Primary contact person" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
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
								control={form.control}
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
								control={form.control}
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
									onClick={() => router.navigate({ to: "/platform/clinics" })}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={mutation.isPending}>
									{mutation.isPending ? "Registering…" : "Register Clinic"}
								</Button>
							</div>
						</form>
					</Form>
				</div>
			</div>
		</div>
	);
}
