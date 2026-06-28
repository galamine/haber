import { ScrollArea } from "@haber-final/ui/components/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@haber-final/ui/components/sheet";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import { GameGrid } from "./GameGrid";
import {
	type GameLibraryFilters,
	GameLibrarySidebar,
} from "./GameLibrarySidebar";

interface GameLibraryBrowserSheetProps {
	planId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function GameLibraryBrowserSheet({
	planId,
	open,
	onOpenChange,
}: GameLibraryBrowserSheetProps) {
	const [filters, setFilters] = useState<GameLibraryFilters>({});
	const { data, isLoading } = useQuery(
		trpc.game.list.queryOptions({ ...filters }),
	);

	// Note: api.plan.addGame is mentioned in the spec but plan router might not exist yet.
	// You can replace this when plan router is available.
	// const addGameMutation = trpc.plan.addGame.useMutation();

	const handlePinToPlan = async (gameId: string) => {
		try {
			// await addGameMutation.mutateAsync({ planId, gameId });
			toast.success("Game pinned to plan successfully! (Mocked)");
			onOpenChange(false);
		} catch (error: any) {
			toast.error(error.message || "Failed to pin game to plan");
		}
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="flex w-full flex-col p-0 sm:max-w-4xl">
				<div className="border-b p-6">
					<SheetHeader>
						<SheetTitle>Game Library</SheetTitle>
						<SheetDescription>
							Browse and pin games to the current treatment plan.
						</SheetDescription>
					</SheetHeader>
				</div>

				<div className="flex flex-1 flex-col overflow-hidden md:flex-row">
					<div className="w-full border-r bg-muted/20 p-6 md:w-64">
						<ScrollArea className="h-full pr-4">
							<GameLibrarySidebar filters={filters} onChange={setFilters} />
						</ScrollArea>
					</div>
					<div className="flex-1 overflow-hidden p-6">
						<ScrollArea className="h-full pr-4">
							<GameGrid
								games={data?.items}
								isLoading={isLoading}
								planId={planId}
								onPinToPlan={handlePinToPlan}
							/>
						</ScrollArea>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
