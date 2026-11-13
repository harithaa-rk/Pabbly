'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Webhook,
  Send,
  Database,
  Globe,
  Folder,
} from 'lucide-react';
import { useWorkflowStore, WorkflowItem } from '../../store/workflowStore';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import { WorkflowActionMenu } from './WorkflowActionMenu';
import { EmptyWorkflowState } from './EmptyWorkflowState';
import { formatDate, cn } from '../../lib/utils';

interface WorkflowTableProps {
  onCreateClick: () => void;
}

export const WorkflowTable: React.FC<WorkflowTableProps> = ({ onCreateClick }) => {
  const { workflows, activeFolder, statusFilter, searchQuery, isDense } =
    useWorkflowStore();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Filter workflows according to active folder, statusFilter, and searchQuery
  const filteredWorkflows = workflows.filter((wf) => {
    // Folder match
    if (activeFolder === 'Trash') {
      if (wf.folder !== 'Trash') return false;
    } else {
      if (wf.folder === 'Trash') return false;
      if (activeFolder !== 'Home' && wf.folder !== activeFolder) return false;
    }

    // Status filter match
    if (statusFilter !== 'ALL' && wf.status !== statusFilter) {
      return false;
    }

    // Search query match (by name or webhookUrl)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = wf.name.toLowerCase().includes(q);
      const matchWebhook = wf.webhookUrl.toLowerCase().includes(q);
      if (!matchName && !matchWebhook) return false;
    }

    return true;
  });

  const total = filteredWorkflows.length;
  const totalPages = Math.ceil(total / rowsPerPage) || 1;
  const paginatedWorkflows = filteredWorkflows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedWorkflows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedWorkflows.map((w) => w.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  if (filteredWorkflows.length === 0) {
    return <EmptyWorkflowState onCreateClick={onCreateClick} />;
  }

  const renderAppBadges = (apps: string[]) => {
    return (
      <div className="flex items-center -space-x-1">
        <div
          title="Webhook Trigger"
          className="w-6 h-6 rounded-md bg-[#FFF7F4] border border-[#E9E5E4] flex items-center justify-center text-[#E85D8A]"
        >
          <Webhook className="w-3.5 h-3.5" />
        </div>
        <div
          title="HTTP API Action"
          className="w-6 h-6 rounded-md bg-[#E8DDF0] border border-[#E9E5E4] flex items-center justify-center text-[#6D4298]"
        >
          <Globe className="w-3.5 h-3.5" />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E9E5E4] bg-[#FFF7F4]/60 text-[11px] font-semibold uppercase tracking-wider text-[#667085]">
              <th className="w-10 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  checked={
                    paginatedWorkflows.length > 0 &&
                    selectedIds.length === paginatedWorkflows.length
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-[#E9E5E4] text-[#E85D8A] focus:ring-[#E85D8A] cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 min-w-[140px]">Status / Date</th>
              <th className="px-4 py-3 w-28">Application</th>
              <th className="px-4 py-3">Workflow Name</th>
              <th className="px-4 py-3 min-w-[140px]">Task Consumption</th>
              <th className="w-12 px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E9E5E4]">
            {paginatedWorkflows.map((wf) => {
              const isSelected = selectedIds.includes(wf.id);

              return (
                <tr
                  key={wf.id}
                  className={cn(
                    'transition-colors hover:bg-[#FFF7F4]/40 group',
                    isSelected && 'bg-[#F8DCE5]/20',
                    isDense ? 'py-1.5' : 'py-3.5'
                  )}
                >
                  {/* Checkbox */}
                  <td className={cn('px-4 text-center', isDense ? 'py-2' : 'py-3.5')}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(wf.id)}
                      className="rounded border-[#E9E5E4] text-[#E85D8A] focus:ring-[#E85D8A] cursor-pointer"
                    />
                  </td>

                  {/* Status / Date */}
                  <td className={cn('px-4', isDense ? 'py-2' : 'py-3.5')}>
                    <div className="flex flex-col gap-1">
                      <WorkflowStatusBadge status={wf.status} />
                      <span className="text-[11px] text-[#667085]">
                        {formatDate(wf.createdAt)}
                      </span>
                    </div>
                  </td>

                  {/* Application Icons */}
                  <td className={cn('px-4', isDense ? 'py-2' : 'py-3.5')}>
                    {renderAppBadges(wf.apps)}
                  </td>

                  {/* Workflow Name & Folder */}
                  <td className={cn('px-4', isDense ? 'py-2' : 'py-3.5')}>
                    <Link
                      href={`/workflows/${wf.id}`}
                      className="text-xs font-semibold text-[#182033] hover:text-[#E85D8A] transition-colors line-clamp-1"
                    >
                      {wf.name}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[#667085]">
                      <Folder className="w-3 h-3 text-[#98A2B3]" />
                      <span>{wf.folder}</span>
                    </div>
                  </td>

                  {/* Task Consumption */}
                  <td className={cn('px-4', isDense ? 'py-2' : 'py-3.5')}>
                    <span className="text-xs font-medium text-[#344054]">
                      {wf.tasksConsumed} Tasks Consumed
                    </span>
                  </td>

                  {/* Actions Dropdown */}
                  <td className={cn('px-4 text-right', isDense ? 'py-2' : 'py-3.5')}>
                    <WorkflowActionMenu workflow={wf} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer (Only if data exists) */}
      {total > 0 && (
        <div className="p-4 border-t border-[#E9E5E4] flex flex-wrap items-center justify-between gap-3 text-xs text-[#667085] bg-[#FFFDFB]">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-white border border-[#E9E5E4] rounded text-xs text-[#182033] focus:outline-none focus:border-[#E85D8A]"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span>
              Page {currentPage} of {totalPages} ({total} total)
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-[#E9E5E4] hover:bg-[#FFF7F4] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-[#E9E5E4] hover:bg-[#FFF7F4] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

