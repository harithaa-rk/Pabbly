'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MoreVertical,
  Power,
  Trash2,
  Edit2,
  Copy,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Workflow } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';
import { DeleteWorkflowModal } from './DeleteWorkflowModal';
import { useToast } from '../../hooks/useToast';

interface WorkflowActionMenuProps {
  workflow: Workflow;
  onEditRename?: (workflow: Workflow) => void;
}

export const WorkflowActionMenu: React.FC<WorkflowActionMenuProps> = ({
  workflow,
  onEditRename,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeletingModalOpen, setIsDeletingModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const router = useRouter();
  const { toggleStatus, duplicateWorkflow, deleteWorkflow } = useWorkflowStore();
  const { success, error } = useToast();

  const handleToggle = async () => {
    setIsOpen(false);
    setIsActionLoading(true);
    try {
      await toggleStatus(workflow.id);
      success(`Workflow status updated`);
    } catch (err: any) {
      error(err?.message || 'Failed to update workflow status');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDuplicate = async () => {
    setIsOpen(false);
    setIsActionLoading(true);
    try {
      const copy = await duplicateWorkflow(workflow.id);
      success(`Workflow duplicated as "${copy.name}"`);
    } catch (err: any) {
      error(err?.message || 'Failed to duplicate workflow');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsActionLoading(true);
    try {
      await deleteWorkflow(workflow.id);
      success('Workflow deleted successfully');
      setIsDeletingModalOpen(false);
    } catch (err: any) {
      error(err?.message || 'Failed to delete workflow');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <>
      <div className="relative inline-block text-left">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isActionLoading}
          title="Workflow actions"
          className="p-1.5 rounded-lg text-[#667085] hover:text-[#182033] hover:bg-[#FFF7F4] transition-colors disabled:opacity-50"
        >
          {isActionLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#E85D8A]" />
          ) : (
            <MoreVertical className="w-4 h-4" />
          )}
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-dropdown border border-[#E9E5E4] py-1 z-40 text-xs font-medium animate-scaleUp">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push(`/workflows/${workflow.id}`);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[#344054] hover:bg-[#FFF7F4] hover:text-[#182033]"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#667085]" />
                <span>Open Details</span>
              </button>

              <button
                onClick={handleToggle}
                className="w-full flex items-center gap-2 px-3 py-2 text-[#344054] hover:bg-[#FFF7F4] hover:text-[#182033]"
              >
                <Power className="w-3.5 h-3.5 text-[#E85D8A]" />
                <span>{workflow.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</span>
              </button>

              {onEditRename && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onEditRename(workflow);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[#344054] hover:bg-[#FFF7F4] hover:text-[#182033]"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#667085]" />
                  <span>Rename</span>
                </button>
              )}

              <button
                onClick={handleDuplicate}
                className="w-full flex items-center gap-2 px-3 py-2 text-[#344054] hover:bg-[#FFF7F4] hover:text-[#182033]"
              >
                <Copy className="w-3.5 h-3.5 text-[#667085]" />
                <span>Duplicate</span>
              </button>

              <div className="my-1 border-t border-[#E9E5E4]" />

              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsDeletingModalOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>Delete</span>
              </button>
            </div>
          </>
        )}
      </div>

      <DeleteWorkflowModal
        isOpen={isDeletingModalOpen}
        workflowName={workflow.name}
        isDeleting={isActionLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeletingModalOpen(false)}
      />
    </>
  );
};
