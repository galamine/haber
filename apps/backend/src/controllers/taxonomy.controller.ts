import { CREATE_SCHEMA_MAP, type TaxonomyType } from '@haber/shared';
import type { Response } from 'express';
import httpStatus from 'http-status';
import { taxonomyService } from '../services';
import type { AuthRequest } from '../types';
import { ApiError } from '../utils/ApiError';
import { catchAsync } from '../utils/catchAsync';

const list = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { tenantId: string | null };
  if (!user.tenantId) throw new ApiError(httpStatus.FORBIDDEN, 'No clinic associated');
  const type = req.params.type as TaxonomyType;
  const data = await taxonomyService.list(type, user.tenantId);
  res.send({ data });
});

const create = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { tenantId: string | null };
  if (!user.tenantId) throw new ApiError(httpStatus.FORBIDDEN, 'No clinic associated');
  const type = req.params.type as TaxonomyType;
  const bodySchema = CREATE_SCHEMA_MAP[type];
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `body.${i.path.join('.')}: ${i.message}`).join(', ');
    throw new ApiError(httpStatus.BAD_REQUEST, msg);
  }
  const entry = await taxonomyService.create(type, user.tenantId, parsed.data);
  res.status(httpStatus.CREATED).send(entry);
});

const remove = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { tenantId: string | null };
  if (!user.tenantId) throw new ApiError(httpStatus.FORBIDDEN, 'No clinic associated');
  const type = req.params.type as TaxonomyType;
  await taxonomyService.remove(type, req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
});

const taxonomyController = { list, create, remove };
export default taxonomyController;
