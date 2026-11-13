'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MoreVertical,
  Power,
  Trash2,
  Edit2,
  History,
  RotateCcw,
} from 'lucide-react';
import { useWorkflowStore, WorkflowItem } from '../../store/workflowStore';

interface WorkflowActionMenuProps {
  workflow: WorkflowItem;
}

export const WorkflowActionMenu: React.FC<WorkflowActionMenuProps> = ({ workflow }) => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { toggleStatus, moveToTrash, restoreFromTrash, deletePermanently, updateWorkflow } =
    useWorkflowStore();

  const isTrash = workflow.folder === 'Trash';

  const handleToggle = () => {
    toggleStatus(workflow.id);
    setIsOpen(false);
  };

  const handleRename = () => {
    const newName = window.prompt('Enter new workflow name:', workflow.name);
    if (newName && newName.trim()) {
      updateWorkflow(workflow.id, { name: newName.trim() });
    }
    setIsOpen(false);
  };

  const handleMoveTrash = () => {
    moveToTrash(workflow.id);
    setIsOpen(false);
  };

  const handleRestore = () => {
    restoreFromTrash(workflow.id);
    setIsOpen(false);
  };

  const handleDeletePermanent = () => {
    if (window.confirm(`Permanently delete "${workflow.name}"?`)) {
      deletePermanently(workflow.id);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Workflow actions"
        className="p-1.5 rounded-lg text-[#667085] hover:text-[#182033] hover:bg-[#FFF7F4] transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-dropdown border border-[#E9E5E4] py-1 z-40 text-xs font-medium animate-scaleUp">
            {!isTrash ? (
              <>
                <button
                  onClick={handleToggle}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[#344054] hover:bg-[#FFF7F4] hover:text-[#182033]"
                >
                  <Power className="w-3.5 h-3.5 text-[#E85D8A]" />
                  <span>{workflow.status === 'ACTIVE' ? 'Disable Workflow' : 'Enable Workflow'}</span>
                </button>

                <button
                  onClick={handleRename}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[#344054] hover:bg-[#FFF7F4] hover:text-[#182033]"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#667085]" />
                  <span>Rename</span>
                </button>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/history');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[#344054] hover:bg-[#FFF7F4] hover:text-[#182033]"
                >
                  <History className="w-3.5 h-3.5 text-[#667085]" />
                  <span>View History</span>
                </button>

                <div className="border-t border-[#E9E5E4]/60 my-1" />

                <button
                  onClick={handleMoveTrash}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[#D6455D] hover:bg-[#F8DCE5]/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Move to Trash</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleRestore}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[#22A06B] hover:bg-[#EAF7F0]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Workflow</span>
                </button>

                <button
                  onClick={handleDeletePermanent}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[#D6455D] hover:bg-[#F8DCE5]/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Permanently</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

