import type { SelectionResultSummary } from "@haber-final/api/lib/game-result-summary";
import { Badge } from "@haber-final/ui/components/badge";
import { Button } from "@haber-final/ui/components/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@haber-final/ui/components/collapsible";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@haber-final/ui/components/table";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

function Stat({
	label,
	value,
}: {
	label: string;
	value: string | number | null;
}) {
	if (value === null) return null;
	return (
		<div>
			<p className="text-muted-foreground text-xs">{label}</p>
			<p className="font-medium text-lg">{value}</p>
		</div>
	);
}

export function SelectionResultView({
	summary,
}: {
	summary: SelectionResultSummary;
}) {
	const [roundsOpen, setRoundsOpen] = useState(false);

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<Stat label="Rounds" value={summary.totalRounds} />
				<Stat
					label="Accuracy"
					value={
						summary.accuracy !== null
							? `${Math.round(summary.accuracy * 100)}%`
							: null
					}
				/>
				<Stat label="Correct" value={summary.correct} />
				<Stat label="Wrong" value={summary.wrong} />
				<Stat label="Timeouts" value={summary.timeouts} />
				<Stat
					label="Avg Decision Time"
					value={
						summary.meanDecisionTimeMs !== null
							? `${Math.round(summary.meanDecisionTimeMs)}ms`
							: null
					}
				/>
				<Stat
					label="Fastest / Slowest"
					value={
						summary.minDecisionTimeMs !== null &&
						summary.maxDecisionTimeMs !== null
							? `${Math.round(summary.minDecisionTimeMs)}ms / ${Math.round(summary.maxDecisionTimeMs)}ms`
							: null
					}
				/>
				<Stat label="Attention Pauses" value={summary.pauseCount} />
			</div>

			{summary.rounds.length > 0 && (
				<Collapsible open={roundsOpen} onOpenChange={setRoundsOpen}>
					<CollapsibleTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className="gap-1.5 self-start px-0"
						>
							<ChevronDown
								className={`h-4 w-4 transition-transform ${roundsOpen ? "rotate-180" : ""}`}
							/>
							{roundsOpen ? "Hide" : "Show"} round-by-round (
							{summary.rounds.length})
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>#</TableHead>
									<TableHead>Prompt</TableHead>
									<TableHead>Result</TableHead>
									<TableHead>Decision Time</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{summary.rounds.map((round) => (
									<TableRow key={round.index}>
										<TableCell>{round.index}</TableCell>
										<TableCell>{round.promptItem ?? "—"}</TableCell>
										<TableCell>
											{round.result ? (
												<Badge
													variant={
														round.result === "correct"
															? "success"
															: "destructive"
													}
												>
													{round.result}
												</Badge>
											) : (
												"—"
											)}
										</TableCell>
										<TableCell>
											{round.decisionTimeMs !== null
												? `${Math.round(round.decisionTimeMs)}ms`
												: "—"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CollapsibleContent>
				</Collapsible>
			)}
		</div>
	);
}
