import { TaxonomyTypeSchema } from '@haber/shared';
import { z } from 'zod';

const typeParam = z.object({ type: TaxonomyTypeSchema });
const typeAndIdParam = z.object({ type: TaxonomyTypeSchema, id: z.string().uuid('Invalid ID') });

export default {
  list: { params: typeParam },
  create: { params: typeParam },
  remove: { params: typeAndIdParam },
};
