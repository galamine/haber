import "dotenv/config";
import { createPrismaClient } from "../src/index";
import { PERMISSIONS } from "../src/permissions";

const prisma = createPrismaClient();
const allPermissions = Object.values(PERMISSIONS);

// ── 1. CLINIC ────────────────────────────────────────────────────────────────

const clinic = await prisma.clinic.upsert({
	where: { id: "sf_clinic" },
	update: {},
	create: {
		id: "sf_clinic",
		name: "Sunshine Children's OT Clinic",
		address: "14 Nungambakkam High Road, Chennai 600034",
		contactName: "Ms. Lakshmi Nair",
		contactPhone: "+91-9876543210",
		contactEmail: "admin@sunshine-ot.example.com",
		timezone: "Asia/Kolkata",
	},
});
console.log(`Clinic: ${clinic.name}`);

// ── 2. USERS ─────────────────────────────────────────────────────────────────

const staffUser = await prisma.user.upsert({
	where: { email: "staff.intake@sf.seed.local" },
	update: {
		role: "STAFF",
		clinicId: clinic.id,
		loginEnabled: true,
		emailVerified: true,
	},
	create: {
		id: "sf_staff",
		email: "staff.intake@sf.seed.local",
		role: "STAFF",
		clinicId: clinic.id,
		loginEnabled: true,
		emailVerified: true,
	},
});

const priyaUser = await prisma.user.upsert({
	where: { email: "therapist.priya@sf.seed.local" },
	update: {
		role: "THERAPIST",
		clinicId: clinic.id,
		loginEnabled: true,
		emailVerified: true,
	},
	create: {
		id: "sf_therapist_priya",
		email: "therapist.priya@sf.seed.local",
		role: "THERAPIST",
		clinicId: clinic.id,
		loginEnabled: true,
		emailVerified: true,
		credentialsQualifications: "BOT, MOT (Pediatrics)",
	},
});

const raviUser = await prisma.user.upsert({
	where: { email: "therapist.ravi@sf.seed.local" },
	update: {
		role: "THERAPIST",
		clinicId: clinic.id,
		loginEnabled: true,
		emailVerified: true,
	},
	create: {
		id: "sf_therapist_ravi",
		email: "therapist.ravi@sf.seed.local",
		role: "THERAPIST",
		clinicId: clinic.id,
		loginEnabled: true,
		emailVerified: true,
		credentialsQualifications: "BOT, MSc OT",
	},
});

for (const user of [staffUser, priyaUser, raviUser]) {
	await prisma.$transaction([
		prisma.userPermission.deleteMany({ where: { userId: user.id } }),
		prisma.userPermission.createMany({
			data: allPermissions.map((permission) => ({
				userId: user.id,
				permission,
			})),
		}),
	]);
}

await prisma.userProfile.upsert({
	where: { userId: priyaUser.id },
	update: {},
	create: {
		userId: priyaUser.id,
		name: "Dr. Priya Menon",
		phoneNumber: "+91-9876500001",
		district: "Chennai",
		state: "Tamil Nadu",
		dateOfBirth: new Date("1975-03-15"),
	},
});

await prisma.userProfile.upsert({
	where: { userId: raviUser.id },
	update: {},
	create: {
		userId: raviUser.id,
		name: "Mr. Ravi Krishnan",
		phoneNumber: "+91-9876500002",
		district: "Chennai",
		state: "Tamil Nadu",
		dateOfBirth: new Date("1980-07-22"),
	},
});

console.log(`Users: ${staffUser.email}, ${priyaUser.email}, ${raviUser.email}`);

// ── 3. CHILDREN + GUARDIANS ──────────────────────────────────────────────────

await prisma.child.upsert({
	where: { id: "sf_child_aarav" },
	update: {},
	create: {
		id: "sf_child_aarav",
		clinicId: clinic.id,
		opNumber: "SF-OP-001",
		fullName: "Aarav Sharma",
		dob: new Date("2020-03-15"),
		sex: "male",
		address: "42 Anna Nagar East, Chennai 600102",
		spokenLanguages: ["Tamil", "English"],
		school: "Little Buds Preschool, Anna Nagar",
		consentStatus: "GRANTED",
		medicalHistory: {
			primaryDiagnoses: ["asd", "spd"],
			currentMedications: "Multivitamin syrup 5 ml OD",
			allergies: "Mild eczema — avoid lanolin",
			previousTherapies: "Speech therapy 6 months",
		},
	},
});

await prisma.child.upsert({
	where: { id: "sf_child_meera" },
	update: {},
	create: {
		id: "sf_child_meera",
		clinicId: clinic.id,
		opNumber: "SF-OP-002",
		fullName: "Meera Pillai",
		dob: new Date("2017-08-22"),
		sex: "female",
		address: "7 Besant Nagar 2nd Avenue, Chennai 600090",
		spokenLanguages: ["Tamil", "English"],
		school: "St. Thomas Matriculation School",
		consentStatus: "GRANTED",
		medicalHistory: {
			primaryDiagnoses: ["dcd", "dyspraxia"],
			currentMedications: "None",
			allergies: "None",
			previousTherapies: "None",
		},
	},
});

await prisma.guardian.upsert({
	where: { childId: "sf_child_aarav" },
	update: {},
	create: {
		id: "sf_guardian_aarav",
		childId: "sf_child_aarav",
		name: "Riya Sharma",
		relation: "Mother",
		phone: "+91-9898001234",
		email: "riya.sharma@example.com",
	},
});

await prisma.guardian.upsert({
	where: { childId: "sf_child_meera" },
	update: {},
	create: {
		id: "sf_guardian_meera",
		childId: "sf_child_meera",
		name: "Suresh Pillai",
		relation: "Father",
		phone: "+91-9898005678",
		email: "suresh.pillai@example.com",
	},
});

console.log("Children and guardians created");

// ── 4. CONSENT RECORDS ───────────────────────────────────────────────────────

const consentTs = new Date("2026-05-06T10:00:00+05:30");
for (const { childId, typedName } of [
	{ childId: "sf_child_aarav", typedName: "Riya Sharma" },
	{ childId: "sf_child_meera", typedName: "Suresh Pillai" },
]) {
	for (const consentType of [
		"TREATMENT",
		"DATA_PROCESSING",
		"IMAGE_VIDEO_CAPTURE",
	] as const) {
		await prisma.consentRecord.upsert({
			where: { childId_consentType: { childId, consentType } },
			update: {},
			create: {
				childId,
				consentType,
				typedName,
				checkbox: true,
				timestamp: consentTs,
				ip: "203.0.113.10",
			},
		});
	}
}

console.log("Consent records created");

// ── 5. CHILD-THERAPIST ASSIGNMENTS ───────────────────────────────────────────

await prisma.childTherapistAssignment.upsert({
	where: { id: "sf_cta_aarav" },
	update: {},
	create: {
		id: "sf_cta_aarav",
		childId: "sf_child_aarav",
		therapistId: priyaUser.id,
		assignedAt: new Date("2026-05-07"),
		reviewDueAt: new Date("2026-08-07"),
	},
});

await prisma.childTherapistAssignment.upsert({
	where: { id: "sf_cta_meera" },
	update: {},
	create: {
		id: "sf_cta_meera",
		childId: "sf_child_meera",
		therapistId: raviUser.id,
		assignedAt: new Date("2026-05-07"),
		reviewDueAt: new Date("2026-08-07"),
	},
});

console.log("Therapist assignments created");

// ── 6. GAMES + GAME VERSIONS ─────────────────────────────────────────────────

