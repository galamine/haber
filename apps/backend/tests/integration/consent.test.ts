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

const insertClinicData = async () => {
  await insertSubscriptionPlans([subscriptionPlanOne]);
  await insertClinics([clinicOne, clinicTwo]);
  await insertUsers([clinicAdminOne, therapistOne]);
  await prisma.clinic.update({
    where: { id: clinicOne.id },
    data: { subscriptionPlanId: subscriptionPlanOne.id },
  });
};

const getAccessToken = (user: typeof clinicAdminOne | typeof therapistOne) => {
  const accessTokenExpires = moment().add(1, 'hour');
  return tokenService.generateToken(user.id, user.role, user.tenantId, accessTokenExpires, TokenType.ACCESS);
};

const insertChildWithGuardians = async () => {
  const { v4: uuidv4 } = await import('uuid');
  const childId = uuidv4();
  const guardian1Id = uuidv4();
  const guardian2Id = uuidv4();

  const child = await prisma.child.create({
    data: {
      id: childId,
      tenantId: clinicOne.id,
      childCode: `CHD-${childId.substring(0, 8)}`,
      fullName: 'Consent Test Child',
      dob: new Date('2018-06-15'),
      sex: 'male',
      spokenLanguages: [],
      intakeComplete: true,
    },
  });

  const guardian1 = await prisma.guardian.create({
    data: {
      id: guardian1Id,
      childId: child.id,
      fullName: 'Guardian One',
      relationship: 'mother',
      phone: '555-1234',
    },
  });

  const guardian2 = await prisma.guardian.create({
    data: {
      id: guardian2Id,
      childId: child.id,
      fullName: 'Guardian Two',
      relationship: 'father',
      phone: '555-5678',
    },
  });

  await prisma.childTherapist.create({
    data: { childId: child.id, userId: therapistOne.id },
  });

  return { child, guardian1, guardian2 };
};

describe('POST /v1/children/:childId/consent', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('should return 400 when guardian does not belong to child', async () => {
    const { child } = await insertChildWithGuardians();
    const token = getAccessToken(clinicAdminOne);

    const res = await request(app)
      .post(`/v1/children/${child.id}/consent`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        guardianId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        type: 'treatment',
        typedName: 'Guardian One',
      })
      .expect(httpStatus.BAD_REQUEST);

    expect(res.body.message).toBe('Guardian does not belong to this child');
  });

  test('should create consent record and return 201', async () => {
    const { child, guardian1 } = await insertChildWithGuardians();
    const token = getAccessToken(clinicAdminOne);

    const res = await request(app)
      .post(`/v1/children/${child.id}/consent`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        guardianId: guardian1.id,
        type: 'treatment',
        typedName: 'Guardian One',
      })
      .expect(httpStatus.CREATED);

    expect(res.body.id).toBeDefined();
    expect(res.body.guardianId).toBe(guardian1.id);
    expect(res.body.type).toBe('treatment');
    expect(res.body.status).toBe('active');
  });
});

describe('Consent status flow', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('should return allConsented: false when no consents given', async () => {
    const { child } = await insertChildWithGuardians();
    const token = getAccessToken(clinicAdminOne);

    const res = await request(app).get(`/v1/children/${child.id}/consent-status`).set('Authorization', `Bearer ${token}`);

    expect(res.body.allConsented).toBe(false);
    expect(res.body.consentStatus).toBe('none');
    expect(res.body.guardians).toHaveLength(2);
  });

  test('should return allConsented: false when only one guardian has both types', async () => {
    const { child, guardian1 } = await insertChildWithGuardians();
    const token = getAccessToken(clinicAdminOne);

    await request(app).post(`/v1/children/${child.id}/consent`).set('Authorization', `Bearer ${token}`).send({
      guardianId: guardian1.id,
      type: 'treatment',
      typedName: 'Guardian One',
    });

    await request(app).post(`/v1/children/${child.id}/consent`).set('Authorization', `Bearer ${token}`).send({
      guardianId: guardian1.id,
      type: 'data_processing',
      typedName: 'Guardian One',
    });

    const res = await request(app).get(`/v1/children/${child.id}/consent-status`).set('Authorization', `Bearer ${token}`);

    expect(res.body.allConsented).toBe(false);
    expect(res.body.consentStatus).toBe('partial');
  });

  test('should return allConsented: true when both guardians have both consent types', async () => {
    const { child, guardian1, guardian2 } = await insertChildWithGuardians();
    const token = getAccessToken(clinicAdminOne);

    for (const guardian of [guardian1, guardian2]) {
      await request(app).post(`/v1/children/${child.id}/consent`).set('Authorization', `Bearer ${token}`).send({
        guardianId: guardian.id,
        type: 'treatment',
        typedName: guardian.fullName,
      });

      await request(app).post(`/v1/children/${child.id}/consent`).set('Authorization', `Bearer ${token}`).send({
        guardianId: guardian.id,
        type: 'data_processing',
        typedName: guardian.fullName,
      });
    }

    const res = await request(app).get(`/v1/children/${child.id}/consent-status`).set('Authorization', `Bearer ${token}`);

    expect(res.body.allConsented).toBe(true);
    expect(res.body.consentStatus).toBe('all_consented');
  });
});

