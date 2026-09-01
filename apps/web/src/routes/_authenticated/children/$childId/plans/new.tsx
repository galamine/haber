import { Button } from "@haber-final/ui/components/button";
import { Input } from "@haber-final/ui/components/input";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sparkles } from "lucide-react";

import { usePlanData } from "@/features/plan/use-plan-data";
import { PlanFormSchema, type PlanFormValues } from "@/features/plan/schema";
import { NO_PRESET_ID, PRESET_ICONS } from "@/features/plan/constants";
import { PresetCard } from "@/features/plan/PresetCard";
import { CustomGoalsSection } from "@/features/plan/CustomGoalsSection";
import { PresetGoalsPreview } from "@/features/plan/PresetGoalsPreview";
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

	const form = useForm<z.input<typeof PlanFormSchema>>({
		resolver: zodResolver(PlanFormSchema),
		defaultValues: {
			childId,
			name: "",
			programLengthWeeks: 12,
			sessionDurationMinutes: 60,
			targetMilestones: [],
			customGoals: { short_term: [], long_term: [] },
		},
	});

	const create = useMutation(trpc.plan.create.mutationOptions({
		onSuccess: (plan, variables) => {
			if (variables.publish) {
				navigate({ to: "/children/$childId/plans/$planId", params: { childId, planId: plan.id } });
			} else {
				navigate({ to: "/children/$childId/plans", params: { childId } });
			}
		},
		onError: (err) => toast.error(err.message),
	}));

	const selectedPresetId = form.watch("presetId");
	const selectedPreset = presets.data?.find(p => p.preset_id === selectedPresetId);

	return (
		<div className="space-y-6 p-8">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="font-bold text-2xl text-on-surface tracking-tight sm:text-3xl">Create Treatment Plan</h1>
					<p className="mt-1 text-on-surface-variant text-sm">Design a comprehensive, phase-based intervention strategy.</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={form.handleSubmit((v: z.input<typeof PlanFormSchema>) => create.mutate({ ...v, publish: false }))} disabled={create.isPending}>
						Save Draft
					</Button>
					<Button onClick={form.handleSubmit((v: z.input<typeof PlanFormSchema>) => create.mutate({ ...v, publish: true }))} disabled={create.isPending}>
						{create.isPending ? "Creating…" : "Publish Plan"}
					</Button>
				</div>
			</div>

			<div>
				<h3 className="mb-4 flex items-center gap-2 font-medium text-on-background">
					<Sparkles className="h-5 w-5 text-brown-600" />
					Start with a Preset Template
				</h3>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
					<PresetCard
						key={NO_PRESET_ID}
						preset={{
							preset_id: NO_PRESET_ID,
							case_label: "No Preset",
							description: "Start from scratch and define your own goals.",
						}}
						icon="Plus"
						selected={!selectedPresetId}
						onSelect={() => {
							form.setValue("presetId", undefined);
							form.setValue("sessionDurationMinutes", 60);
							form.setValue("name", "");
						}}
					/>
					{(presets.data ?? []).map(preset => (
						<PresetCard
							key={preset.preset_id}
							preset={{
								preset_id: preset.preset_id,
								case_label: preset.case_label,
								description: preset.presenting_concerns,
							}}
							icon={PRESET_ICONS[preset.preset_id] ?? "Activity"}
							selected={selectedPresetId === preset.preset_id}
							onSelect={(id) => {
								form.setValue("presetId", id);
								form.setValue("sessionDurationMinutes", preset.session_duration_minutes);
								form.setValue("name", preset.case_label);
							}}
						/>
					))}
				</div>
			</div>

			{selectedPresetId
				? (selectedPreset && <PresetGoalsPreview preset={selectedPreset} />)
				: <CustomGoalsSection form={form} />}

			<div className="mx-auto w-full max-w-3xl">
				<SectionCard title="Plan Details" description="Core information for this treatment plan.">
					<FieldWrapper label="Plan Name" className="md:col-span-2" error={form.formState.errors.name?.message as string}>
						<Input {...form.register("name")} placeholder="e.g., Intensive Communication Protocol" />
					</FieldWrapper>
					<FieldWrapper label="Length (Weeks)" error={form.formState.errors.programLengthWeeks?.message as string}>
						<Input {...form.register("programLengthWeeks", { valueAsNumber: true })} type="number" min={1} max={52} />
					</FieldWrapper>
					<FieldWrapper label="Session Duration (Min)" error={form.formState.errors.sessionDurationMinutes?.message as string}>
						<Input {...form.register("sessionDurationMinutes", { valueAsNumber: true })} type="number" min={15} step={15} />
					</FieldWrapper>
					<FieldWrapper label="Target Start Date" className="md:col-span-2">
						<Input {...form.register("startDate", { valueAsDate: true })} type="date" />
					</FieldWrapper>
				</SectionCard>
			</div>
		</div>
	);
}
