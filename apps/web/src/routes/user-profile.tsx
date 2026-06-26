import { Button } from "@haber-final/ui/components/button";
import { Input } from "@haber-final/ui/components/input";
import { Label } from "@haber-final/ui/components/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

const ProfileSchema = z.object({
	name: z.string().min(1, "Name is required"),
	dateOfBirth: z.string().min(1, "Date of birth is required"),
	district: z.string().min(1, "District is required"),
	state: z.string().min(1, "State is required"),
	phoneNumber: z.string().min(1, "Phone number is required"),
});

type ProfileValues = z.infer<typeof ProfileSchema>;

export const Route = createFileRoute("/user-profile")({
	beforeLoad: () => {
		if (!useAuthStore.getState().isAuthenticated) {
			throw redirect({ to: "/login" });
		}
	},
	component: UserProfilePage,
});

function UserProfilePage() {
	const router = useRouter();
	const queryClient = useQueryClient();

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<ProfileValues>({
		resolver: zodResolver(ProfileSchema),
		defaultValues: {
			name: "",
			dateOfBirth: "",
			district: "",
			state: "",
			phoneNumber: "",
		},
	});

	const createMutation = useMutation(
		trpc.profile.create.mutationOptions({
			onSuccess: async () => {
				toast.success("Profile created successfully");
				await queryClient.invalidateQueries({
					queryKey: trpc.profile.get.queryKey(),
				});
				router.navigate({ to: "/" });
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	function onSubmit(data: ProfileValues) {
		createMutation.mutate(data);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<main className="relative flex w-full max-w-md flex-col items-center gap-6 overflow-hidden rounded-xl border border-border bg-white p-8 shadow-sm">
				<div className="absolute top-0 left-0 h-1 w-full bg-brown-600" />
				<div className="flex flex-col gap-1 text-center">
					<h1 className="font-medium text-on-surface text-xl">
						Complete Your Profile
					</h1>
					<p className="text-on-surface-variant text-sm">
						Please fill in your details to continue
					</p>
				</div>

				<form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="name">
							Full Name <span className="text-red-500">*</span>
						</Label>
						<Input
							id="name"
							placeholder="Your full name"
							{...register("name")}
							className={errors.name ? "border-red-500" : ""}
						/>
						{errors.name && (
							<p className="text-red-600 text-xs">{errors.name.message}</p>
						)}
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="dateOfBirth">
							Date of Birth <span className="text-red-500">*</span>
						</Label>
						<Input
							id="dateOfBirth"
							type="date"
							{...register("dateOfBirth")}
							className={errors.dateOfBirth ? "border-red-500" : ""}
						/>
						{errors.dateOfBirth && (
							<p className="text-red-600 text-xs">
								{errors.dateOfBirth.message}
							</p>
						)}
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="district">
							District <span className="text-red-500">*</span>
						</Label>
						<Input
							id="district"
							placeholder="Your district"
							{...register("district")}
							className={errors.district ? "border-red-500" : ""}
						/>
						{errors.district && (
							<p className="text-red-600 text-xs">{errors.district.message}</p>
						)}
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="state">
							State <span className="text-red-500">*</span>
						</Label>
						<Input
							id="state"
							placeholder="Your state"
							{...register("state")}
							className={errors.state ? "border-red-500" : ""}
						/>
						{errors.state && (
							<p className="text-red-600 text-xs">{errors.state.message}</p>
						)}
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="phoneNumber">
							Phone Number <span className="text-red-500">*</span>
						</Label>
						<Input
							id="phoneNumber"
							type="tel"
							placeholder="+971 50 000 0000"
							{...register("phoneNumber")}
							className={errors.phoneNumber ? "border-red-500" : ""}
						/>
						{errors.phoneNumber && (
							<p className="text-red-600 text-xs">
								{errors.phoneNumber.message}
							</p>
						)}
					</div>

					<Button
						type="submit"
						className="w-full"
						disabled={createMutation.isPending}
					>
						{createMutation.isPending ? "Saving…" : "Save Profile"}
					</Button>
				</form>
			</main>
		</div>
	);
}
