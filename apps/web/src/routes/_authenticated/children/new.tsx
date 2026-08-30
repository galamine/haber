import { MedicalHistoryInput } from "@haber-final/api/schemas/child";
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
import { Steps } from "@haber-final/ui/components/steps";
import { TagInput } from "@haber-final/ui/components/tag-input";
import { Textarea } from "@haber-final/ui/components/textarea";
import { cn } from "@haber-final/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Check, ChevronRight, ExternalLink, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { z } from "zod";

import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/children/new")({
	component: NewChildPage,
});

// ─── Schemas ────────────────────────────────────────────────────────────────

const ProfileSchema = z.object({
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
	dob: z.string().min(1, "Date of birth is required"),
	sex: z.string().min(1, "Sex is required"),
	opNumber: z.string().min(1, "OP number is required"),
	addressStreet: z.string().optional(),
	spokenLanguages: z
		.array(z.string())
		.min(1, "At least one language is required"),
	school: z.string().optional(),
	photoUrl: z.string().optional(),
});

type ProfileValues = z.infer<typeof ProfileSchema>;
type MedicalValues = z.infer<typeof MedicalHistoryInput>;

const GuardianSchema = z.object({
	name: z.string().min(1, "Name is required"),
	relation: z.string().min(1, "Relation is required"),
	phone: z
		.string()
		.min(1, "Phone is required")
		.regex(
			/^(\+91[\s-]?)?(91|0)?[6-9]\d{9}$/,
			"Enter a valid 10-digit Indian mobile number",
		),
	email: z.string().email("Valid email required"),
});

type GuardianValues = z.infer<typeof GuardianSchema>;

const TherapistAssignmentSchema = z.object({
	therapistId: z.string().min(1, "Therapist is required"),
	reviewDueAt: z.string().optional(),
});

type TherapistAssignmentValues = z.infer<typeof TherapistAssignmentSchema>;

// ─── Types ───────────────────────────────────────────────────────────────────

type CreatedChild = {
	id: string;
	guardian: {
		id: string;
		name: string;
		relation: string;
		phone: string;
		email: string | null;
	};
};

// ─── Step 1: Profile ─────────────────────────────────────────────────────────

