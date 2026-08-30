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
		});
	};

	if (!assignment) return null;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="flex w-full flex-col p-6 sm:w-[480px] sm:max-w-[480px]"
			>
				<SheetHeader className="flex-shrink-0 pr-6">
					<SheetTitle className="font-semibold text-base">
						Edit Game Assignment
					</SheetTitle>
					<SheetDescription className="flex items-center gap-2 pt-1 font-medium text-on-surface">
						<span>{assignment.gameVersion.game.name}</span>
						<span className="rounded bg-surface-container px-1.5 py-0.5 text-on-surface-variant text-xs">
							v{assignment.gameVersion.versionNumber}
						</span>
					</SheetDescription>
				</SheetHeader>

				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="mt-4 flex flex-1 flex-col overflow-hidden"
				>
					<div className="flex-1 space-y-4 overflow-y-auto py-1 pr-1">
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
							<Label htmlFor="frequencyPerWeek">Frequency / Week</Label>
							<Input
								id="frequencyPerWeek"
								type="number"
								min={1}
								placeholder="e.g., 2"
								{...form.register("frequencyPerWeek", { valueAsNumber: true })}
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
					</div>

					<div className="mt-auto flex flex-shrink-0 flex-col gap-2 border-t pt-4">
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
