import { Router } from 'express';
import childController from '../../controllers/child.controller';
import consentController from '../../controllers/consent.controller';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import childValidation from '../../validations/child.validation';
import consentValidation from '../../validations/consent.validation';

const router = Router();

router.post('/', auth('child.intake'), validate(childValidation.createChild), childController.createChild);
router.get('/', auth('child.intake'), validate(childValidation.getChildren), childController.getChildren);
router.get('/:childId', auth('child.intake'), validate(childValidation.getChild), childController.getChildById);
router.patch('/:childId', auth('child.intake'), validate(childValidation.updateChild), childController.updateChild);
router.put(
  '/:childId/medical-history',
  auth('child.intake'),
  validate(childValidation.upsertMedicalHistory),
  childController.upsertMedicalHistory
);
router.post(
  '/:childId/guardians',
  auth('child.intake'),
  validate(childValidation.createGuardian),
  childController.createGuardian
);
router.patch(
  '/:childId/guardians/:guardianId',
  auth('child.intake'),
  validate(childValidation.updateGuardian),
  childController.updateGuardian
);
router.get(
  '/:childId/intake-status',
  auth('child.intake'),
  validate(childValidation.getIntakeStatus),
  childController.getIntakeStatus
);
router.post(
  '/:childId/consent',
  auth('child.consent'),
  validate(consentValidation.captureConsent),
  consentController.captureConsent
);
router.get(
  '/:childId/consent-status',
  auth('child.consent'),
  validate(consentValidation.getConsentStatus),
  consentController.getConsentStatus
);
router.post(
  '/:childId/consent/:consentId/withdraw',
  auth('child.consent'),
  validate(consentValidation.withdrawConsent),
  consentController.withdrawConsent
);
router.get(
  '/:childId/consent',
  auth('child.consent'),
  validate(consentValidation.getConsentHistory),
  consentController.getConsentHistory
);
router.delete('/:childId', auth(), childController.softDeleteChild);

export default router;
