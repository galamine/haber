import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SeedItem {
  id: string;
  label: string;
  category?: string;
}

interface SeedJson {
  diagnoses: { items: SeedItem[] };
  developmental_milestones: { items: SeedItem[] };
  sensory_systems: { items: SeedItem[] };
  functional_concerns: { items: SeedItem[] };
  standardized_assessment_tools: { items: SeedItem[] };
  equipment_catalog: { items: SeedItem[] };
  intervention_approaches: { items: SeedItem[] };
}

const MILESTONE_META: Record<string, { min: number; max: number; description: string }> = {
  head_control: { min: 1, max: 4, description: 'Child lifts and holds head steady when placed on stomach' },
  rolling: { min: 3, max: 6, description: 'Child rolls from back to side or tummy to back' },
  sitting_independently: { min: 4, max: 9, description: 'Child sits without support for sustained periods' },
  crawling: { min: 6, max: 12, description: 'Child moves on hands and knees in a coordinated pattern' },
  standing: { min: 8, max: 14, description: 'Child pulls to stand and maintains standing with or without support' },
  walking: { min: 10, max: 18, description: 'Child takes independent steps and walks without assistance' },
  first_words: { min: 9, max: 18, description: 'Child produces first meaningful words with intent' },
  two_word_phrases: { min: 18, max: 30, description: 'Child combines two words to form simple phrases' },
  toilet_training: { min: 18, max: 36, description: 'Child achieves daytime bladder and bowel control' },
  self_feeding: { min: 8, max: 18, description: 'Child feeds self independently using fingers or utensils' },
  dressing: { min: 24, max: 48, description: 'Child dresses and undresses with minimal assistance' },
  eye_contact_social_smile: {
    min: 1,
    max: 3,
    description: 'Child makes eye contact and produces a social smile in response to others',
  },
};

const SENSORY_DESCRIPTIONS: Record<string, string> = {
  tactile: 'Processing of touch, pressure, pain, and temperature sensations through the skin',
  vestibular: 'Processing of movement, balance, and spatial orientation through the inner ear',
  proprioceptive: 'Processing of body position, muscle tension, and joint movement from muscles and joints',
  auditory: 'Processing of sound, volume, pitch, and auditory discrimination through the ears',
  visual: 'Processing of light, colour, contrast, and visual spatial information through the eyes',
  olfactory_gustatory: 'Processing of smell and taste sensations through the nose and mouth',
  interoception: 'Processing of internal body signals such as hunger, thirst, heart rate, and temperature',
};

async function seedTaxonomies(data: SeedJson) {
  const counts = {
    diagnoses: 0,
    milestones: 0,
    sensorySystems: 0,
    functionalConcerns: 0,
    assessmentTools: 0,
    equipment: 0,
    interventionApproaches: 0,
  };

  for (const item of data.diagnoses.items) {
    await prisma.diagnosis.upsert({
      where: { id: item.id },
      update: { name: item.label },
      create: { id: item.id, name: item.label, frameworkId: 'global', tenantId: null },
    });
    counts.diagnoses++;
  }

  for (const item of data.developmental_milestones.items) {
    const meta = MILESTONE_META[item.id];
    if (!meta) {
      console.warn(`No age band metadata for milestone: ${item.id}, skipping`);
      continue;
    }
    await prisma.milestone.upsert({
      where: { id: item.id },
      update: { name: item.label, ageBandMinMonths: meta.min, ageBandMaxMonths: meta.max, description: meta.description },
      create: {
        id: item.id,
        name: item.label,
        ageBandMinMonths: meta.min,
        ageBandMaxMonths: meta.max,
        scoringScaleMin: 0,
        scoringScaleMax: 5,
        description: meta.description,
        frameworkId: 'global',
        tenantId: null,
      },
    });
    counts.milestones++;
  }

  for (const item of data.sensory_systems.items) {
    const description = SENSORY_DESCRIPTIONS[item.id] ?? item.label;
    await prisma.sensorySystem.upsert({
      where: { id: item.id },
      update: { name: item.label, description },
      create: { id: item.id, name: item.label, description, frameworkId: 'global', tenantId: null },
    });
    counts.sensorySystems++;
  }

  for (const item of data.functional_concerns.items) {
    await prisma.functionalConcern.upsert({
      where: { id: item.id },
      update: { name: item.label },
      create: { id: item.id, name: item.label, frameworkId: 'global', tenantId: null },
    });
    counts.functionalConcerns++;
  }

  for (const item of data.standardized_assessment_tools.items) {
    await prisma.assessmentTool.upsert({
      where: { id: item.id },
      update: { fullName: item.label },
      create: {
        id: item.id,
        name: item.id.toUpperCase().replace(/_/g, '-'),
        fullName: item.label,
        frameworkId: 'global',
        tenantId: null,
      },
    });
    counts.assessmentTools++;
  }

  for (const item of data.equipment_catalog.items) {
    await prisma.equipment.upsert({
      where: { id: item.id },
      update: { name: item.label },
      create: { id: item.id, name: item.label, frameworkId: 'global', tenantId: null },
    });
    counts.equipment++;
  }

  for (const item of data.intervention_approaches.items) {
    await prisma.interventionApproach.upsert({
      where: { id: item.id },
      update: { name: item.label },
      create: { id: item.id, name: item.label, frameworkId: 'global', tenantId: null },
    });
    counts.interventionApproaches++;
  }

  return counts;
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@haber.dev';

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: 'Admin', email, role: 'super_admin' },
  });

  console.log(`Seeded super_admin: ${user.email} (id: ${user.id})`);

  const seedPath = path.resolve(__dirname, '../../../clinical-data/clinical-taxonomies.seed.json');
  const raw = fs.readFileSync(seedPath, 'utf-8');
  const data = JSON.parse(raw) as SeedJson;

  const counts = await seedTaxonomies(data);
  console.log(`Seeded taxonomies:`);
  console.log(`  diagnoses:              ${counts.diagnoses}`);
  console.log(`  milestones:             ${counts.milestones}`);
  console.log(`  sensory systems:        ${counts.sensorySystems}`);
  console.log(`  functional concerns:    ${counts.functionalConcerns}`);
  console.log(`  assessment tools:       ${counts.assessmentTools}`);
  console.log(`  equipment:              ${counts.equipment}`);
  console.log(`  intervention approaches:${counts.interventionApproaches}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
