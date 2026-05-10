import httpStatus from 'http-status';
import moment from 'moment';
import request from 'supertest';
import app from '../../src/app';
import { TokenType } from '../../src/config/tokens';
import { emailService } from '../../src/services/email.service';
import { otpService } from '../../src/services/otp.service';
import { tokenService } from '../../src/services/token.service';
import {
  clinicOne,
  clinicTwo,
  insertClinics,
  insertSubscriptionPlans,
  subscriptionPlanOne,
} from '../fixtures/clinic.fixture';
import { insertStaffPermissions } from '../fixtures/staffPermission.fixture';
import { insertUsers, userOne } from '../fixtures/user.fixture';
import { prisma, setupTestDB } from '../utils/setupTestDB';

setupTestDB();

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const clinicAdmin = {
  id: 'ca1b2c3d-e5f6-7890-abcd-0123456789ab',
  name: 'Clinic Admin',
  email: 'clinicadmin@test.com',
  role: 'clinic_admin' as const,
  tenantId: clinicOne.id,
  isActive: true,
};

const therapistUser = {
  id: 'ab1b2c3d-e5f6-7890-abcd-0123456789ac',
  name: 'Therapist User',
  email: 'therapist@test.com',
  role: 'therapist' as const,
  tenantId: clinicOne.id,
  isActive: true,
};

const staffUser = {
  id: 'ab1b2c3d-e5f6-7890-abcd-0123456789ad',
  name: 'Staff User',
  email: 'staff@test.com',
  role: 'staff' as const,
  tenantId: clinicOne.id,
  isActive: true,
};

const inactiveTherapist = {
  id: 'ab1b2c3d-e5f6-7890-abcd-0123456789ae',
  name: 'Inactive Therapist',
  email: 'inactivetherapist@test.com',
  role: 'therapist' as const,
  tenantId: clinicOne.id,
  isActive: false,
};

const otherClinicAdmin = {
  id: 'ab1b2c3d-e5f6-7890-abcd-0123456789af',
  name: 'Other Clinic Admin',
  email: 'otherclinicadmin@test.com',
  role: 'clinic_admin' as const,
  tenantId: clinicTwo.id,
  isActive: true,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const insertClinicStaff = async () => {
  await insertSubscriptionPlans([subscriptionPlanOne]);
  await insertClinics([clinicOne, clinicTwo]);
  await insertUsers([clinicAdmin, therapistUser, staffUser, inactiveTherapist, otherClinicAdmin]);
  await prisma.clinic.update({
    where: { id: clinicOne.id },
    data: { subscriptionPlanId: subscriptionPlanOne.id },
  });
  await prisma.user.update({
    where: { id: inactiveTherapist.id },
    data: { isActive: false },
  });
};

const getAccessToken = (user: typeof clinicAdmin | typeof therapistUser | typeof otherClinicAdmin) => {
  const accessTokenExpires = moment().add(1, 'hour');
  return tokenService.generateToken(user.id, user.role, user.tenantId, accessTokenExpires, TokenType.ACCESS);
};

// ─── POST /v1/staff/invite ────────────────────────────────────────────────────

describe('POST /v1/staff/invite', () => {
  beforeEach(() => {
    vi.spyOn(emailService, 'sendInviteEmail').mockResolvedValue(undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  test('should return 201 when clinic_admin invites a therapist', async () => {
    await insertClinicStaff();
    const token = getAccessToken(clinicAdmin);

    const res = await request(app)
      .post('/v1/staff/invite')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'newtherapist@test.com', role: 'therapist', permissions: [], departmentIds: [] })
      .expect(httpStatus.CREATED);

    expect(res.body).toEqual({ message: 'Invitation sent' });

    const invitedUser = await prisma.user.findFirst({ where: { email: 'newtherapist@test.com' } });
    expect(invitedUser).not.toBeNull();
    expect(invitedUser!.isActive).toBe(false);
    expect(invitedUser!.role).toBe('therapist');
    expect(invitedUser!.tenantId).toBe(clinicOne.id);
    expect(invitedUser!.invitedByUserId).toBe(clinicAdmin.id);

    const otpRecord = await prisma.otpRecord.findFirst({
      where: { userId: invitedUser!.id, type: 'invite' },
    });
    expect(otpRecord).not.toBeNull();
  });

  test('should return 422 when inviting 6th therapist when limit is 5', async () => {
    await insertClinicStaff();
    const token = getAccessToken(clinicAdmin);

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/v1/staff/invite')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: `therapist${i}@test.com`, role: 'therapist', permissions: [], departmentIds: [] });
    }

    await request(app)
      .post('/v1/staff/invite')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'sixththerapist@test.com', role: 'therapist', permissions: [], departmentIds: [] })
      .expect(httpStatus.UNPROCESSABLE_ENTITY);
  });

  test('should return 403 when non-admin tries to invite', async () => {
    await insertClinicStaff();
    const token = getAccessToken(therapistUser);

    await request(app)
      .post('/v1/staff/invite')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'newtherapist@test.com', role: 'therapist', permissions: [], departmentIds: [] })
      .expect(httpStatus.FORBIDDEN);
  });
});

