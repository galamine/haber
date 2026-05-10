import httpStatus from 'http-status';
import moment from 'moment';
import request from 'supertest';
import app from '../../src/app';
import { TokenType } from '../../src/config/tokens';
import { emailService } from '../../src/services/email.service';
import { otpService } from '../../src/services/otp.service';
import { tokenService } from '../../src/services/token.service';
import { adminAccessToken, userOneAccessToken } from '../fixtures/token.fixture';
import { admin, insertUsers, userOne } from '../fixtures/user.fixture';
import { prisma, setupTestDB } from '../utils/setupTestDB';

setupTestDB();

// ─── POST /v1/auth/request-otp ────────────────────────────────────────────────

describe('POST /v1/auth/request-otp', () => {
  beforeEach(() => {
    vi.spyOn(emailService, 'sendOtpEmail').mockResolvedValue(undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  test('should return 200 and message for a registered email', async () => {
    await insertUsers([userOne]);
    const res = await request(app).post('/v1/auth/request-otp').send({ email: userOne.email }).expect(httpStatus.OK);
    expect(res.body).toEqual({ message: 'OTP sent' });
    expect(emailService.sendOtpEmail).toHaveBeenCalledWith(userOne.email, expect.stringMatching(/^\d{6}$/));
  });

  test('should return 200 for an unknown email (silent success)', async () => {
    const res = await request(app).post('/v1/auth/request-otp').send({ email: 'nobody@example.com' }).expect(httpStatus.OK);
    expect(res.body).toEqual({ message: 'OTP sent' });
    expect(emailService.sendOtpEmail).not.toHaveBeenCalled();
  });

  test('should return 400 for an invalid email', async () => {
    await request(app).post('/v1/auth/request-otp').send({ email: 'not-an-email' }).expect(httpStatus.BAD_REQUEST);
  });

  test('should return 429 after 5 OTP requests in one hour', async () => {
    await insertUsers([userOne]);
    for (let i = 0; i < 5; i++) {
      await otpService.requestOtp(userOne.email);
    }
    await request(app).post('/v1/auth/request-otp').send({ email: userOne.email }).expect(httpStatus.TOO_MANY_REQUESTS);
  });
});

// ─── POST /v1/auth/verify-otp ─────────────────────────────────────────────────

describe('POST /v1/auth/verify-otp', () => {
  let validOtp: string;

  beforeEach(async () => {
    await insertUsers([userOne]);
    vi.spyOn(emailService, 'sendOtpEmail').mockImplementation(async (_to, otp) => {
      validOtp = otp;
    });
    await otpService.requestOtp(userOne.email);
  });
  afterEach(() => vi.restoreAllMocks());

  test('should return 200 with tokens on valid OTP', async () => {
    const res = await request(app)
      .post('/v1/auth/verify-otp')
      .send({ email: userOne.email, otp: validOtp })
      .expect(httpStatus.OK);
    expect(res.body.tokens).toEqual({
      access: { token: expect.any(String), expires: expect.any(String) },
      refresh: { token: expect.any(String), expires: expect.any(String) },
    });
  });

  test('JWT payload should contain role and tenantId', async () => {
    const res = await request(app)
      .post('/v1/auth/verify-otp')
      .send({ email: userOne.email, otp: validOtp })
      .expect(httpStatus.OK);
    const decoded = JSON.parse(Buffer.from(res.body.tokens.access.token.split('.')[1], 'base64').toString());
    expect(decoded.role).toBe(userOne.role);
    expect(decoded).toHaveProperty('tenantId');
  });

  test('should return 401 for wrong OTP', async () => {
    await request(app)
      .post('/v1/auth/verify-otp')
      .send({ email: userOne.email, otp: '000000' })
      .expect(httpStatus.UNAUTHORIZED);
  });

  test('should return 401 after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/v1/auth/verify-otp').send({ email: userOne.email, otp: '000000' });
    }
    await request(app)
      .post('/v1/auth/verify-otp')
      .send({ email: userOne.email, otp: validOtp })
      .expect(httpStatus.UNAUTHORIZED);
  });

  test('should return 401 for an expired OTP', async () => {
    await prisma.otpRecord.updateMany({ data: { expiresAt: moment().subtract(11, 'minutes').toDate() } });
    await request(app)
      .post('/v1/auth/verify-otp')
      .send({ email: userOne.email, otp: validOtp })
      .expect(httpStatus.UNAUTHORIZED);
  });

  test('should return 401 if OTP is reused after success', async () => {
    await request(app).post('/v1/auth/verify-otp').send({ email: userOne.email, otp: validOtp }).expect(httpStatus.OK);
    await request(app)
      .post('/v1/auth/verify-otp')
      .send({ email: userOne.email, otp: validOtp })
      .expect(httpStatus.UNAUTHORIZED);
  });
});

