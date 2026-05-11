import type { NextFunction, Response } from 'express';
import httpStatus from 'http-status';
import prisma from '../config/prisma';
import type { AuthRequest } from '../types';
import { ApiError } from '../utils/ApiError';
import { catchAsync } from '../utils/catchAsync';

export const requireConsent = catchAsync(async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const childId = req.params.childId;
  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { consentStatus: true },
  });
  if (!child || child.consentStatus !== 'all_consented') {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'CONSENT_REQUIRED');
  }
  next();
});
