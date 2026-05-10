import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';
import httpStatus from 'http-status';
import request from 'supertest';
import app from '../../src/app';
import { adminAccessToken, userOneAccessToken } from '../fixtures/token.fixture';
import { admin, insertUsers, userOne, userTwo } from '../fixtures/user.fixture';
import { setupTestDB } from '../utils/setupTestDB';

const prisma = new PrismaClient();
setupTestDB();

describe('User routes', () => {
  describe('POST /v1/users', () => {
    let newUser: { name: string; email: string; role: string };

    beforeEach(() => {
      newUser = {
        name: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        role: 'staff',
      };
    });

    test('should return 201 and successfully create new user if data is ok', async () => {
      await insertUsers([admin]);

      const res = await request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newUser)
        .expect(httpStatus.CREATED);

      expect(res.body).not.toHaveProperty('password');
      expect(res.body).toMatchObject({
        id: expect.anything(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        tenantId: null,
      });

      const dbUser = await prisma.user.findUnique({ where: { id: res.body.id } });
      expect(dbUser).toBeDefined();
      expect(dbUser).toMatchObject({ name: newUser.name, email: newUser.email, role: newUser.role });
    });

    test('should be able to create a clinic_admin as well', async () => {
      await insertUsers([admin]);
      newUser.role = 'clinic_admin';

      const res = await request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newUser)
        .expect(httpStatus.CREATED);

      expect(res.body.role).toBe('clinic_admin');
      const dbUser = await prisma.user.findUnique({ where: { id: res.body.id } });
      expect(dbUser?.role).toBe('clinic_admin');
    });

    test('should return 401 error if access token is missing', async () => {
      await request(app).post('/v1/users').send(newUser).expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 403 error if logged in user is not admin', async () => {
      await insertUsers([userOne]);

      await request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(newUser)
        .expect(httpStatus.FORBIDDEN);
    });

    test('should return 400 error if email is invalid', async () => {
      await insertUsers([admin]);
      newUser.email = 'invalidEmail';

      await request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newUser)
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 error if email is already used', async () => {
      await insertUsers([admin, userOne]);
      newUser.email = userOne.email;

      await request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newUser)
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 error if role is not a valid role', async () => {
      await insertUsers([admin]);
      newUser.role = 'invalid_role';

      await request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newUser)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('GET /v1/users', () => {
    test('should return 200 and apply the default query options', async () => {
      await insertUsers([userOne, userTwo, admin]);

      const res = await request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toEqual({
        results: expect.any(Array),
        page: 1,
        limit: 10,
        totalPages: 1,
        totalResults: 3,
      });
      expect(res.body.results).toHaveLength(3);
      expect(res.body.results[0]).toMatchObject({
        id: userOne.id,
        name: userOne.name,
        email: userOne.email,
        role: userOne.role,
        tenantId: userOne.tenantId,
      });
    });

    test('should return 401 if access token is missing', async () => {
      await insertUsers([userOne, userTwo, admin]);
      await request(app).get('/v1/users').send().expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 200 for a staff user (getUsers right is granted to all roles)', async () => {
      await insertUsers([userOne, userTwo, admin]);

      await request(app).get('/v1/users').set('Authorization', `Bearer ${userOneAccessToken}`).send().expect(httpStatus.OK);
    });

    test('should correctly apply filter on name field', async () => {
      await insertUsers([userOne, userTwo, admin]);

      const res = await request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ name: userOne.name })
        .send()
        .expect(httpStatus.OK);

      expect(res.body.totalResults).toBe(1);
      expect(res.body.results[0].id).toBe(userOne.id);
    });

    test('should correctly apply filter on role field', async () => {
      await insertUsers([userOne, userTwo, admin]);

      // userOne is 'staff', userTwo is 'therapist'
      const res = await request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ role: 'staff' })
        .send()
        .expect(httpStatus.OK);

      expect(res.body.totalResults).toBe(1);
      expect(res.body.results[0].id).toBe(userOne.id);
    });

    test('should correctly sort the returned array if descending sort param is specified', async () => {
      await insertUsers([userOne, userTwo, admin]);

      // Postgres enum sort order (definition order): super_admin=0, clinic_admin=1, therapist=2, staff=3
      // desc: staff(3) > therapist(2) > super_admin(0)
      const res = await request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ sortBy: 'role:desc' })
        .send()
        .expect(httpStatus.OK);

      expect(res.body.results).toHaveLength(3);
      expect(res.body.results[0].id).toBe(userOne.id); // staff
      expect(res.body.results[1].id).toBe(userTwo.id); // therapist
      expect(res.body.results[2].id).toBe(admin.id); // super_admin
    });

    test('should correctly sort the returned array if ascending sort param is specified', async () => {
      await insertUsers([userOne, userTwo, admin]);

      // asc: super_admin(0) < therapist(2) < staff(3)
      const res = await request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ sortBy: 'role:asc' })
        .send()
        .expect(httpStatus.OK);

      expect(res.body.results).toHaveLength(3);
      expect(res.body.results[0].id).toBe(admin.id); // super_admin
      expect(res.body.results[1].id).toBe(userTwo.id); // therapist
      expect(res.body.results[2].id).toBe(userOne.id); // staff
    });

    test('should correctly sort by multiple criteria', async () => {
      await insertUsers([userOne, userTwo, admin]);

      // role:desc → staff, therapist, super_admin
      const res = await request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ sortBy: 'role:desc,name:asc' })
        .send()
        .expect(httpStatus.OK);

      expect(res.body.results).toHaveLength(3);
      const roles = res.body.results.map((u: { role: string }) => u.role);
      expect(roles[0]).toBe('staff');
      expect(roles[1]).toBe('therapist');
      expect(roles[2]).toBe('super_admin');
    });

    test('should limit returned array if limit param is specified', async () => {
      await insertUsers([userOne, userTwo, admin]);

      const res = await request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ limit: 2 })
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toMatchObject({ page: 1, limit: 2, totalPages: 2, totalResults: 3 });
      expect(res.body.results).toHaveLength(2);
    });

    test('should return the correct page if page and limit params are specified', async () => {
      await insertUsers([userOne, userTwo, admin]);

      const res = await request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ page: 2, limit: 2 })
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toMatchObject({ page: 2, limit: 2, totalPages: 2, totalResults: 3 });
      expect(res.body.results).toHaveLength(1);
    });
  });

  describe('GET /v1/users/:userId', () => {
    test('should return 200 and the user object if data is ok', async () => {
      await insertUsers([userOne]);

      const res = await request(app)
        .get(`/v1/users/${userOne.id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body).not.toHaveProperty('password');
      expect(res.body).toMatchObject({
        id: userOne.id,
        email: userOne.email,
        name: userOne.name,
        role: userOne.role,
        tenantId: userOne.tenantId,
      });
    });

    test('should return 401 error if access token is missing', async () => {
      await insertUsers([userOne]);
      await request(app).get(`/v1/users/${userOne.id}`).send().expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 200 for staff user accessing another user (getUsers right granted)', async () => {
      await insertUsers([userOne, userTwo]);

      await request(app)
        .get(`/v1/users/${userTwo.id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.OK);
    });

    test('should return 200 and the user object if admin is trying to get another user', async () => {
      await insertUsers([userOne, admin]);

      await request(app)
        .get(`/v1/users/${userOne.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.OK);
    });

    test('should return 400 error if userId is not a valid uuid', async () => {
      await insertUsers([admin]);

      await request(app)
        .get('/v1/users/invalidId')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 404 error if user is not found', async () => {
      await insertUsers([admin]);

      await request(app)
        .get(`/v1/users/${userOne.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('DELETE /v1/users/:userId', () => {
    test('should return 204 if data is ok', async () => {
      await insertUsers([userOne]);

      await request(app)
        .delete(`/v1/users/${userOne.id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.NO_CONTENT);

      const dbUser = await prisma.user.findUnique({ where: { id: userOne.id } });
      expect(dbUser).toBeNull();
    });

    test('should return 401 error if access token is missing', async () => {
      await insertUsers([userOne]);
      await request(app).delete(`/v1/users/${userOne.id}`).send().expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 403 error if user is trying to delete another user', async () => {
      await insertUsers([userOne, userTwo]);

      await request(app)
        .delete(`/v1/users/${userTwo.id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.FORBIDDEN);
    });

    test('should return 204 if admin is trying to delete another user', async () => {
      await insertUsers([userOne, admin]);

      await request(app)
        .delete(`/v1/users/${userOne.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.NO_CONTENT);
    });

    test('should return 400 error if userId is not a valid uuid', async () => {
      await insertUsers([admin]);
      await request(app)
        .delete('/v1/users/invalidId')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 404 error if user is not found', async () => {
      await insertUsers([admin]);
      await request(app)
        .delete(`/v1/users/${userOne.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('PATCH /v1/users/:userId', () => {
    test('should return 200 and successfully update user if data is ok', async () => {
      await insertUsers([userOne]);
      const updateBody = {
        name: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
      };

      const res = await request(app)
        .patch(`/v1/users/${userOne.id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.OK);

      expect(res.body).not.toHaveProperty('password');
      expect(res.body).toMatchObject({
        id: userOne.id,
        name: updateBody.name,
        email: updateBody.email,
        role: userOne.role,
        tenantId: userOne.tenantId,
      });

      const dbUser = await prisma.user.findUnique({ where: { id: userOne.id } });
      expect(dbUser).toMatchObject({ name: updateBody.name, email: updateBody.email });
    });

    test('should return 401 error if access token is missing', async () => {
      await insertUsers([userOne]);
      await request(app)
        .patch(`/v1/users/${userOne.id}`)
        .send({ name: faker.person.fullName() })
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 403 if user is updating another user', async () => {
      await insertUsers([userOne, userTwo]);

      await request(app)
        .patch(`/v1/users/${userTwo.id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send({ name: faker.person.fullName() })
        .expect(httpStatus.FORBIDDEN);
    });

    test('should return 200 and successfully update user if admin is updating another user', async () => {
      await insertUsers([userOne, admin]);

      await request(app)
        .patch(`/v1/users/${userOne.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ name: faker.person.fullName() })
        .expect(httpStatus.OK);
    });

    test('should return 404 if admin is updating a user that does not exist', async () => {
      await insertUsers([admin]);

      await request(app)
        .patch(`/v1/users/${userOne.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ name: faker.person.fullName() })
        .expect(httpStatus.NOT_FOUND);
    });

    test('should return 400 error if userId is not a valid uuid', async () => {
      await insertUsers([admin]);

      await request(app)
        .patch('/v1/users/invalidId')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ name: faker.person.fullName() })
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 if email is invalid', async () => {
      await insertUsers([userOne]);

      await request(app)
        .patch(`/v1/users/${userOne.id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send({ email: 'invalidEmail' })
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 if email is already taken', async () => {
      await insertUsers([userOne, userTwo]);

      await request(app)
        .patch(`/v1/users/${userOne.id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send({ email: userTwo.email })
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should not return 400 if email is unchanged', async () => {
      await insertUsers([userOne]);

      await request(app)
        .patch(`/v1/users/${userOne.id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send({ email: userOne.email })
        .expect(httpStatus.OK);
    });
  });
});
