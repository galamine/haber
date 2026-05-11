import type { TaxonomyType } from '@haber/shared/dtos';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateTaxonomyDto } from '@/api/taxonomies';
import { taxonomiesApi } from '@/api/taxonomies';

export const taxonomyKeys = {
  all: ['taxonomies'] as const,
  list: (type: TaxonomyType) => [...taxonomyKeys.all, type] as const,
};

export function useTaxonomy(type: TaxonomyType) {
  return useQuery({
    queryKey: taxonomyKeys.list(type),
    queryFn: () => taxonomiesApi.list(type),
    select: (res) => res.data,
  });
}

export function useTenantTaxonomy(type: TaxonomyType) {
  return useQuery({
    queryKey: taxonomyKeys.list(type),
    queryFn: () => taxonomiesApi.list(type),
    select: (res) => res.data.filter((item) => item.tenantId !== null),
  });
}

export function useCreateTaxonomyEntry(type: TaxonomyType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaxonomyDto) => taxonomiesApi.create(type, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taxonomyKeys.list(type) }),
  });
}

export function useDeleteTaxonomyEntry(type: TaxonomyType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taxonomiesApi.remove(type, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taxonomyKeys.list(type) }),
  });
}