function Step1Profile({
	initial,
	onNext,
}: {
	initial: ProfileValues | null;
	onNext: (data: ProfileValues, photoFile: File | null) => void;
}) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [photoPreview, setPhotoPreview] = useState<string>(
		initial?.photoUrl ?? "",
	);
	const [photoFile, setPhotoFile] = useState<File | null>(null);
	const [isUploading, setIsUploading] = useState(false);

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setPhotoFile(file);
		setPhotoPreview(URL.createObjectURL(file));
	}

	const {
		register,
		handleSubmit,
		control,
		formState: { errors },
	} = useForm<ProfileValues>({
		resolver: zodResolver(ProfileSchema),
		defaultValues: initial ?? {
			firstName: "",
			lastName: "",
			dob: "",
			sex: "",
			opNumber: "",
			addressStreet: "",
			spokenLanguages: [],
			school: "",
			photoUrl: "",
		},
	});

	function onSubmit(data: ProfileValues) {
		onNext({ ...data, photoUrl: photoPreview }, photoFile);
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
				<div className="border-outline-variant border-b px-6 py-4">
					<h2 className="font-semibold text-on-surface text-xl">
						Child Profile
					</h2>
					<p className="mt-1 text-on-surface-variant text-sm">
						Basic information about the child
					</p>
				</div>

				<div className="flex flex-col items-center gap-3 border-outline-variant border-b p-6">
					<Avatar className="h-24 w-24">
						{photoPreview && (
							<AvatarImage src={photoPreview} alt="Child photo" />
						)}
						<AvatarFallback className="bg-brown-200 text-2xl text-brown-800">
							{photoPreview ? "" : "?"}
						</AvatarFallback>
					</Avatar>
					<input
						type="file"
						accept="image/*"
						className="hidden"
						ref={fileInputRef}
						onChange={handleFileChange}
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

				<div className="grid grid-cols-1 gap-x-6 gap-y-5 p-6 md:grid-cols-2">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="firstName">
							First Name <span className="text-red-500">*</span>
						</Label>
						<Input
							id="firstName"
							placeholder="e.g. Aisha"
							{...register("firstName")}
							className={errors.firstName ? "border-red-500" : ""}
						/>
						{errors.firstName && (
							<p className="text-red-600 text-xs">{errors.firstName.message}</p>
						)}
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="lastName">
							Last Name <span className="text-red-500">*</span>
						</Label>
						<Input
							id="lastName"
							placeholder="e.g. Rahman"
							{...register("lastName")}
							className={errors.lastName ? "border-red-500" : ""}
						/>
						{errors.lastName && (
							<p className="text-red-600 text-xs">{errors.lastName.message}</p>
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

					<div className="flex flex-col gap-1.5 md:col-span-2">
						<Label htmlFor="opNumber">
							OP Number <span className="text-red-500">*</span>
						</Label>
						<Input
							id="opNumber"
							placeholder="e.g. OP-2024-001"
							{...register("opNumber")}
							className={errors.opNumber ? "border-red-500" : ""}
						/>
						{errors.opNumber ? (
							<p className="text-red-600 text-xs">{errors.opNumber.message}</p>
						) : (
							<p className="text-on-surface-variant text-xs">
								Unique outpatient number for this child
							</p>
						)}
					</div>

					<div className="flex flex-col gap-1.5 md:col-span-2">
						<Label htmlFor="addressStreet">Address</Label>
						<Input
							id="addressStreet"
							placeholder="Street address"
							{...register("addressStreet")}
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="spokenLanguages">
							Languages Spoken <span className="text-red-500">*</span>
						</Label>
						<Controller
							control={control}
							name="spokenLanguages"
							render={({ field }) => (
								<TagInput
									value={Array.isArray(field.value) ? field.value : []}
									onChange={field.onChange}
									placeholder="e.g. English, Hindi, Arabic"
								/>
							)}
						/>
						{errors.spokenLanguages ? (
							<p className="text-red-600 text-xs">
								{errors.spokenLanguages.message}
							</p>
						) : (
							<p className="text-on-surface-variant text-xs">
								Add at least one language
							</p>
						)}
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="school">School</Label>
						<Input
							id="school"
							placeholder="e.g. Al Noor Academy"
							{...register("school")}
						/>
					</div>
				</div>

				<div className="flex justify-end border-outline-variant border-t px-6 py-4">
					<Button type="submit" className="gap-2">
						Continue
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</form>
	);
}

// ─── Step 2: Medical History ──────────────────────────────────────────────────

function Step2Medical({
	initial,
	onNext,
	onBack,
}: {
	initial: MedicalValues | null;
	onNext: (data: MedicalValues) => void;
	onBack: () => void;
}) {
	const { register, control, handleSubmit } = useForm<MedicalValues>({
		resolver: zodResolver(MedicalHistoryInput),
		defaultValues: initial ?? {},
	});

	const textFields: { key: keyof MedicalValues; label: string }[] = [
		{ key: "birthHistory", label: "Birth History" },
		{ key: "currentMedications", label: "Current Medications" },
		{ key: "priorDiagnoses", label: "Prior Diagnoses" },
		{ key: "familyHistory", label: "Family History" },
	];

	const tagFields: { key: keyof MedicalValues; label: string }[] = [
		{ key: "immunisations", label: "Immunisations" },
		{ key: "allergies", label: "Allergies" },
		{ key: "sensorySensitivities", label: "Sensory Sensitivities" },
	];

	return (
		<form onSubmit={handleSubmit(onNext)}>
			<div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
				<div className="border-outline-variant border-b px-6 py-4">
					<h2 className="font-semibold text-on-surface text-xl">
						Medical History
					</h2>
					<p className="mt-1 text-on-surface-variant text-sm">
						All fields are optional — fill what is known
					</p>
				</div>

				<div className="space-y-5 p-6">
					{textFields.map(({ key, label }) => (
						<div key={key} className="flex flex-col gap-1.5">
							<Label htmlFor={key}>{label}</Label>
							<Textarea
								id={key}
								rows={2}
								placeholder={`Notes about ${label.toLowerCase()}…`}
								{...register(key)}
							/>
						</div>
					))}
					{tagFields.map(({ key, label }) => {
						const placeholders: Record<string, string> = {
							immunisations: "e.g., Polio, MMR, Hepatitis B",
							allergies: "e.g., Peanuts, Dust, Penicillin",
							sensorySensitivities:
								"e.g., Loud noises, Bright lights, Certain textures",
						};
						return (
							<div key={key} className="flex flex-col gap-1.5">
								<Label htmlFor={key}>{label}</Label>
								<Controller
									control={control}
									name={key}
									render={({ field }) => (
										<TagInput
											value={Array.isArray(field.value) ? field.value : []}
											onChange={field.onChange}
											placeholder={
												placeholders[key] ?? `Add ${label.toLowerCase()}…`
											}
										/>
									)}
								/>
							</div>
						);
					})}
				</div>

				<div className="flex justify-between border-outline-variant border-t px-6 py-4">
					<Button type="button" variant="outline" onClick={onBack}>
						Back
					</Button>
					<Button type="submit" className="gap-2">
						Continue
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</form>
	);
}

// ─── Step 3: Guardians ────────────────────────────────────────────────────────

function Step3Guardians({
	onNext,
	onBack,
	isSubmitting,
}: {
	onNext: (data: GuardianValues) => void;
	onBack: () => void;
	isSubmitting: boolean;
}) {
	const {
		register,
		handleSubmit,
		trigger,
		formState: { errors },
	} = useForm<GuardianValues>({
		resolver: zodResolver(GuardianSchema),
		defaultValues: {
			name: "",
			relation: "",
			phone: "",
			email: "",
		},
	});

	return (
		<form onSubmit={handleSubmit(onNext)}>
			<div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
				<div className="border-outline-variant border-b px-6 py-4">
					<h2 className="font-semibold text-on-surface text-xl">Guardian</h2>
					<p className="mt-1 text-on-surface-variant text-sm">
						Add the child&apos;s guardian
					</p>
				</div>

				<div className="space-y-4 p-6">
					<div className="rounded-lg border border-outline-variant p-4">
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div className="flex flex-col gap-1.5">
								<Label>
									Full Name <span className="text-red-500">*</span>
								</Label>
								<Input
									placeholder="Guardian's full name"
									{...register("name")}
									className={errors.name ? "border-red-500" : ""}
								/>
								{errors.name && (
									<p className="text-red-600 text-xs">{errors.name.message}</p>
								)}
							</div>

							<div className="flex flex-col gap-1.5">
								<Label>
									Relation <span className="text-red-500">*</span>
								</Label>
								<Input
									placeholder="e.g. Mother, Father"
									{...register("relation")}
									className={errors.relation ? "border-red-500" : ""}
								/>
								{errors.relation && (
									<p className="text-red-600 text-xs">
										{errors.relation.message}
									</p>
								)}
							</div>

							<div className="flex flex-col gap-1.5">
								<Label>
									Phone <span className="text-red-500">*</span>
								</Label>
								<Input
									type="tel"
									placeholder="+91 98765 43210"
									{...register("phone", {
										onBlur: () => trigger("phone"),
									})}
									className={errors.phone ? "border-red-500" : ""}
								/>
								{errors.phone && (
									<p className="text-red-600 text-xs">{errors.phone.message}</p>
								)}
							</div>

							<div className="flex flex-col gap-1.5">
								<Label>
									Email <span className="text-red-500">*</span>
								</Label>
								<Input
									type="email"
									placeholder="guardian@example.com"
									{...register("email")}
									className={errors.email ? "border-red-500" : ""}
								/>
								{errors.email && (
									<p className="text-red-600 text-xs">{errors.email.message}</p>
								)}
							</div>
						</div>
					</div>
				</div>

				<div className="flex justify-between border-outline-variant border-t px-6 py-4">
					<Button type="button" variant="outline" onClick={onBack}>
						Back
					</Button>
					<Button type="submit" disabled={isSubmitting} className="gap-2">
						{isSubmitting ? "Creating record…" : "Continue"}
						{!isSubmitting && <ChevronRight className="h-4 w-4" />}
					</Button>
				</div>
			</div>
		</form>
	);
}

// ─── Step 4: Therapist ─────────────────────────────────────────────────────────

function Step4Therapist({
	initial,
	onNext,
	onBack,
}: {
	initial: TherapistAssignmentValues | null;
	onNext: (data: TherapistAssignmentValues) => void;
	onBack: () => void;
}) {
	const {
		register,
		handleSubmit,
		control,
		formState: { errors },
	} = useForm<TherapistAssignmentValues>({
		resolver: zodResolver(TherapistAssignmentSchema),
		defaultValues: initial ?? {
			therapistId: "",
			reviewDueAt: "",
		},
	});

	const {
		data: therapistsData,
		isLoading,
		isError,
		refetch,
	} = useQuery(
		trpc.staff.list.queryOptions({ role: "THERAPIST", pageSize: 100 }),
	);

	const therapists = therapistsData?.items ?? [];

	return (
		<form onSubmit={handleSubmit(onNext)}>
			<div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
				<div className="border-outline-variant border-b px-6 py-4">
					<h2 className="font-semibold text-on-surface text-xl">
						Therapist Assignment
					</h2>
					<p className="mt-1 text-on-surface-variant text-sm">
						Assign a therapist to this child
					</p>
				</div>

				<div className="space-y-4 p-6">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="therapistId">
							Therapist <span className="text-red-500">*</span>
						</Label>
						{isLoading ? (
							<Input
								id="therapistId"
								disabled
								placeholder="Loading therapists..."
							/>
						) : isError ? (
							<>
								<Input
									id="therapistId"
									disabled
									placeholder="Failed to load therapists"
								/>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => void refetch()}
								>
									Retry
								</Button>
							</>
						) : (
							<Controller
								control={control}
								name="therapistId"
								render={({ field }) => (
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger
											id="therapistId"
											className={errors.therapistId ? "border-red-500" : ""}
										>
											<SelectValue placeholder="Select a therapist" />
										</SelectTrigger>
										<SelectContent>
											{therapists.length === 0 ? (
												<div className="px-2 py-1.5 text-muted-foreground text-sm">
													No therapists available
												</div>
											) : (
												therapists.map((therapist) => (
													<SelectItem key={therapist.id} value={therapist.id}>
														{therapist.name} ({therapist.email})
													</SelectItem>
												))
											)}
										</SelectContent>
									</Select>
								)}
							/>
						)}
						{errors.therapistId && (
							<p className="text-red-600 text-xs">
								{errors.therapistId.message}
							</p>
						)}
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="reviewDueAt">Review Due Date</Label>
						<Input id="reviewDueAt" type="date" {...register("reviewDueAt")} />
					</div>
				</div>

				<div className="flex justify-between border-outline-variant border-t px-6 py-4">
					<Button type="button" variant="outline" onClick={onBack}>
						Back
					</Button>
					<Button type="submit" className="gap-2">
						Continue
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</form>
	);
}

