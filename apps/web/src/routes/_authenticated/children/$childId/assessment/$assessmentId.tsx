import type {
	SectionASchema,
	SectionBSchema,
	SectionCSchema,
	SectionDSchema,
	SectionESchema,
	SectionFSchema,
	SectionGSchema,
	SectionHSchema,
} from "@haber-final/api/schemas/assessment";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import type { z } from "zod";

import { AssessmentTabsShell } from "@/features/assessment/AssessmentTabsShell";
import type { SectionTabValue } from "@/features/assessment/constants";
import { ReadOnlySectionA } from "@/features/assessment/read-only/ReadOnlySectionA";
import { ReadOnlySectionB } from "@/features/assessment/read-only/ReadOnlySectionB";
import { ReadOnlySectionC } from "@/features/assessment/read-only/ReadOnlySectionC";
import { ReadOnlySectionD } from "@/features/assessment/read-only/ReadOnlySectionD";
import { ReadOnlySectionE } from "@/features/assessment/read-only/ReadOnlySectionE";
import { ReadOnlySectionF } from "@/features/assessment/read-only/ReadOnlySectionF";
import { ReadOnlySectionG } from "@/features/assessment/read-only/ReadOnlySectionG";
import { ReadOnlySectionH } from "@/features/assessment/read-only/ReadOnlySectionH";
import { useAssessmentTaxonomy } from "@/features/assessment/use-assessment-taxonomy";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute(
	"/_authenticated/children/$childId/assessment/$assessmentId",
)({
	component: AssessmentDetailPage,
});

function castSection<T>(value: unknown): T {
	return value as T;
}

function AssessmentDetailPage() {
	const { childId } = Route.useParams();
	const router = useRouter();

	const assessmentQuery = useQuery(
		trpc.assessment.get.queryOptions({ childId }),
	);
	const taxonomy = useAssessmentTaxonomy();

	const [activeTab, setActiveTab] = useState<SectionTabValue>("a");

	if (assessmentQuery.isLoading || taxonomy.isLoading) {
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

	const assessment = assessmentQuery.data;

	if (!assessment) {
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
					Assessment not found.
				</div>
			</div>
		);
	}

	const diagnosisById = Object.fromEntries(
		(taxonomy.diagnoses.data ?? []).map((d) => [d.id, d.label]),
	);
	const functionalConcernById = Object.fromEntries(
		(taxonomy.functionalConcerns.data ?? []).map((c) => [c.id, c.label]),
	);
	const assessmentToolById = Object.fromEntries(
		(taxonomy.assessmentTools.data ?? []).map((t) => [t.id, t.label]),
	);
	const equipmentById = Object.fromEntries(
		(taxonomy.equipment.data ?? []).map((eq) => [eq.id, eq.label]),
	);
	const milestoneById = Object.fromEntries(
		(taxonomy.milestones.data ?? []).map((m) => [m.id, m.description]),
	);
	const sensorySystemById = Object.fromEntries(
		(taxonomy.sensorySystems.data ?? []).map((s) => [s.id, s.label]),
	);

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
				Initial Assessment
			</h1>

			<AssessmentTabsShell
				activeTab={activeTab}
				onTabChange={setActiveTab}
				sections={{
					a: (
						<ReadOnlySectionA
							data={castSection<z.infer<typeof SectionASchema>>(
								assessment.sectionA,
							)}
						/>
					),
					b: (
						<ReadOnlySectionB
							data={castSection<z.infer<typeof SectionBSchema>>(
								assessment.sectionB,
							)}
							diagnosisById={diagnosisById}
						/>
					),
					c: (
						<ReadOnlySectionC
							data={castSection<z.infer<typeof SectionCSchema>>(
								assessment.sectionC,
							)}
							milestoneById={milestoneById}
						/>
					),
					d: (
						<ReadOnlySectionD
							data={castSection<z.infer<typeof SectionDSchema>>(
								assessment.sectionD,
							)}
							sensorySystemById={sensorySystemById}
						/>
					),
					e: (
						<ReadOnlySectionE
							data={castSection<z.infer<typeof SectionESchema>>(
								assessment.sectionE,
							)}
							functionalConcernById={functionalConcernById}
						/>
					),
					f: (
						<ReadOnlySectionF
							data={castSection<z.infer<typeof SectionFSchema>>(
								assessment.sectionF,
							)}
							assessmentToolById={assessmentToolById}
						/>
					),
					g: (
						<ReadOnlySectionG
							data={castSection<z.infer<typeof SectionGSchema>>(
								assessment.sectionG,
							)}
							equipmentById={equipmentById}
						/>
					),
					h: (
						<ReadOnlySectionH
							data={castSection<z.infer<typeof SectionHSchema>>(
								assessment.sectionH,
							)}
							signedAt={assessment.createdAt}
						/>
					),
				}}
			/>
		</div>
	);
}
