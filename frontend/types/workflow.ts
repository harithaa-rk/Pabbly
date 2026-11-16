export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type TriggerType = 'webhook' | 'manual';

export interface TriggerConfig {
  method?: 'POST';
}

export interface WorkflowTrigger {
  type: TriggerType;
  name: string;
  enabled: boolean;
  webhookId?: string;
  webhookUrl?: string;
  config?: TriggerConfig;
  updatedAt?: string;
}

export interface SaveTriggerInput {
  type: TriggerType;
  name: string;
  enabled?: boolean;
  config?: TriggerConfig;
}

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action';
  app: string;
  name: string;
  enabled?: boolean;
  position?: { x: number; y: number };
  config?: any;
  webhookId?: string;
  webhookUrl?: string;
}

export interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string | null;
  status: WorkflowStatus;
  version: number;
  trigger?: WorkflowTrigger | null;
  webhookId?: string | null;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
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
