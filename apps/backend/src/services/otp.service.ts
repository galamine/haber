import { randomInt } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import httpStatus from 'http-status';
import moment from 'moment';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { emailService } from './email.service';

const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RATE_LIMIT_PER_HOUR = 5;

const generateOtp = (): string => randomInt(100000, 999999).toString();

const requestOtp = async (email: string): Promise<{ message: string }> => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { message: 'OTP sent' };
  }

  const oneHourAgo = moment().subtract(1, 'hour').toDate();
  const recentCount = await prisma.otpRecord.count({
    where: { userId: user.id, createdAt: { gte: oneHourAgo } },
  });
  if (recentCount >= OTP_RATE_LIMIT_PER_HOUR) {
    throw new ApiError(httpStatus.TOO_MANY_REQUESTS, 'Too many OTP requests. Please try again later.');
  }

  const otp = generateOtp();
  const hashedOtp = await bcrypt.hash(otp, 10);
  await prisma.otpRecord.create({
    data: {
      userId: user.id,
      hashedOtp,
      expiresAt: moment().add(OTP_EXPIRY_MINUTES, 'minutes').toDate(),
      type: 'login',
    },
  });

  await emailService.sendOtpEmail(email, otp);
  return { message: 'OTP sent' };
};

const verifyOtp = async (email: string, otp: string, tx?: Prisma.TransactionClient) => {
  const db = tx ?? prisma;

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid OTP');
  }

  const otpRecord = await db.otpRecord.findFirst({
    where: { userId: user.id, type: 'login', usedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpRecord) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid OTP');
  }

  if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Too many failed attempts');
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'OTP has expired');
  }

  const isValid = await bcrypt.compare(otp, otpRecord.hashedOtp);
  if (!isValid) {
    // Use prisma directly so this increment commits even if the caller's transaction rolls back
    await prisma.otpRecord.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid OTP');
  }

  await db.otpRecord.update({ where: { id: otpRecord.id }, data: { usedAt: new Date() } });
  return user;
};

export const otpService = { requestOtp, verifyOtp };
