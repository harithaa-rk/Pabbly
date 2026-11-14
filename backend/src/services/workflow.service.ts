import { prisma } from '../config/database.js';
import { AppError } from '../utils/apiResponse.js';
import { WorkflowStatus } from '@prisma/client';

export interface CreateWorkflowDTO {
  name: string;
  description?: string | null;
}

export interface UpdateWorkflowDTO {
  name?: string;
  description?: string | null;
  nodes?: any[];
  connections?: any[];
}

export interface WorkflowQueryParams {
  search?: string;
  status?: string;
  sort?: 'name' | 'createdAt' | 'updatedAt' | 'status';
  order?: 'asc' | 'desc';
}

export class WorkflowService {
  /**
   * Helper to verify ownership and existence
   */
  private static async getWorkflowAndVerifyOwnership(workflowId: string, userId: string) {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new AppError('Workflow not found', 404);
    }

    if (workflow.ownerId !== userId) {
      throw new AppError('Access denied: You do not have permission to access this workflow', 403);
    }

    return workflow;
  }

  /**
   * Create a new workflow for the authenticated user
   */
  static async createWorkflow(userId: string, data: CreateWorkflowDTO) {
    const workflow = await prisma.workflow.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        status: WorkflowStatus.DRAFT,
        version: 1,
        nodes: [],
        connections: [],
        ownerId: userId,
      },
    });

    return workflow;
  }

  /**
   * List all workflows for the authenticated user with optional search, filter & sort
   */
  static async listWorkflows(userId: string, params: WorkflowQueryParams = {}) {
    const { search, status, sort = 'updatedAt', order = 'desc' } = params;

    const where: any = {
      ownerId: userId,
    };

    // Filter by status if provided and not 'ALL'
    if (status && status !== 'ALL') {
      where.status = status as WorkflowStatus;
    }

    // Search by name or description (case-insensitive)
    if (search && search.trim()) {
      const trimmedSearch = search.trim();
      where.OR = [
        { name: { contains: trimmedSearch, mode: 'insensitive' } },
        { description: { contains: trimmedSearch, mode: 'insensitive' } },
      ];
    }

    // Sorting
    const orderBy: any = {};
    const validSortFields = ['name', 'createdAt', 'updatedAt', 'status'];
    const sortField = validSortFields.includes(sort) ? sort : 'updatedAt';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';
    orderBy[sortField] = sortOrder;

    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where,
        orderBy,
      }),
      prisma.workflow.count({ where }),
    ]);

    return {
      workflows,
      total,
    };
  }

  /**
   * Get workflow by ID (strict owner isolation)
   */
  static async getWorkflowById(workflowId: string, userId: string) {
    return await this.getWorkflowAndVerifyOwnership(workflowId, userId);
  }

  /**
   * Update workflow metadata or configuration (strict owner isolation)
   */
  static async updateWorkflow(workflowId: string, userId: string, data: UpdateWorkflowDTO) {
    await this.getWorkflowAndVerifyOwnership(workflowId, userId);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) {
      updateData.description = data.description ? data.description.trim() : null;
    }
    if (data.nodes !== undefined) updateData.nodes = data.nodes;
    if (data.connections !== undefined) updateData.connections = data.connections;

    const updated = await prisma.workflow.update({
      where: { id: workflowId },
      data: updateData,
    });

    return updated;
  }

  /**
   * Update workflow lifecycle status (DRAFT | ACTIVE | INACTIVE)
   */
  static async updateStatus(workflowId: string, userId: string, status: WorkflowStatus) {
    await this.getWorkflowAndVerifyOwnership(workflowId, userId);

    const updated = await prisma.workflow.update({
      where: { id: workflowId },
      data: { status },
    });

    return updated;
  }

  /**
   * Duplicate a workflow (creates a new DRAFT copy with version 1)
   */
  static async duplicateWorkflow(workflowId: string, userId: string) {
    const original = await this.getWorkflowAndVerifyOwnership(workflowId, userId);

    const duplicated = await prisma.workflow.create({
      data: {
        name: `${original.name} Copy`,
        description: original.description,
        status: WorkflowStatus.DRAFT,
        version: 1,
        nodes: original.nodes ? JSON.parse(JSON.stringify(original.nodes)) : [],
        connections: original.connections ? JSON.parse(JSON.stringify(original.connections)) : [],
        ownerId: userId,
      },
    });

    return duplicated;
  }

  /**
   * Delete a workflow permanently (strict owner isolation)
   */
  static async deleteWorkflow(workflowId: string, userId: string) {
    await this.getWorkflowAndVerifyOwnership(workflowId, userId);

    await prisma.workflow.delete({
      where: { id: workflowId },
    });

    return { id: workflowId };
  }
}
