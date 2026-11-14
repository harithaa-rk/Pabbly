'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, GitBranch, Loader2 } from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { Button } from '../ui/Button';

interface CreateWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateWorkflowModal: React.FC<CreateWorkflowModalProps> = ({
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const { createWorkflow } = useWorkflowStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Workflow name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newWf = await createWorkflow({
        name: cleanName,
        description: description.trim() || undefined,
      });

      setName('');
      setDescription('');
      onClose();
      router.push(`/workflows/${newWf.id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create workflow. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E9E5E4] overflow-hidden animate-scaleUp">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E9E5E4]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#F8DCE5] text-[#E85D8A] flex items-center justify-center">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#182033]">Create Workflow</h3>
              <p className="text-xs text-[#667085]">Start automating your application tasks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-[#667085] hover:text-[#182033] p-1.5 rounded-lg hover:bg-[#FFF7F4] disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#182033] mb-1.5">
              Workflow Name <span className="text-[#E85D8A]">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Lead Capture to Google Sheets"
              maxLength={100}
              required
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E9E5E4] rounded-lg text-[#182033] placeholder-[#98A2B3] focus:outline-none focus:border-[#E85D8A] focus:ring-1 focus:ring-[#E85D8A] disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#182033] mb-1.5">
              Description <span className="text-xs font-normal text-[#98A2B3]">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of what this workflow accomplishes"
              rows={3}
              maxLength={500}
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E9E5E4] rounded-lg text-[#182033] placeholder-[#98A2B3] focus:outline-none focus:border-[#E85D8A] focus:ring-1 focus:ring-[#E85D8A] disabled:bg-slate-50 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E9E5E4]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !name.trim()}
              leftIcon={isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : undefined}
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
