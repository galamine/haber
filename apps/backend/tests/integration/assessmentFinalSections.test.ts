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
  id: 'fs1b2c3d-e5f6-7890-abcd-012345678910',
  name: 'Final Section Admin',
  email: 'fsadmin@test.com',
  role: 'clinic_admin' as const,
  tenantId: clinicOne.id,
  isActive: true,
};

const therapistOne = {
  id: 'fs2b2c3d-e5f6-7890-abcd-012345678911',
  name: 'Final Section Therapist',
  email: 'fstherapist1@test.com',
  role: 'therapist' as const,
  tenantId: clinicOne.id,
  isActive: true,
  credentialsQualifications: 'BOT, MOT (Pediatrics)',
};

const insertClinicData = async () => {
  await insertSubscriptionPlans([subscriptionPlanOne]);
  await insertClinics([clinicOne, clinicTwo]);
  await insertUsers([clinicAdminOne, therapistOne]);
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
      fullName: 'Final Section Child',
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

const insertDraftAssessment = async (childId: string, _therapistId: string) => {
  const token = getAccessToken(therapistOne);
  const res = await request(app)
    .post(`/v1/children/${childId}/assessments`)
    .set('Authorization', `Bearer ${token}`)
    .send({ assessmentDate: TODAY });
  return res.body as { id: string };
};

const insertAssessmentTool = async () => {
  const { v4: uuidv4 } = await import('uuid');
  return prisma.assessmentTool.create({
    data: {
      id: uuidv4(),
      name: 'BOT-2',
      fullName: 'Bruininks-Oseretsky Test of Motor Proficiency - Second Edition',
      description: 'Motor proficiency assessment',
      frameworkId: 'framework-001',
      tenantId: clinicOne.id,
    },
  });
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

const _insertFunctionalConcern = async () => {
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

// ─── PUT tool-results ─────────────────────────────────────────────────────────

describe('PUT /v1/children/:childId/assessments/:assessmentId/tool-results', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('upserts tool results for a draft assessment', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const tool1 = await insertAssessmentTool();
    const tool2 = await insertAssessmentTool();
    const tool3 = await insertAssessmentTool();
    const token = getAccessToken(therapistOne);

    const res = await request(app)
      .put(`/v1/children/${child.id}/assessments/${assessment.id}/tool-results`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        toolResults: [
          { assessmentToolId: tool1.id, scoresSummary: 'Raw score 45, Percentile 72' },
          { assessmentToolId: tool2.id, scoresSummary: 'Composite score 110' },
          { assessmentToolId: tool3.id, scoresSummary: null },
        ],
        overallScoresSummary: 'Overall within average range',
      })
      .expect(httpStatus.OK);

    expect(res.body).toHaveLength(3);
    expect(res.body.find((r: { assessmentToolId: string }) => r.assessmentToolId === tool1.id).scoresSummary).toBe(
      'Raw score 45, Percentile 72'
    );
  });

  test('idempotent re-submit replaces existing tool results', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const tool1 = await insertAssessmentTool();
    const token = getAccessToken(therapistOne);

    const payload = {
      toolResults: [{ assessmentToolId: tool1.id, scoresSummary: 'Initial submission' }],
      overallScoresSummary: 'First summary',
    };

    await request(app)
      .put(`/v1/children/${child.id}/assessments/${assessment.id}/tool-results`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    const res = await request(app)
      .put(`/v1/children/${child.id}/assessments/${assessment.id}/tool-results`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        toolResults: [{ assessmentToolId: tool1.id, scoresSummary: 'Updated submission' }],
        overallScoresSummary: 'Updated summary',
      })
      .expect(httpStatus.OK);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].scoresSummary).toBe('Updated submission');
  });

  test('returns 409 ASSESSMENT_FINALISED on a finalised assessment', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const tool = await insertAssessmentTool();
    const milestone = await insertMilestone();
    const token = getAccessToken(therapistOne);

    await prisma.assessmentMilestone.create({
      data: { assessmentId: assessment.id, milestoneId: milestone.id, delayed: false },
    });
    for (let i = 0; i < 7; i++) {
      const sys = await insertSensorySystem();
      await prisma.assessmentSensoryRating.create({
        data: { assessmentId: assessment.id, sensorySystemId: sys.id, rating: 3 },
      });
    }
    await prisma.assessmentSignature.create({
      data: {
        assessmentId: assessment.id,
        signatoryType: 'therapist',
        typedName: 'Therapist One',
        timestamp: new Date(),
        ipAddress: '127.0.0.1',
        credentials: 'BOT',
      },
    });
    await prisma.assessmentSignature.create({
      data: {
        assessmentId: assessment.id,
        signatoryType: 'guardian',
        typedName: 'Test Guardian',
        timestamp: new Date(),
        ipAddress: '127.0.0.1',
        consentCheckbox: true,
      },
    });

    await request(app)
      .post(`/v1/children/${child.id}/assessments/${assessment.id}/finalise`)
      .set('Authorization', `Bearer ${token}`)
      .expect(httpStatus.OK);

    const res = await request(app)
      .put(`/v1/children/${child.id}/assessments/${assessment.id}/tool-results`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        toolResults: [{ assessmentToolId: tool.id, scoresSummary: 'Trying to update' }],
      })
      .expect(httpStatus.CONFLICT);

    expect(res.body.message).toBe('ASSESSMENT_FINALISED');
  });
});

