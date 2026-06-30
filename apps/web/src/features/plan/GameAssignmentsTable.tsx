import { Button } from "@haber-final/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@haber-final/ui/components/table";

type GameAssignment = {
	id: string;
	gameVersion: { game: { name: string }; versionNumber: string };
	durationSeconds: number | null;
	repetitions: number | null;
	frequencyPerWeek: number | null;
	appliesToPhase: string | null;
};

type GameAssignmentsTableProps = {
	assignments?: GameAssignment[];
	onEdit: (assignmentId: string) => void;
	onRemove: (assignmentId: string) => void;
	onAddGame: () => void;
	isLoading?: boolean;
};

export function GameAssignmentsTable({
	assignments = [],
	onEdit,
	onRemove,
	onAddGame,
	isLoading,
}: GameAssignmentsTableProps) {
	if (isLoading) return null;

	return (
		<div className="overflow-hidden rounded-xl border border-surface-container-highest bg-surface-container-lowest shadow-sm">
			<div className="flex items-center justify-between border-surface-container-highest border-b bg-surface-container-low/50 p-4">
				<h2 className="flex items-center gap-2 font-medium text-on-surface">
					<span className="material-symbols-outlined text-primary">
						videogame_asset
					</span>
					Game Assignments
				</h2>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={onAddGame}
					className="text-primary"
				>
					<span className="material-symbols-outlined text-sm">add</span>
					Add Game
				</Button>
			</div>
			<div className="overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow className="border-surface-container-highest border-b bg-surface-container-low">
							<TableHead className="text-xs uppercase">Game Name</TableHead>
							<TableHead className="text-xs uppercase">Ver</TableHead>
							<TableHead className="text-xs uppercase">Duration</TableHead>
							<TableHead className="text-xs uppercase">Reps/Wk</TableHead>
							<TableHead className="text-xs uppercase">Phase</TableHead>
							<TableHead className="text-right text-xs uppercase">
								Actions
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody className="divide-y divide-surface-container-highest">
						{assignments.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={6}
									className="py-8 text-center text-on-surface-variant"
								>
									No games assigned. Click "Add Game" to assign games to this
									plan.
								</TableCell>
							</TableRow>
						) : (
							assignments.map((assignment) => (
								<TableRow
									key={assignment.id}
									className="group transition-colors hover:bg-surface-bright"
								>
									<TableCell>
										<div className="flex items-center gap-3">
											<div className="flex h-10 w-10 items-center justify-center rounded bg-brown-100 text-brown-600">
												<span className="material-symbols-outlined">
													extension
												</span>
											</div>
											<span className="font-medium text-on-surface text-sm">
												{assignment.gameVersion.game.name}
											</span>
										</div>
									</TableCell>
									<TableCell className="text-on-surface-variant text-sm">
										{assignment.gameVersion.versionNumber}
									</TableCell>
									<TableCell className="text-on-surface-variant text-sm">
										{assignment.durationSeconds
											? `${Math.round(assignment.durationSeconds / 60)} min`
											: "—"}
									</TableCell>
									<TableCell className="text-on-surface-variant text-sm">
										{assignment.frequencyPerWeek
											? `${assignment.frequencyPerWeek}x`
											: "—"}
									</TableCell>
									<TableCell>
										{assignment.appliesToPhase ? (
											<span className="rounded bg-secondary-container px-2 py-0.5 font-medium text-on-secondary-container text-xs">
												{assignment.appliesToPhase}
											</span>
										) : (
											<span className="text-on-surface-variant text-xs">—</span>
										)}
									</TableCell>
									<TableCell className="text-right">
										<div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => onEdit(assignment.id)}
											>
												<span className="material-symbols-outlined text-lg">
													edit
												</span>
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => onRemove(assignment.id)}
												className="text-danger hover:text-danger"
											>
												<span className="material-symbols-outlined text-lg">
													delete
												</span>
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
					{assignments.length > 0 && (
						<tfoot className="bg-surface-container-low">
							<TableRow>
								<TableCell
									colSpan={2}
									className="text-right font-medium text-on-surface text-sm"
								>
									Total Duration:
								</TableCell>
								<TableCell className="font-bold text-sm text-warning">
									{Math.round(
										assignments.reduce(
											(sum, a) => sum + (a.durationSeconds ?? 0),
											0,
										) / 60,
									)}{" "}
									min
								</TableCell>
								<TableCell colSpan={3} />
							</TableRow>
						</tfoot>
					)}
				</Table>
			</div>
		</div>
	);
}
