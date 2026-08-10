import type { UseFormReturn } from "react-hook-form";
import { INTERVENTION_SETTINGS } from "@/features/assessment/constants";
import type { AIDraft } from "./types";

interface FieldOption {
	value: string;
	label: string;
}

const SIMPLE_FIELDS = new Set([
	"sectionA.patientName",
	"sectionA.dob",
	"sectionA.age",
	"sectionA.gender",
	"sectionA.assessmentDate",
	"sectionA.location",
	"sectionA.referringTherapist",
	"sectionA.referralSource",
	"sectionA.caregiverName",
	"sectionA.caregiverRelation",
	"sectionA.caregiverContact",
	"sectionA.caregiverEmail",
	"sectionA.chiefComplaint",
	"sectionB.prenatalHistory",
	"sectionB.birthHistory",
	"sectionB.neonatalHistory",
	"sectionB.gestationalAgeWeeks",
	"sectionB.medicalHistory",
	"sectionB.currentMedications",
	"sectionB.allergies",
	"sectionB.previousTherapies",
	"sectionF.overallSummary",
	"sectionG.homeProgramRecommendations",
	"sectionG.referrals",
	"sectionH.therapistName",
	"sectionH.guardianName",
	"sectionH.signedAt",
	"sectionH.therapistCredentials",
]);

const TAG_INPUT_FIELDS = new Set([
	"sectionB.primaryDiagnoses",
	"sectionD.behaviouralObservations",
	"sectionE.observations",
	"sectionG.equipment",
]);

const NUMBER_FIELDS = new Set([
	"sectionG.recommendedFrequency",
	"sectionG.sessionDurationMinutes",
	"sectionG.reviewPeriodWeeks",
]);

const NUMBER_RANGES: Record<string, { min: number; max: number }> = {
	"sectionG.recommendedFrequency": { min: 1, max: 7 },
	"sectionG.sessionDurationMinutes": { min: 15, max: 120 },
	"sectionG.reviewPeriodWeeks": { min: 1, max: 52 },
};

const BOOLEAN_FIELDS = new Set([
	"sectionH.consentObtained",
	"sectionA.parentPresent",
]);

function fuzzyMatch(text: string, options: string[]): string | null {
	const normalizedText = text.toLowerCase().trim();
	let bestMatch: string | null = null;
	let bestScore = 0;

	for (const option of options) {
		const normalizedOption = option.toLowerCase().trim();

		if (normalizedOption === normalizedText) return option;
		if (
			normalizedOption.includes(normalizedText) ||
			normalizedText.includes(normalizedOption)
		) {
			const score = Math.min(normalizedText.length, normalizedOption.length);
			if (score > bestScore) {
				bestScore = score;
				bestMatch = option;
			}
		}
	}

	return bestMatch;
}

function fuzzyMatchLabelToValue(
	text: string,
	options: FieldOption[],
): string | null {
	const normalizedText = text.toLowerCase().trim();
	let bestMatch: string | null = null;
	let bestScore = 0;

	for (const option of options) {
		const normalizedLabel = option.label.toLowerCase().trim();
		const normalizedValue = option.value.toLowerCase().trim();

		if (
			normalizedLabel === normalizedText ||
			normalizedValue === normalizedText
		) {
			return option.value;
		}

		if (
			normalizedLabel.includes(normalizedText) ||
			normalizedText.includes(normalizedLabel)
		) {
			const score = Math.min(normalizedText.length, normalizedLabel.length);
			if (score > bestScore) {
				bestScore = score;
				bestMatch = option.value;
			}
		}
	}

	return bestMatch;
}

function parseBoolean(value: unknown): boolean | null {
	if (typeof value === "boolean") return value;
	if (typeof value === "string") {
		const normalized = value.toLowerCase().trim();
		if (["yes", "true", "y", "1", "correct", "confirmed"].includes(normalized))
			return true;
		if (["no", "false", "n", "0", "incorrect", "not"].includes(normalized))
			return false;
	}
	if (typeof value === "number") return value !== 0;
	return null;
}

