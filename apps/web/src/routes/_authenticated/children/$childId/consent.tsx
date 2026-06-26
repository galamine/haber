import { Button } from "@haber-final/ui/components/button";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Mail, Shield, XCircle } from "lucide-react";
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

function ConsentPage() {
	const { childId } = Route.useParams();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { role } = useAuthStore();

	const isAdmin = role === "CLINIC_ADMIN" || role === "SUPER_ADMIN";

	const { data: child, isLoading: childLoading } = useQuery(
		trpc.child.get.queryOptions({ childId }),
	);
	const { data: consentStatus, isLoading: consentLoading } = useQuery(
		trpc.consent.getStatus.queryOptions({ childId }),
	);
	const { data: invitations, isLoading: invitationsLoading } = useQuery(
		trpc.consentInvitation.list.queryOptions({ childId }),
	);

	const sendMutation = useMutation(
		trpc.consentInvitation.send.mutationOptions({
			onSuccess: () => {
				toast.success("Consent link sent!");
				queryClient.invalidateQueries({
					queryKey: trpc.consentInvitation.list.queryOptions({ childId })
						.queryKey,
				});
				queryClient.invalidateQueries({
					queryKey: trpc.child.list.queryOptions({}).queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
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

	const activeInvitation = invitations?.find((i) => !i.alreadyUsed);
	const latestInvitation = invitations?.[0];

	const isLoading = childLoading || consentLoading || invitationsLoading;

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
	const guardian = (
		child as unknown as {
			guardian: { name: string; relation: string; email: string | null } | null;
		}
	)?.guardian;
	const guardianName = guardian?.name ?? "Guardian";

	const allConsentsGranted = consentStatus?.consents
		? Object.values(consentStatus.consents).every((c) => c.consented)
		: false;

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
						disabled={withdrawMutation.isPending}
						onClick={() => withdrawMutation.mutate({ childId })}
					>
						<Shield className="h-4 w-4" />
						Withdraw All Consent
					</Button>
				)}
			</div>

			<div className="space-y-6">
				{/* Guardian + Send Link Section */}
				<div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
					<div className="flex items-center gap-3 border-outline-variant border-b bg-surface px-5 py-4">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container font-semibold text-on-primary-container text-sm">
							{guardianName
								.split(" ")
								.map((n) => n[0])
								.join("")
								.slice(0, 2)
								.toUpperCase()}
						</div>
						<div>
							<p className="font-medium text-on-surface text-sm">
								{guardianName}
							</p>
							{guardian?.relation && (
								<p className="text-on-surface-variant text-xs capitalize">
									{guardian.relation}
								</p>
							)}
						</div>
						{allConsentsGranted && (
							<CheckCircle2 className="ml-auto h-5 w-5 text-green-600" />
						)}
					</div>

					<div className="divide-y divide-outline-variant">
						{(
							[
								"TREATMENT",
								"DATA_PROCESSING",
								"IMAGE_VIDEO_CAPTURE",
							] as ConsentType[]
						).map((type) => {
							const entry = consentStatus?.consents[type];
							return (
								<div
									key={type}
									className="flex items-center justify-between px-5 py-3"
								>
									<div>
										<p className="text-on-surface text-sm">
											{CONSENT_LABELS[type].label}
										</p>
										{entry?.consented &&
											entry?.typedName &&
											entry?.timestamp && (
												<p className="text-on-surface-variant text-xs">
													Signed by {entry.typedName} on{" "}
													{new Date(entry.timestamp).toLocaleDateString()}
												</p>
											)}
									</div>
									{entry?.consented ? (
										<CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
									) : (
										<XCircle className="h-4 w-4 shrink-0 text-on-surface-variant" />
									)}
								</div>
							);
						})}
					</div>

					{overallStatus !== "WITHDRAWN" && (
						<div className="border-outline-variant border-t bg-surface-container-low p-5">
							{!activeInvitation && !allConsentsGranted ? (
								<div className="space-y-3">
									<p className="text-on-surface-variant text-sm">
										Send a magic link to {guardianName} to collect consent
										remotely.
									</p>
									<Button
										className="w-full gap-2"
										disabled={sendMutation.isPending || !guardian?.email}
										onClick={() => sendMutation.mutate({ childId })}
									>
										<Mail className="h-4 w-4" />
										{sendMutation.isPending ? "Sending…" : "Send Consent Link"}
									</Button>
									{!guardian?.email && (
										<p className="text-red-500 text-xs">
											No guardian email on file. Add a guardian email to send
											the consent link.
										</p>
									)}
								</div>
							) : activeInvitation ? (
								<div className="space-y-2">
									<div className="flex items-center gap-2 text-on-surface-variant text-sm">
										<Mail className="h-4 w-4 text-green-600" />
										<span>
											Link sent on{" "}
											{new Date(
												activeInvitation.createdAt,
											).toLocaleDateString()}
										</span>
									</div>
									<p className="text-on-surface-variant text-xs">
										{activeInvitation.expiresAt > new Date()
											? `Expires in ${Math.ceil((new Date(activeInvitation.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days`
											: "Link has expired"}
									</p>
									<Button
										variant="outline"
										className="w-full gap-2"
										disabled={sendMutation.isPending}
										onClick={() => sendMutation.mutate({ childId })}
									>
										<Mail className="h-4 w-4" />
										{sendMutation.isPending ? "Sending…" : "Resend Link"}
									</Button>
								</div>
							) : null}
						</div>
					)}
				</div>

				{/* Invitation history */}
				{latestInvitation && (
					<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
						<h3 className="mb-3 font-medium text-on-surface text-sm">
							Invitation History
						</h3>
						<div className="space-y-2">
							{invitations?.map((inv) => (
								<div
									key={inv.id}
									className="flex items-center justify-between text-sm"
								>
									<span className="text-on-surface-variant">
										{new Date(inv.createdAt).toLocaleDateString()}
									</span>
									{inv.alreadyUsed ? (
										<span className="flex items-center gap-1 text-green-600">
											<CheckCircle2 className="h-3 w-3" /> Used
										</span>
									) : inv.expiresAt < new Date() ? (
										<span className="flex items-center gap-1 text-red-600">
											<XCircle className="h-3 w-3" /> Expired
										</span>
									) : (
										<span className="flex items-center gap-1 text-amber-600">
											<Mail className="h-3 w-3" /> Sent
										</span>
									)}
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
