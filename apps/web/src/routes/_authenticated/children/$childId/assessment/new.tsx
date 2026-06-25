import { Button } from "@haber-final/ui/components/button";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FieldErrors } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AssessmentTabsShell } from "@/features/assessment/AssessmentTabsShell";
import {
	SECTION_TABS,
	type SectionTabValue,
} from "@/features/assessment/constants";
import {
	AssessmentFormSchema,
	type AssessmentFormValues,
	buildDefaultValues,
	EMPTY_DEFAULTS,
} from "@/features/assessment/schema";
import { SectionA } from "@/features/assessment/sections/SectionA";
import { SectionB } from "@/features/assessment/sections/SectionB";
import { SectionC } from "@/features/assessment/sections/SectionC";
import { SectionD } from "@/features/assessment/sections/SectionD";
import { SectionE } from "@/features/assessment/sections/SectionE";
import { SectionF } from "@/features/assessment/sections/SectionF";
import { SectionG } from "@/features/assessment/sections/SectionG";
import { SectionH } from "@/features/assessment/sections/SectionH";
import { useAssessmentTaxonomy } from "@/features/assessment/use-assessment-taxonomy";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute(
	"/_authenticated/children/$childId/assessment/new",
)({
	component: NewAssessmentPage,
});

function NewAssessmentPage() {
	const { childId } = Route.useParams();
	const router = useRouter();
	const queryClient = useQueryClient();

	const childQuery = useQuery(trpc.child.get.queryOptions({ childId }));
	const child = childQuery.data;

	const existingAssessmentQuery = useQuery({
		...trpc.assessment.get.queryOptions({ childId }),
		retry: false,
		meta: { suppressErrorToast: true },
	});

	const taxonomy = useAssessmentTaxonomy();

	const [activeTab, setActiveTab] = useState<SectionTabValue>("a");
	const [submitAttempted, setSubmitAttempted] = useState(false);
	const [visitedTabs, setVisitedTabs] = useState<Set<SectionTabValue>>(
		new Set(["a"]),
	);

	const form = useForm<AssessmentFormValues>({
		resolver: zodResolver(AssessmentFormSchema),
		defaultValues: EMPTY_DEFAULTS,
	});
	const {
		register,
		control,
		handleSubmit,
		trigger,
		formState: { errors },
	} = form;

	const seededRef = useRef(false);

	useEffect(() => {
		if (existingAssessmentQuery.data) {
			router.navigate({
				to: "/children/$childId/assessment/$assessmentId",
				params: { childId, assessmentId: existingAssessmentQuery.data.id },
			});
		}
	}, [existingAssessmentQuery.data, childId, router]);

	useEffect(() => {
		if (seededRef.current) return;
		if (!child) return;
		if (taxonomy.isLoading) return;
		if (existingAssessmentQuery.isLoading) return;
		if (existingAssessmentQuery.data) return;

		seededRef.current = true;
		form.reset(
			buildDefaultValues({
				child,
				sensorySystems: taxonomy.sensorySystems.data ?? [],
				milestones: taxonomy.milestones.data ?? [],
			}),
		);
		if (taxonomy.therapistMe.data?.email) {
			form.setValue("sectionH.therapistName", taxonomy.therapistMe.data.email);
		}
	}, [child, taxonomy, existingAssessmentQuery, form]);

	const currentTabConfig = SECTION_TABS.find((t) => t.value === activeTab);
	const handleNext = async (): Promise<boolean> => {
		if (!currentTabConfig) return false;

		const isValid = await trigger(currentTabConfig.field);

		if (!isValid) {
			setSubmitAttempted(true);
			toast.error(
				"Please fill short term goal and long term goal fields before proceeding",
			);
			return false;
		}
		const nextIdx = SECTION_TABS.findIndex((t) => t.value === activeTab) + 1;
		if (nextIdx < SECTION_TABS.length) {
			const nextTab = SECTION_TABS[nextIdx].value;
			setVisitedTabs((prev) => new Set([...prev, nextTab]));
		}
		return true;
	};

	const createMutation = useMutation(
		trpc.assessment.create.mutationOptions({
			onSuccess: (data) => {
				toast.success("Assessment created");
				router.navigate({
					to: "/children/$childId/assessment/$assessmentId",
					params: { childId, assessmentId: data.id },
				});
			},
			onError: (err) => {
				if (err.data?.code === "CONFLICT") {
					toast.error("An assessment already exists for this child.");
					queryClient.invalidateQueries({
						queryKey: trpc.assessment.get.queryOptions({ childId }).queryKey,
					});
				} else if (err.data?.code === "PRECONDITION_FAILED") {
					toast.error("Consent must be granted before creating an assessment.");
				} else {
					toast.error(err.message);
				}
			},
		}),
	);

	function onValid(values: AssessmentFormValues) {
		const { previousTherapiesRows, ...sectionBRest } = values.sectionB;
		const previousTherapies = previousTherapiesRows
			.map(
				(row) =>
					`${row.therapyType} — ${row.durationFrequency} — ${row.providerLocation}`,
			)
			.join("\n");

		createMutation.mutate({
			childId,
			sectionA: values.sectionA,
			sectionB: { ...sectionBRest, previousTherapies },
			sectionC: values.sectionC,
			sectionD: values.sectionD,
			sectionE: values.sectionE,
			sectionF: values.sectionF,
			sectionG: values.sectionG,
			sectionH: values.sectionH,
		});
	}

	function onInvalid(formErrors: FieldErrors<AssessmentFormValues>) {
		setSubmitAttempted(true);
		const firstErrorTab = SECTION_TABS.find((tab) => formErrors[tab.field]);
		if (firstErrorTab) setActiveTab(firstErrorTab.value);
		toast.error("Please fix the highlighted errors before submitting.");
	}

	const errorTabs = useMemo(() => {
		if (!submitAttempted) return new Set<string>();
		return new Set(
			SECTION_TABS.filter((tab) => errors[tab.field]).map((tab) => tab.value),
		);
	}, [submitAttempted, errors]);

	if (
		childQuery.isLoading ||
		taxonomy.isLoading ||
		existingAssessmentQuery.isLoading
	) {
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

	if (!child) {
		return (
			<div className="p-8">
				<button
					type="button"
					onClick={() => router.navigate({ to: "/children" })}
					className="mb-6 flex items-center gap-1.5 text-on-surface-variant text-sm hover:text-on-surface"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to Children
				</button>
				<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center text-on-surface-variant text-sm">
					Child not found.
				</div>
			</div>
		);
	}

	if (existingAssessmentQuery.data) {
		return (
			<div className="p-8">
				<p className="text-on-surface-variant text-sm">
					Redirecting to existing assessment…
				</p>
			</div>
		);
	}

	if (child.consentStatus !== "GRANTED") {
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
						Consent Required
					</h2>
					<p className="mt-2 text-on-surface-variant text-sm">
						Consent must be granted before creating an assessment.
					</p>
					<Button
						className="mt-4"
						onClick={() =>
							router.navigate({
								to: "/children/$childId/consent",
								params: { childId },
							})
						}
					>
						Go to Consent
					</Button>
				</div>
			</div>
		);
	}

	const therapistCredentials = [
		taxonomy.therapistMe.data?.credentialsQualifications,
		taxonomy.therapistMe.data?.credentialsRegistrationNumber,
	]
		.filter((part): part is string => !!part)
		.join(", ");

	const diagnosisOptions = (taxonomy.diagnoses.data ?? []).map((d) => ({
		value: d.id,
		label: d.label,
	}));
	const equipmentOptions = (taxonomy.equipment.data ?? []).map((eq) => ({
		value: eq.id,
		label: eq.label,
	}));
	const milestoneById = Object.fromEntries(
		(taxonomy.milestones.data ?? []).map((m) => [m.id, m.description]),
	);
	const sensorySystemById = Object.fromEntries(
		(taxonomy.sensorySystems.data ?? []).map((s) => [s.id, s.label]),
	);

	const lockedTabs = new Set(
		SECTION_TABS.map((t) => t.value).filter((v) => !visitedTabs.has(v)),
	);

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
				New Initial Assessment
			</h1>

			<AssessmentTabsShell
				activeTab={activeTab}
				onTabChange={setActiveTab}
				errorTabs={errorTabs}
				lockedTabs={lockedTabs}
				onNext={handleNext}
				onSubmit={handleSubmit(onValid, onInvalid)}
				isSubmitting={createMutation.isPending}
				sections={{
					a: <SectionA register={register} control={control} errors={errors} />,
					b: (
						<SectionB
							register={register}
							control={control}
							errors={errors}
							diagnosisOptions={diagnosisOptions}
						/>
					),
					c: (
						<SectionC
							register={register}
							control={control}
							errors={errors}
							milestoneById={milestoneById}
						/>
					),
					d: (
						<SectionD
							register={register}
							control={control}
							errors={errors}
							sensorySystemById={sensorySystemById}
						/>
					),
					e: (
						<SectionE
							register={register}
							control={control}
							errors={errors}
							functionalConcernOptions={taxonomy.functionalConcerns.data ?? []}
						/>
					),
					f: (
						<SectionF
							register={register}
							control={control}
							errors={errors}
							assessmentToolOptions={taxonomy.assessmentTools.data ?? []}
						/>
					),
					g: (
						<SectionG
							register={register}
							control={control}
							errors={errors}
							equipmentOptions={equipmentOptions}
						/>
					),
					h: (
						<SectionH
							register={register}
							control={control}
							errors={errors}
							therapistCredentials={therapistCredentials}
						/>
					),
				}}
			/>
		</div>
	);
}
