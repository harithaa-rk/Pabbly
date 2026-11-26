import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index.js';
import { taskService } from '../services/task.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { env } from '../config/env.js';
import { isDatabaseConnected } from '../config/database.js';

export async function getTaskUsage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!isDatabaseConnected() && env.nodeEnv === 'development') {
      sendSuccess(res, 'Task usage retrieved successfully (Local Decoupled Mode)', undefined, 200, {
        usage: {
          tasksAllocated: 100,
          tasksConsumed: 0,
          tasksRemaining: 100,
          freeTasksConsumed: 0,
          plan: 'FREE (Decoupled Dev)',
          billingPeriodStart: new Date().toISOString(),
          billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          isDecoupledDev: true,
        },
      });
      return;
    }
    const userId = req.user!.id;
    const usage = await taskService.getOrCreateTaskUsage(userId);
    sendSuccess(res, 'Task usage retrieved successfully', undefined, 200, { usage });
  } catch (error) {
    next(error);
  }
}

export async function getExecutionHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const filter = (req.query.filter as 'ALL' | 'SUCCESS' | 'FAILED') || 'ALL';
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    if (!isDatabaseConnected() && env.nodeEnv === 'development') {
      sendSuccess(res, 'Execution history retrieved successfully (Local Decoupled Mode)', undefined, 200, {
        executions: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        isDecoupledDev: true,
      });
      return;
    }

    const userId = req.user!.id;
    const history = await taskService.getExecutionHistory(userId, filter, page, limit);
    sendSuccess(res, 'Execution history retrieved successfully', undefined, 200, history);
  } catch (error) {
    next(error);
  }
}

export async function recordExecution(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const {
      workflowId,
      workflowName,
      executionId,
      status,
      actionCount,
      isTest,
      failureReason,
    } = req.body;

    // Check if request is authenticated as the trusted backend execution engine
    const engineHeader = req.headers['x-internal-engine-key'];
    const isTrustedEngine = Boolean(engineHeader && engineHeader === env.jwtSecret);

    const execution = await taskService.recordExecution({
      userId,
      workflowId,
      workflowName,
      executionId,
      status,
      actionCount,
      isTest: Boolean(isTest),
      failureReason,
      isTrustedEngine,
    });

    sendSuccess(res, 'Execution recorded successfully', undefined, 201, { execution });
  } catch (error) {
    next(error);
  }
}
