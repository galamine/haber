import type {
	FollowUpSectionASchema,
	FollowUpSectionBSchema,
	FollowUpSectionDSchema,
	FollowUpSectionESchema,
	FollowUpSectionFSchema,
	SensoryCheckResultSchema,
} from "@haber-final/api/schemas/assessment";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import type { z } from "zod";
import type { FollowUpTabValue } from "@/features/followup/constants";
import { FollowUpTabsShell } from "@/features/followup/FollowUpTabsShell";
import { ReadOnlySectionA } from "@/features/followup/read-only/ReadOnlySectionA";
import { ReadOnlySectionB } from "@/features/followup/read-only/ReadOnlySectionB";
import { ReadOnlySectionC } from "@/features/followup/read-only/ReadOnlySectionC";
import { ReadOnlySectionD } from "@/features/followup/read-only/ReadOnlySectionD";
import { ReadOnlySectionE } from "@/features/followup/read-only/ReadOnlySectionE";
import { ReadOnlySectionF } from "@/features/followup/read-only/ReadOnlySectionF";
import { useFollowUpData } from "@/features/followup/use-followup-data";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute(
	"/_authenticated/children/$childId/followup/$followUpId",
)({ component: FollowUpDetailPage });

function castSection<T>(value: unknown): T {
	return value as T;
}

function FollowUpDetailPage() {
	const { childId, followUpId } = Route.useParams();
	const router = useRouter();

	const followUpQuery = useQuery(
		trpc.assessment.getFollowUp.queryOptions({ followUpId }),
	);
	const data = useFollowUpData({ childId });

	const [activeTab, setActiveTab] = useState<FollowUpTabValue>("a");

	if (followUpQuery.isLoading || data.isLoading) {
		return (
			<div className="p-8">
				<Skeleton className="mb-6 h-5 w-24" />
				<Skeleton className="mb-6 h-8 w-48" />
				<div className="space-y-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-48 w-full rounded-xl" />
					))}
				</div>
			</div>
		);
	}

	const followUp = followUpQuery.data;

	if (!followUp) {
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
				<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center text-on-surface-variant text-sm">
					Follow-up assessment not found.
				</div>
			</div>
		);
	}

	const sensorySystemById = Object.fromEntries(
		(data.sensorySystems.data ?? []).map((s) => [s.id, s.label]),
	);
	const goalDescriptionById = Object.fromEntries(
		(data.activePlan.data?.goals ?? []).map((g) => [g.id, g.description]),
	);

	const sectionC = castSection<{
		sensoryCheck: z.infer<typeof SensoryCheckResultSchema>[];
	}>(followUp.sectionC);

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
				Follow-Up Assessment
			</h1>

			<FollowUpTabsShell
				activeTab={activeTab}
				onTabChange={setActiveTab}
				readOnly
				sections={{
					a: (
						<ReadOnlySectionA
							data={castSection<z.infer<typeof FollowUpSectionASchema>>(
								followUp.sectionA,
							)}
						/>
					),
					b: (
						<ReadOnlySectionB
							data={castSection<z.infer<typeof FollowUpSectionBSchema>>(
								followUp.sectionB,
							)}
							goalDescriptionById={goalDescriptionById}
						/>
					),
					c: (
						<ReadOnlySectionC
							data={sectionC}
							sensorySystemById={sensorySystemById}
						/>
					),
					d: (
						<ReadOnlySectionD
							data={castSection<z.infer<typeof FollowUpSectionDSchema>>(
								followUp.sectionD,
							)}
						/>
					),
					e: (
						<ReadOnlySectionE
							data={castSection<z.infer<typeof FollowUpSectionESchema>>(
								followUp.sectionE,
							)}
						/>
					),
					f: (
						<ReadOnlySectionF
							data={castSection<z.infer<typeof FollowUpSectionFSchema>>(
								followUp.sectionF,
							)}
							signedAt={followUp.createdAt}
						/>
					),
				}}
			/>
		</div>
	);
}
