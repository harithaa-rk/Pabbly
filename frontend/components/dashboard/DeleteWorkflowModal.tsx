'use client';

import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface DeleteWorkflowModalProps {
  isOpen: boolean;
  workflowName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteWorkflowModal: React.FC<DeleteWorkflowModalProps> = ({
  isOpen,
  workflowName,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-[#E9E5E4] p-5 animate-scaleUp">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#182033]">Delete Workflow</h3>
            <p className="text-xs text-[#667085]">This action cannot be undone.</p>
          </div>
        </div>

        <p className="text-xs text-[#475467] mb-5">
          Are you sure you want to permanently delete{' '}
          <span className="font-semibold text-[#182033]">"{workflowName}"</span>? All
          associated steps and configurations will be removed.
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={onConfirm}
            disabled={isDeleting}
            leftIcon={isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : undefined}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
};