// ─── GET tool-results ─────────────────────────────────────────────────────────

describe('GET /v1/children/:childId/assessments/:assessmentId/tool-results', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('returns saved tool result rows', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const tool = await insertAssessmentTool();
    const token = getAccessToken(therapistOne);

    await request(app)
      .put(`/v1/children/${child.id}/assessments/${assessment.id}/tool-results`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        toolResults: [{ assessmentToolId: tool.id, scoresSummary: 'Test score' }],
      });

    const res = await request(app)
      .get(`/v1/children/${child.id}/assessments/${assessment.id}/tool-results`)
      .set('Authorization', `Bearer ${token}`)
      .expect(httpStatus.OK);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].scoresSummary).toBe('Test score');
  });
});

// ─── PUT intervention-plan ───────────────────────────────────────────────────

describe('PUT /v1/children/:childId/assessments/:assessmentId/intervention-plan', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('upserts intervention plan with valid goals', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const token = getAccessToken(therapistOne);

    const res = await request(app)
      .put(`/v1/children/${child.id}/assessments/${assessment.id}/intervention-plan`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        frequencyPerWeek: 3,
        sessionDurationMinutes: 60,
        interventionSetting: 'clinic',
        reviewPeriodWeeks: 6,
        homeProgramRecommendations: 'Practice fine motor activities daily',
        referralsToSpecialists: 'Refer to ophthalmology',
        shortTermGoals: [{ description: 'Improve grasp strength' }, { description: 'Increase activity tolerance' }],
        longTermGoals: [{ description: 'Achieve age-appropriate motor skills' }],
      })
      .expect(httpStatus.OK);

    expect(res.body.frequencyPerWeek).toBe(3);
    expect(res.body.sessionDurationMinutes).toBe(60);
    expect(res.body.interventionSetting).toBe('clinic');
    expect(res.body.shortTermGoals).toHaveLength(2);
    expect(res.body.longTermGoals).toHaveLength(1);
  });

  test('returns 400 when shortTermGoals exceeds 4 entries', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const token = getAccessToken(therapistOne);

    await request(app)
      .put(`/v1/children/${child.id}/assessments/${assessment.id}/intervention-plan`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        frequencyPerWeek: 3,
        sessionDurationMinutes: 60,
        interventionSetting: 'clinic',
        reviewPeriodWeeks: 6,
        shortTermGoals: [
          { description: 'Goal 1' },
          { description: 'Goal 2' },
          { description: 'Goal 3' },
          { description: 'Goal 4' },
          { description: 'Goal 5 - too many' },
        ],
        longTermGoals: [{ description: 'Long term goal' }],
      })
      .expect(httpStatus.BAD_REQUEST);
  });

  test('idempotent re-submit replaces existing intervention plan', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const token = getAccessToken(therapistOne);

    await request(app)
      .put(`/v1/children/${child.id}/assessments/${assessment.id}/intervention-plan`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        frequencyPerWeek: 2,
        sessionDurationMinutes: 45,
        interventionSetting: 'home',
        reviewPeriodWeeks: 4,
        shortTermGoals: [{ description: 'Initial short term' }],
        longTermGoals: [{ description: 'Initial long term' }],
      });

    const res = await request(app)
      .put(`/v1/children/${child.id}/assessments/${assessment.id}/intervention-plan`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        frequencyPerWeek: 5,
        sessionDurationMinutes: 30,
        interventionSetting: 'school',
        reviewPeriodWeeks: 8,
        shortTermGoals: [{ description: 'Updated short term' }],
        longTermGoals: [{ description: 'Updated long term' }],
      })
      .expect(httpStatus.OK);

    expect(res.body.frequencyPerWeek).toBe(5);
    expect(res.body.shortTermGoals).toHaveLength(1);
    expect((res.body.shortTermGoals as { description: string }[])[0].description).toBe('Updated short term');
  });
});

