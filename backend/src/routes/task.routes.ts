import { Router } from 'express';
import * as taskController from '../controllers/task.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/usage', requireAuth, taskController.getTaskUsage);
router.get('/history', requireAuth, taskController.getExecutionHistory);
router.post('/execute', requireAuth, taskController.recordExecution);

export default router;
