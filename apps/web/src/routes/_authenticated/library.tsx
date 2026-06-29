import { ScrollArea } from "@haber-final/ui/components/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GameGrid } from "@/components/game-library/GameGrid";
import {
	type GameLibraryFilters,
	GameLibrarySidebar,
} from "@/components/game-library/GameLibrarySidebar";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/library")({
	component: LibraryPage,
});

function LibraryPage() {
	const [filters, setFilters] = useState<GameLibraryFilters>({});
	const { data, isLoading } = useQuery(
		trpc.game.list.queryOptions({
			...filters,
			enabledForClinic: true,
		}),
	);

	return (
		<div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-background md:flex-row">
			<div className="hidden h-full w-full flex-shrink-0 border-r bg-muted/10 md:block md:w-64 lg:w-72">
				<ScrollArea className="h-full p-6">
					<div className="mb-6">
						<h2 className="font-semibold text-xl">Game Library</h2>
						<p className="mt-1 text-muted-foreground text-sm">
							Browse and filter available games.
						</p>
					</div>
					<GameLibrarySidebar filters={filters} onChange={setFilters} />
				</ScrollArea>
			</div>

			<div className="h-full flex-1 overflow-hidden">
				<ScrollArea className="h-full p-6">
					{/* Mobile Title & Filters (Simplified) */}
					<div className="mb-6 md:hidden">
						<h2 className="mb-4 font-semibold text-2xl">Game Library</h2>
						<GameLibrarySidebar filters={filters} onChange={setFilters} />
					</div>

					<div className="mx-auto max-w-6xl">
						<GameGrid games={data?.items} isLoading={isLoading} />
					</div>
				</ScrollArea>
			</div>
		</div>
	);
}
