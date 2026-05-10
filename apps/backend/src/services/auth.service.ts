import httpStatus from 'http-status';
import prisma from '../config/prisma';
import { TokenType } from '../config/tokens';
import { ApiError } from '../utils/ApiError';
import { otpService } from './otp.service';
import { tokenService } from './token.service';

const authenticateWithOtp = async (email: string, otp: string) => {
  return prisma.$transaction(async (tx) => {
    const user = await otpService.verifyOtp(email, otp, tx);
    const tokens = await tokenService.generateAuthTokens(user, tx);
    return { user, tokens };
  });
};

const logout = async (refreshToken: string) => {
  const tokenDoc = await prisma.token.findFirst({
    where: { token: refreshToken, type: TokenType.REFRESH, blacklisted: false },
  });
  if (!tokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
  await prisma.token.delete({ where: { id: tokenDoc.id } });
};

const logoutAll = async (userId: string) => {
  await prisma.token.updateMany({
    where: { userId, type: TokenType.REFRESH, blacklisted: false },
    data: { blacklisted: true },
  });
};

export const authService = { authenticateWithOtp, logout, logoutAll };
