export const PERMISSIONS = {
	CHILD_INTAKE: "child.intake",
	SESSION_RUN: "session.run",
	TREATMENT_PLAN_MODIFY: "treatment_plan.modify",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