describe('requireConsent middleware', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('should allow request when consentStatus is all_consented', async () => {
    const { child, guardian1, guardian2 } = await insertChildWithGuardians();
    const token = getAccessToken(clinicAdminOne);

    for (const guardian of [guardian1, guardian2]) {
      await request(app).post(`/v1/children/${child.id}/consent`).set('Authorization', `Bearer ${token}`).send({
        guardianId: guardian.id,
        type: 'treatment',
        typedName: guardian.fullName,
      });

      await request(app).post(`/v1/children/${child.id}/consent`).set('Authorization', `Bearer ${token}`).send({
        guardianId: guardian.id,
        type: 'data_processing',
        typedName: guardian.fullName,
      });
    }

    const dbChild = await prisma.child.findUnique({ where: { id: child.id } });
    expect(dbChild?.consentStatus).toBe('all_consented');
  });
});

describe('Withdraw consent', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('should set consentStatus to withdrawn when consent is withdrawn', async () => {
    const { child, guardian1 } = await insertChildWithGuardians();
    const token = getAccessToken(clinicAdminOne);

    await request(app).post(`/v1/children/${child.id}/consent`).set('Authorization', `Bearer ${token}`).send({
      guardianId: guardian1.id,
      type: 'treatment',
      typedName: 'Guardian One',
    });

    await request(app).post(`/v1/children/${child.id}/consent`).set('Authorization', `Bearer ${token}`).send({
      guardianId: guardian1.id,
      type: 'data_processing',
      typedName: 'Guardian One',
    });

    const consentRecord = await prisma.consentRecord.findFirst({
      where: { childId: child.id, guardianId: guardian1.id, type: 'treatment' },
    });

    await request(app)
      .post(`/v1/children/${child.id}/consent/${consentRecord?.id}/withdraw`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Changed my mind' })
      .expect(httpStatus.NO_CONTENT);

    const dbChild = await prisma.child.findUnique({ where: { id: child.id } });
    expect(dbChild?.consentStatus).toBe('withdrawn');
  });

  test('should return 403 when consentId does not belong to child', async () => {
    const { child: child1 } = await insertChildWithGuardians();
    const { child: child2, guardian2 } = await insertChildWithGuardians();

    const token = getAccessToken(clinicAdminOne);

    const consentRecord = await prisma.consentRecord.create({
      data: {
        guardianId: guardian2.id,
        childId: child2.id,
        type: 'treatment',
        typedName: 'Guardian Two',
        checkedAt: new Date(),
        ipAddress: '127.0.0.1',
        status: 'active',
      },
    });

    await request(app)
      .post(`/v1/children/${child1.id}/consent/${consentRecord.id}/withdraw`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Trying to withdraw other child consent' })
      .expect(httpStatus.FORBIDDEN);
  });
});

describe('Re-capture consent after withdrawal', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('should create new ConsentRecord row after withdrawal and restore allConsented', async () => {
    const { child, guardian1, guardian2 } = await insertChildWithGuardians();
    const token = getAccessToken(clinicAdminOne);

    for (const guardian of [guardian1, guardian2]) {
      await request(app).post(`/v1/children/${child.id}/consent`).set('Authorization', `Bearer ${token}`).send({
        guardianId: guardian.id,
        type: 'treatment',
        typedName: guardian.fullName,
      });

      await request(app).post(`/v1/children/${child.id}/consent`).set('Authorization', `Bearer ${token}`).send({
        guardianId: guardian.id,
        type: 'data_processing',
        typedName: guardian.fullName,
      });
    }

    const consentRecord = await prisma.consentRecord.findFirst({
      where: { childId: child.id, guardianId: guardian1.id, type: 'treatment' },
    });

    await request(app)
      .post(`/v1/children/${child.id}/consent/${consentRecord?.id}/withdraw`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Changed my mind' });

    const countBefore = await prisma.consentRecord.count({ where: { childId: child.id } });

    await request(app).post(`/v1/children/${child.id}/consent`).set('Authorization', `Bearer ${token}`).send({
      guardianId: guardian1.id,
      type: 'treatment',
      typedName: 'Guardian One Re-captured',
    });

    const countAfter = await prisma.consentRecord.count({ where: { childId: child.id } });
    expect(countAfter).toBe(countBefore + 1);

    const res = await request(app).get(`/v1/children/${child.id}/consent-status`).set('Authorization', `Bearer ${token}`);

    expect(res.body.allConsented).toBe(true);
    expect(res.body.consentStatus).toBe('all_consented');
  });
});

describe('GET /v1/children/:childId/consent (history)', () => {
  beforeEach(async () => {
    await insertClinicData();
  });

  test('should return all consent records for child', async () => {
    const { child, guardian1 } = await insertChildWithGuardians();
    const token = getAccessToken(clinicAdminOne);

    await request(app).post(`/v1/children/${child.id}/consent`).set('Authorization', `Bearer ${token}`).send({
      guardianId: guardian1.id,
      type: 'treatment',
      typedName: 'Guardian One',
    });

    await request(app).post(`/v1/children/${child.id}/consent`).set('Authorization', `Bearer ${token}`).send({
      guardianId: guardian1.id,
      type: 'data_processing',
      typedName: 'Guardian One',
    });

    const res = await request(app).get(`/v1/children/${child.id}/consent`).set('Authorization', `Bearer ${token}`);

    expect(res.body).toHaveLength(2);
    expect(res.body[0].ipAddress).toBeDefined();
  });
});
