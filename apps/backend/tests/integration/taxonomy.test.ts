import httpStatus from 'http-status';
import moment from 'moment';
import request from 'supertest';
import app from '../../src/app';
import { TokenType } from '../../src/config/tokens';
import { tokenService } from '../../src/services/token.service';
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
  email: 'clinicadminone@taxonomy.test',
  role: 'clinic_admin' as const,
  tenantId: clinicOne.id,
  isActive: true,
};

const clinicAdminTwo = {
  id: 'ca2b2c3d-e5f6-7890-abcd-0123456789ad',
  name: 'Clinic Admin Two',
  email: 'clinicadmintwo@taxonomy.test',
  role: 'clinic_admin' as const,
  tenantId: clinicTwo.id,
  isActive: true,
};

const therapistOne = {
  id: 'th1b2c3d-e5f6-7890-abcd-0123456789ac',
  name: 'Therapist One',
  email: 'therapistone@taxonomy.test',
  role: 'therapist' as const,
  tenantId: clinicOne.id,
  isActive: true,
};

const insertClinicData = async () => {
  await insertSubscriptionPlans([subscriptionPlanOne]);
  await insertClinics([clinicOne, clinicTwo]);
  await insertUsers([clinicAdminOne, clinicAdminTwo, therapistOne]);
  await prisma.clinic.update({ where: { id: clinicOne.id }, data: { subscriptionPlanId: subscriptionPlanOne.id } });
  await prisma.clinic.update({ where: { id: clinicTwo.id }, data: { subscriptionPlanId: subscriptionPlanOne.id } });
};

const getToken = (user: { id: string; role: string; tenantId: string | null }) => {
  const expires = moment().add(1, 'hour');
  return tokenService.generateToken(user.id, user.role, user.tenantId, expires, TokenType.ACCESS);
};

const seedGlobalDiagnosis = (name: string) =>
  prisma.diagnosis.create({ data: { name, frameworkId: 'global', tenantId: null } });

const seedClinicDiagnosis = (name: string, tenantId: string) =>
  prisma.diagnosis.create({ data: { name, frameworkId: `clinic_${tenantId}`, tenantId } });

// ─────────────────────────────────────────────────────────────
// Behavior 1: GET returns global entries for the caller's tenant
// ─────────────────────────────────────────────────────────────
describe('GET /v1/taxonomies/diagnoses', () => {
  beforeEach(insertClinicData);

  test('returns global diagnoses for authenticated clinic admin', async () => {
    await seedGlobalDiagnosis('ASD');
    await seedGlobalDiagnosis('ADHD');

    const res = await request(app)
      .get('/v1/taxonomies/diagnoses')
      .set('Authorization', `Bearer ${getToken(clinicAdminOne)}`);

    expect(res.status).toBe(httpStatus.OK);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.map((d: { name: string }) => d.name)).toEqual(expect.arrayContaining(['ASD', 'ADHD']));
  });

  // ─────────────────────────────────────────────────────────────
  // Behavior 2: GET includes the caller's own clinic extensions
  // ─────────────────────────────────────────────────────────────
  test("includes the clinic's own tenant-scoped extensions alongside global entries", async () => {
    await seedGlobalDiagnosis('ASD');
    await seedClinicDiagnosis('Custom Clinic 1 Entry', clinicOne.id);

    const res = await request(app)
      .get('/v1/taxonomies/diagnoses')
      .set('Authorization', `Bearer ${getToken(clinicAdminOne)}`);

    expect(res.status).toBe(httpStatus.OK);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.map((d: { name: string }) => d.name)).toEqual(
      expect.arrayContaining(['ASD', 'Custom Clinic 1 Entry'])
    );
  });

  // ─────────────────────────────────────────────────────────────
  // Behavior 3: GET excludes another clinic's extensions
  // ─────────────────────────────────────────────────────────────
  test("does not include another clinic's extensions", async () => {
    await seedGlobalDiagnosis('ASD');
    await seedClinicDiagnosis('Clinic Two Private Entry', clinicTwo.id);

    const res = await request(app)
      .get('/v1/taxonomies/diagnoses')
      .set('Authorization', `Bearer ${getToken(clinicAdminOne)}`);

    expect(res.status).toBe(httpStatus.OK);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('ASD');
  });

  // ─────────────────────────────────────────────────────────────
  // Behavior 4: Therapist can GET (has child.intake)
  // ─────────────────────────────────────────────────────────────
  test('therapist can list taxonomies', async () => {
    await seedGlobalDiagnosis('ASD');

    const res = await request(app)
      .get('/v1/taxonomies/diagnoses')
      .set('Authorization', `Bearer ${getToken(therapistOne)}`);

    expect(res.status).toBe(httpStatus.OK);
    expect(res.body.data).toHaveLength(1);
  });

  // ─────────────────────────────────────────────────────────────
  // Behavior 5: Unauthenticated GET → 401
  // ─────────────────────────────────────────────────────────────
  test('returns 401 for unauthenticated requests', async () => {
    const res = await request(app).get('/v1/taxonomies/diagnoses');
    expect(res.status).toBe(httpStatus.UNAUTHORIZED);
  });
});

