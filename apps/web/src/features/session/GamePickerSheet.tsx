import { env } from "@haber-final/env/web";
import { Badge } from "@haber-final/ui/components/badge";
import { Button } from "@haber-final/ui/components/button";
import { Input } from "@haber-final/ui/components/input";
import { Label } from "@haber-final/ui/components/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@haber-final/ui/components/sheet";
import { Textarea } from "@haber-final/ui/components/textarea";
import { cn } from "@haber-final/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Gamepad2, History, PlayCircle } from "lucide-react";
import { useState } from "react";
import type { GameItem } from "@/components/game-library/GameCard";
import { GameThumbnail } from "@/components/game-library/GameThumbnail";
import { trpc } from "@/utils/trpc";

type PlayHistory = { lastPlayedAt: string | Date; timesPlayed: number };

function lastPlayedLabel(history: PlayHistory) {
	const date = new Date(history.lastPlayedAt).toLocaleDateString(undefined, {
		day: "numeric",
		month: "short",
	});
	const sessions = history.timesPlayed === 1 ? "session" : "sessions";
	return `Last played ${date} · ${history.timesPlayed} ${sessions}`;
}

function GamePreview({ game }: { game: GameItem }) {
	const [failed, setFailed] = useState(false);

	if (!game.previewPath || failed) {
		return (
			<div className="space-y-1.5">
				<GameThumbnail
					name={game.name}
					categoryName={game.category.name}
					size="lg"
				/>
				<p className="text-center text-on-surface-variant text-xs">
					Preview not available yet
				</p>
			</div>
		);
	}

	const src = `${env.VITE_GAME_SERVER_URL}${game.previewPath}`;
	if (/\.(mp4|webm)$/i.test(game.previewPath)) {
		return (
			<video
				src={src}
				className="aspect-video w-full rounded-xl bg-black"
				muted
				loop
				autoPlay
				controls
				playsInline
				onError={() => setFailed(true)}
			/>
		);
	}
	return (
		<img
			src={src}
			alt={`${game.name} preview`}
			className="aspect-video w-full rounded-xl object-cover"
			onError={() => setFailed(true)}
		/>
	);
}

function FilterChip({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			aria-pressed={active}
			onClick={onClick}
			className={cn(
				"inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors",
				active
					? "border-brown-500 bg-brown-500 text-white"
					: "border-outline-variant text-on-surface-variant hover:border-brown-400",
			)}
		>
			{children}
		</button>
	);
}

const RECENT_FILTER = "recent";

type GamePickerSheetProps = {
	childId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelect: (game: {
		gameVersionId: string;
		gameName: string;
		instructions?: string;
	}) => void;
};

