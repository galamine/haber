import { MedicalHistoryInput } from "@haber-final/api/schemas/child";
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
import { cn } from "@haber-final/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Check, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { z } from "zod";

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
	spokenLanguages: z.string().min(1, "At least one language is required"),
	school: z.string().optional(),
});

type ProfileValues = z.infer<typeof ProfileSchema>;
type MedicalValues = z.infer<typeof MedicalHistoryInput>;

const GuardianSchema = z.object({
	name: z.string().min(1, "Name is required"),
	relation: z.string().min(1, "Relation is required"),
	phone: z.string().min(1, "Phone is required"),
	email: z.string().email("Valid email required"),
});

type GuardianValues = z.infer<typeof GuardianSchema>;

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

// ─── Stepper ─────────────────────────────────────────────────────────────────

const STEPS = ["Profile", "Medical History", "Guardian", "Consent"];

function WizardStepper({ currentStep }: { currentStep: number }) {
	return (
		<div className="relative mx-auto flex max-w-2xl items-center justify-between py-2">
			<div className="absolute top-7 right-0 left-0 -z-10 h-0.5 bg-surface-variant" />
			<div
				className="absolute top-7 left-0 -z-10 h-0.5 bg-brown-600 transition-all duration-300"
				style={{
					width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
				}}
			/>
			{STEPS.map((label, idx) => {
				const stepNum = idx + 1;
				const isActive = stepNum === currentStep;
				const isDone = stepNum < currentStep;
				return (
					<div key={label} className="flex flex-col items-center gap-2">
						<div
							className={cn(
								"flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm transition-all",
								isActive && "bg-brown-600 text-white ring-4 ring-brown-50",
								isDone && "bg-brown-600 text-white",
								!isActive &&
									!isDone &&
									"bg-surface-variant text-on-surface-variant",
							)}
						>
							{isDone ? <Check className="h-4 w-4" /> : stepNum}
						</div>
						<span
							className={cn(
								"text-center text-xs",
								isActive
									? "font-medium text-on-surface"
									: "text-on-surface-variant",
							)}
						>
							{label}
						</span>
					</div>
				);
			})}
		</div>
	);
}

// ─── Step 1: Profile ─────────────────────────────────────────────────────────

function Step1Profile({
	initial,
	onNext,
}: {
	initial: ProfileValues | null;
	onNext: (data: ProfileValues) => void;
}) {
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
			spokenLanguages: "",
			school: "",
		},
	});

	return (
		<form onSubmit={handleSubmit(onNext)}>
			<div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
				<div className="border-outline-variant border-b px-6 py-4">
					<h2 className="font-semibold text-on-surface text-xl">
						Child Profile
					</h2>
					<p className="mt-1 text-on-surface-variant text-sm">
						Basic information about the child
					</p>
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
						<Input
							id="spokenLanguages"
							placeholder="e.g. English, Arabic"
							{...register("spokenLanguages")}
							className={errors.spokenLanguages ? "border-red-500" : ""}
						/>
						{errors.spokenLanguages ? (
							<p className="text-red-600 text-xs">
								{errors.spokenLanguages.message}
							</p>
						) : (
							<p className="text-on-surface-variant text-xs">
								Comma-separated list
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
	const { register, handleSubmit } = useForm<MedicalValues>({
		resolver: zodResolver(MedicalHistoryInput),
		defaultValues: initial ?? {},
	});

	const fields: { key: keyof MedicalValues; label: string }[] = [
		{ key: "birthHistory", label: "Birth History" },
		{ key: "immunisations", label: "Immunisations" },
		{ key: "allergies", label: "Allergies" },
		{ key: "currentMedications", label: "Current Medications" },
		{ key: "priorDiagnoses", label: "Prior Diagnoses" },
		{ key: "familyHistory", label: "Family History" },
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
					{fields.map(({ key, label }) => (
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
									placeholder="+971 50 000 0000"
									{...register("phone")}
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

// ─── Step 4: Send Consent Link ────────────────────────────────────────────────

function Step4SendConsentLink({
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
	const sendMutation = useMutation(
		trpc.consentInvitation.send.mutationOptions({
			onSuccess: () => {
				toast.success("Consent link sent!");
				queryClient.invalidateQueries({
					queryKey: trpc.child.list.queryOptions({}).queryKey,
				});
				onComplete();
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
						if (guardianEmail) {
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

function NewChildPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [step, setStep] = useState(1);
	const [profileData, setProfileData] = useState<ProfileValues | null>(null);
	const [medicalData, setMedicalData] = useState<MedicalValues | null>(null);
	const [createdChild, setCreatedChild] = useState<CreatedChild | null>(null);
	const [isCreating, setIsCreating] = useState(false);

	const createChildMutation = trpc.child.create.useMutation();

	function handleStep1(data: ProfileValues) {
		setProfileData(data);
		setStep(2);
	}

	function handleStep2(data: MedicalValues) {
		setMedicalData(data);
		setStep(3);
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
				spokenLanguages: profileData.spokenLanguages
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean),
				school: profileData.school || undefined,
				guardian,
				medicalHistory: medicalData ?? {},
			});

			if (!childWithGuardian.guardian) {
				throw new Error("Failed to create guardian record");
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

	return (
		<div className="flex min-h-screen flex-col bg-brown-50">
			{/* Header */}
			<header className="sticky top-0 z-50 flex items-center justify-between border-outline-variant border-b bg-surface-container-lowest px-6 py-3">
				<button
					type="button"
					onClick={() => router.navigate({ to: "/children" })}
					className="flex items-center gap-1.5 text-brown-600 text-sm hover:text-brown-800"
				>
					<X className="h-4 w-4" />
					Cancel Intake
				</button>
				<button
					type="button"
					disabled
					className="rounded-lg border border-outline-variant px-4 py-1.5 text-on-surface-variant text-sm opacity-50"
				>
					Save as Draft
				</button>
			</header>

			{/* Content */}
			<main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
				<h1 className="mb-8 text-center font-semibold text-3xl text-on-surface">
					Register New Child
				</h1>

				<WizardStepper currentStep={step} />

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
						<Step4SendConsentLink
							childId={createdChild.id}
							guardianName={createdChild.guardian.name}
							guardianEmail={createdChild.guardian.email}
							onBack={() => setStep(3)}
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
