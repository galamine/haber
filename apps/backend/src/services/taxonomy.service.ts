import type { TaxonomyType } from '@haber/shared';
import httpStatus from 'http-status';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';

const MODEL_MAP = {
  diagnoses: 'diagnosis',
  milestones: 'milestone',
  'sensory-systems': 'sensorySystem',
  'functional-concerns': 'functionalConcern',
  'assessment-tools': 'assessmentTool',
  equipment: 'equipment',
  'intervention-approaches': 'interventionApproach',
} as const satisfies Record<TaxonomyType, string>;

const getDelegate = (type: TaxonomyType): any => (prisma as any)[MODEL_MAP[type]];

const list = async (type: TaxonomyType, tenantId: string) => {
  const delegate = getDelegate(type);
  return delegate.findMany({
    where: { OR: [{ frameworkId: 'global' }, { tenantId }] },
    orderBy: { createdAt: 'asc' as const },
  });
};

const create = async (type: TaxonomyType, tenantId: string, data: Record<string, unknown>) => {
  const delegate = getDelegate(type);
  return delegate.create({
    data: { ...data, frameworkId: `clinic_${tenantId}`, tenantId },
  });
};

const remove = async (type: TaxonomyType, id: string) => {
  const delegate = getDelegate(type);
  const entry = await delegate.findUnique({ where: { id } });
  if (!entry) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Taxonomy entry not found');
  }
  if (entry.frameworkId === 'global') {
    throw new ApiError(httpStatus.FORBIDDEN, 'CANNOT_DELETE_GLOBAL_TAXONOMY');
  }
  await delegate.delete({ where: { id } });
};

export const taxonomyService = { list, create, remove };
