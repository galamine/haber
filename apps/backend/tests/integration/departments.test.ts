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
import { departmentOne, insertDepartments } from '../fixtures/department.fixture';
import { insertUsers } from '../fixtures/user.fixture';
import { setupTestDB } from '../utils/setupTestDB';

setupTestDB();

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const clinicAdmin = {
  id: 'cc000001-0000-0000-0000-000000000001',
  name: 'Clinic Admin',
  email: 'clinicadmin@depts.test',
  role: 'clinic_admin' as const,
  tenantId: clinicOne.id,
  isActive: true,
};

const therapist = {
  id: 'cc000002-0000-0000-0000-000000000002',
  name: 'Therapist',
  email: 'therapist@depts.test',
  role: 'therapist' as const,
  tenantId: clinicOne.id,
  isActive: true,
};

const otherClinicAdmin = {
  id: 'cc000003-0000-0000-0000-000000000003',
  name: 'Other Clinic Admin',
  email: 'other@depts.test',
  role: 'clinic_admin' as const,
  tenantId: clinicTwo.id,
  isActive: true,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const seed = async () => {
  await insertSubscriptionPlans([subscriptionPlanOne]);
  await insertClinics([clinicOne, clinicTwo]);
  await insertUsers([clinicAdmin, therapist, otherClinicAdmin]);
};

const token = (user: { id: string; role: string; tenantId: string | null }) =>
  tokenService.generateToken(user.id, user.role, user.tenantId, moment().add(1, 'hour'), TokenType.ACCESS);

// ─── POST /v1/departments ─────────────────────────────────────────────────────

describe('POST /v1/departments', () => {
  test('should return 201 and the created department when clinic_admin creates one', async () => {
    await seed();

    const res = await request(app)
      .post('/v1/departments')
      .set('Authorization', `Bearer ${token(clinicAdmin)}`)
      .send({ name: 'OT Wing', description: 'Occupational Therapy' })
      .expect(httpStatus.CREATED);

    expect(res.body).toMatchObject({
      id: expect.any(String),
      name: 'OT Wing',
      description: 'Occupational Therapy',
      tenantId: clinicOne.id,
      headUserId: null,
    });
  });

  test('should return 403 when therapist tries to create a department', async () => {
    await seed();

    await request(app)
      .post('/v1/departments')
      .set('Authorization', `Bearer ${token(therapist)}`)
      .send({ name: 'OT Wing' })
      .expect(httpStatus.FORBIDDEN);
  });

  test('should return 401 when unauthenticated', async () => {
    await seed();

    await request(app).post('/v1/departments').send({ name: 'OT Wing' }).expect(httpStatus.UNAUTHORIZED);
  });
});

// ─── GET /v1/departments ──────────────────────────────────────────────────────

describe('GET /v1/departments', () => {
  test("should return only departments in the caller's clinic", async () => {
    await seed();
    await insertDepartments([departmentOne]);

    const res = await request(app)
      .get('/v1/departments')
      .set('Authorization', `Bearer ${token(clinicAdmin)}`)
      .expect(httpStatus.OK);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ name: departmentOne.name, tenantId: clinicOne.id });
  });

  test('should not return departments from another clinic', async () => {
    await seed();
    await insertDepartments([departmentOne]);

    const res = await request(app)
      .get('/v1/departments')
      .set('Authorization', `Bearer ${token(otherClinicAdmin)}`)
      .expect(httpStatus.OK);

    expect(res.body).toHaveLength(0);
  });

  test('should return 403 when staff role accesses departments', async () => {
    await seed();

    const staffUser = {
      id: 'cc000004-0000-0000-0000-000000000004',
      name: 'Staff',
      email: 'staff@depts.test',
      role: 'staff' as const,
      tenantId: clinicOne.id,
      isActive: true,
    };
    await insertUsers([clinicAdmin, therapist, otherClinicAdmin, staffUser]);

    await request(app)
      .get('/v1/departments')
      .set('Authorization', `Bearer ${token(staffUser)}`)
      .expect(httpStatus.FORBIDDEN);
  });
});

// ─── PATCH /v1/departments/:id ────────────────────────────────────────────────

describe('PATCH /v1/departments/:id', () => {
  test('should update department name and description', async () => {
    await seed();
    await insertDepartments([departmentOne]);

    const res = await request(app)
      .patch(`/v1/departments/${departmentOne.id}`)
      .set('Authorization', `Bearer ${token(clinicAdmin)}`)
      .send({ name: 'Renamed Wing', description: 'Updated description' })
      .expect(httpStatus.OK);

    expect(res.body).toMatchObject({ id: departmentOne.id, name: 'Renamed Wing', description: 'Updated description' });
  });

  test('should return 404 when department does not exist', async () => {
    await seed();

    await request(app)
      .patch('/v1/departments/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token(clinicAdmin)}`)
      .send({ name: 'Ghost' })
      .expect(httpStatus.NOT_FOUND);
  });

  test("should return 404 when clinic_admin targets another clinic's department", async () => {
    await seed();
    await insertDepartments([departmentOne]);

    await request(app)
      .patch(`/v1/departments/${departmentOne.id}`)
      .set('Authorization', `Bearer ${token(otherClinicAdmin)}`)
      .send({ name: 'Stolen' })
      .expect(httpStatus.NOT_FOUND);
  });
});

// ─── DELETE /v1/departments/:id ───────────────────────────────────────────────

describe('DELETE /v1/departments/:id', () => {
  test('should return 204 when deleting a department with no rooms', async () => {
    await seed();
    await insertDepartments([departmentOne]);

    await request(app)
      .delete(`/v1/departments/${departmentOne.id}`)
      .set('Authorization', `Bearer ${token(clinicAdmin)}`)
      .expect(httpStatus.NO_CONTENT);
  });

  test('should return 422 DEPARTMENT_HAS_ROOMS when rooms are assigned', async () => {
    await seed();
    await insertDepartments([departmentOne]);

    const { prisma } = await import('../utils/setupTestDB');
    await prisma.sensoryRoom.create({
      data: {
        id: 'rr000001-0000-0000-0000-000000000001',
        tenantId: clinicOne.id,
        name: 'Room A',
        code: 'RM-A',
        departmentId: departmentOne.id,
        equipmentList: [],
        status: 'active',
      },
    });

    const res = await request(app)
      .delete(`/v1/departments/${departmentOne.id}`)
      .set('Authorization', `Bearer ${token(clinicAdmin)}`)
      .expect(httpStatus.UNPROCESSABLE_ENTITY);

    expect(res.body.message).toBe('DEPARTMENT_HAS_ROOMS');
  });
});
