import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { requireAuth, requireRole, validateBody } from '../middleware/auth.middleware.js';
import { updateRoleSchema, updateStatusSchema } from '../validators/user.validator.js';

const router = Router();

// All routes require ADMIN role
router.use(requireAuth, requireRole('ADMIN'));

router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/role', validateBody(updateRoleSchema), adminController.updateUserRole);
router.patch('/users/:id/status', validateBody(updateStatusSchema), adminController.updateUserStatus);

export default router;