function clampNumber(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

function appendUniqueTags(
	newValues: string[],
	current: string[] = [],
): string[] {
	const uniqueNew = newValues.filter((v) => !current.includes(v));
	return [...current, ...uniqueNew];
}

export function applyDraftsToForm(
	drafts: AIDraft[],
	form: UseFormReturn<Record<string, unknown>>,
	milestoneById: Record<string, string>,
	sensorySystemById: Record<string, string>,
	functionalConcernOptions: { id: string; label: string }[] = [],
): string[] {
	const filledFields: string[] = [];

	for (const draft of drafts) {
		const { fieldId, value } = draft;

		if (SIMPLE_FIELDS.has(fieldId)) {
			form.setValue(fieldId, value, { shouldDirty: true });
			filledFields.push(fieldId);
			continue;
		}

		if (NUMBER_FIELDS.has(fieldId)) {
			const numValue = Number.parseFloat(String(value));
			if (!Number.isNaN(numValue)) {
				const range = NUMBER_RANGES[fieldId];
				const clampedValue = range
					? clampNumber(numValue, range.min, range.max)
					: numValue;
				form.setValue(fieldId, clampedValue, { shouldDirty: true });
			}
			filledFields.push(fieldId);
			continue;
		}

		if (BOOLEAN_FIELDS.has(fieldId)) {
			const boolValue = parseBoolean(value);
			if (boolValue !== null) {
				form.setValue(fieldId, boolValue, { shouldDirty: true });
			}
			filledFields.push(fieldId);
			continue;
		}

		if (fieldId === "sectionG.interventionSetting") {
			const matchedValue = fuzzyMatchLabelToValue(
				String(value),
				INTERVENTION_SETTINGS,
			);
			if (matchedValue) {
				form.setValue(fieldId, matchedValue, { shouldDirty: true });
			}
			filledFields.push(fieldId);
			continue;
		}

		if (TAG_INPUT_FIELDS.has(fieldId)) {
			const current = form.getValues(fieldId) ?? [];
			const newValues = Array.isArray(value)
				? value.map(String)
				: [String(value)];
			form.setValue(fieldId, appendUniqueTags(newValues, current), {
				shouldDirty: true,
			});
			filledFields.push(fieldId);
			continue;
		}

		if (fieldId === "sectionE.functionalConcerns") {
			applyFunctionalConcernUpdates(form, value, functionalConcernOptions);
			filledFields.push(fieldId);
			continue;
		}

		if (fieldId === "sectionC.milestones") {
			applyMilestoneUpdates(form, value, milestoneById);
			filledFields.push(fieldId);
			continue;
		}

		if (fieldId === "sectionD.sensoryProfile") {
			applySensoryUpdates(form, value, sensorySystemById);
			filledFields.push(fieldId);
			continue;
		}

		if (
			fieldId === "sectionG.shortTermGoals" ||
			fieldId === "sectionG.longTermGoals"
		) {
			applyGoalUpdates(form, fieldId, value);
			filledFields.push(fieldId);
			continue;
		}

		if (fieldId === "sectionF.toolsAdministered") {
			applyToolUpdates(form, value);
			filledFields.push(fieldId);
			continue;
		}

		if (fieldId === "sectionE.goalStatusDecisions") {
			const current = form.getValues(fieldId) ?? [];
			const newValues = Array.isArray(value)
				? value.map(String)
				: [String(value)];
			form.setValue(fieldId, appendUniqueTags(newValues, current), {
				shouldDirty: true,
			});
			filledFields.push(fieldId);
			continue;
		}

		if (
			fieldId === "sectionD.improvementsAtHome" ||
			fieldId === "sectionD.improvementsAtSchool"
		) {
			const current = form.getValues(fieldId) ?? [];
			const newValues = Array.isArray(value)
				? value.map(String)
				: [String(value)];
			form.setValue(fieldId, appendUniqueTags(newValues, current), {
				shouldDirty: true,
			});
			filledFields.push(fieldId);
			continue;
		}

		if (
			fieldId === "sectionD.schoolPerformanceChanges" ||
			fieldId === "sectionD.behaviourChanges" ||
			fieldId === "sectionD.newSkillsObserved" ||
			fieldId === "sectionD.therapistObservations"
		) {
			const current = form.getValues(fieldId) ?? [];
			const newValues = Array.isArray(value)
				? value.map(String)
				: [String(value)];
			form.setValue(fieldId, appendUniqueTags(newValues, current), {
				shouldDirty: true,
			});
			filledFields.push(fieldId);
			continue;
		}

		if (fieldId === "sectionE.updatedGoals") {
			applyGoalUpdates(form, fieldId, value);
			filledFields.push(fieldId);
			continue;
		}

		if (
			fieldId === "sectionD.homeProgramCompliance" ||
			fieldId === "sectionD.sessionEngagement" ||
			fieldId === "sectionD.regressions"
		) {
			form.setValue(fieldId, value, { shouldDirty: true });
			filledFields.push(fieldId);
			continue;
		}

		if (
			fieldId === "sectionE.updatedHomeProgram" ||
			fieldId === "sectionE.nextFollowUpDate" ||
			fieldId === "sectionE.nextAssessmentType" ||
			fieldId === "sectionE.clinicalNotes"
		) {
			form.setValue(fieldId, value, { shouldDirty: true });
			filledFields.push(fieldId);
			continue;
		}

		if (fieldId === "sectionD.equipmentEffectivelyUsed") {
			const current = form.getValues(fieldId) ?? [];
			const newValues = Array.isArray(value)
				? value.map(String)
				: [String(value)];
			form.setValue(fieldId, appendUniqueTags(newValues, current), {
				shouldDirty: true,
			});
			filledFields.push(fieldId);
			continue;
		}

		if (
			fieldId === "sectionA.date" ||
			fieldId === "sectionA.sessionNumber" ||
			fieldId === "sectionA.weeksSinceInitial"
		) {
			form.setValue(fieldId, value, { shouldDirty: true });
			filledFields.push(fieldId);
			continue;
		}

		if (fieldId === "sectionB.goalProgress") {
			applyGoalProgressUpdates(form, value);
			filledFields.push(fieldId);
			continue;
		}

		if (fieldId === "sectionC.sensoryCheck") {
			applySensoryCheckUpdates(form, value, sensorySystemById);
			filledFields.push(fieldId);
			continue;
		}

		form.setValue(fieldId, value, { shouldDirty: true });
		filledFields.push(fieldId);
	}

	return filledFields;
}

function applyFunctionalConcernUpdates(
	form: UseFormReturn<Record<string, unknown>>,
	value: unknown,
	options: { id: string; label: string }[],
): void {
	if (!options || options.length === 0) return;

	const current = form.getValues("sectionE.functionalConcerns") ?? [];
	const values = Array.isArray(value) ? value : [value];
	const newIds: string[] = [];

	for (const val of values) {
		const strValue = String(val).toLowerCase().trim();
		const matched = fuzzyMatch(
			strValue,
			options.map((o) => o.label),
		);
		if (matched) {
			const option = options.find((o) => o.label === matched);
			if (
				option &&
				!current.includes(option.id) &&
				!newIds.includes(option.id)
			) {
				newIds.push(option.id);
			}
		}
	}

	if (newIds.length > 0) {
		form.setValue("sectionE.functionalConcerns", [...current, ...newIds], {
			shouldDirty: true,
		});
	}
}

function applyMilestoneUpdates(
	form: UseFormReturn<Record<string, unknown>>,
	value: unknown,
	milestoneById: Record<string, string>,
): void {
	if (!Array.isArray(value)) return;

	const milestones = form.getValues("sectionC.milestones");
	if (!milestones || !Array.isArray(milestones)) return;

	for (const aiValue of value) {
		const strValue = String(aiValue).toLowerCase();

		for (let i = 0; i < milestones.length; i++) {
			const milestone = milestones[i];
			const milestoneName =
				milestoneById[milestone.milestoneId]?.toLowerCase() ?? "";

			if (
				milestoneName.includes(strValue) ||
				strValue.includes(milestoneName)
			) {
				form.setValue(`sectionC.milestones.${i}.achievedAtAgeMonths`, null, {
					shouldDirty: true,
				});
				form.setValue(`sectionC.milestones.${i}.delayed`, false, {
					shouldDirty: true,
				});
				break;
			}
		}
	}
}

function applySensoryUpdates(
	form: UseFormReturn<Record<string, unknown>>,
	value: unknown,
	sensorySystemById: Record<string, string>,
): void {
	if (!Array.isArray(value)) return;

	const sensoryProfile = form.getValues("sectionD.sensoryProfile");
	if (!sensoryProfile || !Array.isArray(sensoryProfile)) return;

	for (const aiValue of value) {
		const strValue = String(aiValue).toLowerCase();

		for (let i = 0; i < sensoryProfile.length; i++) {
			const system = sensoryProfile[i];
			const systemName =
				sensorySystemById[system.systemId]?.toLowerCase() ?? "";

			if (systemName.includes(strValue) || strValue.includes(systemName)) {
				form.setValue(`sectionD.sensoryProfile.${i}.rating`, 3, {
					shouldDirty: true,
				});
				form.setValue(`sectionD.sensoryProfile.${i}.notes`, String(aiValue), {
					shouldDirty: true,
				});
				break;
			}
		}
	}
}

function applyGoalUpdates(
	form: UseFormReturn<Record<string, unknown>>,
	fieldId: string,
	value: unknown,
): void {
	if (!Array.isArray(value)) return;

	const values = value.map(String).filter((v) => v.trim() !== "");
	if (values.length === 0) return;

	const MAX_GOALS = 4;

	for (const aiValue of values) {
		const goals = form.getValues(fieldId) ?? [];
		const normalizedValue = aiValue.toLowerCase().trim();

		const existingIndex = goals.findIndex(
			(g) => g.description?.toLowerCase().trim() === normalizedValue,
		);
		if (existingIndex !== -1) continue;

		const emptyIndex = goals.findIndex(
			(g) => g.description === "" || g.description == null,
		);
		if (emptyIndex !== -1) {
			form.setValue(`${fieldId}.${emptyIndex}.description`, aiValue.trim(), {
				shouldDirty: true,
			});
			form.setValue(`${fieldId}.${emptyIndex}.targetAttainmentPct`, 100, {
				shouldDirty: true,
			});
			continue;
		}

		if (goals.length < MAX_GOALS) {
			const currentGoals = form.getValues(fieldId) ?? [];
			const newGoal = {
				goalId: crypto.randomUUID(),
				description: aiValue.trim(),
				targetAttainmentPct: 100,
			};
			form.setValue(fieldId, [...currentGoals, newGoal], { shouldDirty: true });
		}
	}
}

function applyToolUpdates(
	form: UseFormReturn<Record<string, unknown>>,
	value: unknown,
): void {
	if (!Array.isArray(value)) return;

	const tools = form.getValues("sectionF.toolsAdministered");
	if (!tools || !Array.isArray(tools)) return;

	for (const aiValue of value) {
		const strValue = String(aiValue).toLowerCase();

		for (let i = 0; i < tools.length; i++) {
			const tool = tools[i];
			if (
				tool.scoresSummary?.toLowerCase().includes(strValue) ||
				strValue.includes(tool.scoresSummary?.toLowerCase())
			) {
				continue;
			}

			if (tools[i].scoresSummary === "") {
				form.setValue(
					`sectionF.toolsAdministered.${i}.scoresSummary`,
					String(aiValue),
					{ shouldDirty: true },
				);
				break;
			}
		}
	}
}

function applyGoalProgressUpdates(
	form: UseFormReturn<Record<string, unknown>>,
	value: unknown,
): void {
	if (!Array.isArray(value)) return;

	const goalProgress = form.getValues("sectionB.goalProgress");
	if (!goalProgress || !Array.isArray(goalProgress)) return;

	for (let i = 0; i < goalProgress.length && i < value.length; i++) {
		form.setValue(`sectionB.goalProgress.${i}.attainmentPct`, 0, {
			shouldDirty: true,
		});
		form.setValue(
			`sectionB.goalProgress.${i}.evidenceNotes`,
			String(value[i]),
			{ shouldDirty: true },
		);
	}
}

function applySensoryCheckUpdates(
	form: UseFormReturn<Record<string, unknown>>,
	value: unknown,
	sensorySystemById: Record<string, string>,
): void {
	if (!Array.isArray(value)) return;

	const sensoryCheck = form.getValues("sectionC.sensoryCheck");
	if (!sensoryCheck || !Array.isArray(sensoryCheck)) return;

	for (const aiValue of value) {
		const strValue = String(aiValue).toLowerCase();

		for (let i = 0; i < sensoryCheck.length; i++) {
			const system = sensoryCheck[i];
			const systemName =
				sensorySystemById[system.systemId]?.toLowerCase() ?? "";

			if (systemName.includes(strValue) || strValue.includes(systemName)) {
				form.setValue(`sectionC.sensoryCheck.${i}.rating`, 3, {
					shouldDirty: true,
				});
				form.setValue(`sectionC.sensoryCheck.${i}.notes`, String(aiValue), {
					shouldDirty: true,
				});
				break;
			}
		}
	}
}
