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
	scored: unknown;
};

export function GameResultCard({ gameName, resultSummary, scored }: Props) {
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

	const rubric =
		scored && typeof scored === "object" && "rubric_version" in scored
			? (scored as { score: number; rubric_version: string })
			: null;

	return (
		<Card>
			<SectionHeader
				icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
				title={gameName}
				meta={
					rubric
						? `Rubric Score: ${rubric.score} (${rubric.rubric_version})`
						: undefined
				}
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
				{resultSummary.family === "UNKNOWN" &&
					(rubric ? (
						<div>
							<p className="text-muted-foreground text-xs">Score</p>
							<p className="font-medium text-lg">{rubric.score}</p>
						</div>
					) : (
						<p className="text-muted-foreground text-sm">
							Result recorded, but its format isn't recognized yet.
						</p>
					))}
			</CardContent>
		</Card>
	);
}