const gameBubble = await prisma.game.upsert({
	where: { id: "sf_game_bubble" },
	update: {},
	create: {
		id: "sf_game_bubble",
		name: "Bubble Burst Sensory",
		description:
			"Pop virtual bubbles with full-body movements; targets tactile and visual modulation.",
		categoryId: "gc_sensory_integration",
		targetIssues: ["tactile_sensitivity", "attention", "visual_tracking"],
		difficulty: "easy",
		ageRangeMin: 3,
		ageRangeMax: 7,
		isGlobal: true,
	},
});

const gameBalance = await prisma.game.upsert({
	where: { id: "sf_game_balance" },
	update: {},
	create: {
		id: "sf_game_balance",
		name: "Balance Board Reach",
		description:
			"Maintain balance while reaching for targets; vestibular and proprioceptive processing.",
		categoryId: "gc_balance",
		targetIssues: [
			"vestibular_seeking",
			"proprioceptive_processing",
			"postural_control",
		],
		difficulty: "medium",
		ageRangeMin: 4,
		ageRangeMax: 9,
		isGlobal: true,
	},
});

const gameTrace = await prisma.game.upsert({
	where: { id: "sf_game_trace" },
	update: {},
	create: {
		id: "sf_game_trace",
		name: "Precision Trace",
		description:
			"Trace letter and shape paths with increasing accuracy; handwriting readiness.",
		categoryId: "gc_fine_motor",
		targetIssues: ["handwriting", "pencil_control", "visual_motor_integration"],
		difficulty: "medium",
		ageRangeMin: 5,
		ageRangeMax: 12,
		isGlobal: true,
	},
});

const gameCatch = await prisma.game.upsert({
	where: { id: "sf_game_catch" },
	update: {},
	create: {
		id: "sf_game_catch",
		name: "Catch & Release",
		description:
			"Time catches to on-screen targets; motor planning and bilateral coordination.",
		categoryId: "gc_coordination",
		targetIssues: [
			"bilateral_coordination",
			"motor_planning",
			"eye_hand_coordination",
		],
		difficulty: "medium",
		ageRangeMin: 6,
		ageRangeMax: 12,
		isGlobal: true,
	},
});

const gvBubble = await prisma.gameVersion.upsert({
	where: { id: "sf_gv_bubble" },
	update: {},
	create: {
		id: "sf_gv_bubble",
		gameId: gameBubble.id,
		versionNumber: "1",
		isLatest: true,
		rubricVersion: "v1",
		scoringSchema: {
			fields: [
				{ key: "bubbles_popped", type: "integer", label: "Bubbles Popped" },
				{ key: "accuracy_pct", type: "float", label: "Accuracy %" },
				{
					key: "engagement_score",
					type: "integer",
					label: "Engagement Score",
					min: 1,
					max: 5,
				},
			],
		},
	},
});

const gvBalance = await prisma.gameVersion.upsert({
	where: { id: "sf_gv_balance" },
	update: {},
	create: {
		id: "sf_gv_balance",
		gameId: gameBalance.id,
		versionNumber: "1",
		isLatest: true,
		rubricVersion: "v1",
		scoringSchema: {
			fields: [
				{
					key: "balance_hold_seconds",
					type: "float",
					label: "Balance Hold (s)",
				},
				{ key: "targets_reached", type: "integer", label: "Targets Reached" },
				{ key: "falls_count", type: "integer", label: "Falls" },
			],
		},
	},
});

const gvTrace = await prisma.gameVersion.upsert({
	where: { id: "sf_gv_trace" },
	update: {},
	create: {
		id: "sf_gv_trace",
		gameId: gameTrace.id,
		versionNumber: "1",
		isLatest: true,
		rubricVersion: "v1",
		scoringSchema: {
			fields: [
				{ key: "accuracy_pct", type: "float", label: "Trace Accuracy %" },
				{
					key: "letter_forms_correct",
					type: "integer",
					label: "Letter Forms Correct",
				},
				{ key: "speed_lpm", type: "float", label: "Speed (letters/min)" },
			],
		},
	},
});

const gvCatch = await prisma.gameVersion.upsert({
	where: { id: "sf_gv_catch" },
	update: {},
	create: {
		id: "sf_gv_catch",
		gameId: gameCatch.id,
		versionNumber: "1",
		isLatest: true,
		rubricVersion: "v1",
		scoringSchema: {
			fields: [
				{
					key: "catches_successful",
					type: "integer",
					label: "Successful Catches",
				},
				{ key: "total_attempts", type: "integer", label: "Total Attempts" },
				{
					key: "bilateral_score",
					type: "integer",
					label: "Bilateral Score",
					min: 1,
					max: 5,
				},
			],
		},
	},
});

console.log("Games and versions created");

// ── 7. INITIAL ASSESSMENTS ───────────────────────────────────────────────────

