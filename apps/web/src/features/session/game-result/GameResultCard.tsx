import type { GameResultSummary } from "@haber-final/api/lib/game-result-summary";
import { Card, CardContent } from "@haber-final/ui/components/card";
import { SectionHeader } from "@haber-final/ui/components/section-header";
import { CheckCircle2 } from "lucide-react";

import { ArcadeResultView } from "./ArcadeResultView";
import { DrawResultView } from "./DrawResultView";
import { SelectionResultView } from "./SelectionResultView";

type Props = {
	gameName: string;
	resultSummary: GameResultSummary | null;
};

export function GameResultCard({ gameName, resultSummary }: Props) {
	if (!resultSummary) {
		return (
			<Card>
				<SectionHeader title={gameName} />
				<CardContent>
					<p className="text-muted-foreground text-sm">
						No result recorded for this game.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<SectionHeader
				icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
				title={gameName}
			/>
			<CardContent>
				{resultSummary.family === "ARCADE" && (
					<ArcadeResultView summary={resultSummary} />
				)}
				{resultSummary.family === "DRAW" && (
					<DrawResultView summary={resultSummary} />
				)}
				{resultSummary.family === "SELECTION" && (
					<SelectionResultView summary={resultSummary} />
				)}
				{resultSummary.family === "UNKNOWN" && (
					<p className="text-muted-foreground text-sm">
						Result recorded, but its format isn't recognized yet.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
