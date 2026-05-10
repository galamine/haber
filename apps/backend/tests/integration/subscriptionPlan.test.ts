import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';
import httpStatus from 'http-status';
import request from 'supertest';
import app from '../../src/app';
import { insertSubscriptionPlans, subscriptionPlanOne, subscriptionPlanTwo } from '../fixtures/clinic.fixture';
import { adminAccessToken, userOneAccessToken } from '../fixtures/token.fixture';
import { admin, insertUsers, userOne } from '../fixtures/user.fixture';
import { setupTestDB } from '../utils/setupTestDB';

const prisma = new PrismaClient();
setupTestDB();

describe('Subscription Plan routes', () => {
  describe('POST /v1/super-admin/subscription-plans', () => {
    let newPlan: {
      name: string;
      tier: string;
      maxUsersByRole: Record<string, number>;
      maxSensoryRooms: number;
      maxActiveChildren: number;
      featureFlags: Record<string, boolean>;
    };

    beforeEach(() => {
      newPlan = {
        name: `${faker.company.name()} Plan`,
        tier: 'basic',
        maxUsersByRole: { doctor: 5, therapist: 10, staff: 20 },
        maxSensoryRooms: 3,
        maxActiveChildren: 75,
        featureFlags: { smsNotifications: true, perTenantBranding: false },
      };
    });

    test('should return 201 and create subscription plan if data is ok', async () => {
      await insertUsers([admin]);

      const res = await request(app)
        .post('/v1/super-admin/subscription-plans')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newPlan)
        .expect(httpStatus.CREATED);

      expect(res.body).toMatchObject({
        id: expect.anything(),
        name: newPlan.name,
        tier: newPlan.tier,
        maxSensoryRooms: newPlan.maxSensoryRooms,
        maxActiveChildren: newPlan.maxActiveChildren,
      });

      const dbPlan = await prisma.subscriptionPlan.findUnique({ where: { id: res.body.id } });
      expect(dbPlan).toBeDefined();
      expect(dbPlan).toMatchObject({
        name: newPlan.name,
        tier: newPlan.tier,
        maxSensoryRooms: newPlan.maxSensoryRooms,
        maxActiveChildren: newPlan.maxActiveChildren,
      });
    });

    test('should return 401 error if access token is missing', async () => {
      await request(app).post('/v1/super-admin/subscription-plans').send(newPlan).expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 403 error if logged in user is not super_admin', async () => {
      await insertUsers([admin, userOne]);

      await request(app)
        .post('/v1/super-admin/subscription-plans')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(newPlan)
        .expect(httpStatus.FORBIDDEN);
    });

    test('should return 400 error if tier is invalid', async () => {
      await insertUsers([admin]);
      newPlan.tier = 'invalid_tier';

      await request(app)
        .post('/v1/super-admin/subscription-plans')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newPlan)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('GET /v1/super-admin/subscription-plans', () => {
    test('should return 200 and list subscription plans', async () => {
      await insertUsers([admin]);
      await insertSubscriptionPlans([subscriptionPlanOne, subscriptionPlanTwo]);

      const res = await request(app)
        .get('/v1/super-admin/subscription-plans')
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
      await request(app).get('/v1/super-admin/subscription-plans').send().expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 403 error if logged in user is not super_admin', async () => {
      await insertUsers([admin, userOne]);
      await insertSubscriptionPlans([subscriptionPlanOne]);

      await request(app)
        .get('/v1/super-admin/subscription-plans')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.FORBIDDEN);
    });
  });

  describe('PATCH /v1/super-admin/subscription-plans/:planId', () => {
    test('should return 200 and update subscription plan', async () => {
      await insertUsers([admin]);
      await insertSubscriptionPlans([subscriptionPlanOne]);

      const updateBody = { name: 'Updated Plan Name', tier: 'advanced' };

      const res = await request(app)
        .patch(`/v1/super-admin/subscription-plans/${subscriptionPlanOne.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.OK);

      expect(res.body).toMatchObject({
        id: subscriptionPlanOne.id,
        name: 'Updated Plan Name',
        tier: 'advanced',
      });
    });

    test('should return 404 if plan not found', async () => {
      await insertUsers([admin]);

      await request(app)
        .patch('/v1/super-admin/subscription-plans/f3a4b5c6-d7e8-9012-cdef-123456789099')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ name: 'Updated Name' })
        .expect(httpStatus.NOT_FOUND);
    });

    test('should return 401 error if access token is missing', async () => {
      await request(app)
        .patch(`/v1/super-admin/subscription-plans/${subscriptionPlanOne.id}`)
        .send({ name: 'Updated Name' })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