const assessmentAarav = await prisma.initialAssessment.upsert({
	where: { id: "sf_assessment_aarav" },
	update: {},
	create: {
		id: "sf_assessment_aarav",
		childId: "sf_child_aarav",
		therapistId: priyaUser.id,
		versionNumber: 1,
		sectionA: {
			patientName: "Aarav Sharma",
			dob: "2020-03-15",
			age: { years: 5, months: 2 },
			gender: "Male",
			assessmentDate: "2026-05-07",
			location: "Sunshine Children's OT Clinic, Chennai",
			referringTherapist:
				"Dr. Karthik Subramaniam (Developmental Paediatrician)",
			referralSource: "Paediatric outpatient referral",
			caregiverName: "Riya Sharma",
			caregiverRelation: "Mother",
			caregiverContact: "+91-9898001234",
			caregiverEmail: "riya.sharma@example.com",
			chiefComplaint:
				"Avoids messy textures, frequent meltdowns in noisy environments, toe-walking, limited eye contact.",
		},
		sectionB: {
			primaryDiagnoses: ["asd", "spd"],
			prenatalHistory: "Uncomplicated pregnancy.",
			birthHistory: "Emergency C-section. APGAR 7/9.",
			neonatalHistory: "48h NICU stay for observation; discharged stable.",
			gestationalAgeWeeks: 39,
			medicalHistory: "Recurrent otitis media age 2; bilateral grommets age 3.",
			currentMedications: "Multivitamin syrup 5 ml OD.",
			allergies: "Mild eczema; avoid lanolin-based products.",
			previousTherapies: "Speech therapy 6 months (3 sessions/week).",
		},
		sectionC: {
			milestones: [
				{
					milestoneId: "head_control",
					achievedAtAgeMonths: 4,
					delayed: false,
					notes: "",
				},
				{
					milestoneId: "rolling",
					achievedAtAgeMonths: 6,
					delayed: false,
					notes: "",
				},
				{
					milestoneId: "sitting_independently",
					achievedAtAgeMonths: 8,
					delayed: false,
					notes: "",
				},
				{
					milestoneId: "crawling",
					achievedAtAgeMonths: 11,
					delayed: false,
					notes: "",
				},
				{
					milestoneId: "standing",
					achievedAtAgeMonths: 13,
					delayed: false,
					notes: "",
				},
				{
					milestoneId: "walking",
					achievedAtAgeMonths: 16,
					delayed: true,
					notes: "Toe-walking past 24 months.",
				},
				{
					milestoneId: "first_words",
					achievedAtAgeMonths: 24,
					delayed: true,
					notes: "Single words only at 24 months.",
				},
				{
					milestoneId: "two_word_phrases",
					achievedAtAgeMonths: 36,
					delayed: true,
					notes: "",
				},
				{
					milestoneId: "toilet_training",
					achievedAtAgeMonths: null,
					delayed: true,
					notes: "In progress; resists toilet.",
				},
				{
					milestoneId: "self_feeding",
					achievedAtAgeMonths: 30,
					delayed: true,
					notes: "Refuses textured food.",
				},
				{
					milestoneId: "dressing",
					achievedAtAgeMonths: null,
					delayed: true,
					notes: "Tolerates pull-on clothing only.",
				},
				{
					milestoneId: "eye_contact_social_smile",
					achievedAtAgeMonths: 18,
					delayed: true,
					notes: "Reduced, inconsistent.",
				},
			],
		},
		sectionD: {
			sensoryProfile: [
				{
					systemId: "tactile",
					rating: 5,
					notes: "Avoids messy textures; tags on clothing trigger meltdowns.",
				},
				{
					systemId: "vestibular",
					rating: 4,
					notes: "Seeks rotary movement; spins frequently.",
				},
				{
					systemId: "proprioceptive",
					rating: 4,
					notes: "Crashing, jumping, deep pressure seeking.",
				},
				{
					systemId: "auditory",
					rating: 5,
					notes: "Covers ears; meltdowns in malls.",
				},
				{ systemId: "visual", rating: 3, notes: "Typical." },
				{
					systemId: "olfactory_gustatory",
					rating: 5,
					notes: "Refuses strong-smelling foods; gags on textures.",
				},
				{
					systemId: "interoception",
					rating: 2,
					notes: "Limited awareness of toilet needs and hunger.",
				},
			],
			behaviouralObservations:
				"Sought weighted lap pad during transitions. Covered ears repeatedly. Avoided sand bin; tolerated rice bin for 2 min after modeling.",
		},
		sectionE: {
			functionalConcerns: [
				"buttoning_zipping_dressing",
				"feeding_skills_oral_motor",
				"play_skills",
				"social_participation_peer_interaction",
				"adl_independence",
				"emotional_regulation_behavior",
			],
			observations:
				"Bilateral coordination at 2nd percentile (BOT-2). Rigid play schemas. Strong proprioceptive seeking. Refuses messy art tasks.",
		},
		sectionF: {
			toolsAdministered: [
				{
					toolId: "sp2",
					scoresSummary:
						"Significant sensory sensitivity (>2 SD) and sensory avoiding elevated.",
				},
				{
					toolId: "bot2",
					scoresSummary: "Bilateral coordination at 2nd percentile.",
				},
				{
					toolId: "cars2",
					scoresSummary: "Total score 32.5 — Moderate autism range.",
				},
			],
			overallSummary:
				"Profile consistent with ASD + sensory modulation disorder; bilateral coordination at 2nd percentile; auditory and tactile hyper-responsivity dominant.",
		},
		sectionG: {
			shortTermGoals: [
				{
					goalId: "sf_goal_aarav_st1",
					description:
						"Tolerate light touch to hands 3/5 trials without distress.",
					targetAttainmentPct: 100,
				},
				{
					goalId: "sf_goal_aarav_st2",
					description: "Engage in sand/rice tactile bin play for 5 minutes.",
					targetAttainmentPct: 100,
				},
			],
			longTermGoals: [
				{
					goalId: "sf_goal_aarav_lt1",
					description:
						"Independent participation in group sensory activities at school.",
					targetAttainmentPct: 100,
				},
				{
					goalId: "sf_goal_aarav_lt2",
					description:
						"Independently use 2+ self-regulation strategies when dysregulated.",
					targetAttainmentPct: 100,
				},
			],
			recommendedFrequency: 3,
			sessionDurationMinutes: 60,
			interventionSetting: "hybrid",
			reviewPeriodWeeks: 6,
			homeProgramRecommendations:
				"Wilbarger brushing protocol 2x daily; weighted blanket at bedtime; chewy tool during homework.",
			equipment: [
				"lycra_body_sock",
				"weighted_lap_pad",
				"linear_swing",
				"tactile_bin_rice",
				"noise_cancelling_headphones",
			],
			referrals: "None at this time.",
		},
		sectionH: {
			therapistName: "Dr. Priya Menon",
			therapistCredentials: "BOT, MOT (Pediatrics)",
			signedAt: "2026-05-07T10:25:00+05:30",
			guardianName: "Riya Sharma",
			guardianIp: "203.0.113.10",
			consentObtained: true,
		},
	},
});

for (const sp of [
	{
		id: "sf_sp_ai_tactile",
		systemId: "tactile",
		rating: 5,
		notes: "Avoids messy textures; tags trigger meltdowns.",
	},
	{
		id: "sf_sp_ai_vestibular",
		systemId: "vestibular",
		rating: 4,
		notes: "Seeks rotary movement; spins frequently.",
	},
	{
		id: "sf_sp_ai_proprioceptive",
		systemId: "proprioceptive",
		rating: 4,
		notes: "Crashing, jumping, deep pressure seeking.",
	},
	{
		id: "sf_sp_ai_auditory",
		systemId: "auditory",
		rating: 5,
		notes: "Covers ears; meltdowns in malls.",
	},
	{ id: "sf_sp_ai_visual", systemId: "visual", rating: 3, notes: "Typical." },
	{
		id: "sf_sp_ai_olfactory",
		systemId: "olfactory_gustatory",
		rating: 5,
		notes: "Refuses strong-smelling foods; gags on textures.",
	},
	{
		id: "sf_sp_ai_interoception",
		systemId: "interoception",
		rating: 2,
		notes: "Limited awareness of toilet needs and hunger.",
	},
]) {
	await prisma.sensoryProfile.upsert({
		where: { id: sp.id },
		update: {},
		create: {
			id: sp.id,
			assessmentId: assessmentAarav.id,
			systemId: sp.systemId,
			rating: sp.rating,
			notes: sp.notes,
		},
	});
}

