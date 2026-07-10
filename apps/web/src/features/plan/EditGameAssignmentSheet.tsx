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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";

type GameAssignment = {
	id: string;
	gameVersion: { game: { name: string }; versionNumber: string };
	durationSeconds: number | null;
	repetitions: number | null;
	frequencyPerWeek: number | null;
	instructions: string | null;
	appliesToPhase: string | null;
};

type EditGameAssignmentSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	assignment: GameAssignment | null;
	planId: string;
};

type FormValues = {
	durationMinutes: number | null;
	repetitions: number | null;
	frequencyPerWeek: number | null;
	instructions: string;
	appliesToPhase: string;
};

export function EditGameAssignmentSheet({
	open,
	onOpenChange,
	assignment,
	planId,
}: EditGameAssignmentSheetProps) {
	const queryClient = useQueryClient();
	const form = useForm<FormValues>({
		defaultValues: {
			durationMinutes: null,
			repetitions: null,
			frequencyPerWeek: null,
			instructions: "",
			appliesToPhase: "",
		},
	});

	useEffect(() => {
		if (assignment) {
			form.reset({
				durationMinutes: assignment.durationSeconds
					? Math.round(assignment.durationSeconds / 60)
					: null,
				repetitions: assignment.repetitions,
				frequencyPerWeek: assignment.frequencyPerWeek,
				instructions: assignment.instructions ?? "",
				appliesToPhase: assignment.appliesToPhase ?? "",
			});
		}
	}, [assignment, form]);

	const updateGame = useMutation(
		trpc.plan.updateGame.mutationOptions({
			onSuccess: () => {
				toast.success("Game assignment updated");
				queryClient.invalidateQueries({
					queryKey: trpc.plan.get.queryOptions({ planId }).queryKey,
				});
				queryClient.invalidateQueries({
					queryKey: trpc.plan.checkSessionDuration.queryOptions({ planId })
						.queryKey,
				});
				onOpenChange(false);
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const onSubmit = (values: FormValues) => {
		if (!assignment) return;
		updateGame.mutate({
			assignmentId: assignment.id,
			durationSeconds: values.durationMinutes
				? values.durationMinutes * 60
				: undefined,
			repetitions: values.repetitions ?? undefined,
			frequencyPerWeek: values.frequencyPerWeek ?? undefined,
			instructions: values.instructions || undefined,
			appliesToPhase: values.appliesToPhase || undefined,
		});
	};

	if (!assignment) return null;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="overflow-y-auto sm:max-w-md">
				<SheetHeader>
					<SheetTitle>Edit Game Assignment</SheetTitle>
					<SheetDescription>
						{assignment.gameVersion.game.name} (v
						{assignment.gameVersion.versionNumber})
					</SheetDescription>
				</SheetHeader>

				<form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
					<div className="space-y-2">
						<Label htmlFor="durationMinutes">Duration (minutes)</Label>
						<Input
							id="durationMinutes"
							type="number"
							min={1}
							placeholder="e.g., 15"
							{...form.register("durationMinutes", { valueAsNumber: true })}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="repetitions">Repetitions</Label>
						<Input
							id="repetitions"
							type="number"
							min={1}
							placeholder="e.g., 3"
							{...form.register("repetitions", { valueAsNumber: true })}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="frequencyPerWeek">Frequency per Week</Label>
						<Input
							id="frequencyPerWeek"
							type="number"
							min={1}
							placeholder="e.g., 2"
							{...form.register("frequencyPerWeek", { valueAsNumber: true })}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="appliesToPhase">Phase</Label>
						<Input
							id="appliesToPhase"
							placeholder="e.g., Phase 1"
							{...form.register("appliesToPhase")}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="instructions">Instructions</Label>
						<Textarea
							id="instructions"
							placeholder="Special instructions for this game..."
							rows={3}
							{...form.register("instructions")}
						/>
					</div>

					<div className="flex flex-col gap-2 pt-4">
						<Button type="submit" disabled={updateGame.isPending}>
							{updateGame.isPending ? "Saving…" : "Save Changes"}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
					</div>
				</form>
			</SheetContent>
		</Sheet>
	);
}
