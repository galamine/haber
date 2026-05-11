import httpStatus from 'http-status';
import moment from 'moment';
import request from 'supertest';
import app from '../../src/app';
import { TokenType } from '../../src/config/tokens';
import { tokenService } from '../../src/services/token.service';
import { childOne, childTwo, insertChildren } from '../fixtures/child.fixture';
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
  id: 'ca1b2c3d-e5f6-7890-abcd-0123456789ab',
  name: 'Clinic Admin One',
  email: 'clinicadminone@test.com',
  role: 'clinic_admin' as const,
  tenantId: clinicOne.id,
  isActive: true,
};

const therapistOne = {
  id: 'th1b2c3d-e5f6-7890-abcd-0123456789ac',
  name: 'Therapist One',
  email: 'therapistone@test.com',
  role: 'therapist' as const,
  tenantId: clinicOne.id,
  isActive: true,
};

const clinicAdminTwo = {
  id: 'ca2b2c3d-e5f6-7890-abcd-0123456789ad',
  name: 'Clinic Admin Two',
  email: 'clinicadmintwo@test.com',
  role: 'clinic_admin' as const,
  tenantId: clinicTwo.id,
  isActive: true,
};

const therapistTwo = {
  id: 'th2b2c3d-e5f6-7890-abcd-0123456789ae',
  name: 'Therapist Two',
  email: 'therapisttwo@test.com',
  role: 'therapist' as const,
  tenantId: clinicTwo.id,
  isActive: true,
};

const superAdmin = {
  id: 'sa1b2c3d-e5f6-7890-abcd-0123456789af',
  name: 'Super Admin',
  email: 'superadmin@test.com',
  role: 'super_admin' as const,
  tenantId: null as string | null,
  isActive: true,
};

const insertClinicData = async () => {
  await insertSubscriptionPlans([subscriptionPlanOne]);
  await insertClinics([clinicOne, clinicTwo]);
  await insertUsers([clinicAdminOne, therapistOne, clinicAdminTwo, therapistTwo, superAdmin]);
  await prisma.clinic.update({
    where: { id: clinicOne.id },
    data: { subscriptionPlanId: subscriptionPlanOne.id },
  });
  await prisma.clinic.update({
    where: { id: clinicTwo.id },
    data: { subscriptionPlanId: subscriptionPlanOne.id },
  });
};

const getAccessToken = (user: typeof clinicAdminOne | typeof therapistOne | typeof clinicAdminTwo | typeof superAdmin) => {
  const accessTokenExpires = moment().add(1, 'hour');
  return tokenService.generateToken(user.id, user.role, user.tenantId, accessTokenExpires, TokenType.ACCESS);
};

describe('POST /v1/children', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('should return 201 with intakeComplete: false', async () => {
    const token = getAccessToken(clinicAdminOne);

    const res = await request(app)
      .post('/v1/children')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Test Child',
        dob: '2018-06-15T00:00:00.000Z',
        sex: 'male',
        spokenLanguages: ['English'],
      })
      .expect(httpStatus.CREATED);

    expect(res.body.intakeComplete).toBe(false);
    expect(res.body.childCode).toMatch(/^CHD-\d{4}$/);
    expect(res.body.fullName).toBe('Test Child');
  });
});

describe('Intake completion flow', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('should return intakeComplete: true when all required fields are filled', async () => {
    const token = getAccessToken(clinicAdminOne);

    const createRes = await request(app)
      .post('/v1/children')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Test Child',
        dob: '2018-06-15T00:00:00.000Z',
        sex: 'male',
        spokenLanguages: ['English'],
      });

    const childId = createRes.body.id;

    await request(app).post(`/v1/children/${childId}/guardians`).set('Authorization', `Bearer ${token}`).send({
      fullName: 'Test Guardian',
      relationship: 'mother',
      phone: '555-1234',
      email: 'guardian@test.com',
    });

    await request(app).put(`/v1/children/${childId}/medical-history`).set('Authorization', `Bearer ${token}`).send({
      birthTerm: 'term',
      immunizations: 'Up to date',
      allergies: 'None',
      currentMedications: [],
    });

    await request(app).patch(`/v1/children/${childId}`).set('Authorization', `Bearer ${token}`).send({
      heightCm: 110,
      weightKg: 20,
      measurementDate: '2024-01-15T00:00:00.000Z',
    });

    const statusRes = await request(app)
      .get(`/v1/children/${childId}/intake-status`)
      .set('Authorization', `Bearer ${token}`);

    expect(statusRes.body.intakeComplete).toBe(true);
    expect(statusRes.body.missingFields).toEqual([]);
  });
});

describe('GET /v1/children', () => {
  beforeEach(async () => {
    await insertClinicData();
    await insertChildren([{ ...childOne }, { ...childTwo }]);
  });

  test('should not return children from other clinic', async () => {
    const token = getAccessToken(clinicAdminTwo);

    const res = await request(app).get('/v1/children').set('Authorization', `Bearer ${token}`);

    expect(res.body.results.some((c: { id: string }) => c.id === childOne.id)).toBe(false);
  });
});

describe('DELETE /v1/children/:id', () => {
  beforeEach(async () => {
    await insertClinicData();
    await insertChildren([{ ...childOne }]);
  });

  test('should soft delete child and exclude from list', async () => {
    const token = getAccessToken(clinicAdminOne);

    await request(app)
      .delete(`/v1/children/${childOne.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(httpStatus.NO_CONTENT);

    const listRes = await request(app).get('/v1/children').set('Authorization', `Bearer ${token}`);
    expect(listRes.body.results.some((c: { id: string }) => c.id === childOne.id)).toBe(false);
  });

  test('should return deleted child for super_admin with includeDeleted=true', async () => {
    const adminToken = getAccessToken(superAdmin);

    await request(app)
      .delete(`/v1/children/${childOne.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(httpStatus.NO_CONTENT);

    const listRes = await request(app).get('/v1/children?includeDeleted=true').set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.body.results.some((c: { id: string }) => c.id === childOne.id)).toBe(true);
  });
});

describe('PATCH /v1/children/:id', () => {
  beforeEach(async () => {
    await insertClinicData();
    await insertChildren([{ ...childOne }]);
  });

  test('should return 422 when preferredTherapistId is from different clinic', async () => {
    const token = getAccessToken(clinicAdminOne);

    await request(app)
      .patch(`/v1/children/${childOne.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ preferredTherapistId: therapistTwo.id })
      .expect(httpStatus.UNPROCESSABLE_ENTITY);
  });
});

describe('GET /v1/children/:id', () => {
  beforeEach(async () => {
    await insertClinicData();
    await insertChildren([{ ...childOne }]);
    await prisma.childTherapist.create({
      data: { childId: childOne.id, userId: therapistOne.id },
    });
  });

  test('should return 403 when therapist is not assigned to child', async () => {
    const token = getAccessToken(therapistTwo);

    await request(app)
      .get(`/v1/children/${childOne.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(httpStatus.FORBIDDEN);
  });

  test('should return child when therapist is assigned', async () => {
    const token = getAccessToken(therapistOne);

    const res = await request(app).get(`/v1/children/${childOne.id}`).set('Authorization', `Bearer ${token}`);

    expect(res.body.id).toBe(childOne.id);
  });
});
