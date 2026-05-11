import type {
  CreateAssessmentDto,
  UpdateAssessmentDto,
  UpsertFunctionalConcernsDto,
  UpsertMilestonesDto,
  UpsertSensoryProfileDto,
} from '@haber/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { assessmentsApi } from '@/api/assessments';

export const assessmentKeys = {
  all: ['assessments'] as const,
  list: (childId: string) => [...assessmentKeys.all, 'list', childId] as const,
  detail: (childId: string, id: string) => [...assessmentKeys.all, 'detail', childId, id] as const,
  milestones: (childId: string, assessmentId: string) =>
    [...assessmentKeys.detail(childId, assessmentId), 'milestones'] as const,
  sensoryProfile: (childId: string, assessmentId: string) =>
    [...assessmentKeys.detail(childId, assessmentId), 'sensory-profile'] as const,
  functionalConcerns: (childId: string, assessmentId: string) =>
    [...assessmentKeys.detail(childId, assessmentId), 'functional-concerns'] as const,
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

export function useMilestones(childId: string, assessmentId: string) {
  return useQuery({
    queryKey: assessmentKeys.milestones(childId, assessmentId),
    queryFn: () => assessmentsApi.getMilestones(childId, assessmentId),
    enabled: !!childId && !!assessmentId,
  });
}

export function useUpsertMilestones() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ childId, assessmentId, data }: { childId: string; assessmentId: string; data: UpsertMilestonesDto }) =>
      assessmentsApi.upsertMilestones(childId, assessmentId, data),
    onSuccess: (result, { childId, assessmentId }) => {
      queryClient.setQueryData(assessmentKeys.milestones(childId, assessmentId), result);
    },
  });
}

export function useSensoryProfile(childId: string, assessmentId: string) {
  return useQuery({
    queryKey: assessmentKeys.sensoryProfile(childId, assessmentId),
    queryFn: () => assessmentsApi.getSensoryProfile(childId, assessmentId),
    enabled: !!childId && !!assessmentId,
  });
}

export function useUpsertSensoryProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      childId,
      assessmentId,
      data,
    }: {
      childId: string;
      assessmentId: string;
      data: UpsertSensoryProfileDto;
    }) => assessmentsApi.upsertSensoryProfile(childId, assessmentId, data),
    onSuccess: (result, { childId, assessmentId }) => {
      queryClient.setQueryData(assessmentKeys.sensoryProfile(childId, assessmentId), result);
    },
  });
}

export function useFunctionalConcerns(childId: string, assessmentId: string) {
  return useQuery({
    queryKey: assessmentKeys.functionalConcerns(childId, assessmentId),
    queryFn: () => assessmentsApi.getFunctionalConcerns(childId, assessmentId),
    enabled: !!childId && !!assessmentId,
  });
}

export function useUpsertFunctionalConcerns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      childId,
      assessmentId,
      data,
    }: {
      childId: string;
      assessmentId: string;
      data: UpsertFunctionalConcernsDto;
    }) => assessmentsApi.upsertFunctionalConcerns(childId, assessmentId, data),
    onSuccess: (result, { childId, assessmentId }) => {
      queryClient.setQueryData(assessmentKeys.functionalConcerns(childId, assessmentId), result);
    },
  });
}
