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

function renderSchemaValue(value: unknown) {
	if (Array.isArray(value)) {
		return (
			<div className="flex flex-wrap justify-end gap-1.5">
				{value.map((item, index) => {
					if (typeof item === "object" && item !== null) {
						const label =
							(item as Record<string, unknown>).label ||
							(item as Record<string, unknown>).name ||
							(item as Record<string, unknown>).metric ||
							(item as Record<string, unknown>).type ||
							JSON.stringify(item);
						return (
							<Badge
								key={index}
								variant="secondary"
								className="font-normal text-xs"
							>
								{String(label)}
							</Badge>
						);
					}
					return (
						<Badge
							key={index}
							variant="secondary"
							className="font-normal text-xs"
						>
							{String(item)}
						</Badge>
					);
				})}
			</div>
		);
	}
	if (typeof value === "object" && value !== null) {
		return (
			<pre className="max-w-[240px] overflow-x-auto text-right font-mono text-muted-foreground text-xs">
				{JSON.stringify(value, null, 2)}
			</pre>
		);
	}
	return <span className="font-medium">{String(value)}</span>;
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
			<SheetContent className="flex w-full flex-col p-6 sm:w-[540px] sm:max-w-[540px]">
				<SheetHeader className="sr-only">
					<SheetTitle>{game.name}</SheetTitle>
					<SheetDescription>Game details</SheetDescription>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto pr-1">
					<div className="flex flex-col gap-6">
						{/* Header */}
						<div className="flex items-start justify-between gap-4 pr-6">
							<div>
								<div className="mb-1.5 flex items-center gap-2 text-muted-foreground text-sm">
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
										<Badge
											key={issue}
											variant="outline"
											className="px-2 py-0.5"
										>
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
													className="flex flex-col justify-between gap-2 rounded-md bg-muted px-3 py-2.5 text-sm sm:flex-row sm:items-center"
												>
													<span className="font-medium text-muted-foreground capitalize">
														{key.replace(/([A-Z])/g, " $1").trim()}
													</span>
													{renderSchemaValue(value)}
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
