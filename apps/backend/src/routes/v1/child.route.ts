import { Router } from 'express';
import assessmentController from '../../controllers/assessment.controller';
import assessmentFinalSectionsController from '../../controllers/assessmentFinalSections.controller';
import assessmentSectionsController from '../../controllers/assessmentSections.controller';
import childController from '../../controllers/child.controller';
import consentController from '../../controllers/consent.controller';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import assessmentValidation from '../../validations/assessment.validation';
import assessmentFinalSectionsValidation from '../../validations/assessmentFinalSections.validation';
import assessmentSectionsValidation from '../../validations/assessmentSections.validation';
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
router.post(
  '/:childId/assessments',
  auth('child.assessment'),
  validate(assessmentValidation.create),
  assessmentController.createAssessment
);
router.get(
  '/:childId/assessments',
  auth('child.assessment'),
  validate(assessmentValidation.list),
  assessmentController.listAssessments
);
router.get(
  '/:childId/assessments/:assessmentId',
  auth('child.assessment'),
  validate(assessmentValidation.get),
  assessmentController.getAssessment
);
router.patch(
  '/:childId/assessments/:assessmentId',
  auth('child.assessment'),
  validate(assessmentValidation.update),
  assessmentController.updateAssessment
);
router.post(
  '/:childId/assessments/:assessmentId/finalise',
  auth('child.assessment'),
  validate(assessmentValidation.finalise),
  assessmentController.finaliseAssessment
);
router
  .route('/:childId/assessments/:assessmentId/milestones')
  .put(
    auth('child.assessment'),
    validate(assessmentSectionsValidation.upsertMilestones),
    assessmentSectionsController.upsertMilestones
  )
  .get(
    auth('child.assessment'),
    validate(assessmentSectionsValidation.getMilestones),
    assessmentSectionsController.getMilestones
  );
router
  .route('/:childId/assessments/:assessmentId/sensory-profile')
  .put(
    auth('child.assessment'),
    validate(assessmentSectionsValidation.upsertSensoryProfile),
    assessmentSectionsController.upsertSensoryProfile
  )
  .get(
    auth('child.assessment'),
    validate(assessmentSectionsValidation.getSensoryProfile),
    assessmentSectionsController.getSensoryProfile
  );
router
  .route('/:childId/assessments/:assessmentId/functional-concerns')
  .put(
    auth('child.assessment'),
    validate(assessmentSectionsValidation.upsertFunctionalConcerns),
    assessmentSectionsController.upsertFunctionalConcerns
  )
  .get(
    auth('child.assessment'),
    validate(assessmentSectionsValidation.getFunctionalConcerns),
    assessmentSectionsController.getFunctionalConcerns
  );
router
  .route('/:childId/assessments/:assessmentId/tool-results')
  .put(
    auth('child.assessment'),
    validate(assessmentFinalSectionsValidation.upsertToolResults),
    assessmentFinalSectionsController.upsertToolResults
  )
  .get(
    auth('child.assessment'),
    validate(assessmentFinalSectionsValidation.getToolResults),
    assessmentFinalSectionsController.getToolResults
  );
router
  .route('/:childId/assessments/:assessmentId/intervention-plan')
  .put(
    auth('child.assessment'),
    validate(assessmentFinalSectionsValidation.upsertInterventionPlan),
    assessmentFinalSectionsController.upsertInterventionPlan
  )
  .get(
    auth('child.assessment'),
    validate(assessmentFinalSectionsValidation.getInterventionPlan),
    assessmentFinalSectionsController.getInterventionPlan
  );
router
  .route('/:childId/assessments/:assessmentId/sign')
  .post(
    auth('child.assessment'),
    validate(assessmentFinalSectionsValidation.sign),
    assessmentFinalSectionsController.signAssessment
  );
router.get(
  '/:childId/assessments/:assessmentId/signatures',
  auth('child.assessment'),
  validate(assessmentFinalSectionsValidation.getSignatures),
  assessmentFinalSectionsController.getSignatures
);
router.delete('/:childId', auth(), childController.softDeleteChild);

export default router;
