import { env } from "@haber-final/env/web";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@haber-final/ui/components/avatar";
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
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { Textarea } from "@haber-final/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/children/$childId/edit")({
	component: EditChildPage,
});

const EditSchema = z.object({
	fullName: z.string().min(1, "Full name is required"),
	dob: z.string().min(1, "Date of birth is required"),
	sex: z.string().min(1, "Sex is required"),
	opNumber: z.string().min(1, "OP number is required"),
	address: z.string().optional(),
	spokenLanguages: z.string().min(1, "At least one language is required"),
	school: z.string().optional(),
	birthHistory: z.string().optional(),
	immunisations: z.string().optional(),
	allergies: z.string().optional(),
	currentMedications: z.string().optional(),
	priorDiagnoses: z.string().optional(),
	familyHistory: z.string().optional(),
	sensorySensitivities: z.string().optional(),
	photoUrl: z.string().optional(),
});

type EditValues = z.infer<typeof EditSchema>;

function EditChildPage() {
	const { childId } = Route.useParams();
	const router = useRouter();
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [photoUrl, setPhotoUrl] = useState<string>("");
	const [isUploading, setIsUploading] = useState(false);

	const { data: child, isLoading } = useQuery(
		trpc.child.get.queryOptions({ childId }),
	);

	const {
		register,
		handleSubmit,
		control,
		reset,
		formState: { errors },
	} = useForm<EditValues>({
		resolver: zodResolver(EditSchema),
		defaultValues: {
			fullName: "",
			dob: "",
			sex: "",
			opNumber: "",
			address: "",
			spokenLanguages: "",
			school: "",
			photoUrl: "",
		},
	});

	useEffect(() => {
		if (!child) return;
		const medical = child.medicalHistory as Record<string, string | undefined>;
		setPhotoUrl(child.photoUrl ?? "");
		reset({
			fullName: child.fullName,
			dob: new Date(child.dob).toISOString().split("T")[0],
			sex: child.sex,
			opNumber: child.opNumber,
			address: child.address ?? "",
			spokenLanguages: child.spokenLanguages.join(", "),
			school: child.school ?? "",
			birthHistory: medical.birthHistory ?? "",
			immunisations: medical.immunisations ?? "",
			allergies: medical.allergies ?? "",
			currentMedications: medical.currentMedications ?? "",
			priorDiagnoses: medical.priorDiagnoses ?? "",
			familyHistory: medical.familyHistory ?? "",
			sensorySensitivities: medical.sensorySensitivities ?? "",
			photoUrl: child.photoUrl ?? "",
		});
	}, [child, reset]);

	async function handleUpload(file: File) {
		setIsUploading(true);
		try {
			const formData = new FormData();
			formData.append("file", file);
			const res = await fetch(
				`${env.VITE_SERVER_URL}/api/upload/child-photo?childId=${childId}`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
					},
					body: formData,
				},
			);
			if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
			const { url } = await res.json();
			setPhotoUrl(url);
			toast.success("Photo uploaded");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Upload failed");
		} finally {
			setIsUploading(false);
		}
	}

	const updateMutation = useMutation(trpc.child.update.mutationOptions());
	const updateMedicalMutation = useMutation(
		trpc.child.updateMedicalHistory.mutationOptions(),
	);

	async function onSubmit(values: EditValues) {
		try {
			await updateMutation.mutateAsync({
				id: childId,
				fullName: values.fullName,
				dob: new Date(values.dob),
				sex: values.sex,
				opNumber: values.opNumber,
				address: values.address || undefined,
				spokenLanguages: values.spokenLanguages
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean),
				school: values.school || undefined,
				photoUrl: photoUrl || undefined,
			});

			await updateMedicalMutation.mutateAsync({
				childId,
				history: {
					birthHistory: values.birthHistory || undefined,
					immunisations: values.immunisations || undefined,
					allergies: values.allergies || undefined,
					currentMedications: values.currentMedications || undefined,
					priorDiagnoses: values.priorDiagnoses || undefined,
					familyHistory: values.familyHistory || undefined,
					sensorySensitivities: values.sensorySensitivities || undefined,
				},
			});

			await queryClient.invalidateQueries({
				queryKey: trpc.child.get.queryOptions({ childId }).queryKey,
			});
			await queryClient.invalidateQueries({
				queryKey: trpc.child.list.queryOptions({}).queryKey,
			});

			toast.success("Child record updated");
			router.navigate({
				to: "/children/$childId",
				params: { childId },
			});
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Failed to update record";
			toast.error(message);
		}
	}

	if (isLoading) {
		return (
			<div className="p-8">
				<Skeleton className="mb-6 h-5 w-24" />
				<Skeleton className="mb-6 h-8 w-48" />
				<div className="max-w-2xl space-y-4">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-10 w-full" />
					))}
				</div>
			</div>
		);
	}

	const isPending = updateMutation.isPending || updateMedicalMutation.isPending;

	return (
		<div className="p-8">
			<button
				type="button"
				onClick={() =>
					router.navigate({
						to: "/children/$childId",
						params: { childId },
					})
				}
				className="mb-6 flex items-center gap-1.5 text-on-surface-variant text-sm hover:text-on-surface"
			>
				<ArrowLeft className="h-4 w-4" />
				Back to Profile
			</button>

			<h1 className="mb-6 font-semibold text-2xl text-on-surface">
				Edit Child Record
			</h1>

			<div className="mb-6 flex flex-col items-center gap-3">
				<Avatar className="h-24 w-24">
					{photoUrl && <AvatarImage src={photoUrl} alt={child?.fullName} />}
					<AvatarFallback className="bg-brown-200 text-2xl text-brown-800">
						{photoUrl
							? ""
							: (child?.fullName
									?.split(" ")
									.map((n) => n[0])
									.join("")
									.slice(0, 2)
									.toUpperCase() ?? "?")}
					</AvatarFallback>
				</Avatar>
				<input
					type="file"
					accept="image/*"
					className="hidden"
					ref={fileInputRef}
					onChange={(e) => {
						const file = e.target.files?.[0];
						if (file) handleUpload(file);
					}}
				/>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="gap-2"
					onClick={() => fileInputRef.current?.click()}
					disabled={isUploading}
				>
					<Upload className="h-4 w-4" />
					{isUploading ? "Uploading…" : "Upload Photo"}
				</Button>
			</div>

			<div className="max-w-2xl">
				<form onSubmit={handleSubmit(onSubmit)}>
					<div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
						{/* Profile section */}
						<div className="border-outline-variant border-b px-6 py-4">
							<h2 className="font-medium text-on-surface">Profile</h2>
						</div>
						<div className="grid grid-cols-1 gap-x-6 gap-y-5 p-6 md:grid-cols-2">
							<div className="flex flex-col gap-1.5 md:col-span-2">
								<Label htmlFor="fullName">
									Full Name <span className="text-red-500">*</span>
								</Label>
								<Input
									id="fullName"
									{...register("fullName")}
									className={errors.fullName ? "border-red-500" : ""}
								/>
								{errors.fullName && (
									<p className="text-red-600 text-xs">
										{errors.fullName.message}
									</p>
								)}
							</div>

							<div className="flex flex-col gap-1.5">
								<Label htmlFor="dob">
									Date of Birth <span className="text-red-500">*</span>
								</Label>
								<Input
									id="dob"
									type="date"
									{...register("dob")}
									className={errors.dob ? "border-red-500" : ""}
								/>
								{errors.dob && (
									<p className="text-red-600 text-xs">{errors.dob.message}</p>
								)}
							</div>

							<div className="flex flex-col gap-1.5">
								<Label htmlFor="sex">
									Legal Sex <span className="text-red-500">*</span>
								</Label>
								<Controller
									control={control}
									name="sex"
									render={({ field }) => (
										<Select value={field.value} onValueChange={field.onChange}>
											<SelectTrigger
												id="sex"
												className={errors.sex ? "border-red-500" : ""}
											>
												<SelectValue placeholder="Select sex" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="Male">Male</SelectItem>
												<SelectItem value="Female">Female</SelectItem>
												<SelectItem value="Other">Other</SelectItem>
												<SelectItem value="Prefer not to say">
													Prefer not to say
												</SelectItem>
											</SelectContent>
										</Select>
									)}
								/>
								{errors.sex && (
									<p className="text-red-600 text-xs">{errors.sex.message}</p>
								)}
							</div>

							<div className="flex flex-col gap-1.5">
								<Label htmlFor="opNumber">
									OP Number <span className="text-red-500">*</span>
								</Label>
								<Input
									id="opNumber"
									{...register("opNumber")}
									className={errors.opNumber ? "border-red-500" : ""}
								/>
								{errors.opNumber && (
									<p className="text-red-600 text-xs">
										{errors.opNumber.message}
									</p>
								)}
							</div>

							<div className="flex flex-col gap-1.5">
								<Label htmlFor="spokenLanguages">
									Languages Spoken <span className="text-red-500">*</span>
								</Label>
								<Input
									id="spokenLanguages"
									placeholder="Comma-separated"
									{...register("spokenLanguages")}
									className={errors.spokenLanguages ? "border-red-500" : ""}
								/>
								{errors.spokenLanguages && (
									<p className="text-red-600 text-xs">
										{errors.spokenLanguages.message}
									</p>
								)}
							</div>

							<div className="flex flex-col gap-1.5">
								<Label htmlFor="address">Address</Label>
								<Input id="address" {...register("address")} />
							</div>

							<div className="flex flex-col gap-1.5">
								<Label htmlFor="school">School</Label>
								<Input id="school" {...register("school")} />
							</div>
						</div>

						{/* Medical history section */}
						<div className="border-outline-variant border-y px-6 py-4">
							<h2 className="font-medium text-on-surface">Medical History</h2>
						</div>
						<div className="space-y-5 p-6">
							{(
								[
									{ key: "birthHistory", label: "Birth History" },
									{ key: "immunisations", label: "Immunisations" },
									{ key: "allergies", label: "Allergies" },
									{ key: "currentMedications", label: "Current Medications" },
									{ key: "priorDiagnoses", label: "Prior Diagnoses" },
									{ key: "familyHistory", label: "Family History" },
									{
										key: "sensorySensitivities",
										label: "Sensory Sensitivities",
									},
								] as const
							).map(({ key, label }) => (
								<div key={key} className="flex flex-col gap-1.5">
									<Label htmlFor={key}>{label}</Label>
									<Textarea id={key} rows={2} {...register(key)} />
								</div>
							))}
						</div>

						<div className="flex gap-3 border-outline-variant border-t px-6 py-4">
							<Button
								type="button"
								variant="outline"
								onClick={() =>
									router.navigate({
										to: "/children/$childId",
										params: { childId },
									})
								}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isPending} className="w-full">
								{isPending ? "Saving…" : "Save Changes"}
							</Button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