// ─── POST /v1/auth/refresh-tokens ─────────────────────────────────────────────

describe('POST /v1/auth/refresh-tokens', () => {
  test('should return new tokens on valid refresh token', async () => {
    await insertUsers([userOne]);
    const { refresh } = await tokenService.generateAuthTokens(userOne);

    const res = await request(app)
      .post('/v1/auth/refresh-tokens')
      .send({ refreshToken: refresh.token })
      .expect(httpStatus.OK);

    expect(res.body).toMatchObject({
      access: { token: expect.any(String) },
      refresh: { token: expect.any(String) },
    });
    expect(res.body.refresh.token).not.toBe(refresh.token);
  });

  test('should return 401 and blacklist family on refresh token reuse', async () => {
    await insertUsers([userOne]);
    const { refresh: firstRefresh } = await tokenService.generateAuthTokens(userOne);

    const rotated = await request(app)
      .post('/v1/auth/refresh-tokens')
      .send({ refreshToken: firstRefresh.token })
      .expect(httpStatus.OK);

    // Reuse the already-rotated original token — triggers reuse detection
    await request(app)
      .post('/v1/auth/refresh-tokens')
      .send({ refreshToken: firstRefresh.token })
      .expect(httpStatus.UNAUTHORIZED);

    // New token from the rotation should also be blacklisted
    await request(app)
      .post('/v1/auth/refresh-tokens')
      .send({ refreshToken: rotated.body.refresh.token })
      .expect(httpStatus.UNAUTHORIZED);
  });

  test('should return 401 for an invalid refresh token', async () => {
    await request(app)
      .post('/v1/auth/refresh-tokens')
      .send({ refreshToken: 'invalid.token.here' })
      .expect(httpStatus.UNAUTHORIZED);
  });
});

// ─── POST /v1/auth/logout ─────────────────────────────────────────────────────

describe('POST /v1/auth/logout', () => {
  test('should return 204 and delete the refresh token', async () => {
    await insertUsers([userOne]);
    const { refresh } = await tokenService.generateAuthTokens(userOne);

    await request(app).post('/v1/auth/logout').send({ refreshToken: refresh.token }).expect(httpStatus.NO_CONTENT);

    const tokenInDb = await prisma.token.findFirst({ where: { token: refresh.token } });
    expect(tokenInDb).toBeNull();
  });

  test('should return 404 if refresh token not found', async () => {
    await request(app)
      .post('/v1/auth/logout')
      .send({ refreshToken: 'nonexistent.refresh.token' })
      .expect(httpStatus.NOT_FOUND);
  });
});

// ─── POST /v1/auth/logout-all ─────────────────────────────────────────────────

describe('POST /v1/auth/logout-all', () => {
  test('should invalidate all refresh tokens and return 204', async () => {
    await insertUsers([userOne]);
    const { refresh: r1 } = await tokenService.generateAuthTokens(userOne);
    const { refresh: r2 } = await tokenService.generateAuthTokens(userOne);

    await request(app)
      .post('/v1/auth/logout-all')
      .set('Authorization', `Bearer ${userOneAccessToken}`)
      .expect(httpStatus.NO_CONTENT);

    // Both refresh tokens should now be blacklisted
    await request(app).post('/v1/auth/refresh-tokens').send({ refreshToken: r1.token }).expect(httpStatus.UNAUTHORIZED);
    await request(app).post('/v1/auth/refresh-tokens').send({ refreshToken: r2.token }).expect(httpStatus.UNAUTHORIZED);
  });

  test('should return 401 if not authenticated', async () => {
    await request(app).post('/v1/auth/logout-all').expect(httpStatus.UNAUTHORIZED);
  });
});
