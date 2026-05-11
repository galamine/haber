import httpStatus from 'http-status';
import moment from 'moment';
import request from 'supertest';
import app from '../../src/app';
import { TokenType } from '../../src/config/tokens';
import { tokenService } from '../../src/services';
import {
  clinicOne,
  clinicTwo,
  insertClinics,
  insertSubscriptionPlans,
  subscriptionPlanOne,
} from '../fixtures/clinic.fixture';
import { insertUsers } from '../fixtures/user.fixture';
import { prisma, setupTestDB } from '../utils/setupTestDB';

setupTestDB();

const clinicAdminOne = {
  id: 'aa1b2c3d-e5f6-7890-abcd-012345678910',
  name: 'Clinic Admin One',
  email: 'sectionsadmin@test.com',
  role: 'clinic_admin' as const,
  tenantId: clinicOne.id,
  isActive: true,
};

const therapistOne = {
  id: 'tt1b2c3d-e5f6-7890-abcd-012345678911',
  name: 'Therapist One',
  email: 'sectionstherapist1@test.com',
  role: 'therapist' as const,
  tenantId: clinicOne.id,
  isActive: true,
};

const therapistTwo = {
  id: 'tt2b2c3d-e5f6-7890-abcd-012345678912',
  name: 'Therapist Two',
  email: 'sectionstherapist2@test.com',
  role: 'therapist' as const,
  tenantId: clinicOne.id,
  isActive: true,
};

const insertClinicData = async () => {
  await insertSubscriptionPlans([subscriptionPlanOne]);
  await insertClinics([clinicOne, clinicTwo]);
  await insertUsers([clinicAdminOne, therapistOne, therapistTwo]);
  await prisma.clinic.update({
    where: { id: clinicOne.id },
    data: { subscriptionPlanId: subscriptionPlanOne.id },
  });
};

const getAccessToken = (user: { id: string; role: 'clinic_admin' | 'therapist'; tenantId: string | null }) => {
  const accessTokenExpires = moment().add(1, 'hour');
  return tokenService.generateToken(user.id, user.role, user.tenantId, accessTokenExpires, TokenType.ACCESS);
};

const insertReadyChild = async (assignTherapistId?: string) => {
  const { v4: uuidv4 } = await import('uuid');
  const childId = uuidv4();

  const child = await prisma.child.create({
    data: {
      id: childId,
      tenantId: clinicOne.id,
      childCode: `CHD-${childId.substring(0, 8)}`,
      fullName: 'Section Test Child',
      dob: new Date('2019-01-01'),
      sex: 'female',
      spokenLanguages: [],
      intakeComplete: true,
      consentStatus: 'all_consented',
    },
  });

  await prisma.guardian.create({
    data: {
      id: uuidv4(),
      childId: child.id,
      fullName: 'Test Guardian',
      relationship: 'mother',
      phone: '555-0001',
    },
  });

  if (assignTherapistId) {
    await prisma.childTherapist.create({ data: { childId: child.id, userId: assignTherapistId } });
  }

  return child;
};

const TODAY = new Date().toISOString().split('T')[0];

const insertDraftAssessment = async (childId: string, therapistId: string) => {
  const token = getAccessToken(therapistOne);
  const res = await request(app)
    .post(`/v1/children/${childId}/assessments`)
    .set('Authorization', `Bearer ${token}`)
    .send({ assessmentDate: TODAY });
  return res.body as { id: string };
};

const insertMilestone = async () => {
  const { v4: uuidv4 } = await import('uuid');
  return prisma.milestone.create({
    data: {
      id: uuidv4(),
      name: 'Test Milestone',
      ageBandMinMonths: 0,
      ageBandMaxMonths: 12,
      scoringScaleMin: 1,
      scoringScaleMax: 5,
      description: 'Test milestone description',
      frameworkId: 'framework-001',
      tenantId: clinicOne.id,
    },
  });
};

const insertSensorySystem = async () => {
  const { v4: uuidv4 } = await import('uuid');
  return prisma.sensorySystem.create({
    data: {
      id: uuidv4(),
      name: 'Test Sensory System',
      description: 'Test sensory system description',
      frameworkId: 'framework-001',
      tenantId: clinicOne.id,
    },
  });
};

const insertFunctionalConcern = async () => {
  const { v4: uuidv4 } = await import('uuid');
  return prisma.functionalConcern.create({
    data: {
      id: uuidv4(),
      name: 'Test Functional Concern',
      frameworkId: 'framework-001',
      tenantId: clinicOne.id,
    },
  });
};