// ─────────────────────────────────────────────────────────────
// Behavior 6: Clinic admin POST creates a tenant-scoped entry
// ─────────────────────────────────────────────────────────────
describe('POST /v1/taxonomies/diagnoses', () => {
  beforeEach(insertClinicData);

  test('clinic admin creates a custom diagnosis extension', async () => {
    const res = await request(app)
      .post('/v1/taxonomies/diagnoses')
      .set('Authorization', `Bearer ${getToken(clinicAdminOne)}`)
      .send({ name: 'Custom Hypotonia NOS', icdReference: 'G70.9' });

    expect(res.status).toBe(httpStatus.CREATED);
    expect(res.body.name).toBe('Custom Hypotonia NOS');
    expect(res.body.icdReference).toBe('G70.9');
    expect(res.body.frameworkId).toBe(`clinic_${clinicOne.id}`);
    expect(res.body.tenantId).toBe(clinicOne.id);
  });

  // ─────────────────────────────────────────────────────────────
  // Behavior 7: POST entry visible only to that clinic's GET
  // ─────────────────────────────────────────────────────────────
  test('created entry appears only in the creating clinic GET, not another clinic', async () => {
    await request(app)
      .post('/v1/taxonomies/diagnoses')
      .set('Authorization', `Bearer ${getToken(clinicAdminOne)}`)
      .send({ name: 'Clinic One Custom' });

    const resOne = await request(app)
      .get('/v1/taxonomies/diagnoses')
      .set('Authorization', `Bearer ${getToken(clinicAdminOne)}`);

    const resTwo = await request(app)
      .get('/v1/taxonomies/diagnoses')
      .set('Authorization', `Bearer ${getToken(clinicAdminTwo)}`);

    expect(resOne.body.data.map((d: { name: string }) => d.name)).toContain('Clinic One Custom');
    expect(resTwo.body.data.map((d: { name: string }) => d.name)).not.toContain('Clinic One Custom');
  });

  // ─────────────────────────────────────────────────────────────
  // Behavior 10: Therapist POST → 403
  // ─────────────────────────────────────────────────────────────
  test('therapist cannot create taxonomy extensions', async () => {
    const res = await request(app)
      .post('/v1/taxonomies/diagnoses')
      .set('Authorization', `Bearer ${getToken(therapistOne)}`)
      .send({ name: 'Should Fail' });

    expect(res.status).toBe(httpStatus.FORBIDDEN);
  });
});

// ─────────────────────────────────────────────────────────────
// Behavior 8 & 9: DELETE
// ─────────────────────────────────────────────────────────────
describe('DELETE /v1/taxonomies/diagnoses/:id', () => {
  beforeEach(insertClinicData);

  test('returns 403 when attempting to delete a global taxonomy entry', async () => {
    const global = await seedGlobalDiagnosis('ASD');

    const res = await request(app)
      .delete(`/v1/taxonomies/diagnoses/${global.id}`)
      .set('Authorization', `Bearer ${getToken(clinicAdminOne)}`);

    expect(res.status).toBe(httpStatus.FORBIDDEN);
    expect(res.body.message).toBe('CANNOT_DELETE_GLOBAL_TAXONOMY');
  });

  test('clinic admin can delete their own tenant-scoped extension', async () => {
    const custom = await seedClinicDiagnosis('To Be Deleted', clinicOne.id);

    const deleteRes = await request(app)
      .delete(`/v1/taxonomies/diagnoses/${custom.id}`)
      .set('Authorization', `Bearer ${getToken(clinicAdminOne)}`);

    expect(deleteRes.status).toBe(httpStatus.NO_CONTENT);

    const listRes = await request(app)
      .get('/v1/taxonomies/diagnoses')
      .set('Authorization', `Bearer ${getToken(clinicAdminOne)}`);

    expect(listRes.body.data.map((d: { name: string }) => d.name)).not.toContain('To Be Deleted');
  });
});
