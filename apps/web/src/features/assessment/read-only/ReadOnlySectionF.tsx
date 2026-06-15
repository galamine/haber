import type { SectionFSchema } from "@haber-final/api/schemas/assessment";
import type { z } from "zod";

import { SectionCard } from "../SectionCard";
import { ReadOnlyField } from "./ReadOnlyField";

type SectionFData = z.infer<typeof SectionFSchema>;

export function ReadOnlySectionF({
	data,
	assessmentToolById,
}: {
	data: SectionFData;
	assessmentToolById: Record<string, string>;
}) {
	return (
		<SectionCard title="Section F — Standardized Assessment Tools">
			<div className="flex flex-col gap-4 md:col-span-2">
				{data.toolsAdministered.length === 0 ? (
					<p className="text-on-surface-variant text-sm">
						No tools administered.
					</p>
				) : (
					data.toolsAdministered.map((tool) => (
						<div
							key={tool.toolId}
							className="rounded-lg border border-outline-variant p-4"
						>
							<p className="font-medium text-on-surface text-sm">
								{assessmentToolById[tool.toolId] ?? tool.toolId}
							</p>
							<p className="mt-1 text-on-surface-variant text-sm">
								{tool.scoresSummary || "—"}
							</p>
						</div>
					))
				)}
			</div>

			<ReadOnlyField
				label="Overall Summary"
				value={data.overallSummary}
				className="md:col-span-2"
			/>
		</SectionCard>
	);
}