// ─── GET intervention-plan ───────────────────────────────────────────────────

describe('GET /v1/children/:childId/assessments/:assessmentId/intervention-plan', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('returns 404 INTERVENTION_PLAN_NOT_FOUND when no plan exists', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const token = getAccessToken(therapistOne);

    const res = await request(app)
      .get(`/v1/children/${child.id}/assessments/${assessment.id}/intervention-plan`)
      .set('Authorization', `Bearer ${token}`)
      .expect(httpStatus.NOT_FOUND);

    expect(res.body.message).toBe('INTERVENTION_PLAN_NOT_FOUND');
  });

  test('returns saved intervention plan', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const token = getAccessToken(therapistOne);

    await request(app)
      .put(`/v1/children/${child.id}/assessments/${assessment.id}/intervention-plan`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        frequencyPerWeek: 3,
        sessionDurationMinutes: 60,
        interventionSetting: 'clinic',
        reviewPeriodWeeks: 6,
        shortTermGoals: [{ description: 'Short term' }],
        longTermGoals: [{ description: 'Long term' }],
      });

    const res = await request(app)
      .get(`/v1/children/${child.id}/assessments/${assessment.id}/intervention-plan`)
      .set('Authorization', `Bearer ${token}`)
      .expect(httpStatus.OK);

    expect(res.body.frequencyPerWeek).toBe(3);
  });
});

// ─── POST sign ───────────────────────────────────────────────────────────────

