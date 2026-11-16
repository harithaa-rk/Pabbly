export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

export interface Workflow {
  id: string;
  name: string;
  description?: string | null;
  status: WorkflowStatus;
  version: number;
  nodes: any[];
  connections: any[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string | null;
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string | null;
  nodes?: any[];
  connections?: any[];
}

export interface WorkflowQueryParams {
  search?: string;
  status?: WorkflowStatus | 'ALL';
  sort?: 'name' | 'createdAt' | 'updatedAt' | 'status';
  order?: 'asc' | 'desc';
}

