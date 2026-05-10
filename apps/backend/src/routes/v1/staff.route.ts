import { Router } from 'express';
import staffController from '../../controllers/staff.controller';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import staffValidation from '../../validations/staff.validation';

const router = Router();

router.post('/invite', auth('manageUsers'), validate(staffValidation.inviteStaff), staffController.inviteStaff);
router.get('/', auth('manageUsers'), validate(staffValidation.getStaff), staffController.getStaff);
router.get('/capacity', auth('manageUsers'), staffController.getCapacity);
router.get('/:userId', auth('manageUsers'), validate(staffValidation.getStaffById), staffController.getStaffById);
router.patch('/:userId', auth('manageUsers'), validate(staffValidation.updateStaff), staffController.updateStaff);
router.post(
  '/:userId/deactivate',
  auth('manageUsers'),
  validate(staffValidation.deactivateStaff),
  staffController.deactivateStaff
);
router.post(
  '/:userId/reactivate',
  auth('manageUsers'),
  validate(staffValidation.reactivateStaff),
  staffController.reactivateStaff
);

export default router;
