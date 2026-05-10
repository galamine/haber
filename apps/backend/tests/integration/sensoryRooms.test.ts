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
import { insertSensoryRooms, sensoryRoomOne, sensoryRoomTwo } from '../fixtures/sensoryRoom.fixture';
import { insertUsers } from '../fixtures/user.fixture';
import { setupTestDB } from '../utils/setupTestDB';

setupTestDB();

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const clinicAdmin = {
  id: 'rm000001-0000-0000-0000-000000000001',
  name: 'Clinic Admin',
  email: 'clinicadmin@rooms.test',
  role: 'clinic_admin' as const,
  tenantId: clinicOne.id,
  isActive: true,
};

const therapist = {
  id: 'rm000002-0000-0000-0000-000000000002',
  name: 'Therapist',
  email: 'therapist@rooms.test',
  role: 'therapist' as const,
  tenantId: clinicOne.id,
  isActive: true,
};

const otherClinicAdmin = {
  id: 'rm000003-0000-0000-0000-000000000003',
  name: 'Other Clinic Admin',
  email: 'other@rooms.test',
  role: 'clinic_admin' as const,
  tenantId: clinicTwo.id,
  isActive: true,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const seed = async () => {
  await insertSubscriptionPlans([subscriptionPlanOne]);
  await insertClinics([clinicOne, clinicTwo]);
  await insertUsers([clinicAdmin, therapist, otherClinicAdmin]);
  const { prisma } = await import('../utils/setupTestDB');
  await prisma.clinic.update({
    where: { id: clinicOne.id },
    data: { subscriptionPlanId: subscriptionPlanOne.id },
  });
};

const token = (user: { id: string; role: string; tenantId: string | null }) =>
  tokenService.generateToken(user.id, user.role, user.tenantId, moment().add(1, 'hour'), TokenType.ACCESS);

// ─── POST /v1/sensory-rooms ───────────────────────────────────────────────────

describe('POST /v1/sensory-rooms', () => {
  test('should return 201 and the created room when clinic_admin creates one', async () => {
    await seed();

    const res = await request(app)
      .post('/v1/sensory-rooms')
      .set('Authorization', `Bearer ${token(clinicAdmin)}`)
      .send({ name: 'Room A', code: 'RM-A', equipmentList: ['Swing'], status: 'active' })
      .expect(httpStatus.CREATED);

    expect(res.body).toMatchObject({
      id: expect.any(String),
      name: 'Room A',
      code: 'RM-A',
      tenantId: clinicOne.id,
      status: 'active',
      equipmentList: ['Swing'],
    });
  });

  test('should return 422 SENSORY_ROOM_LIMIT_REACHED when plan cap is hit', async () => {
    await seed();
    // subscriptionPlanOne has maxSensoryRooms: 2 — insert 2 rooms first
    await insertSensoryRooms([sensoryRoomOne, sensoryRoomTwo]);

    const res = await request(app)
      .post('/v1/sensory-rooms')
      .set('Authorization', `Bearer ${token(clinicAdmin)}`)
      .send({ name: 'Room C', code: 'RM-C', equipmentList: [], status: 'active' })
      .expect(httpStatus.UNPROCESSABLE_ENTITY);

    expect(res.body.message).toBe('SENSORY_ROOM_LIMIT_REACHED');
  });

  test('should return 409 ROOM_CODE_TAKEN when code is duplicated within the same clinic', async () => {
    await seed();
    await insertSensoryRooms([sensoryRoomOne]);

    const res = await request(app)
      .post('/v1/sensory-rooms')
      .set('Authorization', `Bearer ${token(clinicAdmin)}`)
      .send({ name: 'Duplicate', code: 'RM-A', equipmentList: [], status: 'active' })
      .expect(httpStatus.CONFLICT);

    expect(res.body.message).toBe('ROOM_CODE_TAKEN');
  });

  test('should return 403 when therapist tries to create a room', async () => {
    await seed();

    await request(app)
      .post('/v1/sensory-rooms')
      .set('Authorization', `Bearer ${token(therapist)}`)
      .send({ name: 'Room X', code: 'RM-X', equipmentList: [], status: 'active' })
      .expect(httpStatus.FORBIDDEN);
  });
});

// ─── GET /v1/sensory-rooms ────────────────────────────────────────────────────

describe('GET /v1/sensory-rooms', () => {
  test("should return rooms scoped to caller's clinic", async () => {
    await seed();
    await insertSensoryRooms([sensoryRoomOne, sensoryRoomTwo]);

    const res = await request(app)
      .get('/v1/sensory-rooms')
      .set('Authorization', `Bearer ${token(clinicAdmin)}`)
      .expect(httpStatus.OK);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  test('should filter by status', async () => {
    await seed();
    await insertSensoryRooms([sensoryRoomOne, sensoryRoomTwo]);

    const res = await request(app)
      .get('/v1/sensory-rooms?status=maintenance')
      .set('Authorization', `Bearer ${token(clinicAdmin)}`)
      .expect(httpStatus.OK);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('maintenance');
  });

  test('should not return rooms from another clinic', async () => {
    await seed();
    await insertSensoryRooms([sensoryRoomOne]);

    const res = await request(app)
      .get('/v1/sensory-rooms')
      .set('Authorization', `Bearer ${token(otherClinicAdmin)}`)
      .expect(httpStatus.OK);

    expect(res.body).toHaveLength(0);
  });
});

// ─── GET /v1/sensory-rooms/:id ────────────────────────────────────────────────

describe('GET /v1/sensory-rooms/:id', () => {
  test('should return room detail', async () => {
    await seed();
    await insertSensoryRooms([sensoryRoomOne]);

    const res = await request(app)
      .get(`/v1/sensory-rooms/${sensoryRoomOne.id}`)
      .set('Authorization', `Bearer ${token(clinicAdmin)}`)
      .expect(httpStatus.OK);

    expect(res.body).toMatchObject({ id: sensoryRoomOne.id, name: sensoryRoomOne.name });
  });

  test('should return 404 for room in another clinic', async () => {
    await seed();
    await insertSensoryRooms([sensoryRoomOne]);

    await request(app)
      .get(`/v1/sensory-rooms/${sensoryRoomOne.id}`)
      .set('Authorization', `Bearer ${token(otherClinicAdmin)}`)
      .expect(httpStatus.NOT_FOUND);
  });
});

// ─── PATCH /v1/sensory-rooms/:id ─────────────────────────────────────────────

describe('PATCH /v1/sensory-rooms/:id', () => {
  test('should update room status to maintenance', async () => {
    await seed();
    await insertSensoryRooms([sensoryRoomOne]);

    const res = await request(app)
      .patch(`/v1/sensory-rooms/${sensoryRoomOne.id}`)
      .set('Authorization', `Bearer ${token(clinicAdmin)}`)
      .send({ status: 'maintenance' })
      .expect(httpStatus.OK);

    expect(res.body.status).toBe('maintenance');
  });

  test('should return 409 when updating code to an existing code in the same clinic', async () => {
    await seed();
    await insertSensoryRooms([sensoryRoomOne, sensoryRoomTwo]);

    const res = await request(app)
      .patch(`/v1/sensory-rooms/${sensoryRoomOne.id}`)
      .set('Authorization', `Bearer ${token(clinicAdmin)}`)
      .send({ code: 'RM-B' })
      .expect(httpStatus.CONFLICT);

    expect(res.body.message).toBe('ROOM_CODE_TAKEN');
  });
});

// ─── DELETE /v1/sensory-rooms/:id ────────────────────────────────────────────

describe('DELETE /v1/sensory-rooms/:id', () => {
  test('should delete room and return 204', async () => {
    await seed();
    await insertSensoryRooms([sensoryRoomOne]);

    await request(app)
      .delete(`/v1/sensory-rooms/${sensoryRoomOne.id}`)
      .set('Authorization', `Bearer ${token(clinicAdmin)}`)
      .expect(httpStatus.NO_CONTENT);
  });

  test('should return 404 when deleting room from another clinic', async () => {
    await seed();
    await insertSensoryRooms([sensoryRoomOne]);

    await request(app)
      .delete(`/v1/sensory-rooms/${sensoryRoomOne.id}`)
      .set('Authorization', `Bearer ${token(otherClinicAdmin)}`)
      .expect(httpStatus.NOT_FOUND);
  });
});
