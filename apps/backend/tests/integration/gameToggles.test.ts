import httpStatus from 'http-status';
import moment from 'moment';
import request from 'supertest';
import app from '../../src/app';
import { TokenType } from '../../src/config/tokens';
import { tokenService } from '../../src/services';
import { clinicOne, insertClinics, insertSubscriptionPlans, subscriptionPlanOne } from '../fixtures/clinic.fixture';
import { gameOne, gameTwo, insertGames } from '../fixtures/game.fixture';
import { insertUsers } from '../fixtures/user.fixture';
import { setupTestDB } from '../utils/setupTestDB';

setupTestDB();

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const clinicAdmin = {
  id: 'dd000001-0000-0000-0000-000000000001',
  name: 'Clinic Admin',
  email: 'clinicadmin@games.test',
  role: 'clinic_admin' as const,
  tenantId: clinicOne.id,
  isActive: true,
};

const therapist = {
  id: 'dd000002-0000-0000-0000-000000000002',
  name: 'Therapist',
  email: 'therapist@games.test',
  role: 'therapist' as const,
  tenantId: clinicOne.id,
  isActive: true,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const seed = async () => {
  await insertSubscriptionPlans([subscriptionPlanOne]);
  await insertClinics([clinicOne]);
  await insertUsers([clinicAdmin, therapist]);
  await insertGames([gameOne, gameTwo]);
};

const token = (user: { id: string; role: string; tenantId: string | null }) =>
  tokenService.generateToken(user.id, user.role, user.tenantId, moment().add(1, 'hour'), TokenType.ACCESS);

// ─── GET /v1/clinic/game-toggles ─────────────────────────────────────────────

describe('GET /v1/clinic/game-toggles', () => {
  test('should list all games with enabled: true by default when no toggles exist', async () => {
    await seed();

    const res = await request(app)
      .get('/v1/clinic/game-toggles')
      .set('Authorization', `Bearer ${token(clinicAdmin)}`)
      .expect(httpStatus.OK);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body.every((g: { enabled: boolean }) => g.enabled === true)).toBe(true);
    expect(res.body[0]).toMatchObject({
      game: { id: expect.any(String), name: expect.any(String) },
      enabled: true,
    });
  });

  test('should return 403 when therapist tries to list game toggles', async () => {
    await seed();

    await request(app)
      .get('/v1/clinic/game-toggles')
      .set('Authorization', `Bearer ${token(therapist)}`)
      .expect(httpStatus.FORBIDDEN);
  });
});

// ─── PATCH /v1/clinic/game-toggles ───────────────────────────────────────────

describe('PATCH /v1/clinic/game-toggles', () => {
  test('should disable a game for the clinic and reflect it in GET', async () => {
    await seed();

    await request(app)
      .patch('/v1/clinic/game-toggles')
      .set('Authorization', `Bearer ${token(clinicAdmin)}`)
      .send({ gameId: gameOne.id, enabled: false })
      .expect(httpStatus.OK);

    const res = await request(app)
      .get('/v1/clinic/game-toggles')
      .set('Authorization', `Bearer ${token(clinicAdmin)}`)
      .expect(httpStatus.OK);

    const toggle = res.body.find((g: { game: { id: string } }) => g.game.id === gameOne.id);
    expect(toggle.enabled).toBe(false);

    const otherToggle = res.body.find((g: { game: { id: string } }) => g.game.id === gameTwo.id);
    expect(otherToggle.enabled).toBe(true);
  });

  test('should re-enable a previously disabled game', async () => {
    await seed();

    await request(app)
      .patch('/v1/clinic/game-toggles')
      .set('Authorization', `Bearer ${token(clinicAdmin)}`)
      .send({ gameId: gameOne.id, enabled: false });

    await request(app)
      .patch('/v1/clinic/game-toggles')
      .set('Authorization', `Bearer ${token(clinicAdmin)}`)
      .send({ gameId: gameOne.id, enabled: true });

    const res = await request(app)
      .get('/v1/clinic/game-toggles')
      .set('Authorization', `Bearer ${token(clinicAdmin)}`)
      .expect(httpStatus.OK);

    const toggle = res.body.find((g: { game: { id: string } }) => g.game.id === gameOne.id);
    expect(toggle.enabled).toBe(true);
  });

  test('should return 400 when gameId does not exist', async () => {
    await seed();

    await request(app)
      .patch('/v1/clinic/game-toggles')
      .set('Authorization', `Bearer ${token(clinicAdmin)}`)
      .send({ gameId: '00000000-0000-0000-0000-000000000000', enabled: false })
      .expect(httpStatus.BAD_REQUEST);
  });

  test('should return 403 when therapist tries to patch game toggles', async () => {
    await seed();

    await request(app)
      .patch('/v1/clinic/game-toggles')
      .set('Authorization', `Bearer ${token(therapist)}`)
      .send({ gameId: gameOne.id, enabled: false })
      .expect(httpStatus.FORBIDDEN);
  });
});
