'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, GitBranch, ArrowRight } from 'lucide-react';
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
  const { folders, activeFolder, createWorkflow } = useWorkflowStore();
  const [name, setName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(
    activeFolder === 'Trash' ? 'Home' : activeFolder
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    const newWf = createWorkflow({
      name: cleanName,
      folder: selectedFolder,
    });

    setName('');
    onClose();
    router.push(`/workflows/${newWf.id}`);
  };

  const availableFolders = folders.filter((f) => f !== 'Trash');

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
            className="text-[#667085] hover:text-[#182033] p-1.5 rounded-lg hover:bg-[#FFF7F4]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#182033] mb-1.5">
              Workflow Name
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lead Capture to Google Sheets"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E9E5E4] rounded-lg text-[#182033] placeholder-[#98A2B3] focus:outline-none focus:border-[#E85D8A] focus:ring-1 focus:ring-[#E85D8A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#182033] mb-1.5">
              Folder
            </label>
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E9E5E4] rounded-lg text-[#182033] focus:outline-none focus:border-[#E85D8A] focus:ring-1 focus:ring-[#E85D8A]"
            >
              {availableFolders.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E9E5E4]">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!name.trim()}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

