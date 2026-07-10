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
import { useQuery } from "@tanstack/react-query";
import { Gamepad2 } from "lucide-react";
import { useState } from "react";
import type { GameItem } from "@/components/game-library/GameCard";
import { trpc } from "@/utils/trpc";

type GameAssignmentData = {
	gameVersionId: string;
	durationSeconds?: number;
	repetitions?: number;
	frequencyPerWeek?: number;
	instructions?: string;
	appliesToPhase?: string;
};

type GameLibraryBrowserSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelectGame: (data: GameAssignmentData) => void;
};

type FormState = {
	durationMinutes: string;
	repetitions: string;
	frequencyPerWeek: string;
	phase: string;
	instructions: string;
};

export function GameLibraryBrowserSheet({
	open,
	onOpenChange,
	onSelectGame,
}: GameLibraryBrowserSheetProps) {
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);
	const [form, setForm] = useState<FormState>({
		durationMinutes: "",
		repetitions: "",
		frequencyPerWeek: "",
		phase: "",
		instructions: "",
	});

	const { data, isLoading } = useQuery(
		trpc.game.list.queryOptions({
			page,
			pageSize: 12,
			search: search || undefined,
			enabledForClinic: true,
		}),
	);

	const handleOpenChange = (newOpen: boolean) => {
		if (!newOpen) {
			setSelectedGame(null);
		}
		onOpenChange(newOpen);
	};

	const handlePinToPlan = (game: GameItem) => {
		setSelectedGame(game);
		setForm({
			durationMinutes: "",
			repetitions: "",
			frequencyPerWeek: "",
			phase: "",
			instructions: "",
		});
	};

	const handleBack = () => {
		setSelectedGame(null);
	};

	const handleSubmit = () => {
		if (!selectedGame) return;
		const latestVersion = selectedGame.versions[0];
		if (!latestVersion) return;

		onSelectGame({
			gameVersionId: latestVersion.id,
			durationSeconds: form.durationMinutes
				? Number.parseInt(form.durationMinutes, 10) * 60
				: undefined,
			repetitions: form.repetitions
				? Number.parseInt(form.repetitions, 10)
				: undefined,
			frequencyPerWeek: form.frequencyPerWeek
				? Number.parseInt(form.frequencyPerWeek, 10)
				: undefined,
			instructions: form.instructions || undefined,
			appliesToPhase: form.phase || undefined,
		});
		setSelectedGame(null);
	};

	const handleInputChange = (field: keyof FormState, value: string) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	if (selectedGame) {
		const latestVersion = selectedGame.versions[0];
		return (
			<Sheet open={open} onOpenChange={handleOpenChange}>
				<SheetContent
					side="right"
					className="flex w-full flex-col p-6 sm:w-[520px] sm:max-w-[520px]"
				>
					<SheetHeader className="flex-shrink-0 pr-6">
						<SheetTitle className="font-semibold text-base">
							Add Game to Plan
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
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="duration">
									Duration <span className="text-danger">*</span>
								</Label>
								<div className="flex items-center gap-2">
									<Input
										id="duration"
										type="number"
										min={1}
										placeholder="e.g., 15"
										value={form.durationMinutes}
										onChange={(e) =>
											handleInputChange("durationMinutes", e.target.value)
										}
										className="flex-1"
									/>
									<span className="text-on-surface-variant text-sm">
										minutes
									</span>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="repetitions">Repetitions</Label>
									<Input
										id="repetitions"
										type="number"
										min={1}
										placeholder="e.g., 3"
										value={form.repetitions}
										onChange={(e) =>
											handleInputChange("repetitions", e.target.value)
										}
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="frequency">Frequency / Week</Label>
									<Input
										id="frequency"
										type="number"
										min={1}
										placeholder="e.g., 2"
										value={form.frequencyPerWeek}
										onChange={(e) =>
											handleInputChange("frequencyPerWeek", e.target.value)
										}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="phase">Phase</Label>
								<Input
									id="phase"
									placeholder="e.g., Phase 1, Introduction"
									value={form.phase}
									onChange={(e) => handleInputChange("phase", e.target.value)}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="instructions">Instructions</Label>
								<Textarea
									id="instructions"
									placeholder="Special instructions or notes for this game..."
									rows={3}
									value={form.instructions}
									onChange={(e) =>
										handleInputChange("instructions", e.target.value)
									}
								/>
							</div>
						</div>
					</div>

					<div className="mt-auto flex flex-col gap-2 border-t pt-4">
						<Button onClick={handleSubmit} disabled={!form.durationMinutes}>
							Add to Plan
						</Button>
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
				className="flex w-full flex-col p-6 sm:w-[520px] sm:max-w-[520px]"
			>
				<SheetHeader className="flex-shrink-0">
					<SheetTitle className="font-semibold text-base">
						Game Library
					</SheetTitle>
					<SheetDescription>
						Select a game to add to this plan.
					</SheetDescription>
				</SheetHeader>

				<div className="py-4">
					<Input
						placeholder="Search games..."
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
					/>
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
							<p className="text-on-surface-variant text-sm">No games found.</p>
						</div>
					) : (
						<div className="space-y-3">
							{data?.items.map((game) => (
								<div
									key={game.id}
									className="flex flex-col justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition-all hover:border-brown-400 sm:flex-row sm:items-center"
								>
									<div className="flex-1 space-y-1.5">
										<div className="flex flex-wrap items-center gap-2">
											<h4 className="font-semibold text-on-surface">
												{game.name}
											</h4>
											<Badge variant="secondary" className="text-xs">
												Level {game.difficulty || "N/A"}
											</Badge>
											{game.ageRangeMin !== null &&
											game.ageRangeMax !== null ? (
												<Badge variant="outline" className="text-xs">
													Ages {game.ageRangeMin}-{game.ageRangeMax}
												</Badge>
											) : null}
										</div>
										{game.targetIssues && game.targetIssues.length > 0 ? (
											<div className="flex flex-wrap gap-1">
												{game.targetIssues.map((issue) => (
													<Badge
														key={issue}
														variant="outline"
														className="px-1.5 py-0 text-[11px]"
													>
														{issue}
													</Badge>
												))}
											</div>
										) : null}
										{game.description ? (
											<p className="line-clamp-2 text-muted-foreground text-xs">
												{game.description}
											</p>
										) : null}
									</div>
									<div className="flex-shrink-0">
										<Button
											size="sm"
											onClick={() => handlePinToPlan(game)}
											className="w-full sm:w-auto"
										>
											Pin to Plan
										</Button>
									</div>
								</div>
							))}
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
