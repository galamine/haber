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
  id: 'aa1b2c3d-e5f6-7890-abcd-012345678900',
  name: 'Clinic Admin One',
  email: 'assessmentadmin@test.com',
  role: 'clinic_admin' as const,
  tenantId: clinicOne.id,
  isActive: true,
};

const therapistOne = {
  id: 'tt1b2c3d-e5f6-7890-abcd-012345678901',
  name: 'Therapist One',
  email: 'assessmenttherapist1@test.com',
  role: 'therapist' as const,
  tenantId: clinicOne.id,
  isActive: true,
};

const therapistTwo = {
  id: 'tt2b2c3d-e5f6-7890-abcd-012345678902',
  name: 'Therapist Two',
  email: 'assessmenttherapist2@test.com',
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

const insertReadyChild = async (opts: { assignTherapistId?: string } = {}) => {
  const { v4: uuidv4 } = await import('uuid');
  const childId = uuidv4();
  const guardianId = uuidv4();

  const child = await prisma.child.create({
    data: {
      id: childId,
      tenantId: clinicOne.id,
      childCode: `CHD-${childId.substring(0, 8)}`,
      fullName: 'Assessment Test Child',
      dob: new Date('2019-01-01'),
      sex: 'female',
      spokenLanguages: [],
      intakeComplete: true,
      consentStatus: 'all_consented',
    },
  });

  await prisma.guardian.create({
    data: {
      id: guardianId,
      childId: child.id,
      fullName: 'Test Guardian',
      relationship: 'mother',
      phone: '555-0000',
    },
  });

  if (opts.assignTherapistId) {
    await prisma.childTherapist.create({
      data: { childId: child.id, userId: opts.assignTherapistId },
    });
  }

  return child;
};

const TODAY = new Date().toISOString().split('T')[0];

// ─── Tracer bullet ─────────────────────────────────────────────────────────

describe('POST /v1/children/:childId/assessments', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('assigned therapist creates assessment → version 1, draft', async () => {
    const child = await insertReadyChild({ assignTherapistId: therapistOne.id });
    const token = getAccessToken(therapistOne);

    const res = await request(app)
      .post(`/v1/children/${child.id}/assessments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assessmentDate: TODAY })
      .expect(httpStatus.CREATED);

    expect(res.body.id).toBeDefined();
    expect(res.body.version).toBe(1);
    expect(res.body.status).toBe('draft');
  });

  test('returns 422 INTAKE_INCOMPLETE when intakeComplete is false', async () => {
    const { v4: uuidv4 } = await import('uuid');
    const childId = uuidv4();
    const child = await prisma.child.create({
      data: {
        id: childId,
        tenantId: clinicOne.id,
        childCode: `CHD-${childId.substring(0, 8)}`,
        fullName: 'Incomplete Intake Child',
        dob: new Date('2019-01-01'),
        sex: 'male',
        spokenLanguages: [],
        intakeComplete: false,
        consentStatus: 'all_consented',
      },
    });
    await prisma.childTherapist.create({ data: { childId: child.id, userId: therapistOne.id } });

    const res = await request(app)
      .post(`/v1/children/${child.id}/assessments`)
      .set('Authorization', `Bearer ${getAccessToken(therapistOne)}`)
      .send({ assessmentDate: TODAY })
      .expect(422);

    expect(res.body.message).toBe('INTAKE_INCOMPLETE');
  });

  test('returns 422 CONSENT_REQUIRED when consentStatus is not all_consented', async () => {
    const { v4: uuidv4 } = await import('uuid');
    const childId = uuidv4();
    const child = await prisma.child.create({
      data: {
        id: childId,
        tenantId: clinicOne.id,
        childCode: `CHD-${childId.substring(0, 8)}`,
        fullName: 'No Consent Child',
        dob: new Date('2019-01-01'),
        sex: 'male',
        spokenLanguages: [],
        intakeComplete: true,
        consentStatus: 'partial',
      },
    });
    await prisma.childTherapist.create({ data: { childId: child.id, userId: therapistOne.id } });

    const res = await request(app)
      .post(`/v1/children/${child.id}/assessments`)
      .set('Authorization', `Bearer ${getAccessToken(therapistOne)}`)
      .send({ assessmentDate: TODAY })
      .expect(422);

    expect(res.body.message).toBe('CONSENT_REQUIRED');
  });

  test('returns 403 when therapist is not assigned to child', async () => {
    const child = await insertReadyChild(); // no assignment

    await request(app)
      .post(`/v1/children/${child.id}/assessments`)
      .set('Authorization', `Bearer ${getAccessToken(therapistOne)}`)
      .send({ assessmentDate: TODAY })
      .expect(httpStatus.FORBIDDEN);
  });

  test('returns 409 DRAFT_EXISTS when a draft already exists', async () => {
    const child = await insertReadyChild({ assignTherapistId: therapistOne.id });
    const token = getAccessToken(therapistOne);

    await request(app)
      .post(`/v1/children/${child.id}/assessments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assessmentDate: TODAY })
      .expect(httpStatus.CREATED);

    const res = await request(app)
      .post(`/v1/children/${child.id}/assessments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assessmentDate: TODAY })
      .expect(httpStatus.CONFLICT);

    expect(res.body.message).toBe('DRAFT_EXISTS');
  });

  test('creates version 2 after version 1 is finalised', async () => {
    const child = await insertReadyChild({ assignTherapistId: therapistOne.id });
    const token = getAccessToken(therapistOne);

    const v1Res = await request(app)
      .post(`/v1/children/${child.id}/assessments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assessmentDate: TODAY })
      .expect(httpStatus.CREATED);

    await request(app)
      .post(`/v1/children/${child.id}/assessments/${v1Res.body.id}/finalise`)
      .set('Authorization', `Bearer ${token}`)
      .expect(httpStatus.OK);

    const v2Res = await request(app)
      .post(`/v1/children/${child.id}/assessments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assessmentDate: TODAY })
      .expect(httpStatus.CREATED);

    expect(v2Res.body.version).toBe(2);
  });
});

// ─── GET list ───────────────────────────────────────────────────────────────

describe('GET /v1/children/:childId/assessments', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('assigned therapist gets all assessments for child', async () => {
    const child = await insertReadyChild({ assignTherapistId: therapistOne.id });
    const token = getAccessToken(therapistOne);

    await request(app)
      .post(`/v1/children/${child.id}/assessments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assessmentDate: TODAY });

    const res = await request(app)
      .get(`/v1/children/${child.id}/assessments`)
      .set('Authorization', `Bearer ${token}`)
      .expect(httpStatus.OK);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].version).toBe(1);
  });

  test('unassigned therapist gets 403', async () => {
    const child = await insertReadyChild({ assignTherapistId: therapistOne.id });

    await request(app)
      .get(`/v1/children/${child.id}/assessments`)
      .set('Authorization', `Bearer ${getAccessToken(therapistTwo)}`)
      .expect(httpStatus.FORBIDDEN);
  });

  test('clinic_admin gets all assessments regardless of assignment', async () => {
    const child = await insertReadyChild({ assignTherapistId: therapistOne.id });

    await request(app)
      .post(`/v1/children/${child.id}/assessments`)
      .set('Authorization', `Bearer ${getAccessToken(therapistOne)}`)
      .send({ assessmentDate: TODAY });

    const res = await request(app)
      .get(`/v1/children/${child.id}/assessments`)
      .set('Authorization', `Bearer ${getAccessToken(clinicAdminOne)}`)
      .expect(httpStatus.OK);

    expect(res.body).toHaveLength(1);
  });
});