describe('POST /v1/children/:childId/assessments/:assessmentId/sign', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('captures therapist signature with credentials snapshot', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const token = getAccessToken(therapistOne);

    const res = await request(app)
      .post(`/v1/children/${child.id}/assessments/${assessment.id}/sign`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        signatoryType: 'therapist',
        typedName: 'Final Section Therapist',
      })
      .expect(httpStatus.OK);

    expect(res.body.signatoryType).toBe('therapist');
    expect(res.body.typedName).toBe('Final Section Therapist');
    expect(res.body.credentials).toBe('BOT, MOT (Pediatrics)');
    expect(res.body.ipAddress).toBeTruthy();
  });

  test('captures guardian signature with consent checkbox', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const token = getAccessToken(therapistOne);

    const res = await request(app)
      .post(`/v1/children/${child.id}/assessments/${assessment.id}/sign`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        signatoryType: 'guardian',
        typedName: 'Test Guardian',
        consentCheckbox: true,
      })
      .expect(httpStatus.OK);

    expect(res.body.signatoryType).toBe('guardian');
    expect(res.body.typedName).toBe('Test Guardian');
    expect(res.body.consentCheckbox).toBe(true);
  });

  test('idempotent re-submit updates therapist signature', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const token = getAccessToken(therapistOne);

    await request(app)
      .post(`/v1/children/${child.id}/assessments/${assessment.id}/sign`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        signatoryType: 'therapist',
        typedName: 'Original Name',
      });

    const res = await request(app)
      .post(`/v1/children/${child.id}/assessments/${assessment.id}/sign`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        signatoryType: 'therapist',
        typedName: 'Updated Name',
      })
      .expect(httpStatus.OK);

    expect(res.body.typedName).toBe('Updated Name');
  });

  test('returns 400 when guardian signatory lacks consentCheckbox', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const token = getAccessToken(therapistOne);

    const res = await request(app)
      .post(`/v1/children/${child.id}/assessments/${assessment.id}/sign`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        signatoryType: 'guardian',
        typedName: 'Test Guardian',
      })
      .expect(httpStatus.BAD_REQUEST);

    expect(res.body.message).toBe('CONSENT_CHECKBOX_REQUIRED');
  });
});

// ─── GET signatures ─────────────────────────────────────────────────────────

describe('GET /v1/children/:childId/assessments/:assessmentId/signatures', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('returns empty array when no signatures captured', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const token = getAccessToken(therapistOne);

    const res = await request(app)
      .get(`/v1/children/${child.id}/assessments/${assessment.id}/signatures`)
      .set('Authorization', `Bearer ${token}`)
      .expect(httpStatus.OK);

    expect(res.body).toHaveLength(0);
  });

  test('returns captured signatures', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const token = getAccessToken(therapistOne);

    await request(app)
      .post(`/v1/children/${child.id}/assessments/${assessment.id}/sign`)
      .set('Authorization', `Bearer ${token}`)
      .send({ signatoryType: 'therapist', typedName: 'Therapist' });

    const res = await request(app)
      .get(`/v1/children/${child.id}/assessments/${assessment.id}/signatures`)
      .set('Authorization', `Bearer ${token}`)
      .expect(httpStatus.OK);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].signatoryType).toBe('therapist');
  });
});

// ─── Finalise with signatures ────────────────────────────────────────────────

