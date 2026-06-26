import { Button } from "@haber-final/ui/components/button";
import { Input } from "@haber-final/ui/components/input";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";

import { usePlanData } from "@/features/plan/use-plan-data";
import { PlanFormSchema, type PlanFormValues } from "@/features/plan/schema";
import { PRESET_CARDS } from "@/features/plan/constants";
import { PresetCard } from "@/features/plan/PresetCard";
import { PhaseBuilder } from "@/features/plan/PhaseBuilder";
import { SectionCard } from "@/features/assessment/SectionCard";
import { FieldWrapper } from "@/features/assessment/FieldWrapper";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/children/$childId/plans/new")({
	component: NewPlanPage,
});

function NewPlanPage() {
	const { childId } = Route.useParams();
	const navigate = useNavigate();
	const { presets } = usePlanData({ childId });

	const form = useForm<PlanFormValues>({
		resolver: zodResolver(PlanFormSchema),
		defaultValues: { childId, name: "", programLengthWeeks: 12, sessionDurationMinutes: 60, phases: [], targetMilestones: [] },
	});

	const create = useMutation(trpc.plan.create.mutationOptions({
		onSuccess: (plan) => navigate({ to: "/children/$childId/plans/$planId", params: { childId, planId: plan.id } }),
		onError: (err) => toast.error(err.message),
	}));

	const selectedPresetId = form.watch("presetId");

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="font-bold text-on-background">Create Treatment Plan</h1>
					<p className="text-on-surface-variant text-sm">Design a comprehensive, phase-based intervention strategy.</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline">Save Draft</Button>
					<Button onClick={form.handleSubmit(v => create.mutate(v))} disabled={create.isPending}>
						{create.isPending ? "Creating…" : "Publish Plan"}
					</Button>
				</div>
			</div>

			<div>
				<h3 className="font-medium text-on-background mb-3 flex items-center gap-2">
					<span className="material-symbols-outlined text-brown-600">auto_awesome</span>
					Start with a Preset Template
				</h3>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
					{PRESET_CARDS.map(preset => (
						<PresetCard
							key={preset.preset_id}
							preset={preset}
							selected={selectedPresetId === preset.preset_id}
							onSelect={(id) => {
								form.setValue("presetId", id);
								const found = presets.data?.find(p => p.preset_id === id);
								if (found) {
									form.setValue("sessionDurationMinutes", found.session_duration_minutes);
									form.setValue("name", found.case_label);
									form.setValue("phases", found.session_structure.map(s => ({ phase: s.phase, weeks: s.minutes, label: s.label })));
								}
							}}
						/>
					))}
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				<div className="lg:col-span-5">
					<SectionCard title="Plan Details">
						<div className="space-y-4">
							<FieldWrapper label="Plan Name" error={form.formState.errors.name?.message}>
								<Input {...form.register("name")} placeholder="e.g., Intensive Communication Protocol" />
							</FieldWrapper>
							<div className="grid grid-cols-2 gap-4">
								<FieldWrapper label="Length (Weeks)" error={form.formState.errors.programLengthWeeks?.message}>
									<Input {...form.register("programLengthWeeks", { valueAsNumber: true })} type="number" min={1} max={52} />
								</FieldWrapper>
								<FieldWrapper label="Session Duration (Min)" error={form.formState.errors.sessionDurationMinutes?.message}>
									<Input {...form.register("sessionDurationMinutes", { valueAsNumber: true })} type="number" min={15} step={15} />
								</FieldWrapper>
							</div>
							<FieldWrapper label="Target Start Date">
								<Input {...form.register("startDate", { valueAsDate: true })} type="date" />
							</FieldWrapper>
						</div>
					</SectionCard>
				</div>

				<div className="lg:col-span-7">
					<SectionCard
						title="Phase Builder"
						description="Break down the treatment into chronological stages."
						action={
							<Button type="button" variant="ghost" size="sm" onClick={() => {
								const phases = form.getValues("phases") ?? [];
								form.setValue("phases", [...phases, { phase: `phase_${Date.now()}`, weeks: 4, label: `Phase ${phases.length + 1}` }]);
							}}>
								<span className="material-symbols-outlined text-sm">add_circle</span>
								Add Phase
							</Button>
						}
					>
						<PhaseBuilder form={form} />
					</SectionCard>
				</div>
			</div>
		</div>
	);
}
