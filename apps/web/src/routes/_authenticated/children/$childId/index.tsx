import { Avatar, AvatarFallback } from "@haber-final/ui/components/avatar";
import { Button } from "@haber-final/ui/components/button";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@haber-final/ui/components/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Pencil, Shield, XCircle } from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/children/$childId/")({
	component: ChildProfilePage,
});

type ConsentStatus = "PENDING" | "GRANTED" | "WITHDRAWN";

const CONSENT_BADGE: Record<ConsentStatus, string> = {
	GRANTED: "bg-[#DCFCE7] text-[#15803D]",
	PENDING: "bg-[#FEF08A] text-[#854D0E]",
	WITHDRAWN: "bg-red-100 text-red-700",
};

function getAge(dob: Date) {
	const d = new Date(dob);
	const now = new Date();
	let age = now.getFullYear() - d.getFullYear();
	const m = now.getMonth() - d.getMonth();
	if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
	return age;
}

function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

type ChildGuard = {
	id: string;
	name: string;
	relation: string;
	phone: string;
	email: string | null;
};
type ChildProfile = {
	id: string;
	fullName: string;
	dob: string | Date;
	sex: string;
	opNumber: string;
	consentStatus: string;
	medicalHistory: Record<string, string | undefined>;
	guards: ChildGuard[];
};

const MEDICAL_FIELDS: { key: string; label: string }[] = [
	{ key: "birthHistory", label: "Birth History" },
	{ key: "immunisations", label: "Immunisations" },
	{ key: "allergies", label: "Allergies" },
	{ key: "currentMedications", label: "Current Medications" },
	{ key: "priorDiagnoses", label: "Prior Diagnoses" },
	{ key: "familyHistory", label: "Family History" },
	{ key: "sensorySensitivities", label: "Sensory Sensitivities" },
];

const INTAKE_FIELD_LABELS: Record<string, string> = {
	opNumber: "OP Number",
	fullName: "Full Name",
	dob: "Date of Birth",
	sex: "Legal Sex",
	spokenLanguages: "Languages Spoken",
	guardians: "Guardians Added",
	consent: "Consent Granted",
};

function ProfileSkeleton() {
	return (
		<div className="p-8">
			<Skeleton className="mb-6 h-6 w-24" />
			<div className="mb-6 flex items-center gap-4">
				<Skeleton className="h-16 w-16 rounded-full" />
				<div className="space-y-2">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-32" />
				</div>
			</div>
			<Skeleton className="h-64 w-full rounded-xl" />
		</div>
	);
}

