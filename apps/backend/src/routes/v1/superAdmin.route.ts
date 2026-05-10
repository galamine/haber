import { Router } from 'express';
import clinicController from '../../controllers/clinic.controller';
import subscriptionPlanController from '../../controllers/subscriptionPlan.controller';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import clinicValidation from '../../validations/clinic.validation';
import subscriptionPlanValidation from '../../validations/subscriptionPlan.validation';

const router = Router();

router
  .route('/subscription-plans')
  .post(
    auth('manageSubscriptionPlans'),
    validate(subscriptionPlanValidation.createSubscriptionPlan),
    subscriptionPlanController.createSubscriptionPlan
  )
  .get(
    auth('manageSubscriptionPlans'),
    validate(subscriptionPlanValidation.getSubscriptionPlans),
    subscriptionPlanController.getSubscriptionPlans
  );

router
  .route('/subscription-plans/:planId')
  .get(
    auth('manageSubscriptionPlans'),
    validate(subscriptionPlanValidation.getSubscriptionPlan),
    subscriptionPlanController.getSubscriptionPlan
  )
  .patch(
    auth('manageSubscriptionPlans'),
    validate(subscriptionPlanValidation.updateSubscriptionPlan),
    subscriptionPlanController.updateSubscriptionPlan
  );

router
  .route('/clinics')
  .post(auth('manageClinics'), validate(clinicValidation.createClinic), clinicController.createClinic)
  .get(auth('manageClinics'), validate(clinicValidation.getClinics), clinicController.getClinics);

router
  .route('/clinics/:clinicId')
  .get(auth('manageClinics'), validate(clinicValidation.getClinic), clinicController.getClinic)
  .patch(auth('manageClinics'), validate(clinicValidation.updateClinic), clinicController.updateClinic);

router
  .route('/clinics/:clinicId/suspend')
  .post(auth('manageClinics'), validate(clinicValidation.getClinic), clinicController.suspendClinic);

router
  .route('/clinics/:clinicId/reactivate')
  .post(auth('manageClinics'), validate(clinicValidation.getClinic), clinicController.reactivateClinic);

export default router;
