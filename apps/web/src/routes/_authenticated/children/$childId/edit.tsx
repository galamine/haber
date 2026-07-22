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
import { TagInput } from "@haber-final/ui/components/tag-input";
import { Textarea } from "@haber-final/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Upload } from "lucide-react";
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
	immunisations: z.array(z.string()).optional(),
	allergies: z.array(z.string()).optional(),
	currentMedications: z.string().optional(),
	priorDiagnoses: z.string().optional(),
	familyHistory: z.string().optional(),
	sensorySensitivities: z.array(z.string()).optional(),
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
		const medical = child.medicalHistory as Record<
			string,
			string | string[] | undefined
		>;
		setPhotoUrl(child.photoUrl ?? "");
		reset({
			fullName: child.fullName,
			dob: new Date(child.dob).toISOString().split("T")[0],
			sex: child.sex,
			opNumber: child.opNumber,
			address: child.address ?? "",
			spokenLanguages: child.spokenLanguages.join(", "),
			school: child.school ?? "",
			birthHistory: (medical.birthHistory as string) ?? "",
			immunisations: (medical.immunisations as string[]) ?? [],
			allergies: (medical.allergies as string[]) ?? [],
			currentMedications: (medical.currentMedications as string) ?? "",
			priorDiagnoses: (medical.priorDiagnoses as string) ?? "",
			familyHistory: (medical.familyHistory as string) ?? "",
			sensorySensitivities: (medical.sensorySensitivities as string[]) ?? [],
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
					immunisations: values.immunisations,
					allergies: values.allergies,
					currentMedications: values.currentMedications || undefined,
					priorDiagnoses: values.priorDiagnoses || undefined,
					familyHistory: values.familyHistory || undefined,
					sensorySensitivities: values.sensorySensitivities,
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
				<div className="rounded-xl border border-brown-200 bg-white shadow-sm">
					<div className="border-brown-100 border-b px-6 py-4">
						<Skeleton className="h-6 w-48" />
						<Skeleton className="mt-1 h-4 w-64" />
					</div>
					<div className="p-6">
						<div className="grid gap-8 md:grid-cols-2">
							<div className="space-y-6">
								<div className="flex items-center gap-4">
									<Skeleton className="h-20 w-20 rounded-full" />
									<Skeleton className="h-9 w-28" />
								</div>
								<Skeleton className="h-11 w-full" />
								<Skeleton className="h-11 w-full" />
							</div>
							<div className="space-y-6">
								<Skeleton className="min-h-20 w-full" />
								<Skeleton className="min-h-20 w-full" />
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	const isPending = updateMutation.isPending || updateMedicalMutation.isPending;

	return (
		<div className="p-8">
			<div className="rounded-xl border border-brown-200 bg-white shadow-sm">
				<div className="border-brown-100 border-b px-6 py-4">
					<h2 className="font-semibold text-lg">Edit Child Record</h2>
					<p className="text-muted-foreground text-sm">
						Update profile and medical information
					</p>
				</div>
				<form onSubmit={handleSubmit(onSubmit)}>
					<div className="p-6">
						<div className="grid gap-8 md:grid-cols-2">
							<div className="space-y-6">
								<div className="flex items-center gap-4">
									<Avatar className="h-20 w-20 border-2 border-brown-200">
										{photoUrl && (
											<AvatarImage src={photoUrl} alt={child?.fullName} />
										)}
										<AvatarFallback className="bg-brown-200 text-brown-800 text-xl">
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
									<div>
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
											className="border-brown-300 hover:bg-brown-50"
											onClick={() => fileInputRef.current?.click()}
											disabled={isUploading}
										>
											<Upload className="mr-2 h-4 w-4" />
											{isUploading ? "Uploading…" : "Change Photo"}
										</Button>
										<p className="mt-1 text-muted-foreground text-xs">
											JPG, PNG up to 2MB
										</p>
									</div>
								</div>

								<div>
									<Label htmlFor="fullName" className="mb-2">
										Full Name <span className="text-red-500">*</span>
									</Label>
									<Input
										id="fullName"
										{...register("fullName")}
										className={`h-11 border-brown-300 focus:border-brown-500 ${
											errors.fullName ? "border-red-500" : ""
										}`}
									/>
									{errors.fullName && (
										<p className="mt-1 text-red-600 text-xs">
											{errors.fullName.message}
										</p>
									)}
								</div>

								<div>
									<Label htmlFor="dob" className="mb-2">
										Date of Birth <span className="text-red-500">*</span>
									</Label>
									<Input
										id="dob"
										type="date"
										{...register("dob")}
										className={`h-11 border-brown-300 focus:border-brown-500 ${
											errors.dob ? "border-red-500" : ""
										}`}
									/>
									{errors.dob && (
										<p className="mt-1 text-red-600 text-xs">
											{errors.dob.message}
										</p>
									)}
								</div>

								<div>
									<Label htmlFor="sex" className="mb-2">
										Legal Sex <span className="text-red-500">*</span>
									</Label>
									<Controller
										control={control}
										name="sex"
										render={({ field }) => (
											<Select
												value={field.value}
												onValueChange={field.onChange}
											>
												<SelectTrigger
													id="sex"
													className={`h-11 border-brown-300 focus:border-brown-500 ${
														errors.sex ? "border-red-500" : ""
													}`}
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
										<p className="mt-1 text-red-600 text-xs">
											{errors.sex.message}
										</p>
									)}
								</div>

								<div>
									<Label htmlFor="opNumber" className="mb-2">
										OP Number <span className="text-red-500">*</span>
									</Label>
									<Input
										id="opNumber"
										{...register("opNumber")}
										className={`h-11 border-brown-300 focus:border-brown-500 ${
											errors.opNumber ? "border-red-500" : ""
										}`}
									/>
									{errors.opNumber && (
										<p className="mt-1 text-red-600 text-xs">
											{errors.opNumber.message}
										</p>
									)}
								</div>

								<div>
									<Label htmlFor="spokenLanguages" className="mb-2">
										Languages Spoken <span className="text-red-500">*</span>
									</Label>
									<Input
										id="spokenLanguages"
										placeholder="e.g. English, Arabic"
										{...register("spokenLanguages")}
										className={`h-11 border-brown-300 focus:border-brown-500 ${
											errors.spokenLanguages ? "border-red-500" : ""
										}`}
									/>
									{errors.spokenLanguages && (
										<p className="mt-1 text-red-600 text-xs">
											{errors.spokenLanguages.message}
										</p>
									)}
								</div>

								<div>
									<Label htmlFor="address" className="mb-2">
										Address
									</Label>
									<Input
										id="address"
										{...register("address")}
										className="h-11 border-brown-300 focus:border-brown-500"
									/>
								</div>

								<div>
									<Label htmlFor="school" className="mb-2">
										School
									</Label>
									<Input
										id="school"
										{...register("school")}
										className="h-11 border-brown-300 focus:border-brown-500"
									/>
								</div>
							</div>

							<div className="space-y-6">
								<div>
									<Label htmlFor="birthHistory" className="mb-2">
										Birth History
									</Label>
									<Textarea
										id="birthHistory"
										{...register("birthHistory")}
										className="field-sizing-content min-h-20 border-brown-300 focus:border-brown-500"
									/>
								</div>

								<div>
									<Label htmlFor="currentMedications" className="mb-2">
										Current Medications
									</Label>
									<Textarea
										id="currentMedications"
										{...register("currentMedications")}
										className="field-sizing-content min-h-20 border-brown-300 focus:border-brown-500"
									/>
								</div>

								<div>
									<Label htmlFor="priorDiagnoses" className="mb-2">
										Prior Diagnoses
									</Label>
									<Textarea
										id="priorDiagnoses"
										{...register("priorDiagnoses")}
										className="field-sizing-content min-h-20 border-brown-300 focus:border-brown-500"
									/>
								</div>

								<div>
									<Label htmlFor="familyHistory" className="mb-2">
										Family History
									</Label>
									<Textarea
										id="familyHistory"
										{...register("familyHistory")}
										className="field-sizing-content min-h-20 border-brown-300 focus:border-brown-500"
									/>
								</div>

								<div>
									<Label className="mb-2">Immunisations</Label>
									<Controller
										control={control}
										name="immunisations"
										render={({ field }) => (
											<TagInput
												value={Array.isArray(field.value) ? field.value : []}
												onChange={field.onChange}
												placeholder="e.g., Polio, MMR, Hepatitis B"
											/>
										)}
									/>
								</div>

								<div>
									<Label className="mb-2">Allergies</Label>
									<Controller
										control={control}
										name="allergies"
										render={({ field }) => (
											<TagInput
												value={Array.isArray(field.value) ? field.value : []}
												onChange={field.onChange}
												placeholder="e.g., Peanuts, Dust, Penicillin"
											/>
										)}
									/>
								</div>

								<div>
									<Label className="mb-2">Sensory Sensitivities</Label>
									<Controller
										control={control}
										name="sensorySensitivities"
										render={({ field }) => (
											<TagInput
												value={Array.isArray(field.value) ? field.value : []}
												onChange={field.onChange}
												placeholder="e.g., Loud noises, Bright lights, Certain textures"
											/>
										)}
									/>
								</div>

								<div className="flex gap-3">
									<Button
										type="button"
										variant="outline"
										size="lg"
										className="flex-1 border-brown-300 hover:bg-brown-50"
										onClick={() =>
											router.navigate({
												to: "/children/$childId",
												params: { childId },
											})
										}
									>
										Cancel
									</Button>
									<Button
										type="submit"
										size="lg"
										className="flex-1 bg-brown-700 hover:bg-brown-800"
										disabled={isPending}
									>
										{isPending ? "Saving…" : "Save Changes"}
									</Button>
								</div>
							</div>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