// ─── PUT milestones ─────────────────────────────────────────────────────────

describe('PUT /v1/children/:childId/assessments/:assessmentId/milestones', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('upserts milestone ratings for a draft assessment', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const milestone = await insertMilestone();
    const token = getAccessToken(therapistOne);

    const res = await request(app)
      .put(`/v1/children/${child.id}/assessments/${assessment.id}/milestones`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        milestones: [{ milestoneId: milestone.id, achievedAtAgeMonths: 10, delayed: false, notes: null }],
      })
      .expect(httpStatus.OK);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].milestoneId).toBe(milestone.id);
    expect(res.body[0].achievedAtAgeMonths).toBe(10);
    expect(res.body[0].delayed).toBe(false);
  });

  test('idempotent re-submit replaces existing rows (no duplicates)', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const milestone = await insertMilestone();
    const token = getAccessToken(therapistOne);

    const payload = {
      milestones: [{ milestoneId: milestone.id, achievedAtAgeMonths: 8, delayed: true, notes: null }],
    };

    await request(app)
      .put(`/v1/children/${child.id}/assessments/${assessment.id}/milestones`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(httpStatus.OK);

    const res = await request(app)
      .put(`/v1/children/${child.id}/assessments/${assessment.id}/milestones`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(httpStatus.OK);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].delayed).toBe(true);
  });

  test('returns 409 ASSESSMENT_FINALISED on a finalised assessment', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const milestone = await insertMilestone();
    const token = getAccessToken(therapistOne);

    // Seed milestone so finalise passes its own check
    await prisma.assessmentMilestone.create({
      data: { assessmentId: assessment.id, milestoneId: milestone.id, delayed: false },
    });
    // Seed 7 sensory ratings
    for (let i = 0; i < 7; i++) {
      const sys = await insertSensorySystem();
      await prisma.assessmentSensoryRating.create({
        data: { assessmentId: assessment.id, sensorySystemId: sys.id, rating: 3 },
      });
    }

    await request(app)
      .post(`/v1/children/${child.id}/assessments/${assessment.id}/finalise`)
      .set('Authorization', `Bearer ${token}`)
      .expect(httpStatus.OK);

    const res = await request(app)
      .put(`/v1/children/${child.id}/assessments/${assessment.id}/milestones`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        milestones: [{ milestoneId: milestone.id, achievedAtAgeMonths: null, delayed: false }],
      })
      .expect(httpStatus.CONFLICT);

    expect(res.body.message).toBe('ASSESSMENT_FINALISED');
  });
});

// ─── GET milestones ─────────────────────────────────────────────────────────

describe('GET /v1/children/:childId/assessments/:assessmentId/milestones', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('returns saved milestone rows', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const milestone = await insertMilestone();
    const token = getAccessToken(therapistOne);

    await request(app)
      .put(`/v1/children/${child.id}/assessments/${assessment.id}/milestones`)
      .set('Authorization', `Bearer ${token}`)
      .send({ milestones: [{ milestoneId: milestone.id, achievedAtAgeMonths: 6, delayed: false }] });

    const res = await request(app)
      .get(`/v1/children/${child.id}/assessments/${assessment.id}/milestones`)
      .set('Authorization', `Bearer ${token}`)
      .expect(httpStatus.OK);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].achievedAtAgeMonths).toBe(6);
  });
});

// ─── PUT sensory-profile ─────────────────────────────────────────────────────

describe('PUT /v1/children/:childId/assessments/:assessmentId/sensory-profile', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('upserts sensory ratings and observations', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const system = await insertSensorySystem();
    const token = getAccessToken(therapistOne);

    const res = await request(app)
      .put(`/v1/children/${child.id}/assessments/${assessment.id}/sensory-profile`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        ratings: [{ sensorySystemId: system.id, rating: 4, notes: null }],
        sensoryObservations: 'Child shows hyper-responsive behaviour',
      })
      .expect(httpStatus.OK);

    expect(res.body.ratings).toHaveLength(1);
    expect(res.body.ratings[0].rating).toBe(4);
    expect(res.body.sensoryObservations).toBe('Child shows hyper-responsive behaviour');
  });

  test('returns 400 when rating is out of range (6)', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const system = await insertSensorySystem();
    const token = getAccessToken(therapistOne);

    await request(app)
      .put(`/v1/children/${child.id}/assessments/${assessment.id}/sensory-profile`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ratings: [{ sensorySystemId: system.id, rating: 6, notes: null }] })
      .expect(httpStatus.BAD_REQUEST);
  });

  test('idempotent re-submit replaces existing ratings (no duplicates)', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const system = await insertSensorySystem();
    const token = getAccessToken(therapistOne);

    const payload = { ratings: [{ sensorySystemId: system.id, rating: 2, notes: null }] };

    await request(app)
      .put(`/v1/children/${child.id}/assessments/${assessment.id}/sensory-profile`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    const res = await request(app)
      .put(`/v1/children/${child.id}/assessments/${assessment.id}/sensory-profile`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(httpStatus.OK);

    expect(res.body.ratings).toHaveLength(1);
  });
});

