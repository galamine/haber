import type { CaptureConsentDto, ConsentRecordDto, ConsentStatusDto, WithdrawConsentDto } from '@haber/shared';
import { apiClient } from './client';

const BASE = (childId: string) => `/v1/children/${childId}`;

export const consentApi = {
  capture: (childId: string, body: CaptureConsentDto) => apiClient.post<ConsentRecordDto>(`${BASE(childId)}/consent`, body),

  getStatus: (childId: string) => apiClient.get<ConsentStatusDto>(`${BASE(childId)}/consent-status`),

  withdraw: (childId: string, consentId: string, body: WithdrawConsentDto) =>
    apiClient.post<void>(`${BASE(childId)}/consent/${consentId}/withdraw`, body),

  getHistory: (childId: string) => apiClient.get<ConsentRecordDto[]>(`${BASE(childId)}/consent`),
};
