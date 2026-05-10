import { faker } from '@faker-js/faker';
import { PrismaClient, type Role } from '@prisma/client';
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
import { adminAccessToken, userOneAccessToken } from '../fixtures/token.fixture';
import { admin, insertUsers, userOne } from '../fixtures/user.fixture';
import { setupTestDB } from '../utils/setupTestDB';

const prisma = new PrismaClient();
setupTestDB();

describe('Clinic routes', () => {
  let clinicAdminAccessToken: string;
  let clinicAdminUser: { id: string; name: string; email: string; role: Role; tenantId: string | null };

  beforeEach(async () => {
    await insertClinics([clinicOne]);
    await insertSubscriptionPlans([subscriptionPlanOne]);

    clinicAdminUser = {
      id: 'c5d6e7f8-a9b0-1234-cdef-345678901234',
      name: faker.person.fullName(),
      email: 'clinicadmin@test.com',
      role: 'clinic_admin' as Role,
      tenantId: clinicOne.id,
    };

    await prisma.user.create({
      data: {
        id: clinicAdminUser.id,
        name: clinicAdminUser.name,
        email: clinicAdminUser.email,
        role: clinicAdminUser.role,
        tenantId: clinicAdminUser.tenantId,
      },
    });

    const accessTokenExpires = moment().add(15, 'minutes');
    clinicAdminAccessToken = tokenService.generateToken(
      clinicAdminUser.id,
      clinicAdminUser.role,
      clinicAdminUser.tenantId,
      accessTokenExpires,
      TokenType.ACCESS
    );
  });

  describe('POST /v1/super-admin/clinics', () => {
    let newClinic: {
      name: string;
      address: string;
      contactPhone: string;
      contactEmail: string;
      timezone: string;
      subscriptionPlanId?: string;
    };

    beforeEach(() => {
      newClinic = {
        name: `${faker.company.name()} Clinic`,
        address: faker.location.streetAddress(),
        contactPhone: faker.phone.number(),
        contactEmail: faker.internet.email(),
        timezone: 'America/Chicago',
      };
    });

    test('should return 201 and create clinic if data is ok', async () => {
      await insertUsers([admin]);

      const res = await request(app)
        .post('/v1/super-admin/clinics')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newClinic)
        .expect(httpStatus.CREATED);

      expect(res.body).toMatchObject({
        id: expect.anything(),
        name: newClinic.name,
        address: newClinic.address,
        status: 'active',
      });

      const dbClinic = await prisma.clinic.findUnique({ where: { id: res.body.id } });
      expect(dbClinic).toBeDefined();
      expect(dbClinic).toMatchObject({
        name: newClinic.name,
        address: newClinic.address,
        status: 'active',
      });
    });

    test('should return 401 error if access token is missing', async () => {
      await request(app).post('/v1/super-admin/clinics').send(newClinic).expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 403 error if logged in user is not super_admin', async () => {
      await insertUsers([admin, userOne]);

      await request(app)
        .post('/v1/super-admin/clinics')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(newClinic)
        .expect(httpStatus.FORBIDDEN);
    });
  });

  describe('GET /v1/super-admin/clinics', () => {
    test('should return 200 and list clinics', async () => {
      await insertUsers([admin]);
      await insertClinics([clinicOne, clinicTwo]);

      const res = await request(app)
        .get('/v1/super-admin/clinics')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toEqual({
        results: expect.any(Array),
        page: 1,
        limit: 10,
        totalPages: 1,
        totalResults: 2,
      });
      expect(res.body.results).toHaveLength(2);
    });

    test('should return 401 error if access token is missing', async () => {
      await request(app).get('/v1/super-admin/clinics').send().expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /v1/super-admin/clinics/:clinicId/suspend', () => {
    test('should suspend clinic and return 200', async () => {
      await insertUsers([admin]);

      const res = await request(app)
        .post(`/v1/super-admin/clinics/${clinicOne.id}/suspend`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toMatchObject({
        id: clinicOne.id,
        status: 'suspended',
      });
    });

    test('should return 404 if clinic not found', async () => {
      await insertUsers([admin]);

      await request(app)
        .post('/v1/super-admin/clinics/f3a4b5c6-d7e8-9012-cdef-123456789099/suspend')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('POST /v1/super-admin/clinics/:clinicId/reactivate', () => {
    test('should reactivate clinic and return 200', async () => {
      await insertUsers([admin]);
      await prisma.clinic.update({ where: { id: clinicOne.id }, data: { status: 'suspended' } });

      const res = await request(app)
        .post(`/v1/super-admin/clinics/${clinicOne.id}/reactivate`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toMatchObject({
        id: clinicOne.id,
        status: 'active',
      });
    });
  });

  describe('GET /v1/clinic/me', () => {
    test('should return 200 and clinic data for clinic_admin', async () => {
      const res = await request(app)
        .get('/v1/clinic/me')
        .set('Authorization', `Bearer ${clinicAdminAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toMatchObject({
        id: clinicOne.id,
        name: clinicOne.name,
      });
    });

    test('should return 404 if clinic_admin has no tenantId', async () => {
      const noTenantClinicAdmin = {
        id: 'd6e7f8a9-b0c1-2345-def0-456789012345',
        name: faker.person.fullName(),
        email: 'clinicadminnotenant@test.com',
        role: 'clinic_admin' as Role,
        tenantId: null as string | null,
      };

      await prisma.user.create({
        data: {
          id: noTenantClinicAdmin.id,
          name: noTenantClinicAdmin.name,
          email: noTenantClinicAdmin.email,
          role: noTenantClinicAdmin.role,
          tenantId: noTenantClinicAdmin.tenantId,
        },
      });

      const accessTokenExpires = moment().add(15, 'minutes');
      const noTenantToken = tokenService.generateToken(
        noTenantClinicAdmin.id,
        noTenantClinicAdmin.role,
        noTenantClinicAdmin.tenantId,
        accessTokenExpires,
        TokenType.ACCESS
      );

      const res = await request(app)
        .get('/v1/clinic/me')
        .set('Authorization', `Bearer ${noTenantToken}`)
        .send()
        .expect(httpStatus.NOT_FOUND);

      expect(res.body.message).toBe('Clinic not found');
    });

    test('should return 401 if not authenticated', async () => {
      await request(app).get('/v1/clinic/me').send().expect(httpStatus.UNAUTHORIZED);
    });
  });
});

describe('Clinic suspension', () => {
  let clinicAdminAccessToken: string;
  let clinicAdminUser: { id: string; name: string; email: string; role: Role; tenantId: string | null };

  beforeEach(async () => {
    await insertClinics([clinicOne]);
    await insertSubscriptionPlans([subscriptionPlanOne]);

    clinicAdminUser = {
      id: 'e7f8a9b0-c1d2-3456-ef01-567890123456',
      name: faker.person.fullName(),
      email: 'clinicadmin2@test.com',
      role: 'clinic_admin' as Role,
      tenantId: clinicOne.id,
    };

    await prisma.user.create({
      data: {
        id: clinicAdminUser.id,
        name: clinicAdminUser.name,
        email: clinicAdminUser.email,
        role: clinicAdminUser.role,
        tenantId: clinicAdminUser.tenantId,
      },
    });

    const accessTokenExpires = moment().add(15, 'minutes');
    clinicAdminAccessToken = tokenService.generateToken(
      clinicAdminUser.id,
      clinicAdminUser.role,
      clinicAdminUser.tenantId,
      accessTokenExpires,
      TokenType.ACCESS
    );
  });

  test('clinic_admin request returns 403 CLINIC_SUSPENDED when clinic is suspended', async () => {
    await insertUsers([admin, clinicAdminUser]);
    await prisma.clinic.update({ where: { id: clinicOne.id }, data: { status: 'suspended' } });

    await request(app)
      .get('/v1/clinic/me')
      .set('Authorization', `Bearer ${clinicAdminAccessToken}`)
      .send()
      .expect(httpStatus.FORBIDDEN)
      .expect((res) => {
        expect(res.body.message).toBe('CLINIC_SUSPENDED');
      });
  });

  test('clinic_admin request succeeds after clinic is reactivated', async () => {
    await insertUsers([admin, clinicAdminUser]);
    await prisma.clinic.update({ where: { id: clinicOne.id }, data: { status: 'suspended' } });

    await request(app)
      .get('/v1/clinic/me')
      .set('Authorization', `Bearer ${clinicAdminAccessToken}`)
      .send()
      .expect(httpStatus.FORBIDDEN);

    await request(app)
      .post(`/v1/super-admin/clinics/${clinicOne.id}/reactivate`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send()
      .expect(httpStatus.OK);

    await request(app)
      .get('/v1/clinic/me')
      .set('Authorization', `Bearer ${clinicAdminAccessToken}`)
      .send()
      .expect(httpStatus.OK);
  });
});