// ─── GET sensory-profile ─────────────────────────────────────────────────────

describe('GET /v1/children/:childId/assessments/:assessmentId/sensory-profile', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('returns saved sensory ratings and observations', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const system = await insertSensorySystem();
    const token = getAccessToken(therapistOne);

    await request(app)
      .put(`/v1/children/${child.id}/assessments/${assessment.id}/sensory-profile`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ratings: [{ sensorySystemId: system.id, rating: 3 }], sensoryObservations: 'Typical' });

    const res = await request(app)
      .get(`/v1/children/${child.id}/assessments/${assessment.id}/sensory-profile`)
      .set('Authorization', `Bearer ${token}`)
      .expect(httpStatus.OK);

    expect(res.body.ratings).toHaveLength(1);
    expect(res.body.sensoryObservations).toBe('Typical');
  });
});

// ─── PUT functional-concerns ─────────────────────────────────────────────────

describe('PUT /v1/children/:childId/assessments/:assessmentId/functional-concerns', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('upserts functional concern selections', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const concern = await insertFunctionalConcern();
    const token = getAccessToken(therapistOne);

    const res = await request(app)
      .put(`/v1/children/${child.id}/assessments/${assessment.id}/functional-concerns`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        functionalConcernIds: [concern.id],
        clinicalObservations: 'Fine motor difficulties noted',
      })
      .expect(httpStatus.OK);

    expect(res.body.concerns).toHaveLength(1);
    expect(res.body.concerns[0].functionalConcernId).toBe(concern.id);
    expect(res.body.functionalConcernObservations).toBe('Fine motor difficulties noted');
  });
});

// ─── GET functional-concerns ─────────────────────────────────────────────────

describe('GET /v1/children/:childId/assessments/:assessmentId/functional-concerns', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('returns saved functional concern rows', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const concern = await insertFunctionalConcern();
    const token = getAccessToken(therapistOne);

    await request(app)
      .put(`/v1/children/${child.id}/assessments/${assessment.id}/functional-concerns`)
      .set('Authorization', `Bearer ${token}`)
      .send({ functionalConcernIds: [concern.id] });

    const res = await request(app)
      .get(`/v1/children/${child.id}/assessments/${assessment.id}/functional-concerns`)
      .set('Authorization', `Bearer ${token}`)
      .expect(httpStatus.OK);

    expect(res.body.concerns).toHaveLength(1);
    expect(res.body.concerns[0].functionalConcernId).toBe(concern.id);
  });
});

// ─── Finalise validations ────────────────────────────────────────────────────

describe('POST finalise with incomplete section data', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('returns 422 MILESTONE_REQUIRED when no milestones rated', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const token = getAccessToken(therapistOne);

    const res = await request(app)
      .post(`/v1/children/${child.id}/assessments/${assessment.id}/finalise`)
      .set('Authorization', `Bearer ${token}`)
      .expect(httpStatus.UNPROCESSABLE_ENTITY);

    expect(res.body.message).toBe('MILESTONE_REQUIRED');
  });

  test('returns 422 SENSORY_PROFILE_INCOMPLETE when fewer than 7 systems rated', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const milestone = await insertMilestone();
    const token = getAccessToken(therapistOne);

    await prisma.assessmentMilestone.create({
      data: { assessmentId: assessment.id, milestoneId: milestone.id, delayed: false },
    });

    // Only 6 sensory systems rated
    for (let i = 0; i < 6; i++) {
      const sys = await insertSensorySystem();
      await prisma.assessmentSensoryRating.create({
        data: { assessmentId: assessment.id, sensorySystemId: sys.id, rating: 3 },
      });
    }

    const res = await request(app)
      .post(`/v1/children/${child.id}/assessments/${assessment.id}/finalise`)
      .set('Authorization', `Bearer ${token}`)
      .expect(httpStatus.UNPROCESSABLE_ENTITY);

    expect(res.body.message).toBe('SENSORY_PROFILE_INCOMPLETE');
  });
});
