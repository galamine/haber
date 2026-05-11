import { Router } from 'express';
import taxonomyController from '../../controllers/taxonomy.controller';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import taxonomyValidation from '../../validations/taxonomy.validation';

const router = Router();

router
  .route('/:type')
  .get(auth('child.intake'), validate(taxonomyValidation.list), taxonomyController.list)
  .post(auth('manageTaxonomies'), validate(taxonomyValidation.create), taxonomyController.create);

router.route('/:type/:id').delete(auth('manageTaxonomies'), validate(taxonomyValidation.remove), taxonomyController.remove);

export default router;