// ─── POST /v1/auth/verify-otp (invite flow) ──────────────────────────────────

describe('POST /v1/auth/verify-otp (invite flow)', () => {
  let inviteOtp: string;
  let invitedUserId: string;

  beforeEach(async () => {
    vi.spyOn(emailService, 'sendInviteEmail').mockImplementation(async (_to, _clinicName, _role, otp) => {
      inviteOtp = otp;
    });
    await insertClinicStaff();
    const token = getAccessToken(clinicAdmin);

    await request(app)
      .post('/v1/staff/invite')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'invitedtherapist@test.com', role: 'therapist', permissions: ['student.intake'], departmentIds: [] });

    const invitedUser = await prisma.user.findFirst({ where: { email: 'invitedtherapist@test.com' } });
    invitedUserId = invitedUser!.id;
  });
  afterEach(() => vi.restoreAllMocks());

  test('should activate user and return tokens on valid invite OTP', async () => {
    const res = await request(app)
      .post('/v1/auth/verify-otp')
      .send({ email: 'invitedtherapist@test.com', otp: inviteOtp })
      .expect(httpStatus.OK);

    expect(res.body.tokens).toEqual({
      access: { token: expect.any(String), expires: expect.any(String) },
      refresh: { token: expect.any(String), expires: expect.any(String) },
    });

    const updatedUser = await prisma.user.findUnique({ where: { id: invitedUserId } });
    expect(updatedUser!.isActive).toBe(true);

    const staffPermission = await prisma.staffPermission.findUnique({ where: { userId: invitedUserId } });
    expect(staffPermission!.permissions).toEqual(['student.intake']);
  });
});

// ─── GET /v1/staff ─────────────────────────────────────────────────────────────

describe('GET /v1/staff', () => {
  beforeEach(async () => {
    await insertClinicStaff();
    await insertStaffPermissions([{ id: 'sp1', userId: therapistUser.id, permissions: ['student.intake'] }]);
  });

  test('should return staff list for clinic_admin', async () => {
    const token = getAccessToken(clinicAdmin);

    const res = await request(app).get('/v1/staff').set('Authorization', `Bearer ${token}`).expect(httpStatus.OK);

    expect(res.body.results).toHaveLength(4);
    expect(res.body.results.some((s: { email: string }) => s.email === therapistUser.email)).toBe(true);
    expect(res.body.results.some((s: { email: string }) => s.email === staffUser.email)).toBe(true);
    expect(res.body.results.some((s: { email: string }) => s.email === inactiveTherapist.email)).toBe(true);
  });

  test('should not return staff from other clinic', async () => {
    const token = getAccessToken(otherClinicAdmin);

    const res = await request(app).get('/v1/staff').set('Authorization', `Bearer ${token}`).expect(httpStatus.OK);

    expect(res.body.results.some((s: { email: string }) => s.email === therapistUser.email)).toBe(false);
  });
});

// ─── POST /v1/staff/:userId/deactivate ────────────────────────────────────────

describe('POST /v1/staff/:userId/deactivate', () => {
  beforeEach(async () => {
    await insertClinicStaff();
  });

  test('should deactivate a staff member', async () => {
    const token = getAccessToken(clinicAdmin);

    await request(app)
      .post(`/v1/staff/${therapistUser.id}/deactivate`)
      .set('Authorization', `Bearer ${token}`)
      .expect(httpStatus.NO_CONTENT);

    const deactivatedUser = await prisma.user.findUnique({ where: { id: therapistUser.id } });
    expect(deactivatedUser!.isActive).toBe(false);
  });

  test('should return 401 when deactivated user tries to login', async () => {
    await prisma.user.update({ where: { id: therapistUser.id }, data: { isActive: false } });

    const res = await request(app).post('/v1/auth/request-otp').send({ email: therapistUser.email });

    expect(res.status).toBe(httpStatus.OK);

    const otpRecord = await prisma.otpRecord.findFirst({
      where: { userId: therapistUser.id, type: 'login' },
      orderBy: { createdAt: 'desc' },
    });

    await request(app)
      .post('/v1/auth/verify-otp')
      .send({ email: therapistUser.email, otp: '000000' })
      .expect(httpStatus.UNAUTHORIZED);
  });
});

// ─── GET /v1/staff/capacity ────────────────────────────────────────────────────

describe('GET /v1/staff/capacity', () => {
  beforeEach(async () => {
    await insertClinicStaff();
  });

  test('should return capacity info', async () => {
    const token = getAccessToken(clinicAdmin);

    const res = await request(app).get('/v1/staff/capacity').set('Authorization', `Bearer ${token}`).expect(httpStatus.OK);

    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'therapist', active: expect.any(Number), total: expect.any(Number), limit: 5 }),
        expect.objectContaining({ role: 'staff', active: expect.any(Number), total: expect.any(Number), limit: 5 }),
      ])
    );
  });
});
