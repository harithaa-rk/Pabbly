'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GitBranch,
  Loader2,
  Calendar,
  Clock,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { Workflow } from '../../types/workflow';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import { WorkflowActionMenu } from './WorkflowActionMenu';
import { EmptyWorkflowState } from './EmptyWorkflowState';
import { formatDate } from '../../lib/utils';
import { useToast } from '../../hooks/useToast';

interface WorkflowTableProps {
  onCreateClick: () => void;
}

export const WorkflowTable: React.FC<WorkflowTableProps> = ({ onCreateClick }) => {
  const {
    workflows,
    loading,
    error,
    searchQuery,
    statusFilter,
    fetchWorkflows,
    toggleStatus,
    setSearchQuery,
    setStatusFilter,
    updateWorkflow,
  } = useWorkflowStore();

  const { success, error: toastError } = useToast();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleToggle = async (wf: Workflow) => {
    setTogglingId(wf.id);
    try {
      await toggleStatus(wf.id);
      success(`Workflow is now ${wf.status === 'ACTIVE' ? 'inactive' : 'active'}`);
    } catch (err: any) {
      toastError(err?.message || 'Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleRename = async (wf: Workflow) => {
    const newName = window.prompt('Enter new workflow name:', wf.name);
    if (newName && newName.trim() && newName.trim() !== wf.name) {
      try {
        await updateWorkflow(wf.id, { name: newName.trim() });
        success('Workflow renamed successfully');
      } catch (err: any) {
        toastError(err?.message || 'Failed to rename workflow');
      }
    }
  };

  if (loading && workflows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E85D8A] mb-3" />
        <p className="text-xs font-medium text-[#667085]">Loading workflows from database...</p>
      </div>
    );
  }

  if (error && workflows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <p className="text-sm font-semibold text-red-600 mb-1">Failed to load workflows</p>
        <p className="text-xs text-[#667085] mb-4">{error}</p>
        <button
          onClick={() => fetchWorkflows()}
          className="text-xs font-semibold text-[#E85D8A] hover:underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  const isFiltered = Boolean(searchQuery.trim() || statusFilter !== 'ALL');

  if (workflows.length === 0) {
    return (
      <EmptyWorkflowState
        onCreateClick={onCreateClick}
        isFiltered={isFiltered}
        onClearFilters={() => {
          setSearchQuery('');
          setStatusFilter('ALL');
        }}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-[#E9E5E4] bg-[#FFFDFB] text-[#475467] font-semibold select-none">
            <th className="py-3 px-5">Workflow</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4 text-center">Active</th>
            <th className="py-3 px-4">Version</th>
            <th className="py-3 px-4">Last Modified</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E9E5E4] bg-white">
          {workflows.map((wf) => {
            const isToggling = togglingId === wf.id;

            return (
              <tr
                key={wf.id}
                className="hover:bg-[#FFFDFB] transition-colors group"
              >
                {/* Workflow Name & Description */}
                <td className="py-3.5 px-5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#FFF7F4] border border-[#F8D8C5] text-[#E85D8A] flex items-center justify-center shrink-0 mt-0.5">
                      <GitBranch className="w-4 h-4 stroke-[1.75]" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/workflows/${wf.id}`}
                        className="text-xs font-bold text-[#182033] hover:text-[#E85D8A] transition-colors truncate block flex items-center gap-1.5"
                      >
                        <span className="truncate">{wf.name}</span>
                        <ExternalLink className="w-3 h-3 text-[#98A2B3] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      {wf.description && (
                        <p className="text-[11px] text-[#667085] truncate max-w-md mt-0.5">
                          {wf.description}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Status Badge */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <WorkflowStatusBadge status={wf.status} />
                </td>

                {/* Status Toggle Switch */}
                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                  <button
                    onClick={() => handleToggle(wf)}
                    disabled={isToggling}
                    title={wf.status === 'ACTIVE' ? 'Pause Workflow' : 'Activate Workflow'}
                    className="inline-flex items-center text-[#667085] hover:text-[#182033] transition-colors disabled:opacity-50"
                  >
                    {isToggling ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[#E85D8A]" />
                    ) : wf.status === 'ACTIVE' ? (
                      <ToggleRight className="w-6 h-6 text-[#22A06B]" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-[#98A2B3]" />
                    )}
                  </button>
                </td>

                {/* Version */}
                <td className="py-3.5 px-4 whitespace-nowrap text-[#475467]">
                  <span className="px-2 py-0.5 rounded-md bg-[#F2F4F7] text-[11px] font-medium text-[#344054]">
                    v{wf.version}
                  </span>
                </td>

                {/* Last Modified */}
                <td className="py-3.5 px-4 whitespace-nowrap text-[#667085]">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-[#98A2B3]" />
                    <span>{formatDate(wf.updatedAt)}</span>
                  </div>
                </td>

                {/* Actions Dropdown */}
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <WorkflowActionMenu workflow={wf} onEditRename={handleRename} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
