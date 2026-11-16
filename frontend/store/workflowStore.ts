'use client';

import { create } from 'zustand';
import {
  Workflow,
  WorkflowStatus,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  SaveTriggerInput,
} from '../types/workflow';
import { WorkflowService } from '../services/workflowService';
import { extractErrorMessage } from '../lib/api';

interface WorkflowStoreState {
  workflows: Workflow[];
  total: number;
  loading: boolean;
  error: string | null;
  statusFilter: 'ALL' | WorkflowStatus;
  searchQuery: string;
  sortBy: 'updatedAt' | 'createdAt' | 'name' | 'status';
  sortOrder: 'asc' | 'desc';

  // Actions
  fetchWorkflows: () => Promise<void>;
  createWorkflow: (data: CreateWorkflowInput) => Promise<Workflow>;
  updateWorkflow: (id: string, data: UpdateWorkflowInput) => Promise<Workflow>;
  updateStatus: (id: string, status: WorkflowStatus) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
  duplicateWorkflow: (id: string) => Promise<Workflow>;
  deleteWorkflow: (id: string) => Promise<void>;
  saveTrigger: (workflowId: string, data: SaveTriggerInput) => Promise<Workflow>;
  updateTriggerStatus: (workflowId: string, enabled: boolean) => Promise<Workflow>;
  removeTrigger: (workflowId: string) => Promise<Workflow>;
  setStatusFilter: (filter: 'ALL' | WorkflowStatus) => void;
  setSearchQuery: (query: string) => void;
  setSort: (sortBy: 'updatedAt' | 'createdAt' | 'name' | 'status', sortOrder?: 'asc' | 'desc') => void;
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

      set({
        workflows: res.workflows,
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
      const created = await WorkflowService.createWorkflow(data);
      set((state) => ({
        workflows: [created, ...state.workflows],
        total: state.total + 1,
        loading: false,
      }));
      return created;
    } catch (err) {
      const msg = extractErrorMessage(err);
      set({ loading: false, error: msg });
      throw new Error(msg);
    }
  },

  updateWorkflow: async (id: string, data: UpdateWorkflowInput) => {
    try {
      const updated = await WorkflowService.updateWorkflow(id, data);
      set((state) => ({
        workflows: state.workflows.map((wf) => (wf.id === id ? updated : wf)),
      }));
      return updated;
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
        workflows: state.workflows.map((wf) => (wf.id === id ? updated : wf)),
      }));
    } catch (err) {
      const msg = extractErrorMessage(err);
      set({ error: msg });
      throw new Error(msg);
    }
  },

  toggleStatus: async (id: string) => {
    const wf = get().workflows.find((w) => w.id === id);
    if (!wf) return;

    // Toggle: ACTIVE <-> INACTIVE (or DRAFT -> ACTIVE)
    const nextStatus: WorkflowStatus = wf.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await get().updateStatus(id, nextStatus);
  },

  duplicateWorkflow: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const duplicated = await WorkflowService.duplicateWorkflow(id);
      set((state) => ({
        workflows: [duplicated, ...state.workflows],
        total: state.total + 1,
        loading: false,
      }));
      return duplicated;
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
        workflows: state.workflows.map((wf) => (wf.id === workflowId ? updated : wf)),
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
        workflows: state.workflows.map((wf) => (wf.id === workflowId ? updated : wf)),
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
        workflows: state.workflows.map((wf) => (wf.id === workflowId ? updated : wf)),
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
}));
