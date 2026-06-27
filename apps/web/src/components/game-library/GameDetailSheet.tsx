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
import type { GameItem } from "./GameCard";

interface GameDetailSheetProps {
	game: GameItem | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	planId?: string; // If provided, shows the "Pin to Plan" action
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

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="flex w-full flex-col sm:max-w-xl">
				<SheetHeader>
					<SheetTitle className="text-2xl">{game.name}</SheetTitle>
					<SheetDescription>
						{game.subCategory || "Game Library"}
					</SheetDescription>
				</SheetHeader>

				<ScrollArea className="-mx-6 mt-6 flex-1 px-6">
					<div className="space-y-6 pb-6">
						{/* Clinical Specs */}
						<div>
							<h3 className="mb-2 font-semibold text-lg">
								Clinical Specifications
							</h3>
							<div className="mb-4 flex flex-wrap gap-2">
								<Badge variant="secondary">
									Level {game.difficulty || "N/A"}
								</Badge>
								{game.ageRangeMin !== null && game.ageRangeMax !== null && (
									<Badge variant="secondary">
										Ages {game.ageRangeMin}-{game.ageRangeMax}
									</Badge>
								)}
								{game.targetIssues?.map((issue) => (
									<Badge key={issue} variant="outline">
										{issue}
									</Badge>
								))}
							</div>
							<p className="whitespace-pre-wrap text-muted-foreground">
								{game.description || "No description provided for this game."}
							</p>
						</div>

						{/* Module Details (mock for now since DB schema doesn't have it explicitly shown in list query, wait, maybe in versions?) */}
						<div>
							<h3 className="mb-2 font-semibold text-lg">Module Details</h3>
							<p className="text-muted-foreground text-sm">
								Additional game module instructions or clinical notes go here.
							</p>
						</div>

						{/* Scoring Rubric */}
						<div>
							<h3 className="mb-2 font-semibold text-lg">Scoring Rubric</h3>
							<div className="rounded-md bg-muted p-4 text-sm">
								<p className="text-muted-foreground italic">
									Scoring schema will be displayed here based on the latest game
									version.
								</p>
							</div>
						</div>
					</div>
				</ScrollArea>

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