const assessmentMeera = await prisma.initialAssessment.upsert({
	where: { id: "sf_assessment_meera" },
	update: {},
	create: {
		id: "sf_assessment_meera",
		childId: "sf_child_meera",
		therapistId: raviUser.id,
		versionNumber: 1,
		sectionA: {
			patientName: "Meera Pillai",
			dob: "2017-08-22",
			age: { years: 8, months: 8 },
			gender: "Female",
			assessmentDate: "2026-05-07",
			location: "Sunshine Children's OT Clinic, Chennai",
			referringTherapist: "Dr. Anita Chandrasekaran (School Physician)",
			referralSource: "School referral",
			caregiverName: "Suresh Pillai",
			caregiverRelation: "Father",
			caregiverContact: "+91-9898005678",
			caregiverEmail: "suresh.pillai@example.com",
			chiefComplaint:
				"Clumsy, very slow illegible handwriting, avoids PE, low self-esteem around physical activities.",
		},
		sectionB: {
			primaryDiagnoses: ["dcd", "dyspraxia"],
			prenatalHistory: "Uncomplicated pregnancy.",
			birthHistory: "Normal vaginal delivery. APGAR 9/10.",
			neonatalHistory: "No NICU. Discharged at 48h.",
			gestationalAgeWeeks: 40,
			medicalHistory: "Nil significant.",
			currentMedications: "None.",
			allergies: "None.",
			previousTherapies: "None.",
		},
		sectionC: {
			milestones: [
				{
					milestoneId: "head_control",
					achievedAtAgeMonths: 3,
					delayed: false,
					notes: "",
				},
				{
					milestoneId: "rolling",
					achievedAtAgeMonths: 5,
					delayed: false,
					notes: "",
				},
				{
					milestoneId: "sitting_independently",
					achievedAtAgeMonths: 7,
					delayed: false,
					notes: "",
				},
				{
					milestoneId: "crawling",
					achievedAtAgeMonths: 10,
					delayed: false,
					notes: "",
				},
				{
					milestoneId: "standing",
					achievedAtAgeMonths: 12,
					delayed: false,
					notes: "",
				},
				{
					milestoneId: "walking",
					achievedAtAgeMonths: 14,
					delayed: false,
					notes: "",
				},
				{
					milestoneId: "first_words",
					achievedAtAgeMonths: 12,
					delayed: false,
					notes: "",
				},
				{
					milestoneId: "two_word_phrases",
					achievedAtAgeMonths: 24,
					delayed: false,
					notes: "",
				},
				{
					milestoneId: "toilet_training",
					achievedAtAgeMonths: 30,
					delayed: false,
					notes: "",
				},
				{
					milestoneId: "self_feeding",
					achievedAtAgeMonths: 18,
					delayed: false,
					notes: "",
				},
				{
					milestoneId: "dressing",
					achievedAtAgeMonths: 48,
					delayed: true,
					notes: "Still slow; struggles with buttons and zippers.",
				},
				{
					milestoneId: "eye_contact_social_smile",
					achievedAtAgeMonths: 6,
					delayed: false,
					notes: "",
				},
			],
		},
		sectionD: {
			sensoryProfile: [
				{ systemId: "tactile", rating: 3, notes: "Typical." },
				{ systemId: "vestibular", rating: 3, notes: "Typical." },
				{
					systemId: "proprioceptive",
					rating: 4,
					notes: "Poor body awareness; underregisters proprioceptive feedback.",
				},
				{ systemId: "auditory", rating: 3, notes: "Typical." },
				{
					systemId: "visual",
					rating: 4,
					notes:
						"Visual-motor integration difficulties; struggles copying from board.",
				},
				{ systemId: "olfactory_gustatory", rating: 3, notes: "Typical." },
				{ systemId: "interoception", rating: 3, notes: "Typical." },
			],
			behaviouralObservations:
				"Frequent collisions with furniture during clinic navigation. Reversed b/d during writing task. Very slow pencil speed; grip awkward and effortful.",
		},
		sectionE: {
			functionalConcerns: [
				"pencil_grasp_handwriting",
				"bilateral_coordination",
				"gross_motor_motor_planning",
				"eye_hand_coordination_visual_motor",
				"adl_independence",
			],
			observations:
				"MABC-2: 3rd percentile. Beery VMI: 7th percentile. Handwriting speed 40% below class average. Avoids PE; negative self-talk about physical tasks.",
		},
		sectionF: {
			toolsAdministered: [
				{
					toolId: "mabc2",
					scoresSummary:
						"3rd percentile — significant motor impairment category.",
				},
				{
					toolId: "beery_vmi",
					scoresSummary:
						"7th percentile; visual-motor integration well below age norms.",
				},
				{
					toolId: "bot2",
					scoresSummary:
						"Running speed 4th percentile. Fine motor precision 8th percentile.",
				},
			],
			overallSummary:
				"Profile consistent with DCD/dyspraxia; significant motor impairment across fine and gross domains; visual-motor integration deficit.",
		},
		sectionG: {
			shortTermGoals: [
				{
					goalId: "sf_goal_meera_st1",
					description:
						"Produce legible handwriting at functional speed for classroom tasks.",
					targetAttainmentPct: 100,
				},
				{
					goalId: "sf_goal_meera_st2",
					description: "Catch a tennis ball 7/10 trials at 2 metres distance.",
					targetAttainmentPct: 100,
				},
			],
			longTermGoals: [
				{
					goalId: "sf_goal_meera_lt1",
					description:
						"Active participation in PE class activities alongside peers.",
					targetAttainmentPct: 100,
				},
				{
					goalId: "sf_goal_meera_lt2",
					description:
						"Consistent written output at grade-level speed and legibility.",
					targetAttainmentPct: 100,
				},
			],
			recommendedFrequency: 2,
			sessionDurationMinutes: 60,
			interventionSetting: "hybrid",
			reviewPeriodWeeks: 6,
			homeProgramRecommendations:
				"Daily 10-min handwriting practice; practice chosen CO-OP skill 5 min daily; encourage swimming/cycling.",
			equipment: [
				"slant_board",
				"pencil_grips",
				"graph_paper",
				"balance_beam",
				"catching_mitts",
			],
			referrals: "None at this time.",
		},
		sectionH: {
			therapistName: "Mr. Ravi Krishnan",
			therapistCredentials: "BOT, MSc OT",
			signedAt: "2026-05-07T11:30:00+05:30",
			guardianName: "Suresh Pillai",
			guardianIp: "203.0.113.10",
			consentObtained: true,
		},
	},
});

for (const sp of [
	{ id: "sf_sp_mi_tactile", systemId: "tactile", rating: 3, notes: "Typical." },
	{
		id: "sf_sp_mi_vestibular",
		systemId: "vestibular",
		rating: 3,
		notes: "Typical.",
	},
	{
		id: "sf_sp_mi_proprioceptive",
		systemId: "proprioceptive",
		rating: 4,
		notes: "Poor body awareness; underregisters proprioceptive feedback.",
	},
	{
		id: "sf_sp_mi_auditory",
		systemId: "auditory",
		rating: 3,
		notes: "Typical.",
	},
	{
		id: "sf_sp_mi_visual",
		systemId: "visual",
		rating: 4,
		notes:
			"Visual-motor integration difficulties; struggles copying from board.",
	},
	{
		id: "sf_sp_mi_olfactory",
		systemId: "olfactory_gustatory",
		rating: 3,
		notes: "Typical.",
	},
	{
		id: "sf_sp_mi_interoception",
		systemId: "interoception",
		rating: 3,
		notes: "Typical.",
	},
]) {
	await prisma.sensoryProfile.upsert({
		where: { id: sp.id },
		update: {},
		create: {
			id: sp.id,
			assessmentId: assessmentMeera.id,
			systemId: sp.systemId,
			rating: sp.rating,
			notes: sp.notes,
		},
	});
}

console.log("Initial assessments and sensory profiles created");

// ── 8. TREATMENT PLANS + GOALS ───────────────────────────────────────────────

const planAarav = await prisma.treatmentPlan.upsert({
	where: { id: "sf_plan_aarav" },
	update: {},
	create: {
		id: "sf_plan_aarav",
		childId: "sf_child_aarav",
		clinicId: clinic.id,
		createdById: priyaUser.id,
		name: "Aarav — ASD Sensory Integration Programme",
		programLengthWeeks: 12,
		startDate: new Date("2026-05-14"),
		projectedEndDate: new Date("2026-08-06"),
		sessionDurationMinutes: 60,
		status: "ACTIVE",
		isActive: true,
		versionNumber: 1,
		sourcePresetId: "preset_asd_sensory",
		targetMilestones: [
			"eye_contact_social_smile",
			"two_word_phrases",
			"self_feeding",
		],
		phases: [
			{
				phase: "arrival_regulation",
				minutes: 5,
				label: "Arrival & regulation check",
			},
			{
				phase: "heavy_work",
				minutes: 15,
				label: "Heavy work (bear walks, animal walks)",
			},
			{
				phase: "sensory_circuit",
				minutes: 20,
				label: "Sensory circuit (swinging, tactile, balance)",
			},
			{
				phase: "fine_motor",
				minutes: 15,
				label: "Fine motor / structured play",
			},
			{
				phase: "cooldown_transition",
				minutes: 5,
				label: "Cool-down & transition prep",
			},
		],
	},
});

