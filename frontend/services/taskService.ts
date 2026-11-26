import { api } from '../lib/api';

export interface TaskUsage {
  tasksAllocated: number;
  tasksConsumed: number;
  tasksRemaining: number;
  freeTasksConsumed: number;
  plan: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  resetDate: string;
}

export interface ExecutionRecord {
  id: string;
  executionId: string;
  workflowId: string;
  workflowName: string;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING';
  actionCount: number;
  taskConsumed: boolean;
  isTest: boolean;
  failureReason?: string | null;
  executedAt: string;
}

export interface ExecutionHistoryResponse {
  executions: ExecutionRecord[];
  total: number;
  page: number;
  limit: number;
}

class TaskService {
  async getTaskUsage(): Promise<TaskUsage> {
    try {
      const response = await api.get('/tasks/usage');
      return response.data.data.usage;
    } catch (error) {
      // Graceful client fallback with calendar month bounds
      const now = new Date();
      const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      return {
        tasksAllocated: 100,
        tasksConsumed: 0,
        tasksRemaining: 100,
        freeTasksConsumed: 0,
        plan: 'FREE',
        billingPeriodStart: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
        billingPeriodEnd: nextMonth.toISOString(),
        resetDate: nextMonth.toISOString(),
      };
    }
  }

  async getExecutionHistory(
    filter: 'ALL' | 'SUCCESS' | 'FAILED' = 'ALL',
    page: number = 1,
    limit: number = 20
  ): Promise<ExecutionHistoryResponse> {
    try {
      const response = await api.get('/tasks/history', {
        params: { filter, page, limit },
      });
      return response.data.data;
    } catch (error) {
      return {
        executions: [],
        total: 0,
        page: 1,
        limit,
      };
    }
  }

  async recordExecution(data: {
    workflowId: string;
    workflowName: string;
    executionId: string;
    status: 'SUCCESS' | 'FAILED' | 'RUNNING';
    actionCount?: number;
    isTest?: boolean;
    failureReason?: string;
  }): Promise<ExecutionRecord | null> {
    try {
      const response = await api.post('/tasks/execute', data);
      return response.data.data.execution;
    } catch (error) {
      console.warn('Execution record error:', error);
      return null;
    }
  }
}

export const taskService = new TaskService();
