import { Router } from 'express';
import authController from '../../controllers/auth.controller';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import authValidation from '../../validations/auth.validation';

const router = Router();

router.post('/request-otp', validate(authValidation.requestOtp), authController.requestOtp);
router.post('/verify-otp', validate(authValidation.verifyOtp), authController.verifyOtp);
router.post('/refresh-tokens', validate(authValidation.refreshTokens), authController.refreshTokens);
router.post('/logout', validate(authValidation.logout), authController.logout);
router.post('/logout-all', auth(), authController.logoutAll);

export default router;