// ─── GET single ─────────────────────────────────────────────────────────────

describe('GET /v1/children/:childId/assessments/:assessmentId', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('assigned therapist gets full assessment detail', async () => {
    const child = await insertReadyChild({ assignTherapistId: therapistOne.id });
    const token = getAccessToken(therapistOne);

    const created = await request(app)
      .post(`/v1/children/${child.id}/assessments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assessmentDate: TODAY });

    const res = await request(app)
      .get(`/v1/children/${child.id}/assessments/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(httpStatus.OK);

    expect(res.body.id).toBe(created.body.id);
    expect(res.body.childId).toBe(child.id);
  });
});

// ─── PATCH ──────────────────────────────────────────────────────────────────

describe('PATCH /v1/children/:childId/assessments/:assessmentId', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('updates draft assessment fields', async () => {
    const child = await insertReadyChild({ assignTherapistId: therapistOne.id });
    const token = getAccessToken(therapistOne);

    const created = await request(app)
      .post(`/v1/children/${child.id}/assessments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assessmentDate: TODAY });

    const res = await request(app)
      .patch(`/v1/children/${child.id}/assessments/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ chiefComplaint: 'Sensory processing difficulties', observations: 'Child is hyperactive' })
      .expect(httpStatus.OK);

    expect(res.body.chiefComplaint).toBe('Sensory processing difficulties');
    expect(res.body.observations).toBe('Child is hyperactive');
  });

  test('returns 409 ASSESSMENT_FINALISED when patching a finalised assessment', async () => {
    const child = await insertReadyChild({ assignTherapistId: therapistOne.id });
    const token = getAccessToken(therapistOne);

    const created = await request(app)
      .post(`/v1/children/${child.id}/assessments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assessmentDate: TODAY });

    await request(app)
      .post(`/v1/children/${child.id}/assessments/${created.body.id}/finalise`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .patch(`/v1/children/${child.id}/assessments/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'Should not work' })
      .expect(httpStatus.CONFLICT);

    expect(res.body.message).toBe('ASSESSMENT_FINALISED');
  });
});

// ─── Finalise ───────────────────────────────────────────────────────────────

describe('POST /v1/children/:childId/assessments/:assessmentId/finalise', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('finalises a draft assessment', async () => {
    const child = await insertReadyChild({ assignTherapistId: therapistOne.id });
    const token = getAccessToken(therapistOne);

    const created = await request(app)
      .post(`/v1/children/${child.id}/assessments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assessmentDate: TODAY });

    const res = await request(app)
      .post(`/v1/children/${child.id}/assessments/${created.body.id}/finalise`)
      .set('Authorization', `Bearer ${token}`)
      .expect(httpStatus.OK);

    expect(res.body.status).toBe('finalised');
    expect(res.body.version).toBe(1);
  });
});