for (const g of [
	{
		id: "sf_goal_aarav_st1",
		description: "Tolerate light touch to hands 3/5 trials without distress.",
		horizon: "SHORT_TERM" as const,
		currentAttainmentPct: 80,
		status: "IN_PROGRESS" as const,
	},
	{
		id: "sf_goal_aarav_st2",
		description: "Engage in sand/rice tactile bin play for 5 minutes.",
		horizon: "SHORT_TERM" as const,
		currentAttainmentPct: 100,
		status: "MET" as const,
	},
	{
		id: "sf_goal_aarav_lt1",
		description:
			"Independent participation in group sensory activities at school.",
		horizon: "LONG_TERM" as const,
		currentAttainmentPct: 25,
		status: "IN_PROGRESS" as const,
	},
	{
		id: "sf_goal_aarav_lt2",
		description:
			"Independently use 2+ self-regulation strategies when dysregulated.",
		horizon: "LONG_TERM" as const,
		currentAttainmentPct: 30,
		status: "IN_PROGRESS" as const,
	},
]) {
	await prisma.goal.upsert({
		where: { id: g.id },
		update: {},
		create: {
			id: g.id,
			treatmentPlanId: planAarav.id,
			description: g.description,
			horizon: g.horizon,
			targetAttainmentPct: 100,
			currentAttainmentPct: g.currentAttainmentPct,
			status: g.status,
		},
	});
}

await prisma.planGameAssignment.upsert({
	where: { id: "sf_pga_aarav_1" },
	update: {},
	create: {
		id: "sf_pga_aarav_1",
		planId: planAarav.id,
		gameVersionId: gvBubble.id,
		durationSeconds: 600,
		repetitions: 3,
		frequencyPerWeek: 3,
		instructions:
			"Use during sensory circuit. Encourage full-body movement. Allow breaks if dysregulated.",
		appliesToPhase: "sensory_circuit",
		order: 1,
	},
});

await prisma.planGameAssignment.upsert({
	where: { id: "sf_pga_aarav_2" },
	update: {},
	create: {
		id: "sf_pga_aarav_2",
		planId: planAarav.id,
		gameVersionId: gvBalance.id,
		durationSeconds: 480,
		repetitions: 2,
		frequencyPerWeek: 3,
		instructions:
			"Use during heavy work. Spot for safety. Increase challenge when 3/4 sessions stable.",
		appliesToPhase: "heavy_work",
		order: 2,
	},
});

const planMeera = await prisma.treatmentPlan.upsert({
	where: { id: "sf_plan_meera" },
	update: {},
	create: {
		id: "sf_plan_meera",
		childId: "sf_child_meera",
		clinicId: clinic.id,
		createdById: raviUser.id,
		name: "Meera — DCD Motor & Handwriting Programme",
		programLengthWeeks: 16,
		startDate: new Date("2026-05-14"),
		projectedEndDate: new Date("2026-09-03"),
		sessionDurationMinutes: 60,
		status: "ACTIVE",
		isActive: true,
		versionNumber: 1,
		sourcePresetId: "preset_dcd_dyspraxia",
		targetMilestones: ["dressing"],
		phases: [
			{
				phase: "warmup_body_awareness",
				minutes: 10,
				label: "Warm-up & body awareness",
			},
			{
				phase: "handwriting_fine_motor",
				minutes: 20,
				label: "Handwriting & fine motor (HWT)",
			},
			{
				phase: "gross_motor_co_op",
				minutes: 20,
				label: "Gross motor (CO-OP framework)",
			},
			{
				phase: "self_reflection",
				minutes: 10,
				label: "Self-reflection & goal-setting",
			},
		],
	},
});

for (const g of [
	{
		id: "sf_goal_meera_st1",
		description:
			"Produce legible handwriting at functional speed for classroom tasks.",
		horizon: "SHORT_TERM" as const,
		currentAttainmentPct: 70,
		status: "IN_PROGRESS" as const,
	},
	{
		id: "sf_goal_meera_st2",
		description: "Catch a tennis ball 7/10 trials at 2 metres distance.",
		horizon: "SHORT_TERM" as const,
		currentAttainmentPct: 80,
		status: "IN_PROGRESS" as const,
	},
	{
		id: "sf_goal_meera_lt1",
		description: "Active participation in PE class activities alongside peers.",
		horizon: "LONG_TERM" as const,
		currentAttainmentPct: 40,
		status: "IN_PROGRESS" as const,
	},
	{
		id: "sf_goal_meera_lt2",
		description:
			"Consistent written output at grade-level speed and legibility.",
		horizon: "LONG_TERM" as const,
		currentAttainmentPct: 35,
		status: "IN_PROGRESS" as const,
	},
]) {
	await prisma.goal.upsert({
		where: { id: g.id },
		update: {},
		create: {
			id: g.id,
			treatmentPlanId: planMeera.id,
			description: g.description,
			horizon: g.horizon,
			targetAttainmentPct: 100,
			currentAttainmentPct: g.currentAttainmentPct,
			status: g.status,
		},
	});
}

await prisma.planGameAssignment.upsert({
	where: { id: "sf_pga_meera_1" },
	update: {},
	create: {
		id: "sf_pga_meera_1",
		planId: planMeera.id,
		gameVersionId: gvTrace.id,
		durationSeconds: 900,
		repetitions: 4,
		frequencyPerWeek: 2,
		instructions:
			"Use during handwriting phase. Select letters matching school curriculum. Praise effort, not speed.",
		appliesToPhase: "handwriting_fine_motor",
		order: 1,
	},
});

await prisma.planGameAssignment.upsert({
	where: { id: "sf_pga_meera_2" },
	update: {},
	create: {
		id: "sf_pga_meera_2",
		planId: planMeera.id,
		gameVersionId: gvCatch.id,
		durationSeconds: 600,
		repetitions: 3,
		frequencyPerWeek: 2,
		instructions:
			"Use during CO-OP phase. Apply Goal-Plan-Do-Check. Extend distance when 7/10 consistently.",
		appliesToPhase: "gross_motor_co_op",
		order: 2,
	},
});

await prisma.child.update({
	where: { id: "sf_child_aarav" },
	data: { latestPlanId: planAarav.id },
});
await prisma.child.update({
	where: { id: "sf_child_meera" },
	data: { latestPlanId: planMeera.id },
});

console.log("Treatment plans and goals created");

// ── 9. THERAPY SESSIONS ──────────────────────────────────────────────────────

const sessionNotes = {
	aarav: [
		"Arrived dysregulated; required weighted lap pad. Tolerated rice bin for 3 min.",
		"Improved entry to clinic. Completed bubble circuit 2/3 rounds. 1 meltdown averted with heavy work.",
		"Arrived calm. Noticeable improvement in tactile tolerance — sand bin accepted without prompt.",
		"Best session to date. Engaged throughout. Mother reports less resistance to bath time at home.",
	],
	meera: [
		"Baseline session. Child reluctant. Reversed b/d in trace task. 4/10 catches.",
		"Improved pencil pressure. Letter reversals reducing. 5/10 catches achieved.",
		"7/10 catches at 1.5m. Positive self-talk observed for first time during CO-OP check step.",
		"Consistent legible 2-line output. Used CO-OP self-monitoring independently. 8/10 catches.",
	],
};

