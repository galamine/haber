import { Card, CardContent } from "@haber-final/ui/components/card";
import { SectionHeader } from "@haber-final/ui/components/section-header";
import type { ReactNode } from "react";

export function AssessmentSectionCard({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: ReactNode;
}) {
	return (
		<Card>
			<SectionHeader title={title} description={description} />
			<CardContent className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
				{children}
			</CardContent>
		</Card>
	);
}
