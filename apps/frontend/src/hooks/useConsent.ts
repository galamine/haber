import type { CaptureConsentDto, WithdrawConsentDto } from '@haber/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { consentApi } from '@/api/consent';

export const consentKeys = {
  status: (childId: string) => ['consent', 'status', childId] as const,
  history: (childId: string) => ['consent', 'history', childId] as const,
};

export function useConsentStatus(childId: string) {
  return useQuery({
    queryKey: consentKeys.status(childId),
    queryFn: () => consentApi.getStatus(childId),
    enabled: !!childId,
  });
}

export function useConsentHistory(childId: string) {
  return useQuery({
    queryKey: consentKeys.history(childId),
    queryFn: () => consentApi.getHistory(childId),
    enabled: !!childId,
  });
}

export function useCaptureConsent(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CaptureConsentDto) => consentApi.capture(childId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consentKeys.status(childId) });
      queryClient.invalidateQueries({ queryKey: consentKeys.history(childId) });
    },
  });
}

export function useWithdrawConsent(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ consentId, body }: { consentId: string; body: WithdrawConsentDto }) =>
      consentApi.withdraw(childId, consentId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consentKeys.status(childId) });
      queryClient.invalidateQueries({ queryKey: consentKeys.history(childId) });
    },
  });
}
