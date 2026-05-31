import { Button } from "@haber-final/ui/components/button";
import { Input } from "@haber-final/ui/components/input";
import { Label } from "@haber-final/ui/components/label";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Shield, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute(
	"/_authenticated/children/$childId/consent",
)({
	component: ConsentPage,
});

type ConsentType = "TREATMENT" | "DATA_PROCESSING" | "IMAGE_VIDEO_CAPTURE";

const CONSENT_LABELS: Record<
	ConsentType,
	{ label: string; description: string }
> = {
	TREATMENT: {
		label: "Treatment Consent",
		description:
			"Consent to receive therapeutic assessment and treatment services.",
	},
	DATA_PROCESSING: {
		label: "Data Processing",
		description: "Consent to collect and process personal and clinical data.",
	},
	IMAGE_VIDEO_CAPTURE: {
		label: "Image & Video Capture",
		description:
			"Consent to photos or videos for clinical or educational purposes.",
	},
};

type RecordFormState = {
	typedName: string;
	TREATMENT: boolean;
	DATA_PROCESSING: boolean;
	IMAGE_VIDEO_CAPTURE: boolean;
};

function ConsentPage() {
	const { childId } = Route.useParams();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { role } = useAuthStore();

	const isAdmin = role === "CLINIC_ADMIN" || role === "SUPER_ADMIN";

	const { data: consentStatus, isLoading } = useQuery(
		trpc.consent.getStatus.queryOptions({ childId }),
	);

	const [recordForms, setRecordForms] = useState<
		Record<string, RecordFormState>
	>({});

	const recordMutation = useMutation(trpc.consent.record.mutationOptions());
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

	function getFormState(guardianId: string): RecordFormState {
		return (
			recordForms[guardianId] ?? {
				typedName: "",
				TREATMENT: false,
				DATA_PROCESSING: false,
				IMAGE_VIDEO_CAPTURE: false,
			}
		);
	}

	function updateForm(guardianId: string, patch: Partial<RecordFormState>) {
		setRecordForms((prev) => ({
			...prev,
			[guardianId]: { ...getFormState(guardianId), ...patch },
		}));
	}

	async function handleRecord(guardianId: string) {
		const state = getFormState(guardianId);
		if (!state.typedName.trim()) {
			toast.error("Please provide a typed signature");
			return;
		}
		const types = (
			["TREATMENT", "DATA_PROCESSING", "IMAGE_VIDEO_CAPTURE"] as ConsentType[]
		).filter((t) => state[t]);
		if (types.length === 0) {
			toast.error("Select at least one consent type");
			return;
		}

		try {
			await Promise.all(
				types.map((consentType) =>
					recordMutation.mutateAsync({
						childId,
						guardianId,
						consentType,
						typedName: state.typedName.trim(),
						checkbox: true,
					}),
				),
			);
			toast.success("Consent recorded");
			queryClient.invalidateQueries({
				queryKey: trpc.consent.getStatus.queryOptions({ childId }).queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: trpc.child.get.queryOptions({ childId }).queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: trpc.child.list.queryOptions({}).queryKey,
			});
			updateForm(guardianId, {
				typedName: "",
				TREATMENT: false,
				DATA_PROCESSING: false,
				IMAGE_VIDEO_CAPTURE: false,
			});
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Failed to record consent";
			toast.error(message);
		}
	}

	if (isLoading) {
		return (
			<div className="p-8">
				<Skeleton className="mb-6 h-5 w-24" />
				<Skeleton className="mb-6 h-8 w-48" />
				<div className="space-y-4">
					{Array.from({ length: 2 }).map((_, i) => (
						<Skeleton key={i} className="h-64 w-full rounded-xl" />
					))}
				</div>
			</div>
		);
	}

	const overallStatus = consentStatus?.status ?? "PENDING";

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

			<div className="mb-6 flex items-start justify-between">
				<div>
					<h1 className="font-semibold text-2xl text-on-surface">
						Consent Management
					</h1>
					<p className="mt-1 text-on-surface-variant text-sm">
						Overall status:{" "}
						<span
							className={
								overallStatus === "GRANTED"
									? "font-medium text-green-700"
									: overallStatus === "WITHDRAWN"
										? "font-medium text-red-600"
										: "font-medium text-amber-700"
							}
						>
							{overallStatus.charAt(0) + overallStatus.slice(1).toLowerCase()}
						</span>
					</p>
				</div>
				{isAdmin && overallStatus !== "WITHDRAWN" && (
					<Button
						variant="outline"
						className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
						disabled={
							withdrawMutation.isPending || !consentStatus?.guardians.length
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
						Withdraw All Consent
					</Button>
				)}
			</div>

			<div className="space-y-6">
				{consentStatus?.guardians.map((g) => {
					const formState = getFormState(g.guardianId);
					const allGranted = Object.values(g.consents).every(
						(c) => c.consented,
					);
					const pendingTypes = (
						[
							"TREATMENT",
							"DATA_PROCESSING",
							"IMAGE_VIDEO_CAPTURE",
						] as ConsentType[]
					).filter((t) => !g.consents[t].consented);

					return (
						<div
							key={g.guardianId}
							className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest"
						>
							<div className="flex items-center gap-3 border-outline-variant border-b bg-surface px-5 py-4">
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container font-semibold text-on-primary-container text-sm">
									{g.name
										.split(" ")
										.map((n) => n[0])
										.join("")
										.slice(0, 2)
										.toUpperCase()}
								</div>
								<div>
									<p className="font-medium text-on-surface text-sm">
										{g.name}
									</p>
									<p className="text-on-surface-variant text-xs capitalize">
										{g.relation}
									</p>
								</div>
								{allGranted && (
									<CheckCircle2 className="ml-auto h-5 w-5 text-green-600" />
								)}
							</div>

							{/* Existing consent records */}
							<div className="divide-y divide-outline-variant">
								{(
									[
										"TREATMENT",
										"DATA_PROCESSING",
										"IMAGE_VIDEO_CAPTURE",
									] as ConsentType[]
								).map((type) => {
									const entry = g.consents[type];
									return (
										<div
											key={type}
											className="flex items-center justify-between px-5 py-3"
										>
											<div>
												<p className="text-on-surface text-sm">
													{CONSENT_LABELS[type].label}
												</p>
												{entry.consented &&
													entry.typedName &&
													entry.timestamp && (
														<p className="text-on-surface-variant text-xs">
															Signed by {entry.typedName} on{" "}
															{new Date(entry.timestamp).toLocaleDateString()}
														</p>
													)}
											</div>
											{entry.consented ? (
												<CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
											) : (
												<XCircle className="h-4 w-4 shrink-0 text-on-surface-variant" />
											)}
										</div>
									);
								})}
							</div>

							{/* Record pending consents form */}
							{pendingTypes.length > 0 && overallStatus !== "WITHDRAWN" && (
								<div className="border-outline-variant border-t bg-surface-container-low p-5">
									<p className="mb-3 font-medium text-on-surface-variant text-xs uppercase tracking-wider">
										Record Consent
									</p>
									<div className="space-y-2.5">
										{pendingTypes.map((type) => (
											<label
												key={type}
												className="flex cursor-pointer items-start gap-3"
											>
												<input
													type="checkbox"
													checked={formState[type]}
													onChange={(e) =>
														updateForm(g.guardianId, {
															[type]: e.target.checked,
														})
													}
													className="mt-0.5 h-4 w-4 rounded border-outline-variant text-brown-600 focus:ring-brown-600"
												/>
												<div>
													<p className="font-medium text-on-surface text-sm">
														{CONSENT_LABELS[type].label}
													</p>
													<p className="text-on-surface-variant text-xs">
														{CONSENT_LABELS[type].description}
													</p>
												</div>
											</label>
										))}
									</div>
									<div className="mt-4 flex flex-col gap-1.5">
										<Label>
											Typed Signature <span className="text-red-500">*</span>
										</Label>
										<Input
											placeholder="Type full name to sign"
											value={formState.typedName}
											onChange={(e) =>
												updateForm(g.guardianId, { typedName: e.target.value })
											}
											className="font-serif italic"
										/>
									</div>
									<Button
										className="mt-4 w-full"
										onClick={() => handleRecord(g.guardianId)}
										disabled={recordMutation.isPending}
									>
										{recordMutation.isPending ? "Recording…" : "Record Consent"}
									</Button>
								</div>
							)}
						</div>
					);
				})}

				{!consentStatus?.guardians.length && (
					<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center text-on-surface-variant text-sm">
						No guardians found for this child.
					</div>
				)}
			</div>
		</div>
	);
}
