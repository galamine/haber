import { Router } from 'express';
import clinicController from '../../controllers/clinic.controller';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import clinicValidation from '../../validations/clinic.validation';

const router = Router();

router.route('/me').get(auth('getClinic'), validate(clinicValidation.getMyClinic), clinicController.getMyClinic);

export default router;
