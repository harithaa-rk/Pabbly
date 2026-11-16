import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index.js';
import { WorkflowService } from '../services/workflow.service.js';
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  updateWorkflowStatusSchema,
  workflowQuerySchema,
} from '../validators/workflow.validator.js';
import { sendSuccess, AppError } from '../utils/apiResponse.js';

export class WorkflowController {
  static async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const validated = createWorkflowSchema.parse(req.body);
      const workflow = await WorkflowService.createWorkflow(req.user.id, validated);

      sendSuccess(res, 'Workflow created successfully', workflow, 201);
    } catch (error) {
      next(error);
    }
  }

  static async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const query = workflowQuerySchema.parse(req.query);
      const { workflows, total } = await WorkflowService.listWorkflows(req.user.id, query);

      sendSuccess(res, 'Workflows retrieved successfully', workflows, 200, { total });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const workflow = await WorkflowService.getWorkflowById(req.params.id, req.user.id);
      sendSuccess(res, 'Workflow retrieved successfully', workflow, 200);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const validated = updateWorkflowSchema.parse(req.body);
      const updated = await WorkflowService.updateWorkflow(req.params.id, req.user.id, validated);

      sendSuccess(res, 'Workflow updated successfully', updated, 200);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { status } = updateWorkflowStatusSchema.parse(req.body);
      const updated = await WorkflowService.updateStatus(req.params.id, req.user.id, status as any);

      sendSuccess(res, `Workflow marked as ${status.toLowerCase()}`, updated, 200);
    } catch (error) {
      next(error);
    }
  }

  static async duplicate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const duplicated = await WorkflowService.duplicateWorkflow(req.params.id, req.user.id);
      sendSuccess(res, 'Workflow duplicated successfully', duplicated, 201);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      await WorkflowService.deleteWorkflow(req.params.id, req.user.id);
      sendSuccess(res, 'Workflow deleted successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }
}

