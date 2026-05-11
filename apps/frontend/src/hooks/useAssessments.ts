import type { CreateAssessmentDto, UpdateAssessmentDto } from '@haber/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { assessmentsApi } from '@/api/assessments';

export const assessmentKeys = {
  all: ['assessments'] as const,
  list: (childId: string) => [...assessmentKeys.all, 'list', childId] as const,
  detail: (childId: string, id: string) => [...assessmentKeys.all, 'detail', childId, id] as const,
};

export function useAssessments(childId: string) {
  return useQuery({
    queryKey: assessmentKeys.list(childId),
    queryFn: () => assessmentsApi.list(childId),
    enabled: !!childId,
  });
}

export function useAssessment(childId: string, assessmentId: string) {
  return useQuery({
    queryKey: assessmentKeys.detail(childId, assessmentId),
    queryFn: () => assessmentsApi.get(childId, assessmentId),
    enabled: !!childId && !!assessmentId,
  });
}

export function useCreateAssessment() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: ({ childId, data }: { childId: string; data: CreateAssessmentDto }) => assessmentsApi.create(childId, data),
    onSuccess: (result, { childId }) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.list(childId) });
      navigate(`/children/${childId}/assessments/${result.id}`);
    },
  });
}

export function useUpdateAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ childId, assessmentId, data }: { childId: string; assessmentId: string; data: UpdateAssessmentDto }) =>
      assessmentsApi.update(childId, assessmentId, data),
    onSuccess: (result, { childId, assessmentId }) => {
      queryClient.setQueryData(assessmentKeys.detail(childId, assessmentId), result);
    },
  });
}

export function useFinaliseAssessment() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: ({ childId, assessmentId }: { childId: string; assessmentId: string }) =>
      assessmentsApi.finalise(childId, assessmentId),
    onSuccess: (_, { childId }) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.list(childId) });
      navigate(`/children/${childId}`);
    },
  });
}