// ─── Step 5: Send Consent Link ────────────────────────────────────────────────

function Step5SendConsentLink({
	childId,
	guardianName,
	guardianEmail,
	onBack,
	onComplete,
}: {
	childId: string;
	guardianName: string;
	guardianEmail: string | null;
	onBack: () => void;
	onComplete: () => void;
}) {
	const queryClient = useQueryClient();
	const [openableConsentUrl, setOpenableConsentUrl] = useState<string | null>(
		null,
	);
	const sendMutation = useMutation(
		trpc.consentInvitation.send.mutationOptions({
			onSuccess: (data) => {
				toast.success("Consent link sent!");
				setOpenableConsentUrl(data.consentUrl);
				queryClient.invalidateQueries({
					queryKey: trpc.child.list.queryOptions({}).queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	return (
		<div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
			<div className="border-outline-variant border-b px-6 py-4">
				<h2 className="font-semibold text-on-surface text-xl">
					Guardian Consent
				</h2>
				<p className="mt-1 text-on-surface-variant text-sm">
					Send a magic link to the guardian to collect consent remotely
				</p>
			</div>
			<div className="space-y-4 p-6">
				<div className="rounded-lg border border-outline-variant bg-surface p-4">
					<p className="text-on-surface-variant text-sm">Sending to:</p>
					<p className="font-medium text-on-surface">{guardianName}</p>
					{guardianEmail ? (
						<p className="text-on-surface-variant text-sm">{guardianEmail}</p>
					) : (
						<p className="text-red-500 text-sm">No email on file</p>
					)}
				</div>
				<Button
					className="w-full"
					disabled={sendMutation.isPending || !guardianEmail}
					onClick={() => sendMutation.mutate({ childId })}
				>
					{sendMutation.isPending ? "Sending…" : "Send Consent Link"}
				</Button>
				{openableConsentUrl && (
					<>
						<Button
							variant="outline"
							className="w-full gap-2"
							onClick={() => window.open(openableConsentUrl, "_blank")}
						>
							<ExternalLink className="h-4 w-4" />
							Open Consent Page
						</Button>
						<p className="text-center text-on-surface-variant text-xs">
							Or open it now to complete consent together.
						</p>
					</>
				)}
				<p className="text-center text-on-surface-variant text-xs">
					The link expires in 7 days and can only be used once.
				</p>
			</div>
			<div className="flex justify-between border-outline-variant border-t px-6 py-4">
				<Button type="button" variant="outline" onClick={onBack}>
					Back
				</Button>
				<Button
					disabled={sendMutation.isPending}
					onClick={() => {
						if (guardianEmail && !openableConsentUrl) {
							sendMutation.mutate({ childId });
						} else {
							onComplete();
						}
					}}
					className="gap-2"
				>
					{sendMutation.isPending ? "Sending…" : "Complete Intake"}
					{!sendMutation.isPending && <Check className="h-4 w-4" />}
				</Button>
			</div>
		</div>
	);
}

// ─── Top-level wizard ─────────────────────────────────────────────────────────

const STEPS = [
	"Profile",
	"Medical History",
	"Guardian",
	"Therapist",
	"Consent",
];

function NewChildPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [step, setStep] = useState(1);
	const [profileData, setProfileData] = useState<ProfileValues | null>(null);
	const [photoFile, setPhotoFile] = useState<File | null>(null);
	const [medicalData, setMedicalData] = useState<MedicalValues | null>(null);
	const [createdChild, setCreatedChild] = useState<CreatedChild | null>(null);
	const [therapistData, setTherapistData] =
		useState<TherapistAssignmentValues | null>(null);
	const [isCreating, setIsCreating] = useState(false);

	useEffect(() => {
		window.scrollTo({ top: 0, behavior: "smooth" });
	}, [step]);

	const createChildMutation = useMutation(trpc.child.create.mutationOptions());
	const updateChildMutation = useMutation(trpc.child.update.mutationOptions());
	const assignTherapistMutation = useMutation(
		trpc.child.assignTherapist.mutationOptions(),
	);

	function handleStep1(data: ProfileValues, file: File | null) {
		setProfileData(data);
		setPhotoFile(file);
		setStep(2);
	}

	function handleStep2(data: MedicalValues) {
		setMedicalData(data);
		setStep(3);
	}

	async function uploadChildPhoto(childId: string, file: File) {
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
		if (!res.ok) {
			const error = await res.json();
			throw new Error(error.error || "Photo upload failed");
		}
		const { url } = await res.json();
		return url;
	}

	async function handleStep3(guardian: GuardianValues) {
		if (!profileData) return;
		setIsCreating(true);
		try {
			const childWithGuardian = await createChildMutation.mutateAsync({
				opNumber: profileData.opNumber,
				fullName: `${profileData.firstName} ${profileData.lastName}`.trim(),
				dob: new Date(profileData.dob),
				sex: profileData.sex,
				address: profileData.addressStreet || undefined,
				spokenLanguages: profileData.spokenLanguages,
				school: profileData.school || undefined,
				guardian,
				medicalHistory: medicalData ?? {},
			});

			if (!childWithGuardian.guardian) {
				throw new Error("Failed to create guardian record");
			}

			if (photoFile) {
				try {
					const photoUrl = await uploadChildPhoto(
						childWithGuardian.id,
						photoFile,
					);
					await updateChildMutation.mutateAsync({
						id: childWithGuardian.id,
						photoUrl,
					});
				} catch (photoErr) {
					console.error("Photo upload failed:", photoErr);
					toast.warning("Child created but photo upload failed");
				}
			}

			setCreatedChild({
				id: childWithGuardian.id,
				guardian: childWithGuardian.guardian,
			});
			setStep(4);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Failed to create record";
			toast.error(message);
		} finally {
			setIsCreating(false);
		}
	}

	async function handleStep4(data: TherapistAssignmentValues) {
		if (!createdChild) return;
		try {
			await assignTherapistMutation.mutateAsync({
				childId: createdChild.id,
				therapistId: data.therapistId,
				reviewDueAt: data.reviewDueAt ? new Date(data.reviewDueAt) : undefined,
			});
		} catch (_err) {
			toast.error("Failed to assign therapist");
			return;
		}
		setTherapistData(data);
		setStep(5);
	}

	return (
		<div className="flex min-h-screen flex-col bg-brown-50">
			{/* Header */}
			<header className="sticky top-0 z-50 flex items-center justify-between border-outline-variant border-b bg-brown-50 px-6 py-3">
				<Button
					variant="outline"
					size="sm"
					className="border-brown-300 text-brown-700 hover:bg-brown-100"
					onClick={() => router.navigate({ to: "/children" })}
				>
					<X className="h-4 w-4" />
					Cancel Intake
				</Button>
				<Button variant="outline" size="sm" disabled>
					Save as Draft
				</Button>
			</header>

			{/* Content */}
			<main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
				<h1 className="mb-8 text-center font-semibold text-3xl text-on-surface">
					Register New Child
				</h1>

				<Steps steps={STEPS} currentStep={step} />

				<div className="mt-8">
					{step === 1 && (
						<Step1Profile initial={profileData} onNext={handleStep1} />
					)}
					{step === 2 && (
						<Step2Medical
							initial={medicalData}
							onNext={handleStep2}
							onBack={() => setStep(1)}
						/>
					)}
					{step === 3 && (
						<Step3Guardians
							onNext={handleStep3}
							onBack={() => setStep(2)}
							isSubmitting={isCreating}
						/>
					)}
					{step === 4 && createdChild && (
						<Step4Therapist
							initial={therapistData}
							onNext={handleStep4}
							onBack={() => setStep(3)}
						/>
					)}
					{step === 5 && createdChild && (
						<Step5SendConsentLink
							childId={createdChild.id}
							guardianName={createdChild.guardian.name}
							guardianEmail={createdChild.guardian.email}
							onBack={() => setStep(4)}
							onComplete={() =>
								router.navigate({
									to: "/children/$childId",
									params: { childId: createdChild.id },
								})
							}
						/>
					)}
				</div>
			</main>
		</div>
	);
}
