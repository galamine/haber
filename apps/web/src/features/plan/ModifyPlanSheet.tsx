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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag, Gamepad2 } from "lucide-react";
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
		goals?: Goal[];
		gameAssignments?: GameAssignment[];
	};
	onSuccess: (newPlanId: string) => void;
};

export function ModifyPlanSheet({
	open,
	onOpenChange,
	plan: { goals = [], gameAssignments = [], ...plan },
	onSuccess,
}: ModifyPlanSheetProps) {
	const queryClient = useQueryClient();
	const form = useForm<ModifyPlanFormValues>({
		resolver: zodResolver(ModifyPlanFormSchema),
		defaultValues: {
			changes: { name: plan.name },
			goalDecisions: goals.map((g) => ({
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
				queryClient.invalidateQueries({
					queryKey: trpc.plan.get.queryOptions({ planId: plan.id }).queryKey,
				});
				queryClient.invalidateQueries({
					queryKey: trpc.plan.list.queryOptions().queryKey,
				});
				onOpenChange(false);
				onSuccess(newPlan.id);
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="flex w-full flex-col p-6 sm:w-[640px] sm:max-w-[640px]"
			>
				<SheetHeader className="flex-shrink-0">
					<SheetTitle className="font-semibold text-base">
						Modify Treatment Plan
					</SheetTitle>
					<SheetDescription>
						Update goals and game assignments for the upcoming period.
					</SheetDescription>
				</SheetHeader>
				<form
					onSubmit={form.handleSubmit((v) =>
						modify.mutate({ planId: plan.id, ...v }),
					)}
					className="mt-4 flex flex-1 flex-col overflow-hidden"
				>
					<div className="flex-1 space-y-6 overflow-y-auto py-1 pr-1">
						<div className="space-y-4">
							<h3 className="flex items-center gap-2 font-semibold text-on-background">
								<Flag className="h-5 w-5 text-brown-500" />
								Clinical Goals
							</h3>
							<div className="space-y-3">
								{goalFields.map((field, idx) => {
									const goal = goals.find((g) => g.id === field.goalId);
									const action = form.watch(`goalDecisions.${idx}.action`);

									return (
										<div
											key={field.id}
											className="space-y-3 rounded-lg border bg-surface-container-lowest p-4"
										>
											<div className="flex items-start justify-between gap-4">
												<div>
													<p className="font-medium text-on-surface text-sm">
														{goal?.description ?? "Unknown Goal"}
													</p>
													<p className="text-on-surface-variant text-xs">
														Target: {goal?.targetAttainmentPct}%
													</p>
												</div>
												<div className="flex gap-1">
													{(["MAINTAIN", "MODIFY", "DISCONTINUE"] as const).map(
														(act) => (
															<Button
																key={act}
																type="button"
																size="sm"
																variant={action === act ? "default" : "outline"}
																className="text-xs"
																onClick={() =>
																	form.setValue(
																		`goalDecisions.${idx}.action`,
																		act,
																	)
																}
															>
																{act}
															</Button>
														),
													)}
												</div>
											</div>

											{action === "MODIFY" && (
												<div className="space-y-2 border-t pt-2">
													<Textarea
														placeholder="Updated goal description…"
														{...form.register(
															`goalDecisions.${idx}.newDescription`,
														)}
														className="text-sm"
													/>
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>

						<div className="space-y-4">
							<h3 className="flex items-center gap-2 font-semibold text-on-background">
								<Gamepad2 className="h-5 w-5 text-brown-500" />
								Game Assignments
							</h3>
							<p className="text-on-surface-variant text-sm">
								{gameAssignments.length} game(s) assigned. Games are copied to
								the new version.
							</p>
						</div>
					</div>

					<div className="mt-auto flex flex-shrink-0 flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end">
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
