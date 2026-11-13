import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { requireAuth, validateBody } from '../middleware/auth.middleware.js';
import { updateProfileSchema } from '../validators/user.validator.js';

const router = Router();

router.get('/profile', requireAuth, userController.getProfile);
router.patch(
  '/profile',
  requireAuth,
  validateBody(updateProfileSchema),
  userController.updateProfile
);

export default router;

