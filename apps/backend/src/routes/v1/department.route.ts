import { Router } from 'express';
import departmentController from '../../controllers/department.controller';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import departmentValidation from '../../validations/department.validation';

const router = Router();

router
  .route('/')
  .post(auth('manageDepartments'), validate(departmentValidation.create), departmentController.create)
  .get(auth('getDepartments'), departmentController.list);

router
  .route('/:id')
  .patch(auth('manageDepartments'), validate(departmentValidation.update), departmentController.update)
  .delete(auth('manageDepartments'), validate(departmentValidation.remove), departmentController.remove);

export default router;