describe('POST /v1/children/:childId/assessments/:assessmentId/finalise', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('returns 422 SIGNATURES_REQUIRED without therapist signature', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const milestone = await insertMilestone();
    const token = getAccessToken(therapistOne);

    await prisma.assessmentMilestone.create({
      data: { assessmentId: assessment.id, milestoneId: milestone.id, delayed: false },
    });
    for (let i = 0; i < 7; i++) {
      const sys = await insertSensorySystem();
      await prisma.assessmentSensoryRating.create({
        data: { assessmentId: assessment.id, sensorySystemId: sys.id, rating: 3 },
      });
    }
    await request(app)
      .post(`/v1/children/${child.id}/assessments/${assessment.id}/sign`)
      .set('Authorization', `Bearer ${token}`)
      .send({ signatoryType: 'guardian', typedName: 'Guardian', consentCheckbox: true });

    const res = await request(app)
      .post(`/v1/children/${child.id}/assessments/${assessment.id}/finalise`)
      .set('Authorization', `Bearer ${token}`)
      .expect(httpStatus.UNPROCESSABLE_ENTITY);

    expect(res.body.message).toBe('SIGNATURES_REQUIRED');
  });

  test('returns 422 GOALS_INCOMPLETE when intervention plan missing goals', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const milestone = await insertMilestone();
    const token = getAccessToken(therapistOne);

    await prisma.assessmentMilestone.create({
      data: { assessmentId: assessment.id, milestoneId: milestone.id, delayed: false },
    });
    for (let i = 0; i < 7; i++) {
      const sys = await insertSensorySystem();
      await prisma.assessmentSensoryRating.create({
        data: { assessmentId: assessment.id, sensorySystemId: sys.id, rating: 3 },
      });
    }
    await request(app)
      .post(`/v1/children/${child.id}/assessments/${assessment.id}/sign`)
      .set('Authorization', `Bearer ${token}`)
      .send({ signatoryType: 'therapist', typedName: 'Therapist' });
    await request(app)
      .post(`/v1/children/${child.id}/assessments/${assessment.id}/sign`)
      .set('Authorization', `Bearer ${token}`)
      .send({ signatoryType: 'guardian', typedName: 'Guardian', consentCheckbox: true });

    const res = await request(app)
      .post(`/v1/children/${child.id}/assessments/${assessment.id}/finalise`)
      .set('Authorization', `Bearer ${token}`)
      .expect(httpStatus.UNPROCESSABLE_ENTITY);

    expect(res.body.message).toBe('GOALS_INCOMPLETE');
  });

  test('returns 200 and finalises assessment with both signatures and goals', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const milestone = await insertMilestone();
    const token = getAccessToken(therapistOne);

    await prisma.assessmentMilestone.create({
      data: { assessmentId: assessment.id, milestoneId: milestone.id, delayed: false },
    });
    for (let i = 0; i < 7; i++) {
      const sys = await insertSensorySystem();
      await prisma.assessmentSensoryRating.create({
        data: { assessmentId: assessment.id, sensorySystemId: sys.id, rating: 3 },
      });
    }
    await request(app)
      .post(`/v1/children/${child.id}/assessments/${assessment.id}/intervention-plan`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        frequencyPerWeek: 3,
        sessionDurationMinutes: 60,
        interventionSetting: 'clinic',
        reviewPeriodWeeks: 6,
        shortTermGoals: [{ description: 'Short term goal' }],
        longTermGoals: [{ description: 'Long term goal' }],
      });

    await request(app)
      .post(`/v1/children/${child.id}/assessments/${assessment.id}/sign`)
      .set('Authorization', `Bearer ${token}`)
      .send({ signatoryType: 'therapist', typedName: 'Therapist' });
    await request(app)
      .post(`/v1/children/${child.id}/assessments/${assessment.id}/sign`)
      .set('Authorization', `Bearer ${token}`)
      .send({ signatoryType: 'guardian', typedName: 'Guardian', consentCheckbox: true });

    const res = await request(app)
      .post(`/v1/children/${child.id}/assessments/${assessment.id}/finalise`)
      .set('Authorization', `Bearer ${token}`)
      .expect(httpStatus.OK);

    expect(res.body.status).toBe('finalised');

    const updated = await prisma.assessment.findUnique({ where: { id: assessment.id } });
    expect(updated?.status).toBe('finalised');
  });

  test('therapist signature credentials are a snapshot, not a live reference', async () => {
    const child = await insertReadyChild(therapistOne.id);
    const assessment = await insertDraftAssessment(child.id, therapistOne.id);
    const token = getAccessToken(therapistOne);

    await request(app)
      .post(`/v1/children/${child.id}/assessments/${assessment.id}/sign`)
      .set('Authorization', `Bearer ${token}`)
      .send({ signatoryType: 'therapist', typedName: 'Therapist' });

    await prisma.user.update({
      where: { id: therapistOne.id },
      data: { credentialsQualifications: 'Updated Credentials' },
    });

    const sigRes = await request(app)
      .get(`/v1/children/${child.id}/assessments/${assessment.id}/signatures`)
      .set('Authorization', `Bearer ${token}`);

    expect(sigRes.body.find((s: { signatoryType: string }) => s.signatoryType === 'therapist').credentials).toBe(
      'BOT, MOT (Pediatrics)'
    );
  });
});
