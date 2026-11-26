'use client';

import { create } from 'zustand';
import {
  Workflow,
  WorkflowStatus,
  WorkflowNode,
  WorkflowConnection,
  WorkflowEdge,
  WorkflowItem,
  BuilderMode,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  SaveTriggerInput,
  TriggerType,
  TriggerConfig,
  WorkflowTrigger,
  createDefaultNodes,
  createDefaultEdges,
} from '../types/workflow';
import { WorkflowService } from '../services/workflowService';
import { extractErrorMessage } from '../lib/api';

export type {
  Workflow,
  WorkflowStatus,
  WorkflowNode,
  WorkflowConnection,
  WorkflowEdge,
  WorkflowItem,
  BuilderMode,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  SaveTriggerInput,
  TriggerType,
  TriggerConfig,
  WorkflowTrigger,
};

export { createDefaultNodes, createDefaultEdges };

export function generateSecureWorkflowId(): string {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(8);
    window.crypto.getRandomValues(bytes);
    return 'wf_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return 'wf_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// In-memory undo/redo history stacks
const historyStacks = new Map<string, { past: WorkflowNode[][]; future: WorkflowNode[][] }>();

function getHistory(workflowId: string) {
  if (!historyStacks.has(workflowId)) {
    historyStacks.set(workflowId, { past: [], future: [] });
  }
  return historyStacks.get(workflowId)!;
}

function pushHistory(workflowId: string, currentNodes: WorkflowNode[]) {
  const h = getHistory(workflowId);
  h.past.push(JSON.parse(JSON.stringify(currentNodes)));
  if (h.past.length > 30) h.past.shift();
  h.future = [];
}

function getLocalBuilderPref(workflowId: string): { builderMode?: BuilderMode; canvasViewport?: { x: number; y: number; zoom: number } } {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`kaira_pref_${workflowId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLocalBuilderPref(workflowId: string, pref: { builderMode?: BuilderMode; canvasViewport?: { x: number; y: number; zoom: number } }) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalBuilderPref(workflowId);
    localStorage.setItem(`kaira_pref_${workflowId}`, JSON.stringify({ ...current, ...pref }));
  } catch {
    // ignore local storage errors
  }
}

interface WorkflowStoreState {
  workflows: Workflow[];
  total: number;
  loading: boolean;
  error: string | null;
  statusFilter: 'ALL' | WorkflowStatus;
  searchQuery: string;
  sortBy: 'updatedAt' | 'createdAt' | 'name' | 'status';
  sortOrder: 'asc' | 'desc';

  // Folders & UI
  folders: string[];
  activeFolder: string;
  isDense: boolean;

  // Actions - Workflows API
  fetchWorkflows: () => Promise<void>;
  createWorkflow: (data: CreateWorkflowInput) => Promise<Workflow>;
  updateWorkflow: (id: string, data: UpdateWorkflowInput) => Promise<Workflow>;
  updateStatus: (id: string, status: WorkflowStatus) => Promise<void>;
  toggleStatus: (id: string) => Promise<boolean>;
  duplicateWorkflow: (id: string) => Promise<Workflow>;
  deleteWorkflow: (id: string) => Promise<void>;
  saveTrigger: (workflowId: string, data: SaveTriggerInput) => Promise<Workflow>;
  updateTriggerStatus: (workflowId: string, enabled: boolean) => Promise<Workflow>;
  removeTrigger: (workflowId: string) => Promise<Workflow>;
  setStatusFilter: (filter: 'ALL' | WorkflowStatus) => void;
  setSearchQuery: (query: string) => void;
  setSort: (sortBy: 'updatedAt' | 'createdAt' | 'name' | 'status', sortOrder?: 'asc' | 'desc') => void;

  // Folder Actions
  addFolder: (name: string) => void;
  setActiveFolder: (folder: string) => void;
  toggleDenseMode: () => void;
  moveToTrash: (id: string) => void;
  restoreFromTrash: (id: string) => void;
  deletePermanently: (id: string) => void;

  // Builder Specific Actions
  setBuilderMode: (workflowId: string, mode: BuilderMode) => void;
  updateWorkflowNodes: (workflowId: string, nodes: WorkflowNode[], edges?: WorkflowEdge[]) => void;
  updateNodePosition: (workflowId: string, nodeId: string, position: { x: number; y: number }) => void;
  addNode: (workflowId: string, afterNodeId?: string) => void;
  deleteNode: (workflowId: string, nodeId: string) => void;
  updateNode: (workflowId: string, nodeId: string, updates: Partial<WorkflowNode>) => void;
  duplicateNode: (workflowId: string, nodeId: string) => void;
  reorderNodes: (workflowId: string, startIndex: number, endIndex: number) => void;
  undo: (workflowId: string) => boolean;
  redo: (workflowId: string) => boolean;
  canUndo: (workflowId: string) => boolean;
  canRedo: (workflowId: string) => boolean;
  updateCanvasViewport: (workflowId: string, viewport: { x: number; y: number; zoom: number }) => void;
  ensureWorkflowInitialized: (id: string, initialName?: string) => Workflow;
}

export const useWorkflowStore = create<WorkflowStoreState>((set, get) => ({
  workflows: [],
  total: 0,
  loading: false,
  error: null,
  statusFilter: 'ALL',
  searchQuery: '',
  sortBy: 'updatedAt',
  sortOrder: 'desc',

  folders: ['Home', 'Trash'],
  activeFolder: 'Home',
  isDense: false,

  fetchWorkflows: async () => {
    set({ loading: true, error: null });
    try {
      const { statusFilter, searchQuery, sortBy, sortOrder } = get();
      const res = await WorkflowService.getWorkflows({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchQuery.trim() || undefined,
        sort: sortBy,
        order: sortOrder,
      });

      // Augment each workflow with local preference for builderMode and canvasViewport if present
      const mappedWorkflows: Workflow[] = (res.workflows || []).map((wf) => {
        const pref = getLocalBuilderPref(wf.id);
        const nodes = Array.isArray(wf.nodes) && wf.nodes.length > 0 ? wf.nodes : createDefaultNodes();
        const connections = Array.isArray(wf.connections) && wf.connections.length > 0
          ? wf.connections
          : createDefaultEdges(nodes);

        const merged: Workflow = {
          ...wf,
          nodes,
          connections,
          folder: wf.folder || 'Home',
          tasksConsumed: wf.tasksConsumed || 0,
          apps: wf.apps || [],
          builderMode: pref.builderMode || wf.builderMode || 'visual',
          canvasViewport: pref.canvasViewport || wf.canvasViewport || { x: 0, y: 0, zoom: 1 },
        };
        (merged as any).edges = connections;
        return merged;
      });

      set({
        workflows: mappedWorkflows,
        total: res.total,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: extractErrorMessage(err),
      });
    }
  },

  createWorkflow: async (data: CreateWorkflowInput) => {
    set({ loading: true, error: null });
    try {
      const initialNodes = data.nodes && data.nodes.length > 0 ? data.nodes : createDefaultNodes();
      const initialConnections = data.connections && data.connections.length > 0 ? data.connections : createDefaultEdges(initialNodes);

      const created = await WorkflowService.createWorkflow({
        ...data,
        nodes: initialNodes,
        connections: initialConnections,
      });

      const pref = getLocalBuilderPref(created.id);
      const enriched: Workflow = {
        ...created,
        nodes: initialNodes,
        connections: initialConnections,
        folder: 'Home',
        tasksConsumed: 0,
        apps: [],
        builderMode: pref.builderMode || 'visual',
        canvasViewport: pref.canvasViewport || { x: 0, y: 0, zoom: 1 },
      };
      (enriched as any).edges = initialConnections;

      set((state) => ({
        workflows: [enriched, ...state.workflows],
        total: state.total + 1,
        loading: false,
      }));
      return enriched;
    } catch (err) {
      const msg = extractErrorMessage(err);
      set({ loading: false, error: msg });
      throw new Error(msg);
    }
  },

  updateWorkflow: async (id: string, data: UpdateWorkflowInput) => {
    try {
      // Support edges as alias for connections
      const payload: UpdateWorkflowInput = { ...data };
      if ((data as any).edges && !data.connections) {
        payload.connections = (data as any).edges;
      }

      // Optimistically update local store immediately
      set((state) => ({
        workflows: state.workflows.map((wf) => {
          if (wf.id !== id) return wf;
          const updated = { ...wf, ...payload };
          if (payload.connections) {
            (updated as any).edges = payload.connections;
          }
          return updated;
        }),
      }));

      const updated = await WorkflowService.updateWorkflow(id, payload);
      const pref = getLocalBuilderPref(id);
      const enriched: Workflow = {
        ...updated,
        builderMode: pref.builderMode || updated.builderMode || 'visual',
        canvasViewport: pref.canvasViewport || updated.canvasViewport || { x: 0, y: 0, zoom: 1 },
      };
      (enriched as any).edges = enriched.connections;

      set((state) => ({
        workflows: state.workflows.map((wf) => (wf.id === id ? { ...wf, ...enriched } : wf)),
      }));
      return enriched;
    } catch (err) {
      const msg = extractErrorMessage(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  updateStatus: async (id: string, status: WorkflowStatus) => {
    try {
      const updated = await WorkflowService.updateStatus(id, status);
      set((state) => ({
        workflows: state.workflows.map((wf) => (wf.id === id ? { ...wf, status: updated.status } : wf)),
      }));
    } catch (err) {
      const msg = extractErrorMessage(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  toggleStatus: async (id: string) => {
    const wf = get().workflows.find((w) => w.id === id);
    if (!wf) return false;

    // Check if workflow has configured apps or trigger before permitting activation
    const hasConfiguredNode = wf.nodes?.some((n) => n.status === 'configured') || false;
    const hasTrigger = Boolean(wf.trigger?.enabled);
    if (!hasConfiguredNode && !hasTrigger && (wf.status === 'DRAFT' || wf.status === 'INACTIVE')) {
      return false;
    }

    const nextStatus: WorkflowStatus = wf.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await get().updateStatus(id, nextStatus);
    return true;
  },

  duplicateWorkflow: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const duplicated = await WorkflowService.duplicateWorkflow(id);
      const pref = getLocalBuilderPref(duplicated.id);
      const enriched: Workflow = {
        ...duplicated,
        builderMode: pref.builderMode || 'visual',
        canvasViewport: pref.canvasViewport || { x: 0, y: 0, zoom: 1 },
      };
      (enriched as any).edges = enriched.connections;

      set((state) => ({
        workflows: [enriched, ...state.workflows],
        total: state.total + 1,
        loading: false,
      }));
      return enriched;
    } catch (err) {
      const msg = extractErrorMessage(err);
      set({ loading: false, error: msg });
      throw new Error(msg);
    }
  },

  deleteWorkflow: async (id: string) => {
    try {
      await WorkflowService.deleteWorkflow(id);
      set((state) => ({
        workflows: state.workflows.filter((wf) => wf.id !== id),
        total: Math.max(0, state.total - 1),
      }));
    } catch (err) {
      const msg = extractErrorMessage(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  saveTrigger: async (workflowId: string, data: SaveTriggerInput) => {
    try {
      const updated = await WorkflowService.saveTrigger(workflowId, data);
      set((state) => ({
        workflows: state.workflows.map((wf) => (wf.id === workflowId ? { ...wf, trigger: updated.trigger } : wf)),
      }));
      return updated;
    } catch (err) {
      const msg = extractErrorMessage(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  updateTriggerStatus: async (workflowId: string, enabled: boolean) => {
    try {
      const updated = await WorkflowService.updateTriggerStatus(workflowId, enabled);
      set((state) => ({
        workflows: state.workflows.map((wf) => (wf.id === workflowId ? { ...wf, trigger: updated.trigger } : wf)),
      }));
      return updated;
    } catch (err) {
      const msg = extractErrorMessage(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  removeTrigger: async (workflowId: string) => {
    try {
      const updated = await WorkflowService.removeTrigger(workflowId);
      set((state) => ({
        workflows: state.workflows.map((wf) => (wf.id === workflowId ? { ...wf, trigger: null } : wf)),
      }));
      return updated;
    } catch (err) {
      const msg = extractErrorMessage(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  setStatusFilter: (filter) => {
    set({ statusFilter: filter });
    get().fetchWorkflows();
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().fetchWorkflows();
  },

  setSort: (sortBy, sortOrder = 'desc') => {
    set({ sortBy, sortOrder });
    get().fetchWorkflows();
  },

  // Folder Actions
  addFolder: (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    set((state) => {
      if (state.folders.includes(cleanName)) return state;
      return {
        folders: [...state.folders.filter((f) => f !== 'Trash'), cleanName, 'Trash'],
      };
    });
  },

  setActiveFolder: (folder: string) => set({ activeFolder: folder }),

  toggleDenseMode: () => set((state) => ({ isDense: !state.isDense })),

  moveToTrash: (id: string) => {
    set((state) => ({
      workflows: state.workflows.map((wf) =>
        wf.id === id ? { ...wf, folder: 'Trash' } : wf
      ),
    }));
  },

  restoreFromTrash: (id: string) => {
    set((state) => ({
      workflows: state.workflows.map((wf) =>
        wf.id === id ? { ...wf, folder: 'Home' } : wf
      ),
    }));
  },

  deletePermanently: (id: string) => {
    get().deleteWorkflow(id).catch(() => {});
  },

  // Builder Specific Actions
  setBuilderMode: (workflowId: string, mode: BuilderMode) => {
    setLocalBuilderPref(workflowId, { builderMode: mode });
    set((state) => ({
      workflows: state.workflows.map((wf) =>
        wf.id === workflowId ? { ...wf, builderMode: mode } : wf
      ),
    }));
  },

  updateWorkflowNodes: (workflowId: string, nodes: WorkflowNode[], edges?: WorkflowEdge[]) => {
    const current = get().workflows.find((w) => w.id === workflowId);
    if (current?.nodes) pushHistory(workflowId, current.nodes);
    const resolvedEdges = edges || createDefaultEdges(nodes);
    set((state) => ({
      workflows: state.workflows.map((wf) => {
        if (wf.id !== workflowId) return wf;
        const updated = {
          ...wf,
          nodes,
          connections: resolvedEdges,
        };
        (updated as any).edges = resolvedEdges;
        return updated;
      }),
    }));
  },

  updateNodePosition: (workflowId: string, nodeId: string, position: { x: number; y: number }) => {
    set((state) => ({
      workflows: state.workflows.map((wf) => {
        if (wf.id !== workflowId) return wf;
        const currentNodes = wf.nodes && wf.nodes.length > 0 ? wf.nodes : createDefaultNodes();
        const updatedNodes = currentNodes.map((n) =>
          n.id === nodeId ? { ...n, position } : n
        );
        const updated = { ...wf, nodes: updatedNodes };
        (updated as any).edges = wf.connections || (wf as any).edges;
        return updated;
      }),
    }));
  },

  addNode: (workflowId: string, afterNodeId?: string) => {
    const current = get().workflows.find((w) => w.id === workflowId);
    if (current?.nodes) pushHistory(workflowId, current.nodes);
    set((state) => ({
      workflows: state.workflows.map((wf) => {
        if (wf.id !== workflowId) return wf;
        const currentNodes = wf.nodes && wf.nodes.length > 0 ? [...wf.nodes] : createDefaultNodes();
        const newIndex = afterNodeId
          ? currentNodes.findIndex((n) => n.id === afterNodeId) + 1
          : currentNodes.length;

        const targetIndex = newIndex > 0 ? newIndex : currentNodes.length;
        const prevNode = currentNodes[targetIndex - 1];
        const nextNode = currentNodes[targetIndex];

        let newX = 500;
        let newY = 220;
        if (prevNode && nextNode && prevNode.position && nextNode.position) {
          newX = (prevNode.position.x + nextNode.position.x) / 2;
          newY = (prevNode.position.y + nextNode.position.y) / 2;
        } else if (prevNode && prevNode.position) {
          newX = prevNode.position.x + 360;
          newY = prevNode.position.y;
        }

        const newNodeId = `action-node-${Date.now().toString(36)}`;
        const newNode: WorkflowNode = {
          id: newNodeId,
          type: 'action',
          stepNumber: targetIndex + 1,
          title: 'Add Action',
          app: '',
          event: '',
          status: 'draft',
          position: { x: newX, y: newY },
          config: {},
        };

        currentNodes.splice(targetIndex, 0, newNode);

        const reindexedNodes = currentNodes.map((node, idx) => ({
          ...node,
          stepNumber: idx + 1,
          title: node.type === 'trigger' ? (node.title || 'Add Trigger') : (node.title || 'Add Action'),
        }));

        const newEdges = createDefaultEdges(reindexedNodes);
        const updated = {
          ...wf,
          nodes: reindexedNodes,
          connections: newEdges,
        };
        (updated as any).edges = newEdges;
        return updated;
      }),
    }));
  },

  deleteNode: (workflowId: string, nodeId: string) => {
    const current = get().workflows.find((w) => w.id === workflowId);
    if (current?.nodes) pushHistory(workflowId, current.nodes);
    set((state) => ({
      workflows: state.workflows.map((wf) => {
        if (wf.id !== workflowId) return wf;
        const currentNodes = wf.nodes || createDefaultNodes();
        if (currentNodes.length <= 1) return wf;

        const filteredNodes = currentNodes.filter((n) => n.id !== nodeId);
        const reindexedNodes = filteredNodes.map((node, idx) => ({
          ...node,
          stepNumber: idx + 1,
        }));

        const newEdges = createDefaultEdges(reindexedNodes);
        const updated = {
          ...wf,
          nodes: reindexedNodes,
          connections: newEdges,
        };
        (updated as any).edges = newEdges;
        return updated;
      }),
    }));
  },

  updateNode: (workflowId: string, nodeId: string, updates: Partial<WorkflowNode>) => {
    set((state) => ({
      workflows: state.workflows.map((wf) => {
        if (wf.id !== workflowId) return wf;
        const currentNodes = wf.nodes || createDefaultNodes();
        const updatedNodes = currentNodes.map((n) =>
          n.id === nodeId ? { ...n, ...updates } : n
        );
        const updated = { ...wf, nodes: updatedNodes };
        (updated as any).edges = wf.connections || (wf as any).edges;
        return updated;
      }),
    }));
  },

  duplicateNode: (workflowId: string, nodeId: string) => {
    const current = get().workflows.find((w) => w.id === workflowId);
    if (!current?.nodes) return;
    const targetIndex = current.nodes.findIndex((n) => n.id === nodeId);
    if (targetIndex === -1) return;
    const targetNode = current.nodes[targetIndex];
    if (targetNode.type === 'trigger') return;

    pushHistory(workflowId, current.nodes);
    const duplicatedNode: WorkflowNode = {
      ...JSON.parse(JSON.stringify(targetNode)),
      id: `action-node-${Date.now().toString(36)}`,
      stepNumber: targetIndex + 2,
      position: {
        x: (targetNode.position?.x ?? 500) + 40,
        y: (targetNode.position?.y ?? 220) + 40,
      },
    };

    const updatedNodes = [...current.nodes];
    updatedNodes.splice(targetIndex + 1, 0, duplicatedNode);
    const reindexed = updatedNodes.map((n, idx) => ({ ...n, stepNumber: idx + 1 }));
    const newEdges = createDefaultEdges(reindexed);

    set((state) => ({
      workflows: state.workflows.map((wf) => {
        if (wf.id !== workflowId) return wf;
        const updated = {
          ...wf,
          nodes: reindexed,
          connections: newEdges,
        };
        (updated as any).edges = newEdges;
        return updated;
      }),
    }));
  },

  reorderNodes: (workflowId: string, startIndex: number, endIndex: number) => {
    const current = get().workflows.find((w) => w.id === workflowId);
    if (!current?.nodes) return;
    if (startIndex === 0 || endIndex === 0) return;

    pushHistory(workflowId, current.nodes);
    const result = Array.from(current.nodes);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    const reindexed = result.map((n, idx) => ({
      ...n,
      stepNumber: idx + 1,
      position: {
        x: 140 + idx * 360,
        y: 220,
      },
    }));

    const newEdges = createDefaultEdges(reindexed);
    set((state) => ({
      workflows: state.workflows.map((wf) => {
        if (wf.id !== workflowId) return wf;
        const updated = {
          ...wf,
          nodes: reindexed,
          connections: newEdges,
        };
        (updated as any).edges = newEdges;
        return updated;
      }),
    }));
  },

  undo: (workflowId: string) => {
    const h = getHistory(workflowId);
    if (h.past.length === 0) return false;
    const current = get().workflows.find((w) => w.id === workflowId);
    if (!current?.nodes) return false;

    const previous = h.past.pop()!;
    h.future.push(JSON.parse(JSON.stringify(current.nodes)));
    const newEdges = createDefaultEdges(previous);

    set((state) => ({
      workflows: state.workflows.map((wf) => {
        if (wf.id !== workflowId) return wf;
        const updated = {
          ...wf,
          nodes: previous,
          connections: newEdges,
        };
        (updated as any).edges = newEdges;
        return updated;
      }),
    }));
    return true;
  },

  redo: (workflowId: string) => {
    const h = getHistory(workflowId);
    if (h.future.length === 0) return false;
    const current = get().workflows.find((w) => w.id === workflowId);
    if (!current?.nodes) return false;

    const next = h.future.pop()!;
    h.past.push(JSON.parse(JSON.stringify(current.nodes)));
    const newEdges = createDefaultEdges(next);

    set((state) => ({
      workflows: state.workflows.map((wf) => {
        if (wf.id !== workflowId) return wf;
        const updated = {
          ...wf,
          nodes: next,
          connections: newEdges,
        };
        (updated as any).edges = newEdges;
        return updated;
      }),
    }));
    return true;
  },

  canUndo: (workflowId: string) => {
    return (getHistory(workflowId).past.length > 0);
  },

  canRedo: (workflowId: string) => {
    return (getHistory(workflowId).future.length > 0);
  },

  updateCanvasViewport: (workflowId: string, viewport: { x: number; y: number; zoom: number }) => {
    setLocalBuilderPref(workflowId, { canvasViewport: viewport });
    set((state) => ({
      workflows: state.workflows.map((wf) =>
        wf.id === workflowId ? { ...wf, canvasViewport: viewport } : wf
      ),
    }));
  },

  ensureWorkflowInitialized: (id: string, initialName?: string) => {
    const state = get();
    const existing = state.workflows.find((w) => w.id === id);
    const pref = getLocalBuilderPref(id);
    const preferredMode = pref.builderMode || 'visual';
    const preferredViewport = pref.canvasViewport || { x: 0, y: 0, zoom: 1 };

    if (!existing) {
      const initialNodes = createDefaultNodes();
      const initialConnections = createDefaultEdges(initialNodes);
      const stub: Workflow = {
        id,
        name: initialName?.trim() || 'Untitled Workflow',
        description: null,
        status: 'DRAFT',
        version: 1,
        trigger: null,
        webhookId: null,
        nodes: initialNodes,
        connections: initialConnections,
        ownerId: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        builderMode: preferredMode,
        canvasViewport: preferredViewport,
        folder: 'Home',
        tasksConsumed: 0,
        apps: [],
      };
      (stub as any).edges = initialConnections;
      set((s) => ({
        workflows: [stub, ...s.workflows],
      }));
      return stub;
    }

    const nodes = existing.nodes && existing.nodes.length > 0 ? existing.nodes : createDefaultNodes();
    const connections = existing.connections && existing.connections.length > 0 ? existing.connections : createDefaultEdges(nodes);
    const updated: Workflow = {
      ...existing,
      nodes,
      connections,
      builderMode: existing.builderMode || preferredMode,
      canvasViewport: existing.canvasViewport || preferredViewport,
    };
    (updated as any).edges = connections;

    if (!existing.nodes || existing.nodes.length === 0 || !existing.builderMode) {
      set((s) => ({
        workflows: s.workflows.map((w) => (w.id === id ? updated : w)),
      }));
    }

    return updated;
  },
}));
