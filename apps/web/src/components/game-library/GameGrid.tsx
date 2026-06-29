import { useState } from "react";
import type { GameItem } from "./GameCard";
import { GameCard, GameCardSkeleton } from "./GameCard";
import { GameDetailSheet } from "./GameDetailSheet";

interface GameGridProps {
	games?: GameItem[];
	isLoading: boolean;
	planId?: string;
	onPinToPlan?: (gameId: string) => void;
}

export function GameGrid({
	games,
	isLoading,
	planId,
	onPinToPlan,
}: GameGridProps) {
	const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);

	return (
		<>
			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{isLoading
					? Array.from({ length: 8 }).map((_, i) => (
							<GameCardSkeleton key={`skeleton-${i}`} />
						))
					: games?.map((game) => (
							<GameCard
								key={game.id}
								game={game}
								onViewDetails={setSelectedGame}
							/>
						))}
				{!isLoading && games?.length === 0 && (
					<div className="col-span-full rounded-lg border border-dashed py-12 text-center text-muted-foreground">
						No games found matching your filters.
					</div>
				)}
			</div>

			<GameDetailSheet
				game={selectedGame}
				open={!!selectedGame}
				onOpenChange={(open) => !open && setSelectedGame(null)}
				planId={planId}
				onPinToPlan={onPinToPlan}
			/>
		</>
	);
}
