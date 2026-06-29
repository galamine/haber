import { Badge } from "@haber-final/ui/components/badge";
import { Input } from "@haber-final/ui/components/input";
import { Switch } from "@haber-final/ui/components/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@haber-final/ui/components/table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { queryClient, trpc } from "@/utils/trpc";
import type { GameItem } from "./GameCard";

export function ClinicLibrarySettingsTable() {
	const [search, setSearch] = useState("");

	// Fetch all games
	const { data: allGamesData, isLoading: isLoadingAll } = useQuery(
		trpc.game.list.queryOptions({
			search,
			pageSize: 100, // Fetch more for admin table
		}),
	);

	// Fetch only enabled games to determine toggle state
	const { data: enabledGamesData, isLoading: isLoadingEnabled } = useQuery(
		trpc.game.list.queryOptions({
			search,
			pageSize: 100,
			enabledForClinic: true,
		}),
	);

	const enableMutation = useMutation(
		trpc.game.enableForClinic.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ["game.list"] });
				toast.success("Game enabled successfully.");
			},
			onError: (error) => {
				toast.error(error.message || "Failed to enable game.");
			},
		}),
	);

	const disableMutation = useMutation(
		trpc.game.disableForClinic.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ["game.list"] });
				toast.success("Game disabled successfully.");
			},
			onError: (error) => {
				toast.error(error.message || "Failed to disable game.");
			},
		}),
	);

	const isLoading = isLoadingAll || isLoadingEnabled;
	const allGames = allGamesData?.items || [];
	const enabledGameIds = new Set(
		(enabledGamesData?.items || []).map((g) => g.id),
	);

	const handleToggle = (game: GameItem, currentlyEnabled: boolean) => {
		if (currentlyEnabled) {
			disableMutation.mutate({ gameId: game.id });
		} else {
			enableMutation.mutate({ gameId: game.id });
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<Input
					placeholder="Search games..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="max-w-sm"
				/>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Game Name</TableHead>
							<TableHead>Category</TableHead>
							<TableHead>Level</TableHead>
							<TableHead>Target Issues</TableHead>
							<TableHead className="text-right">Enabled</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={5} className="py-8 text-center">
									Loading games...
								</TableCell>
							</TableRow>
						) : allGames.length === 0 ? (
							<TableRow>
								<TableCell colSpan={5} className="py-8 text-center">
									No games found.
								</TableCell>
							</TableRow>
						) : (
							allGames.map((game) => {
								const isEnabled = enabledGameIds.has(game.id);
								return (
									<TableRow
										key={game.id}
										className={!isEnabled ? "opacity-50" : ""}
									>
										<TableCell className="font-medium">{game.name}</TableCell>
										<TableCell>{game.subCategory || "General"}</TableCell>
										<TableCell>{game.difficulty || "N/A"}</TableCell>
										<TableCell>
											<div className="flex flex-wrap gap-1">
												{game.targetIssues?.slice(0, 2).map((issue) => (
													<Badge
														key={issue}
														variant="outline"
														className="text-xs"
													>
														{issue}
													</Badge>
												))}
												{(game.targetIssues?.length || 0) > 2 && (
													<Badge variant="outline" className="text-xs">
														+{(game.targetIssues?.length || 0) - 2} more
													</Badge>
												)}
											</div>
										</TableCell>
										<TableCell className="text-right">
											<Switch
												checked={isEnabled}
												onCheckedChange={() => handleToggle(game, isEnabled)}
												disabled={
													enableMutation.isPending || disableMutation.isPending
												}
											/>
										</TableCell>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
