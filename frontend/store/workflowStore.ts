'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WorkflowStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT';

export interface WorkflowItem {
  id: string;
  name: string;
  status: WorkflowStatus;
  folder: string;
  createdAt: string;
  tasksConsumed: number;
  apps: string[];
  webhookUrl: string;
}

interface WorkflowStoreState {
  workflows: WorkflowItem[];
  folders: string[];
  activeFolder: string;
  statusFilter: 'ALL' | WorkflowStatus;
  searchQuery: string;
  isDense: boolean;

  // Actions
  createWorkflow: (data: { name: string; folder?: string }) => WorkflowItem;
  updateWorkflow: (id: string, updates: Partial<WorkflowItem>) => void;
  toggleStatus: (id: string) => void;
  moveToTrash: (id: string) => void;
  restoreFromTrash: (id: string) => void;
  deletePermanently: (id: string) => void;
  addFolder: (name: string) => void;
  setActiveFolder: (folder: string) => void;
  setStatusFilter: (filter: 'ALL' | WorkflowStatus) => void;
  setSearchQuery: (query: string) => void;
  toggleDenseMode: () => void;
}

export const useWorkflowStore = create<WorkflowStoreState>()(
  persist(
    (set, get) => ({
      workflows: [],
      folders: ['Home', 'Trash'],
      activeFolder: 'Home',
      statusFilter: 'ALL',
      searchQuery: '',
      isDense: false,

      createWorkflow: ({ name, folder = 'Home' }) => {
        const id = 'wf_' + Math.random().toString(36).substring(2, 9);
        const newWf: WorkflowItem = {
          id,
          name: name.trim() || 'Untitled Workflow',
          status: 'ACTIVE',
          folder: folder || 'Home',
          createdAt: new Date().toISOString(),
          tasksConsumed: 0,
          apps: ['Webhook', 'API'],
          webhookUrl: `https://api.kairaconnect.com/v1/wh/${id}`,
        };

        set((state) => ({
          workflows: [newWf, ...state.workflows],
        }));

        return newWf;
      },

      updateWorkflow: (id, updates) => {
        set((state) => ({
          workflows: state.workflows.map((wf) =>
            wf.id === id ? { ...wf, ...updates } : wf
          ),
        }));
      },

      toggleStatus: (id) => {
        set((state) => ({
          workflows: state.workflows.map((wf) => {
            if (wf.id !== id) return wf;
            const nextStatus: WorkflowStatus =
              wf.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
            return { ...wf, status: nextStatus };
          }),
        }));
      },

      moveToTrash: (id) => {
        set((state) => ({
          workflows: state.workflows.map((wf) =>
            wf.id === id ? { ...wf, folder: 'Trash' } : wf
          ),
        }));
      },

      restoreFromTrash: (id) => {
        set((state) => ({
          workflows: state.workflows.map((wf) =>
            wf.id === id ? { ...wf, folder: 'Home' } : wf
          ),
        }));
      },

      deletePermanently: (id) => {
        set((state) => ({
          workflows: state.workflows.filter((wf) => wf.id !== id),
        }));
      },

      addFolder: (name) => {
        const cleanName = name.trim();
        if (!cleanName) return;
        set((state) => {
          if (state.folders.includes(cleanName)) return state;
          return {
            folders: [...state.folders.filter((f) => f !== 'Trash'), cleanName, 'Trash'],
          };
        });
      },

      setActiveFolder: (folder) => set({ activeFolder: folder }),
      setStatusFilter: (statusFilter) => set({ statusFilter }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      toggleDenseMode: () => set((state) => ({ isDense: !state.isDense })),
    }),
    {
      name: 'kaira_workflow_storage',
    }
  )
);

