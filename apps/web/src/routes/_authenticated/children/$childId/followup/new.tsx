import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@haber-final/ui/components/alert-dialog";
import { Button } from "@haber-final/ui/components/button";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useBlocker, useRouter } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FieldErrors } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AIAssistPanel, recordingManager } from "@/features/ai-assist";
import {
	FOLLOWUP_TABS,
	type FollowUpTabValue,
} from "@/features/followup/constants";
import { FollowUpTabsShell } from "@/features/followup/FollowUpTabsShell";
import {
	buildFollowUpDefaultValues,
	FOLLOWUP_EMPTY_DEFAULTS,
	FollowUpFormSchema,
	type FollowUpFormValues,
} from "@/features/followup/schema";
import { SectionA } from "@/features/followup/sections/SectionA";
import { SectionB } from "@/features/followup/sections/SectionB";
import { SectionC } from "@/features/followup/sections/SectionC";
import { SectionD } from "@/features/followup/sections/SectionD";
import { SectionE } from "@/features/followup/sections/SectionE";
import { SectionF } from "@/features/followup/sections/SectionF";
import { useFollowUpData } from "@/features/followup/use-followup-data";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute(
	"/_authenticated/children/$childId/followup/new",
)({ component: NewFollowUpPage });

function NewFollowUpPage() {
	const { childId } = Route.useParams();
	const router = useRouter();

	const data = useFollowUpData({ childId });
	const queryClient = useQueryClient();

	const [activeTab, setActiveTab] = useState<FollowUpTabValue>("a");
	const [submitAttempted, setSubmitAttempted] = useState(false);

	const form = useForm<FollowUpFormValues>({
		resolver: zodResolver(FollowUpFormSchema),
		defaultValues: FOLLOWUP_EMPTY_DEFAULTS,
	});
	const {
		register,
		control,
		handleSubmit,
		formState: { errors },
		reset,
	} = form;

	const {
		proceed,
		reset: resetBlocker,
		status: blockerStatus,
	} = useBlocker({
		shouldBlockFn: () => recordingManager.isActive,
		withResolver: true,
		enableBeforeUnload: () => recordingManager.isActive,
	});

	const seededRef = useRef(false);

	useEffect(() => {
		if (data.isLoading) return;
		if (!data.initialAssessment.data) return;
		if (!data.therapistMe.data) return;
		if (seededRef.current) return;

		seededRef.current = true;
		reset(
			buildFollowUpDefaultValues({
				initialAssessment: data.initialAssessment.data,
				therapistId: data.therapistMe.data?.id ?? "",
				sessionNumber: (data.followUps.data?.length ?? 0) + 1,
				activePlan: data.activePlan.data ?? null,
			}),
		);
		form.setValue("sectionF.therapistName", data.therapistMe.data?.email ?? "");
	}, [
		data.isLoading,
		data.initialAssessment.data,
		data.therapistMe.data,
		data.followUps.data,
		data.activePlan.data,
		reset,
		form,
	]);

	const mutation = useMutation(
		trpc.assessment.createFollowUp.mutationOptions({
			onSuccess: (result) => {
				toast.success("Follow-up assessment created");
				queryClient.invalidateQueries({
					queryKey: trpc.goal.list.queryOptions({
						treatmentPlanId: data.activePlan.data?.id,
					}).queryKey,
				});
				router.navigate({
					to: "/children/$childId/followup/$followUpId",
					params: { childId, followUpId: result.id },
				});
			},
			onError: (err) => {
				toast.error(err.message);
			},
		}),
	);

	function onValid(values: FollowUpFormValues) {
		if (!data.initialAssessment.data || !data.activePlan.data) {
			toast.error("Required data not loaded. Please refresh and try again.");
			return;
		}

		if (values.sectionB.goalProgress.length === 0) {
			toast.error("At least one goal progress entry is required.");
			setActiveTab("b");
			return;
		}

		mutation.mutate({
			childId,
			initialAssessmentId: data.initialAssessment.data.id,
			treatmentPlanId: data.activePlan.data.id,
			sectionA: values.sectionA,
			sectionB: values.sectionB,
			sectionC: values.sectionC,
			sectionD: {
				...values.sectionD,
				equipmentEffectivelyUsed:
					values.sectionD.equipmentEffectivelyUsed.join(", "),
			},
			sectionE: values.sectionE,
			sectionF: {
				therapistName: values.sectionF.therapistName,
				guardianName: values.sectionF.guardianName,
			},
		});
	}

	function onInvalid(formErrors: FieldErrors<FollowUpFormValues>) {
		setSubmitAttempted(true);
		const firstErrorTab = FOLLOWUP_TABS.find(
			(tab) => formErrors[tab.field as keyof FollowUpFormValues],
		);
		if (firstErrorTab) setActiveTab(firstErrorTab.value);
		toast.error("Please fix the highlighted errors before submitting.");
	}

	const errorTabs = useMemo(() => {
		if (!submitAttempted) return new Set<string>();
		return new Set(
			FOLLOWUP_TABS.filter(
				(tab) => errors[tab.field as keyof FollowUpFormValues],
			).map((tab) => tab.value),
		);
	}, [submitAttempted, errors]);

	if (data.isLoading) {
		return (
			<div className="p-8">
				<Skeleton className="mb-6 h-5 w-24" />
				<Skeleton className="mb-6 h-8 w-48" />
				<div className="space-y-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-48 w-full rounded-xl" />
					))}
				</div>
			</div>
		);
	}

	if (data.initialAssessment.isError) {
		return (
			<div className="p-8">
				<button
					type="button"
					onClick={() =>
						router.navigate({
							to: "/children/$childId",
							params: { childId },
						})
					}
					className="mb-6 flex items-center gap-1.5 text-on-surface-variant text-sm hover:text-on-surface"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to Profile
				</button>
				<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
					<h2 className="font-semibold text-lg text-on-surface">
						Initial Assessment Required
					</h2>
					<p className="mt-2 text-on-surface-variant text-sm">
						An initial assessment must be completed before creating a follow-up.
					</p>
					<Button
						className="mt-4"
						onClick={() =>
							router.navigate({
								to: "/children/$childId/assessment/new",
								params: { childId },
							})
						}
					>
						Create Initial Assessment
					</Button>
				</div>
			</div>
		);
	}

	const sensorySystemById = Object.fromEntries(
		(data.sensorySystems.data ?? []).map((s) => [s.id, s.label]),
	);
	const baselineMap: Record<string, number> = Object.fromEntries(
		data.initialAssessment.data?.sectionD.sensoryProfile.map((r) => [
			r.systemId,
			r.rating,
		]) ?? [],
	);
	const equipmentOptions = (data.equipment.data ?? []).map((eq) => ({
		value: eq.id,
		label: eq.label,
	}));
	const goalDescriptionById = Object.fromEntries(
		(data.activePlan.data?.goals ?? []).map((g) => [g.id, g.description]),
	);
	const therapistDisplayName = data.therapistMe.data?.email ?? "";
	const therapistCredentials = [
		data.therapistMe.data?.credentialsQualifications,
		data.therapistMe.data?.credentialsRegistrationNumber,
	]
		.filter((part): part is string => !!part)
		.join(", ");

	return (
		<div className="p-8">
			<button
				type="button"
				onClick={() =>
					router.navigate({
						to: "/children/$childId",
						params: { childId },
					})
				}
				className="mb-6 flex items-center gap-1.5 text-on-surface-variant text-sm hover:text-on-surface"
			>
				<ArrowLeft className="h-4 w-4" />
				Back to Profile
			</button>

			<h1 className="mb-6 font-semibold text-2xl text-on-surface">
				New Follow-Up Assessment
			</h1>

			<AIAssistPanel
				childId={childId}
				assessmentType="follow-up"
				form={form}
				milestoneById={{}}
				sensorySystemById={sensorySystemById}
			/>

			<FollowUpTabsShell
				activeTab={activeTab}
				onTabChange={setActiveTab}
				errorTabs={errorTabs}
				onSubmit={handleSubmit(onValid, onInvalid)}
				isSubmitting={mutation.isPending}
				sections={{
					a: (
						<SectionA
							register={register}
							control={control}
							errors={errors}
							therapistDisplayName={therapistDisplayName}
						/>
					),
					b: (
						<SectionB
							register={register}
							control={control}
							errors={errors}
							goalDescriptionById={goalDescriptionById}
						/>
					),
					c: (
						<SectionC
							register={register}
							control={control}
							errors={errors}
							sensorySystemById={sensorySystemById}
							baselineMap={baselineMap}
						/>
					),
					d: (
						<SectionD
							register={register}
							control={control}
							errors={errors}
							equipmentOptions={equipmentOptions}
						/>
					),
					e: <SectionE register={register} control={control} errors={errors} />,
					f: (
						<SectionF
							register={register}
							control={control}
							errors={errors}
							therapistCredentials={therapistCredentials}
						/>
					),
				}}
			/>

			<AlertDialog
				open={blockerStatus === "blocked"}
				onOpenChange={(open) => {
					if (!open) resetBlocker?.();
				}}
			>
				<AlertDialogContent className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 top-4 left-1/2 -translate-x-1/2 translate-y-0 duration-300">
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2">
							<AlertTriangle className="h-5 w-5 text-destructive" />
							Recording in Progress
						</AlertDialogTitle>
						<AlertDialogDescription>
							AI documentation is actively recording. Leaving this page will
							stop the recording. Are you sure you want to leave?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => resetBlocker?.()}>
							Stay
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => proceed?.()}
						>
							Leave & Stop Recording
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