// Aarav: 4 sessions weekly from 2026-05-14
for (let i = 0; i < 4; i++) {
	const sessionId = `sf_session_aarav_${i + 1}`;
	const sgaId = `sf_sga_aarav_${i + 1}`;
	const scheduledDate = new Date("2026-05-14");
	scheduledDate.setDate(scheduledDate.getDate() + i * 7);
	const startedAt = new Date(scheduledDate);
	startedAt.setHours(10, 0, 0, 0);
	const completedAt = new Date(startedAt);
	completedAt.setMinutes(completedAt.getMinutes() + 60);
	const gv = i % 2 === 0 ? gvBubble : gvBalance;

	await prisma.therapySession.upsert({
		where: { id: sessionId },
		update: {},
		create: {
			id: sessionId,
			planId: planAarav.id,
			childId: "sf_child_aarav",
			assignedTherapistId: priyaUser.id,
			scheduledDate,
			startedAt,
			completedAt,
			status: "COMPLETED",
			notes: sessionNotes.aarav[i],
			qualityTag: i < 2 ? "distracted" : "calm",
		},
	});

	await prisma.sessionGameAssignment.upsert({
		where: { id: sgaId },
		update: {},
		create: {
			id: sgaId,
			sessionId,
			gameVersionId: gv.id,
			durationSeconds: 600,
			repetitions: 3,
			instructions:
				i % 2 === 0
					? "Bubble Burst — full body movements; reward attempts not accuracy."
					: "Balance Board — spot closely; increase tilt angle only when stable.",
			rubricVersion: "v1",
			order: 1,
		},
	});

	const accuracy = 50 + i * 10;
	await prisma.gameResult.upsert({
		where: { sessionId },
		update: {},
		create: {
			id: `sf_gr_aarav_${i + 1}`,
			sessionId,
			sessionAssignmentId: sgaId,
			rubricVersion: "v1",
			scored:
				i % 2 === 0
					? {
							bubbles_popped: 16 + i * 4,
							accuracy_pct: accuracy,
							engagement_score: 2 + (i > 1 ? 2 : 1),
						}
					: {
							balance_hold_seconds: 6 + i * 3,
							targets_reached: 3 + i,
							falls_count: Math.max(0, 3 - i),
						},
			rawMetrics: {
				total_attempts: 20,
				successful_attempts: Math.round(20 * (accuracy / 100)),
				avg_response_time_ms: 1500 - i * 80,
				session_number: i + 1,
			},
			events: [
				{ t: 0, event: "session_start" },
				...(i < 2
					? [{ t: 240, event: "regulation_break", duration_seconds: 60 }]
					: []),
				{ t: 600, event: "session_end" },
			],
		},
	});
}

// Meera: 4 sessions weekly from 2026-05-15
for (let i = 0; i < 4; i++) {
	const sessionId = `sf_session_meera_${i + 1}`;
	const sgaId = `sf_sga_meera_${i + 1}`;
	const scheduledDate = new Date("2026-05-15");
	scheduledDate.setDate(scheduledDate.getDate() + i * 7);
	const startedAt = new Date(scheduledDate);
	startedAt.setHours(11, 0, 0, 0);
	const completedAt = new Date(startedAt);
	completedAt.setMinutes(completedAt.getMinutes() + 60);
	const gv = i % 2 === 0 ? gvTrace : gvCatch;

	await prisma.therapySession.upsert({
		where: { id: sessionId },
		update: {},
		create: {
			id: sessionId,
			planId: planMeera.id,
			childId: "sf_child_meera",
			assignedTherapistId: raviUser.id,
			scheduledDate,
			startedAt,
			completedAt,
			status: "COMPLETED",
			notes: sessionNotes.meera[i],
			qualityTag: i === 0 ? "distracted" : "calm",
		},
	});

	await prisma.sessionGameAssignment.upsert({
		where: { id: sgaId },
		update: {},
		create: {
			id: sgaId,
			sessionId,
			gameVersionId: gv.id,
			durationSeconds: i % 2 === 0 ? 900 : 600,
			repetitions: i % 2 === 0 ? 4 : 3,
			instructions:
				i % 2 === 0
					? "Precision Trace — lower-case letters matching school curriculum."
					: "Catch & Release — CO-OP Goal-Plan-Do-Check framework.",
			rubricVersion: "v1",
			order: 1,
		},
	});

	const catches = [4, 5, 7, 8][i] as number;
	await prisma.gameResult.upsert({
		where: { sessionId },
		update: {},
		create: {
			id: `sf_gr_meera_${i + 1}`,
			sessionId,
			sessionAssignmentId: sgaId,
			rubricVersion: "v1",
			scored:
				i % 2 === 0
					? {
							accuracy_pct: 52 + i * 8,
							letter_forms_correct: 5 + i * 2,
							speed_lpm: 2.5 + i * 0.5,
						}
					: {
							catches_successful: catches,
							total_attempts: 10,
							bilateral_score: 2 + i,
						},
			rawMetrics: {
				total_attempts: i % 2 === 0 ? 12 : 10,
				session_number: i + 1,
				duration_seconds: i % 2 === 0 ? 900 : 600,
			},
			events: [
				{ t: 0, event: "session_start" },
				{ t: i % 2 === 0 ? 900 : 600, event: "session_end" },
			],
		},
	});
}

console.log("Therapy sessions and game results created");

// ── 10. FOLLOW-UP ASSESSMENTS ────────────────────────────────────────────────

const followUpAarav = await prisma.followUpAssessment.upsert({
	where: { id: "sf_followup_aarav" },
	update: {},
	create: {
		id: "sf_followup_aarav",
		childId: "sf_child_aarav",
		initialAssessmentId: assessmentAarav.id,
		treatmentPlanId: planAarav.id,
		therapistId: priyaUser.id,
		versionNumber: 1,
		sectionA: {
			date: "2026-06-18",
			therapistId: priyaUser.id,
			sessionNumber: 4,
			weeksSinceInitial: 6,
			parentPresent: true,
		},
		sectionB: {
			goalProgress: [
				{
					goalId: "sf_goal_aarav_st1",
					description:
						"Tolerate light touch to hands 3/5 trials without distress.",
					attainmentPct: 80,
					status: "IN_PROGRESS",
					evidenceNotes:
						"3/5 trials in clinic; novel textures still challenging.",
				},
				{
					goalId: "sf_goal_aarav_st2",
					description: "Engage in sand/rice tactile bin play for 5 minutes.",
					attainmentPct: 100,
					status: "MET",
					evidenceNotes: "Sustained engagement for 7 min in last two sessions.",
				},
				{
					goalId: "sf_goal_aarav_lt1",
					description:
						"Independent participation in group sensory activities at school.",
					attainmentPct: 25,
					status: "IN_PROGRESS",
					evidenceNotes:
						"One full circle-time without leaving group (teacher report).",
				},
				{
					goalId: "sf_goal_aarav_lt2",
					description:
						"Independently use 2+ self-regulation strategies when dysregulated.",
					attainmentPct: 30,
					status: "IN_PROGRESS",
					evidenceNotes:
						"Uses breathing card 2/5 times when prompted by teacher.",
				},
			],
		},
		sectionC: {
			sensoryCheck: [
				{
					systemId: "tactile",
					rating: 4,
					baseline: 5,
					current: 4,
					change: -1,
					notes: "Tolerates rice/sand bins; novel textures still avoidant.",
				},
				{
					systemId: "vestibular",
					rating: 4,
					baseline: 4,
					current: 4,
					change: 0,
					notes: "Unchanged — still seeks rotary input.",
				},
				{
					systemId: "proprioceptive",
					rating: 3,
					baseline: 4,
					current: 3,
					change: -1,
					notes: "Heavy work routine helping; less crashing.",
				},
				{
					systemId: "auditory",
					rating: 5,
					baseline: 5,
					current: 5,
					change: 0,
					notes: "No change — headphones in use.",
				},
				{
					systemId: "visual",
					rating: 3,
					baseline: 3,
					current: 3,
					change: 0,
					notes: "Stable.",
				},
				{
					systemId: "olfactory_gustatory",
					rating: 4,
					baseline: 5,
					current: 4,
					change: -1,
					notes: "Tolerated mild-smelling food once.",
				},
				{
					systemId: "interoception",
					rating: 2,
					baseline: 2,
					current: 2,
					change: 0,
					notes: "Limited progress — add toilet schedule.",
				},
			],
		},
		sectionD: {
			improvementsAtHome:
				"Mother reports child participated in messy art class twice. Less resistance to bath time.",
			improvementsAtSchool:
				"Mother reports child participated in messy art class twice. Less resistance to bath time.",
			regressions:
				"New sleep onset difficulty correlating with school field trip. No skill regression.",
			homeProgramCompliance: "good",
			sessionEngagement: "good",
			schoolPerformanceChanges: "",
			behaviourChanges: "",
			newSkillsObserved: "",
			equipmentEffectivelyUsed: "",
			therapistObservations:
				"Child presented regulated. Engaged in tactile circuit 15 min including sand bin. Good carry-over of brushing protocol.",
		},
		sectionE: {
			goalStatusDecisions: ["modify_existing", "add_new", "continue_all"],
			updatedGoals: [
				{
					goalId: "sf_goal_aarav_st1",
					description:
						"Tolerate light touch to hands 4/5 trials including novel textures.",
					targetAttainmentPct: 100,
				},
				{
					goalId: "sf_goal_aarav_lt2",
					description:
						"Independently initiate regulation strategy 3/5 dysregulation events without teacher prompt.",
					targetAttainmentPct: 100,
				},
			],
			updatedHomeProgram:
				"Continue Wilbarger brushing protocol. Increase sensory diet activities.",
			nextFollowUpDate: "2026-07-30",
			nextAssessmentType: "follow_up",
			clinicalNotes:
				"Progress noted in tactile tolerance and heavy work activities.",
		},
		sectionF: {
			therapistName: "Dr. Priya Menon",
			therapistCredentials: "BOT, MOT (Pediatrics)",
			guardianName: "Riya Sharma",
		},
	},
});

