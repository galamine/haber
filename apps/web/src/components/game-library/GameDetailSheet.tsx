import { Badge } from "@haber-final/ui/components/badge";
import { Button } from "@haber-final/ui/components/button";
import { ScrollArea } from "@haber-final/ui/components/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@haber-final/ui/components/sheet";
import { Brain, Clock, Gamepad2, Target } from "lucide-react";
import type { GameItem } from "./GameCard";

interface GameDetailSheetProps {
	game: GameItem | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	planId?: string;
	onPinToPlan?: (gameId: string) => void;
}

export function GameDetailSheet({
	game,
	open,
	onOpenChange,
	planId,
	onPinToPlan,
}: GameDetailSheetProps) {
	if (!game) return null;

	const latestVersion = game.versions?.[0];
	const scoringSchema = latestVersion?.scoringSchema as Record<
		string,
		unknown
	> | null;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="flex w-full flex-col sm:max-w-xl">
				<SheetHeader className="sr-only">
					<SheetTitle>{game.name}</SheetTitle>
					<SheetDescription>Game details</SheetDescription>
				</SheetHeader>

				<div className="flex flex-col gap-6">
					{/* Header */}
					<div className="flex items-start justify-between gap-4">
						<div>
							<div className="mb-1 flex items-center gap-2 text-muted-foreground text-sm">
								<Gamepad2 className="h-4 w-4" />
								<span>{game.category?.name || "General"}</span>
								{game.subCategory && (
									<>
										<span>/</span>
										<span>{game.subCategory}</span>
									</>
								)}
							</div>
							<h2 className="font-semibold text-2xl text-on-surface">
								{game.name}
							</h2>
						</div>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => onOpenChange(false)}
						>
							×
						</Button>
					</div>

					{/* Quick Stats */}
					<div className="flex flex-wrap gap-3">
						<div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5">
							<Brain className="h-4 w-4 text-muted-foreground" />
							<span className="font-medium text-sm">
								Level {game.difficulty || "N/A"}
							</span>
						</div>
						{game.ageRangeMin !== null && game.ageRangeMax !== null && (
							<div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5">
								<Clock className="h-4 w-4 text-muted-foreground" />
								<span className="font-medium text-sm">
									Ages {game.ageRangeMin}-{game.ageRangeMax}
								</span>
							</div>
						)}
					</div>

					{/* Target Issues */}
					{game.targetIssues && game.targetIssues.length > 0 && (
						<div>
							<h3 className="mb-2 flex items-center gap-2 font-medium text-muted-foreground text-sm">
								<Target className="h-4 w-4" />
								Target Issues
							</h3>
							<div className="flex flex-wrap gap-2">
								{game.targetIssues.map((issue) => (
									<Badge key={issue} variant="outline" className="px-2 py-0.5">
										{issue}
									</Badge>
								))}
							</div>
						</div>
					)}

					{/* Description */}
					<div>
						<h3 className="mb-2 font-medium text-muted-foreground text-sm">
							Description
						</h3>
						<p className="whitespace-pre-wrap text-on-surface">
							{game.description || "No description provided for this game."}
						</p>
					</div>

					{/* Scoring Rubric */}
					<div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
						<h3 className="mb-3 font-medium">Scoring Rubric</h3>
						{latestVersion ? (
							<div className="space-y-2">
								<div className="flex items-center justify-between text-sm">
									<span className="text-muted-foreground">Version</span>
									<Badge variant="secondary">
										v{latestVersion.versionNumber}
									</Badge>
								</div>
								{scoringSchema && Object.keys(scoringSchema).length > 0 ? (
									<div className="mt-3 space-y-2">
										{Object.entries(scoringSchema).map(([key, value]) => (
											<div
												key={key}
												className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm"
											>
												<span className="text-muted-foreground capitalize">
													{key.replace(/([A-Z])/g, " $1").trim()}
												</span>
												<span className="font-medium">{String(value)}</span>
											</div>
										))}
									</div>
								) : (
									<p className="text-muted-foreground text-sm italic">
										No scoring metrics defined for this version.
									</p>
								)}
							</div>
						) : (
							<p className="text-muted-foreground text-sm italic">
								No version data available.
							</p>
						)}
					</div>
				</div>

				{planId && onPinToPlan && (
					<div className="mt-auto border-t pt-6">
						<Button className="w-full" onClick={() => onPinToPlan(game.id)}>
							Pin to Plan
						</Button>
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
