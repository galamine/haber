import { Router } from 'express';
import sensoryRoomController from '../../controllers/sensoryRoom.controller';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import sensoryRoomValidation from '../../validations/sensoryRoom.validation';

const router = Router();

router
  .route('/')
  .post(auth('manageRooms'), validate(sensoryRoomValidation.create), sensoryRoomController.create)
  .get(auth('getRooms'), validate(sensoryRoomValidation.list), sensoryRoomController.list);

router
  .route('/:id')
  .get(auth('getRooms'), validate(sensoryRoomValidation.getOne), sensoryRoomController.getOne)
  .patch(auth('manageRooms'), validate(sensoryRoomValidation.update), sensoryRoomController.update)
  .delete(auth('manageRooms'), validate(sensoryRoomValidation.remove), sensoryRoomController.remove);

export default router;