function ChildProfilePage() {
	const { childId } = Route.useParams();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { role } = useAuthStore();

	const { data: child, isLoading: childLoading } = useQuery(
		trpc.child.get.queryOptions({ childId }),
	);
	const { data: intake, isLoading: intakeLoading } = useQuery(
		trpc.child.checkIntakeComplete.queryOptions({ childId }),
	);
	const { data: consentStatus, isLoading: consentLoading } = useQuery(
		trpc.consent.getStatus.queryOptions({ childId }),
	);

	const withdrawMutation = useMutation(
		trpc.consent.withdraw.mutationOptions({
			onSuccess: () => {
				toast.success("Consent withdrawn");
				queryClient.invalidateQueries({
					queryKey: trpc.consent.getStatus.queryOptions({ childId }).queryKey,
				});
				queryClient.invalidateQueries({
					queryKey: trpc.child.get.queryOptions({ childId }).queryKey,
				});
				queryClient.invalidateQueries({
					queryKey: trpc.child.list.queryOptions({}).queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	if (childLoading || intakeLoading || consentLoading) {
		return <ProfileSkeleton />;
	}

	if (!child) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 py-32 text-on-surface-variant">
				<p className="text-sm">Child not found.</p>
				<Button
					variant="outline"
					onClick={() => router.navigate({ to: "/children" })}
				>
					Back to Children
				</Button>
			</div>
		);
	}

	const isAdmin = role === "CLINIC_ADMIN" || role === "SUPER_ADMIN";
	const c = child as unknown as ChildProfile;
	const consentStatusValue = c.consentStatus as ConsentStatus;
	const medicalHistory = c.medicalHistory;

	return (
		<div className="p-8">
			<button
				type="button"
				onClick={() => router.navigate({ to: "/children" })}
				className="mb-6 flex items-center gap-1.5 text-on-surface-variant text-sm hover:text-on-surface"
			>
				<ArrowLeft className="h-4 w-4" />
				Back to Children
			</button>

			{/* Profile header */}
			<div className="mb-6 flex items-start justify-between">
				<div className="flex items-center gap-4">
					<Avatar className="h-16 w-16">
						<AvatarFallback className="bg-brown-200 text-brown-800 text-lg">
							{getInitials(c.fullName)}
						</AvatarFallback>
					</Avatar>
					<div>
						<h1 className="font-semibold text-2xl text-on-surface">
							{c.fullName}
						</h1>
						<div className="mt-1 flex items-center gap-2">
							<span className="text-on-surface-variant text-sm">
								{getAge(new Date(c.dob))} yrs • {c.opNumber}
							</span>
							<span
								className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${CONSENT_BADGE[consentStatusValue]}`}
							>
								{consentStatusValue.charAt(0) +
									consentStatusValue.slice(1).toLowerCase()}
							</span>
						</div>
					</div>
				</div>
				<Button
					variant="outline"
					onClick={() =>
						router.navigate({
							to: "/children/$childId/edit",
							params: { childId },
						})
					}
					className="gap-2"
				>
					<Pencil className="h-4 w-4" />
					Edit
				</Button>
			</div>

			{/* Tabs */}
			<Tabs defaultValue="overview">
				<TabsList className="mb-6">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="medical">Medical History</TabsTrigger>
					<TabsTrigger value="guardians">Guardians</TabsTrigger>
					<TabsTrigger value="consent">Consent Records</TabsTrigger>
					<TabsTrigger value="assessments">Assessments</TabsTrigger>
					<TabsTrigger value="plans">Plans</TabsTrigger>
					<TabsTrigger value="sessions">Sessions</TabsTrigger>
				</TabsList>

				{/* Overview */}
				<TabsContent value="overview">
					<div className="grid gap-6 md:grid-cols-2">
						<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
							<h3 className="mb-4 font-medium text-on-surface">
								Intake Completeness
							</h3>
							{intake ? (
								<div className="space-y-2.5">
									{Object.keys(INTAKE_FIELD_LABELS).map((field) => {
										const isDone = !intake.missingFields.includes(field);
										return (
											<div key={field} className="flex items-center gap-2.5">
												{isDone ? (
													<CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
												) : (
													<XCircle className="h-4 w-4 shrink-0 text-red-400" />
												)}
												<span
													className={`text-sm ${isDone ? "text-on-surface" : "text-on-surface-variant"}`}
												>
													{INTAKE_FIELD_LABELS[field]}
												</span>
											</div>
										);
									})}
								</div>
							) : (
								<div className="space-y-2">
									{Array.from({ length: 6 }).map((_, i) => (
										<Skeleton key={i} className="h-5 w-full" />
									))}
								</div>
							)}
						</div>

						<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
							<h3 className="mb-4 font-medium text-on-surface">Actions</h3>
							<div className="space-y-3">
								<Button
									className="w-full"
									disabled={!intake?.complete}
									title={
										!intake?.complete
											? "Complete intake before starting an assessment"
											: undefined
									}
								>
									Start Assessment
								</Button>
								<Button
									variant="outline"
									className="w-full"
									onClick={() =>
										router.navigate({
											to: "/children/$childId/consent",
											params: { childId },
										})
									}
								>
									Manage Consent
								</Button>
							</div>
							{!intake?.complete && intake?.missingFields.length ? (
								<p className="mt-3 text-on-surface-variant text-xs">
									Missing:{" "}
									{intake.missingFields
										.map((f) => INTAKE_FIELD_LABELS[f] ?? f)
										.join(", ")}
								</p>
							) : null}
						</div>
					</div>
				</TabsContent>

				{/* Medical History */}
				<TabsContent value="medical">
					<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
						<h3 className="mb-5 font-medium text-on-surface">
							Medical History
						</h3>
						<dl className="grid gap-5 md:grid-cols-2">
							{MEDICAL_FIELDS.map(({ key, label }) => {
								const value = medicalHistory[key];
								return (
									<div key={key}>
										<dt className="font-medium text-on-surface-variant text-xs uppercase tracking-wider">
											{label}
										</dt>
										<dd className="mt-1 text-on-surface text-sm">
											{value || <span className="text-outline">—</span>}
										</dd>
									</div>
								);
							})}
						</dl>
					</div>
				</TabsContent>

				{/* Guardians */}
				<TabsContent value="guardians">
					<div className="space-y-4">
						{c.guards.length === 0 ? (
							<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center text-on-surface-variant text-sm">
								No guardians on file.
							</div>
						) : (
							c.guards.map((g, idx) => (
								<div
									key={g.id}
									className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5"
								>
									<div className="flex items-center gap-3">
										<Avatar className="h-10 w-10">
											<AvatarFallback className="bg-brown-100 text-brown-700 text-sm">
												{g.name
													.split(" ")
													.map((n) => n[0])
													.join("")
													.slice(0, 2)
													.toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div>
											<p className="font-medium text-on-surface text-sm">
												{g.name}
											</p>
											<p className="text-on-surface-variant text-xs capitalize">
												{g.relation}{" "}
												{idx === 0 && (
													<span className="ml-1 rounded-full bg-brown-100 px-1.5 py-0.5 text-brown-700 text-xs">
														Primary
													</span>
												)}
											</p>
										</div>
									</div>
									<div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
										<p className="text-on-surface-variant">
											<span className="font-medium">Phone:</span> {g.phone}
										</p>
										{g.email && (
											<p className="text-on-surface-variant">
												<span className="font-medium">Email:</span> {g.email}
											</p>
										)}
									</div>
								</div>
							))
						)}
					</div>
				</TabsContent>

				{/* Consent Records */}
				<TabsContent value="consent">
					<div className="space-y-4">
						{isAdmin && consentStatus?.status !== "WITHDRAWN" && (
							<div className="flex justify-end">
								<Button
									variant="outline"
									className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
									disabled={
										withdrawMutation.isPending ||
										!consentStatus?.guardians.length
									}
									onClick={() => {
										const firstGuardian = consentStatus?.guardians[0];
										if (firstGuardian) {
											withdrawMutation.mutate({
												childId,
												guardianId: firstGuardian.guardianId,
											});
										}
									}}
								>
									<Shield className="h-4 w-4" />
									Withdraw Consent
								</Button>
							</div>
						)}

						{consentStatus?.guardians.map((g) => (
							<div
								key={g.guardianId}
								className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest"
							>
								<div className="border-outline-variant border-b bg-surface px-5 py-3">
									<p className="font-medium text-on-surface text-sm">
										{g.name}
									</p>
									<p className="text-on-surface-variant text-xs capitalize">
										{g.relation}
									</p>
								</div>
								<div className="divide-y divide-outline-variant">
									{(
										[
											"TREATMENT",
											"DATA_PROCESSING",
											"IMAGE_VIDEO_CAPTURE",
										] as const
									).map((type) => {
										const entry = g.consents[type];
										return (
											<div
												key={type}
												className="flex items-center justify-between px-5 py-3"
											>
												<div>
													<p className="text-on-surface text-sm">
														{type
															.replace(/_/g, " ")
															.toLowerCase()
															.replace(/\b\w/g, (c) => c.toUpperCase())}
													</p>
													{entry.consented && entry.timestamp && (
														<p className="text-on-surface-variant text-xs">
															Signed: {entry.typedName} •{" "}
															{new Date(entry.timestamp).toLocaleDateString()}
														</p>
													)}
												</div>
												{entry.consented ? (
													<CheckCircle2 className="h-4 w-4 text-green-600" />
												) : (
													<XCircle className="h-4 w-4 text-on-surface-variant" />
												)}
											</div>
										);
									})}
								</div>
							</div>
						))}

						{!consentStatus?.guardians.length && (
							<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center text-on-surface-variant text-sm">
								No consent records yet.
							</div>
						)}
					</div>
				</TabsContent>

				{/* Placeholder tabs */}
				{(["assessments", "plans", "sessions"] as const).map((tab) => (
					<TabsContent key={tab} value={tab}>
						<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center text-on-surface-variant text-sm">
							{tab.charAt(0).toUpperCase() + tab.slice(1)} coming soon.
						</div>
					</TabsContent>
				))}
			</Tabs>
		</div>
	);
}
