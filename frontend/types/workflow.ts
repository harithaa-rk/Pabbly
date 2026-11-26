export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type TriggerType = 'webhook' | 'manual';
export type BuilderMode = 'visual' | 'manual';

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
  type: 'trigger' | 'action' | 'condition';
  stepNumber?: number;
  title?: string;
  subtitle?: string;
  app?: string;
  name?: string;
  event?: string;
  status?: 'configured' | 'pending' | 'draft';
  enabled?: boolean;
  position: { x: number; y: number };
  config?: Record<string, any>;
  webhookId?: string;
  webhookUrl?: string;
}

export interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
}

export type WorkflowEdge = WorkflowConnection;

export interface WorkflowItem {
  id: string;
  name: string;
  status: WorkflowStatus;
  folder?: string;
  createdAt?: string;
  tasksConsumed?: number;
  apps?: string[];
  webhookUrl?: string;
  builderMode?: BuilderMode;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  canvasViewport?: { x: number; y: number; zoom: number };
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
  builderMode?: BuilderMode;
  canvasViewport?: { x: number; y: number; zoom: number };
  apps?: string[];
  folder?: string;
  tasksConsumed?: number;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string | null;
  nodes?: WorkflowNode[];
  connections?: WorkflowConnection[];
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string | null;
  status?: WorkflowStatus;
  nodes?: any[];
  connections?: any[];
}

export interface WorkflowQueryParams {
  search?: string;
  status?: WorkflowStatus | 'ALL';
  sort?: 'name' | 'createdAt' | 'updatedAt' | 'status';
  order?: 'asc' | 'desc';
}

export const createDefaultNodes = (): WorkflowNode[] => [
  {
    id: 'trigger-node-1',
    type: 'trigger',
    stepNumber: 1,
    title: 'Add Trigger',
    app: '',
    event: '',
    status: 'draft',
    position: { x: 140, y: 220 },
    config: {},
  },
  {
    id: 'action-node-1',
    type: 'action',
    stepNumber: 2,
    title: 'Add Action',
    app: '',
    event: '',
    status: 'draft',
    position: { x: 500, y: 220 },
    config: {},
  },
];

export const createDefaultEdges = (nodes: WorkflowNode[]): WorkflowConnection[] => {
  const edges: WorkflowConnection[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      id: `edge-${nodes[i].id}-${nodes[i + 1].id}`,
      source: nodes[i].id,
      target: nodes[i + 1].id,
    });
  }
  return edges;
};
