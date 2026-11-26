import { Router } from 'express';
import * as webhookController from '../controllers/webhook.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { webhookIngestLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

// Test dynamic email action interpolation
router.post('/preview-email', webhookController.previewEmailAction);
router.post('/preview/email', webhookController.previewEmailAction);

// Workflow dry-run execution (Zero tasks consumed)
router.post('/workflow/dry-run', webhookController.executeDryRun);
router.post('/:workflowId/dry-run', webhookController.executeDryRun);

// Safe local development testing endpoint (for builder sample payload capture)
router.post('/test/:workflowId', webhookController.receiveTestWebhook);
router.post('/:workflowId/test', webhookController.receiveTestWebhook);

// Query latest captured payload (PROTECTED: Authentication and workflow ownership required)
router.get('/:workflowId/latest', requireAuth, webhookController.getLatestWebhook);

// Query in-memory execution history for a workflow
router.get('/:workflowId/history', webhookController.getExecutionHistory);

// Clear captured webhook buffer (PROTECTED: Authentication and workflow ownership required)
router.delete('/:workflowId', requireAuth, webhookController.clearWebhooks);

// Ingest live production webhook payloads (Public for external services, protected by rate limiting & validation)
router.post('/:workflowId', webhookIngestLimiter, webhookController.receiveWebhook);

export default router;
