import { Router } from 'express';
import { WorkflowController } from '../controllers/workflow.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// All workflow routes require an active authenticated user session
router.use(requireAuth);

router.post('/', WorkflowController.create);
router.get('/', WorkflowController.list);
router.get('/:id', WorkflowController.getById);
router.put('/:id', WorkflowController.update);
router.patch('/:id/status', WorkflowController.updateStatus);
router.post('/:id/duplicate', WorkflowController.duplicate);
router.delete('/:id', WorkflowController.delete);

// Trigger routes (Module 5)
router.put('/:id/trigger', WorkflowController.saveTrigger);
router.patch('/:id/trigger/status', WorkflowController.updateTriggerStatus);
router.delete('/:id/trigger', WorkflowController.removeTrigger);

export default router;

