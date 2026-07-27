export const formRegistry = {
	initialAssessment: {
		id: "initial-assessment",
		sections: [
			{
				id: "section-a",
				name: "Patient & Referral Information",
				fields: [
					{
						id: "sectionA.patientName",
						label: "Patient Name",
						type: "string",
						aliases: ["child name", "patient name", "name"],
					},
					{
						id: "sectionA.dob",
						label: "Date of Birth",
						type: "date",
						aliases: ["DOB", "birth date", "born on"],
					},
					{
						id: "sectionA.age",
						label: "Age",
						type: "object",
						fields: ["years", "months"],
						aliases: ["years old", "age is", "yr", "month"],
					},
					{
						id: "sectionA.gender",
						label: "Gender",
						type: "enum",
						values: ["Male", "Female", "Other", "Prefer not to say"],
						aliases: [],
					},
					{
						id: "sectionA.assessmentDate",
						label: "Assessment Date",
						type: "date",
						aliases: ["assessment done on", "evaluated on"],
					},
					{
						id: "sectionA.location",
						label: "Assessment Location",
						type: "string",
						aliases: ["place", "location"],
					},
					{
						id: "sectionA.referringTherapist",
						label: "Referring Therapist / Doctor",
						type: "string",
						aliases: ["referred by", "referring doctor"],
					},
					{
						id: "sectionA.referralSource",
						label: "Referral Source",
						type: "string",
						aliases: ["referral", "source of referral"],
					},
					{
						id: "sectionA.caregiverName",
						label: "Primary Caregiver Name",
						type: "string",
						aliases: [
							"parent name",
							"guardian name",
							"mother name",
							"father name",
						],
					},
					{
						id: "sectionA.caregiverRelation",
						label: "Relationship to Child",
						type: "string",
						aliases: ["relation", "relationship"],
					},
					{
						id: "sectionA.caregiverContact",
						label: "Contact Number",
						type: "string",
						aliases: ["phone", "mobile", "telephone", "contact", "+91"],
					},
					{
						id: "sectionA.caregiverEmail",
						label: "Email Address",
						type: "string",
						aliases: ["email", "e-mail"],
					},
					{
						id: "sectionA.chiefComplaint",
						label: "Chief Complaint",
						type: "string",
						aliases: ["complaint", "presenting problem", "reason for visit"],
					},
				],
			},
			{
				id: "section-b",
				name: "Medical History",
				fields: [
					{
						id: "sectionB.primaryDiagnoses",
						label: "Primary Diagnoses",
						type: "array-string",
						aliases: ["diagnosis", "diagnosed with", "condition"],
					},
					{
						id: "sectionB.prenatalHistory",
						label: "Prenatal History",
						type: "string",
						aliases: ["pregnancy", "prenatal", "before birth"],
					},
					{
						id: "sectionB.birthHistory",
						label: "Birth History",
						type: "string",
						aliases: ["birth", "delivery", "born"],
					},
					{
						id: "sectionB.neonatalHistory",
						label: "Neonatal History",
						type: "string",
						aliases: ["neonatal", "after birth", "newborn"],
					},
					{
						id: "sectionB.gestationalAgeWeeks",
						label: "Gestational Age (weeks)",
						type: "number",
						aliases: ["weeks gestation", "preterm", "full term"],
					},
					{
						id: "sectionB.medicalHistory",
						label: "Medical History",
						type: "string",
						aliases: ["medical", "past medical"],
					},
					{
						id: "sectionB.currentMedications",
						label: "Current Medications",
						type: "string",
						aliases: ["medications", "medicine", "taking"],
					},
					{
						id: "sectionB.allergies",
						label: "Allergies",
						type: "string",
						aliases: ["allergy", "allergic"],
					},
					{
						id: "sectionB.previousTherapies",
						label: "Previous Therapies",
						type: "string",
						aliases: ["previous therapy", "past therapy"],
					},
				],
			},
			{
				id: "section-c",
				name: "Developmental Milestones",
				fields: [
					{
						id: "sectionC.milestones",
						label: "Milestones",
						type: "array-object",
						aliases: ["milestone", "development", "developmental"],
					},
				],
			},
			{
				id: "section-d",
				name: "Sensory Profile",
				fields: [
					{
						id: "sectionD.sensoryProfile",
						label: "Sensory Profile",
						type: "array-object",
						aliases: ["sensory", "sensory profile"],
					},
					{
						id: "sectionD.behaviouralObservations",
						label: "Behavioural Observations",
						type: "array-string",
						aliases: ["behaviour", "behavior", "observation"],
					},
				],
			},
			{
				id: "section-e",
				name: "Functional Concerns",
				fields: [
					{
						id: "sectionE.functionalConcerns",
						label: "Functional Concerns",
						type: "array-string",
						aliases: ["concerns", "functional", "difficulties"],
					},
					{
						id: "sectionE.observations",
						label: "Observations",
						type: "array-string",
						aliases: ["observation", "observed"],
					},
				],
			},
			{
				id: "section-f",
				name: "Assessment Tools",
				fields: [
					{
						id: "sectionF.toolsAdministered",
						label: "Tools Administered",
						type: "array-object",
						aliases: ["tool", "assessment tool", "test"],
					},
					{
						id: "sectionF.overallSummary",
						label: "Overall Summary",
						type: "string",
						aliases: ["summary", "overall"],
					},
				],
			},
			{
				id: "section-g",
				name: "Goals & Intervention",
				fields: [
					{
						id: "sectionG.shortTermGoals",
						label: "Short Term Goals",
						type: "array-object",
						aliases: ["short term goal", "stg"],
					},
					{
						id: "sectionG.longTermGoals",
						label: "Long Term Goals",
						type: "array-object",
						aliases: ["long term goal", "ltg"],
					},
					{
						id: "sectionG.recommendedFrequency",
						label: "Recommended Frequency",
						type: "number",
						aliases: ["frequency", "sessions per week"],
					},
					{
						id: "sectionG.sessionDurationMinutes",
						label: "Session Duration (minutes)",
						type: "number",
						aliases: ["duration", "session length"],
					},
					{
						id: "sectionG.interventionSetting",
						label: "Intervention Setting",
						type: "string",
						aliases: ["setting", "environment"],
					},
					{
						id: "sectionG.reviewPeriodWeeks",
						label: "Review Period (weeks)",
						type: "number",
						aliases: ["review", "review period"],
					},
					{
						id: "sectionG.homeProgramRecommendations",
						label: "Home Program Recommendations",
						type: "string",
						aliases: ["home program", "homework"],
					},
					{
						id: "sectionG.equipment",
						label: "Equipment",
						type: "array-string",
						aliases: ["equipment", "aids"],
					},
					{
						id: "sectionG.referrals",
						label: "Referrals",
						type: "string",
						aliases: ["referral", "referred"],
					},
				],
			},
			{
				id: "section-h",
				name: "Signatures & Consent",
				fields: [
					{
						id: "sectionH.therapistName",
						label: "Therapist Name",
						type: "string",
						aliases: [],
					},
					{
						id: "sectionH.guardianName",
						label: "Guardian Name",
						type: "string",
						aliases: [],
					},
					{
						id: "sectionH.consentObtained",
						label: "Consent Obtained",
						type: "boolean",
						aliases: ["consent"],
					},
				],
			},
		],
	},
	followUpAssessment: {
		id: "follow-up-assessment",
		sections: [
			{
				id: "section-a",
				name: "Session Info",
				fields: [
					{
						id: "sectionA.date",
						label: "Date",
						type: "date",
						aliases: ["session date"],
					},
					{
						id: "sectionA.sessionNumber",
						label: "Session Number",
						type: "number",
						aliases: ["session", "session number"],
					},
					{
						id: "sectionA.weeksSinceInitial",
						label: "Weeks Since Initial",
						type: "number",
						aliases: ["weeks", "since initial"],
					},
					{
						id: "sectionA.parentPresent",
						label: "Parent Present",
						type: "boolean",
						aliases: ["parent", "caregiver present"],
					},
				],
			},
			{
				id: "section-b",
				name: "Goal Progress",
				fields: [
					{
						id: "sectionB.goalProgress",
						label: "Goal Progress",
						type: "array-object",
						aliases: ["goal", "progress", "goal progress"],
					},
				],
			},
			{
				id: "section-c",
				name: "Sensory Progress",
				fields: [
					{
						id: "sectionC.sensoryCheck",
						label: "Sensory Check",
						type: "array-object",
						aliases: ["sensory", "sensory progress"],
					},
				],
			},
			{
				id: "section-d",
				name: "Clinical Questions",
				fields: [
					{
						id: "sectionD.improvementsAtHome",
						label: "Improvements at Home",
						type: "array-string",
						aliases: ["home improvement", "improved at home"],
					},
					{
						id: "sectionD.improvementsAtSchool",
						label: "Improvements at School",
						type: "array-string",
						aliases: ["school improvement", "improved at school"],
					},
					{
						id: "sectionD.regressions",
						label: "Regressions",
						type: "string",
						aliases: ["regression", "regressed"],
					},
					{
						id: "sectionD.homeProgramCompliance",
						label: "Home Program Compliance",
						type: "string",
						aliases: ["compliance", "home program"],
					},
					{
						id: "sectionD.sessionEngagement",
						label: "Session Engagement",
						type: "string",
						aliases: ["engagement", "engaged"],
					},
					{
						id: "sectionD.schoolPerformanceChanges",
						label: "School Performance Changes",
						type: "array-string",
						aliases: ["school", "academic"],
					},
					{
						id: "sectionD.behaviourChanges",
						label: "Behaviour Changes",
						type: "array-string",
						aliases: ["behaviour", "behavior", "changed"],
					},
					{
						id: "sectionD.newSkillsObserved",
						label: "New Skills Observed",
						type: "array-string",
						aliases: ["new skill", "learned", "newly"],
					},
					{
						id: "sectionD.equipmentEffectivelyUsed",
						label: "Equipment Effectively Used",
						type: "array-string",
						aliases: ["equipment", "used"],
					},
					{
						id: "sectionD.therapistObservations",
						label: "Therapist Observations",
						type: "array-string",
						aliases: ["observation", "observed"],
					},
				],
			},
			{
				id: "section-e",
				name: "Plan Adjustments",
				fields: [
					{
						id: "sectionE.goalStatusDecisions",
						label: "Goal Status Decisions",
						type: "array-string",
						aliases: ["goal decision", "status"],
					},
					{
						id: "sectionE.updatedGoals",
						label: "Updated Goals",
						type: "array-object",
						aliases: ["updated goal", "new goal"],
					},
					{
						id: "sectionE.updatedHomeProgram",
						label: "Updated Home Program",
						type: "string",
						aliases: ["home program", "updated"],
					},
					{
						id: "sectionE.nextFollowUpDate",
						label: "Next Follow-up Date",
						type: "string",
						aliases: ["next follow up", "follow up date"],
					},
					{
						id: "sectionE.nextAssessmentType",
						label: "Next Assessment Type",
						type: "string",
						aliases: ["next assessment"],
					},
					{
						id: "sectionE.clinicalNotes",
						label: "Clinical Notes",
						type: "string",
						aliases: ["notes", "clinical notes"],
					},
				],
			},
			{
				id: "section-f",
				name: "Signatures",
				fields: [
					{
						id: "sectionF.therapistName",
						label: "Therapist Name",
						type: "string",
						aliases: [],
					},
					{
						id: "sectionF.guardianName",
						label: "Guardian Name",
						type: "string",
						aliases: [],
					},
				],
			},
		],
	},
} as const;
