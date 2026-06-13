import "dotenv/config";
import { createRequire } from "node:module";
import { createPrismaClient } from "../src/index";

const require = createRequire(import.meta.url);
const seedData =
	require("../../../clinical-data/clinical-taxonomies.seed.json") as {
		diagnoses: { items: { id: string; label: string }[] };
		functional_concerns: { items: { id: string; label: string }[] };
		standardized_assessment_tools: { items: { id: string; label: string }[] };
		equipment_catalog: { items: { id: string; label: string }[] };
		intervention_approaches: { items: { id: string; label: string }[] };
		sensory_systems: { items: { id: string; label: string }[] };
		developmental_milestones: { items: { id: string; label: string }[] };
	};

const GAME_CATEGORIES = [
	{ id: "gc_fine_motor", name: "Fine Motor" },
	{ id: "gc_gross_motor", name: "Gross Motor" },
	{ id: "gc_sensory_processing", name: "Sensory Processing" },
	{ id: "gc_adl_self_care", name: "ADL / Self-Care" },
	{ id: "gc_cognitive_attention", name: "Cognitive & Attention" },
	{ id: "gc_social_emotional", name: "Social & Emotional" },
	{ id: "gc_communication", name: "Communication" },
	{ id: "gc_visual_perception", name: "Visual Perception" },
	{ id: "gc_oral_motor_feeding", name: "Oral Motor / Feeding" },
	{ id: "gc_play_leisure", name: "Play & Leisure" },
] as const;

const prisma = createPrismaClient();

for (const item of seedData.diagnoses.items) {
	await prisma.diagnosis.upsert({
		where: { id: item.id },
		update: { label: item.label },
		create: { id: item.id, label: item.label, clinicId: null },
	});
}
console.log(`Seeded ${seedData.diagnoses.items.length} diagnoses`);

for (const item of seedData.functional_concerns.items) {
	await prisma.functionalConcern.upsert({
		where: { id: item.id },
		update: { label: item.label },
		create: { id: item.id, label: item.label, clinicId: null },
	});
}
console.log(
	`Seeded ${seedData.functional_concerns.items.length} functional concerns`,
);

for (const item of seedData.standardized_assessment_tools.items) {
	await prisma.assessmentTool.upsert({
		where: { id: item.id },
		update: { label: item.label },
		create: { id: item.id, label: item.label, clinicId: null },
	});
}
console.log(
	`Seeded ${seedData.standardized_assessment_tools.items.length} assessment tools`,
);

// JSON contains 43 items; issue AC says 45 — 43 is the correct count.
for (const item of seedData.equipment_catalog.items) {
	await prisma.equipment.upsert({
		where: { id: item.id },
		update: { label: item.label },
		create: { id: item.id, label: item.label, clinicId: null },
	});
}
console.log(
	`Seeded ${seedData.equipment_catalog.items.length} equipment items`,
);

for (const item of seedData.intervention_approaches.items) {
	await prisma.interventionApproach.upsert({
		where: { id: item.id },
		update: { label: item.label },
		create: { id: item.id, label: item.label, clinicId: null },
	});
}
console.log(
	`Seeded ${seedData.intervention_approaches.items.length} intervention approaches`,
);

for (let i = 0; i < seedData.sensory_systems.items.length; i++) {
	const item = seedData.sensory_systems.items[i]!;
	await prisma.sensorySystem.upsert({
		where: { id: item.id },
		update: { label: item.label, order: i + 1 },
		create: { id: item.id, label: item.label, order: i + 1 },
	});
}
console.log(`Seeded ${seedData.sensory_systems.items.length} sensory systems`);

for (const item of seedData.developmental_milestones.items) {
	await prisma.milestone.upsert({
		where: { id: item.id },
		update: { description: item.label },
		create: {
			id: item.id,
			frameworkId: "global",
			description: item.label,
			ageMinMonths: null,
			ageMaxMonths: null,
			scoringScaleMin: null,
			scoringScaleMax: null,
			parentMilestoneId: null,
		},
	});
}
console.log(
	`Seeded ${seedData.developmental_milestones.items.length} milestones`,
);

for (const cat of GAME_CATEGORIES) {
	await prisma.gameCategory.upsert({
		where: { id: cat.id },
		update: { name: cat.name },
		create: { id: cat.id, name: cat.name, clinicId: null, parentId: null },
	});
}
console.log(`Seeded ${GAME_CATEGORIES.length} game categories`);

await prisma.$disconnect();
console.log("Clinical seed complete.");