for (const sp of [
	{
		id: "sf_sp_af_tactile",
		systemId: "tactile",
		rating: 4,
		notes: "Tolerates rice/sand bins.",
	},
	{
		id: "sf_sp_af_vestibular",
		systemId: "vestibular",
		rating: 4,
		notes: "Unchanged.",
	},
	{
		id: "sf_sp_af_proprioceptive",
		systemId: "proprioceptive",
		rating: 3,
		notes: "Heavy work helping; less crashing.",
	},
	{
		id: "sf_sp_af_auditory",
		systemId: "auditory",
		rating: 5,
		notes: "No change.",
	},
	{ id: "sf_sp_af_visual", systemId: "visual", rating: 3, notes: "Stable." },
	{
		id: "sf_sp_af_olfactory",
		systemId: "olfactory_gustatory",
		rating: 4,
		notes: "Tolerated mild-smelling food once.",
	},
	{
		id: "sf_sp_af_interoception",
		systemId: "interoception",
		rating: 2,
		notes: "Limited progress.",
	},
]) {
	await prisma.sensoryProfile.upsert({
		where: { id: sp.id },
		update: {},
		create: {
			id: sp.id,
			followUpId: followUpAarav.id,
			systemId: sp.systemId,
			rating: sp.rating,
			notes: sp.notes,
		},
	});
}

for (const entry of [
	{
		id: "sf_gpe_aarav_st1",
		goalId: "sf_goal_aarav_st1",
		attainmentPct: 80,
		status: "IN_PROGRESS" as const,
		notes: "3/5 trials in clinic.",
	},
	{
		id: "sf_gpe_aarav_st2",
		goalId: "sf_goal_aarav_st2",
		attainmentPct: 100,
		status: "MET" as const,
		notes: "Sustained 7 min engagement.",
	},
	{
		id: "sf_gpe_aarav_lt1",
		goalId: "sf_goal_aarav_lt1",
		attainmentPct: 25,
		status: "IN_PROGRESS" as const,
		notes: "One circle-time completion.",
	},
	{
		id: "sf_gpe_aarav_lt2",
		goalId: "sf_goal_aarav_lt2",
		attainmentPct: 30,
		status: "IN_PROGRESS" as const,
		notes: "Uses breathing card 2/5 times when prompted.",
	},
]) {
	await prisma.goalProgressEntry.upsert({
		where: { id: entry.id },
		update: {},
		create: {
			id: entry.id,
			goalId: entry.goalId,
			followUpId: followUpAarav.id,
			attainmentPct: entry.attainmentPct,
			status: entry.status,
			evidenceNotes: entry.notes,
			recordedAt: new Date("2026-06-18"),
		},
	});
}

const followUpMeera = await prisma.followUpAssessment.upsert({
	where: { id: "sf_followup_meera" },
	update: {},
	create: {
		id: "sf_followup_meera",
		childId: "sf_child_meera",
		initialAssessmentId: assessmentMeera.id,
		treatmentPlanId: planMeera.id,
		therapistId: raviUser.id,
		versionNumber: 1,
		sectionA: {
			date: "2026-06-19",
			therapistId: raviUser.id,
			sessionNumber: 4,
			weeksSinceInitial: 6,
			parentPresent: true,
		},
		sectionB: {
			goalProgress: [
				{
					goalId: "sf_goal_meera_st1",
					description:
						"Produce legible handwriting at functional speed for classroom tasks.",
					attainmentPct: 70,
					status: "IN_PROGRESS",
					evidenceNotes:
						"Legible 2-line output; speed still 25% below class average.",
				},
				{
					goalId: "sf_goal_meera_st2",
					description: "Catch a tennis ball 7/10 trials at 2 metres.",
					attainmentPct: 80,
					status: "IN_PROGRESS",
					evidenceNotes: "8/10 catches at 1.5m; extending distance to 2m.",
				},
				{
					goalId: "sf_goal_meera_lt1",
					description:
						"Active participation in PE class activities alongside peers.",
					attainmentPct: 40,
					status: "IN_PROGRESS",
					evidenceNotes:
						"PE teacher reports Meera joined warm-up unprompted this week.",
				},
				{
					goalId: "sf_goal_meera_lt2",
					description:
						"Consistent written output at grade-level speed and legibility.",
					attainmentPct: 35,
					status: "IN_PROGRESS",
					evidenceNotes: "Handwriting improving; still 20% below class norm.",
				},
			],
		},
		sectionC: {
			sensoryCheck: [
				{
					systemId: "tactile",
					rating: 3,
					baseline: 3,
					current: 3,
					change: 0,
					notes: "Stable.",
				},
				{
					systemId: "vestibular",
					rating: 3,
					baseline: 3,
					current: 3,
					change: 0,
					notes: "Stable.",
				},
				{
					systemId: "proprioceptive",
					rating: 3,
					baseline: 4,
					current: 3,
					change: -1,
					notes: "Improved body awareness with CO-OP strategy use.",
				},
				{
					systemId: "auditory",
					rating: 3,
					baseline: 3,
					current: 3,
					change: 0,
					notes: "Stable.",
				},
				{
					systemId: "visual",
					rating: 3,
					baseline: 4,
					current: 3,
					change: -1,
					notes: "Fewer letter reversals; copying from board improving.",
				},
				{
					systemId: "olfactory_gustatory",
					rating: 3,
					baseline: 3,
					current: 3,
					change: 0,
					notes: "Stable.",
				},
				{
					systemId: "interoception",
					rating: 3,
					baseline: 3,
					current: 3,
					change: 0,
					notes: "Stable.",
				},
			],
		},
		sectionD: {
			improvementsAtHome: "Father reports Meera completing homework faster.",
			improvementsAtSchool: "PE teacher notes increased group participation.",
			regressions: "None.",
			homeProgramCompliance: "excellent",
			sessionEngagement: "excellent",
			schoolPerformanceChanges: "",
			behaviourChanges: "",
			newSkillsObserved: "",
			equipmentEffectivelyUsed: "",
			therapistObservations:
				"Child self-monitored during trace task using CO-OP check step independently. Positive self-talk about catching.",
		},
		sectionE: {
			goalStatusDecisions: ["continue_all", "modify_existing"],
			updatedGoals: [
				{
					goalId: "sf_goal_meera_st2",
					description: "Catch a tennis ball 8/10 trials at 2 metres distance.",
					targetAttainmentPct: 100,
				},
				{
					goalId: "sf_goal_meera_st1",
					description:
						"Produce legible handwriting at classroom speed for 5-line writing task.",
					targetAttainmentPct: 100,
				},
			],
			updatedHomeProgram:
				"Continue daily handwriting practice and CO-OP skill practice.",
			nextFollowUpDate: "2026-08-01",
			nextAssessmentType: "follow_up",
			clinicalNotes:
				"Improved self-monitoring skills observed during trace task.",
		},
		sectionF: {
			therapistName: "Mr. Ravi Krishnan",
			therapistCredentials: "BOT, MSc OT",
			guardianName: "Suresh Pillai",
		},
	},
});

