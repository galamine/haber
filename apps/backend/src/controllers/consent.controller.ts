import type { Response } from 'express';
import httpStatus from 'http-status';
import { consentService } from '../services';
import type { AuthRequest } from '../types';
import { catchAsync } from '../utils/catchAsync';

const captureConsent = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { id: string; tenantId: string | null };
  if (!user.tenantId) {
    throw new Error('User does not have a tenant');
  }
  const { childId } = req.params;
  const ipAddress = req.ip ?? 'unknown';
  const checkedAt = new Date();
  const result = await consentService.captureConsent(
    childId,
    req.body.guardianId,
    req.body.type,
    req.body.typedName,
    ipAddress,
    checkedAt,
    user.tenantId
  );
  res.status(httpStatus.CREATED).send(result);
});

const withdrawConsent = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { id: string; tenantId: string | null };
  if (!user.tenantId) {
    throw new Error('User does not have a tenant');
  }
  await consentService.withdrawConsent(req.params.childId, req.params.consentId, req.body.reason, user.tenantId);
  res.status(httpStatus.NO_CONTENT).send();
});

const getConsentStatus = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { id: string; tenantId: string | null };
  if (!user.tenantId) {
    throw new Error('User does not have a tenant');
  }
  const status = await consentService.getConsentStatus(req.params.childId, user.tenantId);
  res.send(status);
});

const getConsentHistory = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { id: string; tenantId: string | null };
  if (!user.tenantId) {
    throw new Error('User does not have a tenant');
  }
  const history = await consentService.getConsentHistory(req.params.childId, user.tenantId);
  res.send(history);
});

const consentController = {
  captureConsent,
  withdrawConsent,
  getConsentStatus,
  getConsentHistory,
};

export default consentController;
