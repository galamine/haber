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
import { Cpu, Gamepad2, SearchX } from "lucide-react";
import { useState } from "react";
import type { GameItem } from "@/components/game-library/GameCard";
import { GameCard, GameCardSkeleton } from "@/components/game-library/GameCard";
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
	};

	const handleInputChange = (field: keyof FormState, value: string) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	if (selectedGame) {
		const latestVersion = selectedGame.versions[0];
		return (
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
					<SheetHeader>
						<SheetTitle>Add Game to Plan</SheetTitle>
						<SheetDescription>
							Configure settings for {selectedGame.name}
							{latestVersion && ` (v${latestVersion.versionNumber})`}
						</SheetDescription>
					</SheetHeader>

					<div className="flex-1 space-y-6 overflow-y-auto py-6">
						<div className="rounded-lg border bg-surface-container-low p-4">
							<div className="flex items-center gap-3">
								<div className="flex h-12 w-12 items-center justify-center rounded bg-brown-100 text-brown-600">
									<Cpu className="h-6 w-6" />
								</div>
								<div>
									<h3 className="font-semibold text-on-surface">
										{selectedGame.name}
									</h3>
									{latestVersion && (
										<p className="text-on-surface-variant text-sm">
											Version {latestVersion.versionNumber}
										</p>
									)}
								</div>
							</div>
						</div>

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
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>Game Library</SheetTitle>
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

				<div className="flex-1 overflow-y-auto">
					{isLoading ? (
						<div className="grid grid-cols-2 gap-4">
							{Array.from({ length: 6 }).map((_, i) => (
								<GameCardSkeleton key={i} />
							))}
						</div>
					) : data?.items.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<Gamepad2 className="mb-4 h-10 w-10 text-on-surface-variant" />
							<p className="text-on-surface-variant text-sm">No games found.</p>
						</div>
					) : (
						<div className="grid grid-cols-2 gap-4">
							{data?.items.map((game) => (
								<div key={game.id} className="relative">
									<GameCard
										game={game}
										onViewDetails={() => handlePinToPlan(game)}
									/>
									<Button
										size="sm"
										className="absolute right-2 bottom-2"
										onClick={() => handlePinToPlan(game)}
									>
										Pin to Plan
									</Button>
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