for (const sp of [
	{ id: "sf_sp_mf_tactile", systemId: "tactile", rating: 3, notes: "Stable." },
	{
		id: "sf_sp_mf_vestibular",
		systemId: "vestibular",
		rating: 3,
		notes: "Stable.",
	},
	{
		id: "sf_sp_mf_proprioceptive",
		systemId: "proprioceptive",
		rating: 3,
		notes: "Improved body awareness.",
	},
	{
		id: "sf_sp_mf_auditory",
		systemId: "auditory",
		rating: 3,
		notes: "Stable.",
	},
	{
		id: "sf_sp_mf_visual",
		systemId: "visual",
		rating: 3,
		notes: "Fewer letter reversals.",
	},
	{
		id: "sf_sp_mf_olfactory",
		systemId: "olfactory_gustatory",
		rating: 3,
		notes: "Stable.",
	},
	{
		id: "sf_sp_mf_interoception",
		systemId: "interoception",
		rating: 3,
		notes: "Stable.",
	},
]) {
	await prisma.sensoryProfile.upsert({
		where: { id: sp.id },
		update: {},
		create: {
			id: sp.id,
			followUpId: followUpMeera.id,
			systemId: sp.systemId,
			rating: sp.rating,
			notes: sp.notes,
		},
	});
}

for (const entry of [
	{
		id: "sf_gpe_meera_st1",
		goalId: "sf_goal_meera_st1",
		attainmentPct: 70,
		status: "IN_PROGRESS" as const,
		notes: "Legible 2-line output; speed 25% below class.",
	},
	{
		id: "sf_gpe_meera_st2",
		goalId: "sf_goal_meera_st2",
		attainmentPct: 80,
		status: "IN_PROGRESS" as const,
		notes: "8/10 catches at 1.5m; extending to 2m.",
	},
	{
		id: "sf_gpe_meera_lt1",
		goalId: "sf_goal_meera_lt1",
		attainmentPct: 40,
		status: "IN_PROGRESS" as const,
		notes: "Joined warm-up unprompted (PE teacher).",
	},
	{
		id: "sf_gpe_meera_lt2",
		goalId: "sf_goal_meera_lt2",
		attainmentPct: 35,
		status: "IN_PROGRESS" as const,
		notes: "Speed improving; still 20% below class norm.",
	},
]) {
	await prisma.goalProgressEntry.upsert({
		where: { id: entry.id },
		update: {},
		create: {
			id: entry.id,
			goalId: entry.goalId,
			followUpId: followUpMeera.id,
			attainmentPct: entry.attainmentPct,
			status: entry.status,
			evidenceNotes: entry.notes,
			recordedAt: new Date("2026-06-19"),
		},
	});
}

console.log(
	"Follow-up assessments, sensory profiles, and goal progress created",
);

// ── 11. PLAN REVISION — AARAV v2 ─────────────────────────────────────────────

const planAaravV2 = await prisma.treatmentPlan.upsert({
	where: { id: "sf_plan_aarav_v2" },
	update: {},
	create: {
		id: "sf_plan_aarav_v2",
		childId: "sf_child_aarav",
		clinicId: clinic.id,
		createdById: priyaUser.id,
		name: "Aarav — ASD Sensory Programme (Revised v2)",
		programLengthWeeks: 12,
		startDate: new Date("2026-07-01"),
		projectedEndDate: new Date("2026-09-22"),
		sessionDurationMinutes: 60,
		status: "DRAFT",
		isActive: false,
		versionNumber: 2,
		parentPlanId: planAarav.id,
		sourcePresetId: "preset_asd_sensory",
		targetMilestones: [
			"eye_contact_social_smile",
			"two_word_phrases",
			"self_feeding",
			"dressing",
		],
		phases: [
			{
				phase: "arrival_regulation",
				minutes: 5,
				label: "Arrival & regulation check",
			},
			{ phase: "heavy_work", minutes: 10, label: "Heavy work" },
			{ phase: "sensory_circuit", minutes: 20, label: "Sensory circuit" },
			{
				phase: "fine_motor",
				minutes: 15,
				label: "Fine motor / structured play",
			},
			{
				phase: "social_play",
				minutes: 5,
				label: "Peer-interaction role-play (new phase)",
			},
			{
				phase: "cooldown_transition",
				minutes: 5,
				label: "Cool-down & transition prep",
			},
		],
	},
});

for (const g of [
	{
		id: "sf_goal_aarav_v2_st1",
		description:
			"Tolerate light touch to hands 4/5 trials including novel textures.",
		horizon: "SHORT_TERM" as const,
	},
	{
		id: "sf_goal_aarav_v2_st2",
		description:
			"Independently initiate regulation strategy 3/5 dysregulation events without teacher prompt.",
		horizon: "SHORT_TERM" as const,
	},
	{
		id: "sf_goal_aarav_v2_lt1",
		description:
			"Independent participation in group sensory activities at school.",
		horizon: "LONG_TERM" as const,
	},
	{
		id: "sf_goal_aarav_v2_lt2",
		description:
			"Tolerance of varied food textures at mealtimes — minimum 3 new food textures accepted.",
		horizon: "LONG_TERM" as const,
	},
]) {
	await prisma.goal.upsert({
		where: { id: g.id },
		update: {},
		create: {
			id: g.id,
			treatmentPlanId: planAaravV2.id,
			description: g.description,
			horizon: g.horizon,
			targetAttainmentPct: 100,
			currentAttainmentPct: 0,
			status: "IN_PROGRESS",
		},
	});
}

await prisma.child.update({
	where: { id: "sf_child_aarav" },
	data: { latestPlanId: planAaravV2.id },
});

console.log(
	`Plan revision: ${planAaravV2.name} (v${planAaravV2.versionNumber}, DRAFT)`,
);

// ─────────────────────────────────────────────────────────────────────────────

await prisma.$disconnect();

console.log(`
Flow seed complete.
  Clinic:     Sunshine Children's OT Clinic  (sf_clinic)
  Staff:      staff.intake@sf.seed.local
  Therapists: therapist.priya@sf.seed.local  (Aarav's therapist)
              therapist.ravi@sf.seed.local   (Meera's therapist)
  Children:
    Aarav Sharma  — ASD+SPD, 5 y, plan v1 ACTIVE + v2 DRAFT
    Meera Pillai  — DCD+Dyspraxia, 8 y, plan ACTIVE
  Each child: 1 initial assessment + 4 COMPLETED sessions + 1 follow-up + goal progress
`);
