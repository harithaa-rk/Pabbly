import { api } from '../lib/api';
import {
  Workflow,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  WorkflowQueryParams,
  WorkflowStatus,
} from '../types/workflow';

export class WorkflowService {
  /**
   * Fetch all workflows for the current user with optional query filters
   */
  static async getWorkflows(params?: WorkflowQueryParams): Promise<{ workflows: Workflow[]; total: number }> {
    const res = await api.get('/workflows', { params });
    return {
      workflows: res.data.data || [],
      total: res.data.total ?? (res.data.data ? res.data.data.length : 0),
    };
  }

  /**
   * Fetch single workflow by ID
   */
  static async getWorkflowById(id: string): Promise<Workflow> {
    const res = await api.get(`/workflows/${id}`);
    return res.data.data;
  }

  /**
   * Create a new workflow
   */
  static async createWorkflow(data: CreateWorkflowInput): Promise<Workflow> {
    const res = await api.post('/workflows', data);
    return res.data.data;
  }

  /**
   * Update workflow metadata or node configurations
   */
  static async updateWorkflow(id: string, data: UpdateWorkflowInput): Promise<Workflow> {
    const res = await api.put(`/workflows/${id}`, data);
    return res.data.data;
  }

  /**
   * Update workflow status (ACTIVE, INACTIVE, DRAFT)
   */
  static async updateStatus(id: string, status: WorkflowStatus): Promise<Workflow> {
    const res = await api.patch(`/workflows/${id}/status`, { status });
    return res.data.data;
  }

  /**
   * Duplicate an existing workflow
   */
  static async duplicateWorkflow(id: string): Promise<Workflow> {
    const res = await api.post(`/workflows/${id}/duplicate`);
    return res.data.data;
  }

  /**
   * Delete a workflow
   */
  static async deleteWorkflow(id: string): Promise<void> {
    await api.delete(`/workflows/${id}`);
  }
}