export function GamePickerSheet({
	childId,
	open,
	onOpenChange,
	onSelect,
}: GamePickerSheetProps) {
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	// undefined = all games, RECENT_FILTER = played by this child, else a category id
	const [filter, setFilter] = useState<string>();
	const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);
	const [instructions, setInstructions] = useState("");

	const { data, isLoading } = useQuery(
		trpc.game.list.queryOptions({
			page,
			pageSize: 12,
			search: search || undefined,
			categoryId: filter && filter !== RECENT_FILTER ? filter : undefined,
			playedByChildId: filter === RECENT_FILTER ? childId : undefined,
			enabledForClinic: true,
		}),
	);

	const { data: categories } = useQuery(
		trpc.game.listCategories.queryOptions(),
	);
	const topLevelCategories = categories?.filter((c) => !c.parentId) ?? [];

	const { data: playHistory } = useQuery(
		trpc.game.playHistoryForChild.queryOptions({ childId }),
	);
	const historyByGame = new Map(playHistory?.map((h) => [h.gameId, h]));

	const handleFilterChange = (value: string | undefined) => {
		setFilter(value);
		setPage(1);
	};

	const handleOpenChange = (newOpen: boolean) => {
		if (!newOpen) {
			setSelectedGame(null);
		}
		onOpenChange(newOpen);
	};

	const handlePickGame = (game: GameItem) => {
		setSelectedGame(game);
		setInstructions("");
	};

	const handleBack = () => {
		setSelectedGame(null);
	};

	const handleSubmit = () => {
		if (!selectedGame) return;
		const latestVersion = selectedGame.versions[0];
		if (!latestVersion) return;

		onSelect({
			gameVersionId: latestVersion.id,
			gameName: selectedGame.name,
			instructions: instructions || undefined,
		});
		setSelectedGame(null);
	};

	if (selectedGame) {
		const latestVersion = selectedGame.versions[0];
		const selectedHistory = historyByGame.get(selectedGame.id);
		return (
			<Sheet open={open} onOpenChange={handleOpenChange}>
				<SheetContent
					side="right"
					className="flex w-full flex-col p-6 sm:w-[640px] sm:max-w-[640px]"
				>
					<SheetHeader className="flex-shrink-0 pr-6">
						<SheetTitle className="font-semibold text-base">
							Add Game to Session
						</SheetTitle>
						<SheetDescription className="flex items-center gap-2 pt-1 font-medium text-on-surface">
							<span>{selectedGame.name}</span>
							{latestVersion && (
								<span className="rounded bg-surface-container px-1.5 py-0.5 text-on-surface-variant text-xs">
									v{latestVersion.versionNumber}
								</span>
							)}
						</SheetDescription>
					</SheetHeader>

					<div className="flex-1 space-y-4 overflow-y-auto py-4 pr-1">
						<GamePreview key={selectedGame.id} game={selectedGame} />

						<div className="space-y-2">
							<div className="flex flex-wrap items-center gap-1.5">
								<Badge variant="secondary">{selectedGame.category.name}</Badge>
								{selectedGame.secondaryDomains.map((domain) => (
									<Badge key={domain} variant="outline">
										{domain}
									</Badge>
								))}
							</div>
							{selectedGame.description ? (
								<p className="text-on-surface text-sm">
									{selectedGame.description}
								</p>
							) : null}
							{selectedHistory ? (
								<p className="flex items-center gap-1.5 text-on-surface-variant text-xs">
									<History className="h-3.5 w-3.5" />
									{lastPlayedLabel(selectedHistory)} with this child
								</p>
							) : null}
						</div>

						<div className="space-y-4 border-t pt-4">
							<div className="space-y-2">
								<Label htmlFor="instructions">Instructions</Label>
								<Textarea
									id="instructions"
									placeholder="Special instructions or notes for this game..."
									rows={3}
									value={instructions}
									onChange={(e) => setInstructions(e.target.value)}
								/>
							</div>
						</div>
					</div>

					<div className="mt-auto flex flex-col gap-2 border-t pt-4">
						<Button onClick={handleSubmit}>Add Game</Button>
						<Button variant="outline" onClick={handleBack}>
							Back
						</Button>
					</div>
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetContent
				side="right"
				className="flex w-full flex-col p-6 sm:w-[640px] sm:max-w-[640px]"
			>
				<SheetHeader className="flex-shrink-0">
					<SheetTitle className="font-semibold text-base">
						Game Library
					</SheetTitle>
					<SheetDescription>Select a game for this session.</SheetDescription>
				</SheetHeader>

				<div className="space-y-3 py-4">
					<Input
						placeholder="Search by name or description..."
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
					/>
					<div className="flex flex-wrap gap-1.5">
						<FilterChip
							active={!filter}
							onClick={() => handleFilterChange(undefined)}
						>
							All
						</FilterChip>
						<FilterChip
							active={filter === RECENT_FILTER}
							onClick={() => handleFilterChange(RECENT_FILTER)}
						>
							<History className="h-3 w-3" />
							Recent for this child
						</FilterChip>
						{topLevelCategories.map((category) => (
							<FilterChip
								key={category.id}
								active={filter === category.id}
								onClick={() => handleFilterChange(category.id)}
							>
								{category.name}
							</FilterChip>
						))}
					</div>
				</div>

				<div className="flex-1 overflow-y-auto pr-1">
					{isLoading ? (
						<div className="space-y-3">
							{Array.from({ length: 5 }).map((_, i) => (
								<div
									key={i}
									className="flex items-center justify-between rounded-xl border p-4"
								>
									<div className="flex-1 space-y-2">
										<div className="h-5 w-48 animate-pulse rounded bg-muted" />
										<div className="h-4 w-72 animate-pulse rounded bg-muted" />
									</div>
									<div className="ml-4 h-8 w-24 animate-pulse rounded bg-muted" />
								</div>
							))}
						</div>
					) : data?.items.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<Gamepad2 className="mb-4 h-10 w-10 text-on-surface-variant" />
							<p className="text-on-surface-variant text-sm">
								{filter === RECENT_FILTER
									? "This child has not played any games yet."
									: "No games found."}
							</p>
						</div>
					) : (
						<div className="space-y-3">
							{data?.items.map((game) => {
								const history = historyByGame.get(game.id);
								return (
									<button
										type="button"
										key={game.id}
										onClick={() => handlePickGame(game)}
										className="flex w-full items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 text-left transition-all hover:border-brown-400"
									>
										<GameThumbnail
											name={game.name}
											categoryName={game.category.name}
										/>
										<div className="min-w-0 flex-1 space-y-1.5">
											<div className="flex items-center gap-2">
												<h4 className="truncate font-semibold text-on-surface">
													{game.name}
												</h4>
												{game.previewPath ? (
													<PlayCircle
														aria-label="Preview available"
														className="h-4 w-4 flex-shrink-0 text-on-surface-variant"
													/>
												) : null}
											</div>
											<div className="flex flex-wrap items-center gap-1.5">
												<Badge variant="secondary">{game.category.name}</Badge>
												{game.secondaryDomains.map((domain) => (
													<Badge key={domain} variant="outline">
														{domain}
													</Badge>
												))}
											</div>
											{game.description ? (
												<p className="line-clamp-2 text-muted-foreground text-xs">
													{game.description}
												</p>
											) : null}
											{history ? (
												<Badge variant="success">
													<History />
													{lastPlayedLabel(history)}
												</Badge>
											) : null}
										</div>
									</button>
								);
							})}
						</div>
					)}
				</div>

				{data && data.totalPages > 1 && (
					<div className="flex items-center justify-center gap-2 py-4">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
						>
							Previous
						</Button>
						<span className="text-on-surface-variant text-sm">
							Page {page} of {data.totalPages}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage((p) => p + 1)}
							disabled={page >= data.totalPages}
						>
							Next
						</Button>
					</div>
				)}

				<div className="mt-auto flex flex-col gap-2 border-t pt-4">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}
