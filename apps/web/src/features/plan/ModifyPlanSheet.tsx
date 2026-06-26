import { Button } from "@haber-final/ui/components/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@haber-final/ui/components/sheet";
import { Textarea } from "@haber-final/ui/components/textarea";
import { cn } from "@haber-final/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import { ModifyPlanFormSchema, type ModifyPlanFormValues } from "./schema";
import type { GameAssignment, Goal } from "./types";

type ModifyPlanSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	plan: {
		id: string;
		name: string;
		goals: Goal[];
		gameAssignments: GameAssignment[];
	};
	onSuccess: (newPlanId: string) => void;
};

export function ModifyPlanSheet({
	open,
	onOpenChange,
	plan,
	onSuccess,
}: ModifyPlanSheetProps) {
	const form = useForm<ModifyPlanFormValues>({
		resolver: zodResolver(ModifyPlanFormSchema),
		defaultValues: {
			changes: { name: plan.name },
			goalDecisions: plan.goals.map((g) => ({
				goalId: g.id,
				action: "CARRY_OVER" as const,
			})),
		},
	});

	const { fields: goalFields } = useFieldArray({
		control: form.control,
		name: "goalDecisions",
	});

	const modify = useMutation(
		trpc.plan.modify.mutationOptions({
			onSuccess: (newPlan) => {
				toast.success("Plan modified — new version created");
				trpc.plan.get.invalidate({ planId: plan.id });
				trpc.plan.list.invalidate();
				onOpenChange(false);
				onSuccess(newPlan.id);
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="overflow-y-auto sm:max-w-2xl">
				<SheetHeader>
					<SheetTitle>Modify Treatment Plan</SheetTitle>
					<SheetDescription>
						Update goals and game assignments for the upcoming period.
					</SheetDescription>
				</SheetHeader>
				<form
					onSubmit={form.handleSubmit((v) =>
						modify.mutate({ planId: plan.id, ...v }),
					)}
					className="mt-6 space-y-6"
				>
					<div className="space-y-4">
						<h3 className="flex items-center gap-2 font-semibold text-on-background">
							<span className="material-symbols-outlined text-brown-500">
								flag
							</span>
							Clinical Goals
						</h3>
						<div className="space-y-3">
							{goalFields.map((field, idx) => {
								const goal = plan.goals.find((g) => g.id === field.goalId);
								const action = form.watch(`goalDecisions.${idx}.action`);
								return (
									<div
										key={field.id}
										className={cn(
											"rounded-lg border p-4",
											action === "MODIFY"
												? "border-primary-container bg-surface-container-low ring-1 ring-primary-container"
												: "border-border bg-surface",
										)}
									>
										<div className="mb-3 flex items-start justify-between gap-3">
											<div>
												<span className="mb-1 inline-block rounded bg-surface-container px-2 py-0.5 font-medium text-on-surface-variant text-xs">
													Goal {idx + 1}
												</span>
												<p className="font-medium text-on-background text-sm">
													{goal?.description}
												</p>
											</div>
										</div>
										<div className="flex items-center gap-4">
											<label className="flex cursor-pointer items-center gap-2">
												<input
													type="radio"
													{...form.register(`goalDecisions.${idx}.action`)}
													value="CARRY_OVER"
													className="text-primary"
												/>
												<span className="text-sm">Continue</span>
											</label>
											<label className="flex cursor-pointer items-center gap-2">
												<input
													type="radio"
													{...form.register(`goalDecisions.${idx}.action`)}
													value="MODIFY"
													className="text-primary"
												/>
												<span className="text-sm">Modify</span>
											</label>
											<label className="flex cursor-pointer items-center gap-2">
												<input
													type="radio"
													{...form.register(`goalDecisions.${idx}.action`)}
													value="CLOSE"
													className="text-primary"
												/>
												<span className="text-sm">Discontinue</span>
											</label>
										</div>
										{action === "MODIFY" && (
											<div className="mt-3 border-outline-variant border-t pt-3">
												<p className="mb-2 font-semibold text-primary text-xs uppercase tracking-wider">
													Modified Goal Description
												</p>
												<Textarea
													{...form.register(
														`goalDecisions.${idx}.newDescription`,
													)}
													placeholder="Describe modification..."
													rows={2}
												/>
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>

					<div className="space-y-3">
						<h3 className="flex items-center gap-2 font-semibold text-on-background">
							<span className="material-symbols-outlined text-brown-500">
								videogame_asset
							</span>
							Games
						</h3>
						<p className="text-on-surface-variant text-sm">
							{plan.gameAssignments.length} game(s) assigned. Games are copied
							to the new version.
						</p>
					</div>

					<div className="flex flex-col gap-2 sm:flex-row">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={modify.isPending}>
							{modify.isPending ? "Saving…" : "Save Changes"}
						</Button>
					</div>
				</form>
			</SheetContent>
		</Sheet>
	);
}
