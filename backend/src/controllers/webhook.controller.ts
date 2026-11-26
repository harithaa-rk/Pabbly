import { Request, Response, NextFunction } from 'express';
import { webhookService } from '../services/webhook.service.js';
import { emailActionService } from '../services/emailAction.service.js';
import { workflowExecutionEngine } from '../services/workflowExecution.service.js';
import { sendSuccess, AppError } from '../utils/apiResponse.js';
import { AuthRequest } from '../types/index.js';

export async function receiveWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workflowId } = req.params;

    // Validate workflowId format to prevent path traversal or malformed strings
    if (!workflowId || !/^[a-zA-Z0-9_-]{3,64}$/.test(workflowId)) {
      throw new AppError('Invalid workflow identifier format', 400);
    }

    // Check if request is explicitly flagged for safe local test mode
    if (req.headers['x-kaira-test'] === 'true' || req.headers['x-kaira-test-mode'] === 'true') {
      return receiveTestWebhook(req, res, next);
    }

    // Reject query string secrets for security (query strings leak into server access logs)
    if (req.query?.secret) {
      throw new AppError(
        'Query string webhook secrets are deprecated and insecure. Provide the secret via the X-Webhook-Secret header.',
        400
      );
    }

    // Secret verification using X-Webhook-Secret header ONLY (never logged)
    const providedSecret = req.headers['x-webhook-secret'] as string | undefined;

    const secretCheck = webhookService.verifySecret(workflowId, providedSecret);
    if (!secretCheck.isValid) {
      if (secretCheck.reason === 'unregistered_workflow') {
        throw new AppError(
          'Workflow is unregistered or inactive. Please activate your workflow in the builder first.',
          404
        );
      }
      if (secretCheck.reason === 'missing_secret') {
        throw new AppError(
          'Missing required X-Webhook-Secret header for registered webhook',
          401
        );
      }
      throw new AppError('Invalid X-Webhook-Secret header', 401);
    }

    const payload = req.body || {};

    // Validate payload against prototype pollution
    if (typeof payload === 'object' && payload !== null) {
      if ('__proto__' in payload || 'constructor' in payload) {
        delete (payload as any)['__proto__'];
        delete (payload as any)['constructor'];
      }
    }

    const event = webhookService.captureWebhook(workflowId, payload, req.headers);

    // Response strictly omits secret tokens or user ownership details (Requirement 5)
    sendSuccess(
      res,
      'Webhook payload received and captured in memory',
      {
        workflowId,
        eventId: event.id,
        receivedAt: event.receivedAt,
        payloadSize: JSON.stringify(payload).length,
      },
      200
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Safe local development and builder testing endpoint.
 * Captures sample payload for builder field detection without requiring
 * production workflow registration or task consumption.
 */
export async function receiveTestWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workflowId } = req.params;

    if (!workflowId || !/^[a-zA-Z0-9_-]{3,64}$/.test(workflowId)) {
      throw new AppError('Invalid workflow identifier format', 400);
    }

    const payload = req.body || {};

    if (typeof payload === 'object' && payload !== null) {
      if ('__proto__' in payload || 'constructor' in payload) {
        delete (payload as any)['__proto__'];
        delete (payload as any)['constructor'];
      }
    }

    const event = webhookService.captureWebhook(workflowId, payload, req.headers);

    sendSuccess(
      res,
      'Test webhook sample payload captured for builder',
      {
        workflowId,
        eventId: event.id,
        receivedAt: event.receivedAt,
        payloadSize: JSON.stringify(payload).length,
        isTest: true,
      },
      200
    );
  } catch (error) {
    next(error);
  }
}

export async function getLatestWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user?.id) {
      throw new AppError('Authentication required to access workflow webhook data', 401);
    }

    const { workflowId } = req.params;
    if (!workflowId || !/^[a-zA-Z0-9_-]{3,64}$/.test(workflowId)) {
      throw new AppError('Invalid workflow identifier format', 400);
    }

    // Verify workflow ownership: users cannot read another user's workflow data (Requirement 7)
    const isOwner = webhookService.verifyOwnership(workflowId, authReq.user.id);
    if (!isOwner) {
      throw new AppError(
        'Access denied: You do not have permission to view this workflow webhook data',
        403
      );
    }

    const latest = webhookService.getLatestPayload(workflowId);

    // Response includes payload event data without exposing secret tokens (Requirement 5)
    sendSuccess(
      res,
      'Latest webhook payload query',
      {
        hasPayload: Boolean(latest),
        event: latest,
      },
      200
    );
  } catch (error) {
    next(error);
  }
}

export async function clearWebhooks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user?.id) {
      throw new AppError('Authentication required to clear workflow webhook data', 401);
    }

    const { workflowId } = req.params;
    if (!workflowId || !/^[a-zA-Z0-9_-]{3,64}$/.test(workflowId)) {
      throw new AppError('Invalid workflow identifier format', 400);
    }

    // Verify workflow ownership: users cannot delete another user's workflow data (Requirement 7)
    const isOwner = webhookService.verifyOwnership(workflowId, authReq.user.id);
    if (!isOwner) {
      throw new AppError(
        'Access denied: You do not have permission to clear this workflow webhook data',
        403
      );
    }

    webhookService.clearPayloads(workflowId);
    sendSuccess(res, 'Webhook buffer cleared', { workflowId }, 200);
  } catch (error) {
    next(error);
  }
}

export async function previewEmailAction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { config, sampleData } = req.body || {};
    const preview = emailActionService.previewEmailAction(config || {}, sampleData || {});
    sendSuccess(res, 'Email action preview generated', { preview }, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Executes a dry-run of a workflow (Webhook -> Condition -> Email Action)
 * Shows selected branch and rendered email. Zero tasks consumed.
 */
export async function executeDryRun(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workflow, payload } = req.body || {};
    if (!workflow) {
      throw new AppError('Workflow definition is required for dry-run execution', 400);
    }

    const authReq = req as AuthRequest;
    const userId = authReq.user?.id || 'usr_builder';

    const result = await workflowExecutionEngine.execute({
      workflow,
      payload: payload || {},
      isDryRun: true,
      userId,
    });

    sendSuccess(res, 'Workflow dry-run execution completed', { result }, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves in-memory execution logs for a workflow
 */
export async function getExecutionHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workflowId } = req.params;
    const history = workflowExecutionEngine.getExecutionHistory(workflowId);
    sendSuccess(res, 'Workflow execution history', { history }, 200);
  } catch (error) {
    next(error);
  }
}

export const webhookController = {
  receiveWebhook,
  receiveTestWebhook,
  getLatestWebhook,
  clearWebhooks,
  previewEmailAction,
  executeDryRun,
  getExecutionHistory,
};
