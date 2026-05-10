import type { Prisma, Role as UserRole } from '@prisma/client';
import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import moment, { type Moment } from 'moment';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/config';
import prisma from '../config/prisma';
import { TokenType } from '../config/tokens';
import { ApiError } from '../utils/ApiError';

const generateToken = (
  userId: string,
  role: UserRole,
  tenantId: string | null,
  expires: Moment,
  type: TokenType,
  secret: string = config.jwt.secret
): string => {
  const payload = {
    sub: userId,
    role,
    tenantId,
    jti: uuidv4(),
    iat: moment().unix(),
    exp: expires.unix(),
    type,
  };
  return jwt.sign(payload, secret);
};

const saveToken = async (
  token: string,
  userId: string,
  expires: Moment,
  type: TokenType,
  familyId?: string,
  blacklisted = false,
  tx?: Prisma.TransactionClient
) => {
  const db = tx ?? prisma;
  return db.token.create({
    data: {
      token,
      expires: expires.toDate(),
      type,
      blacklisted,
      familyId,
      user: { connect: { id: userId } },
    },
  });
};

const verifyToken = async (token: string, type: TokenType) => {
  const payload = jwt.verify(token, config.jwt.secret) as { sub: string };
  const tokenDoc = await prisma.token.findFirst({
    where: { token, type, userId: payload.sub, blacklisted: false },
  });
  if (!tokenDoc) {
    throw new Error('Token not found');
  }
  return tokenDoc;
};

export interface AuthTokens {
  access: { token: string; expires: Date };
  refresh: { token: string; expires: Date };
}

const generateAuthTokens = async (
  user: { id: string; role: UserRole; tenantId: string | null },
  tx?: Prisma.TransactionClient
): Promise<AuthTokens> => {
  const familyId = uuidv4();

  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken = generateToken(user.id, user.role, user.tenantId, accessTokenExpires, TokenType.ACCESS);

  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
  const refreshToken = generateToken(user.id, user.role, user.tenantId, refreshTokenExpires, TokenType.REFRESH);
  await saveToken(refreshToken, user.id, refreshTokenExpires, TokenType.REFRESH, familyId, false, tx);

  return {
    access: { token: accessToken, expires: accessTokenExpires.toDate() },
    refresh: { token: refreshToken, expires: refreshTokenExpires.toDate() },
  };
};

const refreshAuthTokens = async (refreshToken: string): Promise<AuthTokens> => {
  let payload: { sub: string; role: UserRole; tenantId: string | null };
  try {
    payload = jwt.verify(refreshToken, config.jwt.secret) as typeof payload;
  } catch {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }

  const tokenDoc = await prisma.token.findFirst({
    where: { token: refreshToken, type: TokenType.REFRESH, userId: payload.sub },
  });

  if (!tokenDoc) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }

  if (tokenDoc.blacklisted) {
    if (tokenDoc.familyId) {
      await prisma.token.updateMany({
        where: { familyId: tokenDoc.familyId },
        data: { blacklisted: true },
      });
    }
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }

  const familyId = tokenDoc.familyId ?? uuidv4();
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const newAccessToken = generateToken(payload.sub, payload.role, payload.tenantId, accessTokenExpires, TokenType.ACCESS);
  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
  const newRefreshToken = generateToken(payload.sub, payload.role, payload.tenantId, refreshTokenExpires, TokenType.REFRESH);

  // Blacklist old token and create new one atomically — if create fails, old token stays valid
  await prisma.$transaction(async (tx) => {
    await tx.token.update({ where: { id: tokenDoc.id }, data: { blacklisted: true } });
    await saveToken(newRefreshToken, payload.sub, refreshTokenExpires, TokenType.REFRESH, familyId, false, tx);
  });

  return {
    access: { token: newAccessToken, expires: accessTokenExpires.toDate() },
    refresh: { token: newRefreshToken, expires: refreshTokenExpires.toDate() },
  };
};

export const tokenService = {
  generateToken,
  saveToken,
  verifyToken,
  generateAuthTokens,
  refreshAuthTokens,
};
