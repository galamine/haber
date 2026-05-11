import { CaptureConsentDtoSchema, WithdrawConsentDtoSchema } from '@haber/shared';
import { z } from 'zod';

const childIdParam = z.object({ childId: z.string().uuid('Invalid child ID') });
const consentIdParam = z.object({
  childId: z.string().uuid('Invalid child ID'),
  consentId: z.string().uuid('Invalid consent ID'),
});

const captureConsent = {
  params: childIdParam,
  body: CaptureConsentDtoSchema,
};

const withdrawConsent = {
  params: consentIdParam,
  body: WithdrawConsentDtoSchema,
};

const getConsentHistory = {
  params: childIdParam,
};

const getConsentStatus = {
  params: childIdParam,
};

export default {
  captureConsent,
  withdrawConsent,
  getConsentHistory,
  getConsentStatus,
};
