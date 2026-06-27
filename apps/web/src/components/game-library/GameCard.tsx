import type { AppRouter } from "@haber-final/api/routers/index";
import { Badge } from "@haber-final/ui/components/badge";
import { Button } from "@haber-final/ui/components/button";
import { Card, CardContent, CardFooter } from "@haber-final/ui/components/card";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type GameItem = RouterOutput["game"]["list"]["items"][0];

interface GameCardProps {
	game: GameItem;
	onViewDetails: (game: GameItem) => void;
}

export function GameCard({ game, onViewDetails }: GameCardProps) {
	return (
		<Card className="flex h-full flex-col overflow-hidden">
			<div className="relative aspect-video bg-muted">
				{/* Placeholder for thumbnail */}
				<div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
					{game.name.substring(0, 2).toUpperCase()}
				</div>
			</div>
			<CardContent className="flex-1 p-4">
				<div className="mb-2 flex items-start justify-between">
					<h3 className="line-clamp-1 font-semibold text-lg">{game.name}</h3>
					<Badge variant="secondary" className="ml-2 whitespace-nowrap">
						Level {game.difficulty || "N/A"}
					</Badge>
				</div>

				<div className="mb-3 flex flex-wrap gap-1">
					{game.ageRangeMin !== null && game.ageRangeMax !== null ? (
						<Badge variant="outline" className="text-xs">
							Ages {game.ageRangeMin}-{game.ageRangeMax}
						</Badge>
					) : null}
					{game.targetIssues?.map((issue) => (
						<Badge key={issue} variant="outline" className="text-xs">
							{issue}
						</Badge>
					))}
				</div>

				<p className="line-clamp-3 text-muted-foreground text-sm">
					{game.description || "No description available."}
				</p>
			</CardContent>
			<CardFooter className="p-4 pt-0">
				<Button
					variant="outline"
					className="w-full"
					onClick={() => onViewDetails(game)}
				>
					View Details
				</Button>
			</CardFooter>
		</Card>
	);
}

export function GameCardSkeleton() {
	return (
		<Card className="flex h-full flex-col overflow-hidden">
			<Skeleton className="aspect-video w-full rounded-none" />
			<CardContent className="flex-1 p-4">
				<div className="mb-2 flex items-start justify-between">
					<Skeleton className="h-6 w-3/4" />
					<Skeleton className="h-6 w-12" />
				</div>
				<div className="mb-3 flex flex-wrap gap-1">
					<Skeleton className="h-5 w-16" />
					<Skeleton className="h-5 w-20" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-2/3" />
				</div>
			</CardContent>
			<CardFooter className="p-4 pt-0">
				<Skeleton className="h-10 w-full" />
			</CardFooter>
		</Card>
	);
}
