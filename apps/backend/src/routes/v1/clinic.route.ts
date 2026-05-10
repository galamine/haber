import { UpdateGameToggleDtoSchema } from '@haber/shared';
import { Router } from 'express';
import httpStatus from 'http-status';
import clinicController from '../../controllers/clinic.controller';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import { gameToggleService } from '../../services';
import type { AuthRequest } from '../../types';
import { ApiError } from '../../utils/ApiError';
import { catchAsync } from '../../utils/catchAsync';
import clinicValidation from '../../validations/clinic.validation';

const router = Router();

router.route('/me').get(auth('getClinic'), validate(clinicValidation.getMyClinic), clinicController.getMyClinic);

router
  .route('/game-toggles')
  .get(
    auth('getGameToggles'),
    catchAsync(async (req: AuthRequest, res) => {
      const user = req.user as { tenantId: string | null };
      if (!user.tenantId) throw new ApiError(httpStatus.FORBIDDEN, 'No clinic associated');
      const toggles = await gameToggleService.list(user.tenantId);
      res.send(toggles);
    })
  )
  .patch(
    auth('manageGameToggles'),
    validate({ body: UpdateGameToggleDtoSchema }),
    catchAsync(async (req: AuthRequest, res) => {
      const user = req.user as { tenantId: string | null };
      if (!user.tenantId) throw new ApiError(httpStatus.FORBIDDEN, 'No clinic associated');
      const result = await gameToggleService.upsert(user.tenantId, req.body);
      res.send(result);
    })
  );

export default router;
