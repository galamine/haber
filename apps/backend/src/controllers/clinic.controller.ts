import type { Response } from 'express';
import httpStatus from 'http-status';
import { clinicService } from '../services';
import type { AuthRequest, PaginateQuery } from '../types';
import { catchAsync } from '../utils/catchAsync';
import { pick } from '../utils/pick';

const createClinic = catchAsync(async (req: AuthRequest, res: Response) => {
  const clinic = await clinicService.createClinic(req.body);
  res.status(httpStatus.CREATED).send(clinic);
});

const getClinics = catchAsync(async (req: PaginateQuery, res: Response) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page']) as Record<string, unknown>;
  const result = await clinicService.queryClinics(options);
  res.send(result);
});

const getClinic = catchAsync(async (req: AuthRequest, res: Response) => {
  const clinic = await clinicService.getClinicById(req.params.clinicId);
  res.send(clinic);
});

const updateClinic = catchAsync(async (req: AuthRequest, res: Response) => {
  const clinic = await clinicService.updateClinic(req.params.clinicId, req.body);
  res.send(clinic);
});

const suspendClinic = catchAsync(async (req: AuthRequest, res: Response) => {
  const clinic = await clinicService.suspendClinic(req.params.clinicId);
  res.send(clinic);
});

const reactivateClinic = catchAsync(async (req: AuthRequest, res: Response) => {
  const clinic = await clinicService.reactivateClinic(req.params.clinicId);
  res.send(clinic);
});

const getMyClinic = catchAsync(async (req: AuthRequest, res: Response) => {
  const tenantId = req.user.tenantId;
  if (!tenantId) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Clinic not found' });
  }
  const clinic = await clinicService.getMyClinic(tenantId);
  res.send(clinic);
});

const clinicController = {
  createClinic,
  getClinics,
  getClinic,
  updateClinic,
  suspendClinic,
  reactivateClinic,
  getMyClinic,
};

export default clinicController;
