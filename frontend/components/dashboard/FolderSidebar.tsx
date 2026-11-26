'use client';

import React, { useState } from 'react';
import { Folder, Trash2, Plus, FolderPlus, Check, X } from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { cn } from '../../lib/utils';

export const FolderSidebar: React.FC = () => {
  const { folders, activeFolder, setActiveFolder, addFolder, workflows } = useWorkflowStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const getFolderCount = (folderName: string) => {
    if (folderName === 'Trash') {
      return workflows.filter((w) => w.folder === 'Trash').length;
    }
    return workflows.filter((w) => w.folder === folderName).length;
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      addFolder(newFolderName.trim());
      setNewFolderName('');
      setIsAdding(false);
    }
  };

  return (
    <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-[#E9E5E4] p-4 flex flex-col shrink-0 select-none bg-[#FFFDFB]">
      <div className="flex items-center justify-between mb-3 px-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#667085]">
          Folders
        </h4>
        <button
          onClick={() => setIsAdding(!isAdding)}
          title="Create New Folder"
          className="p-1 rounded-md text-[#667085] hover:text-[#E85D8A] hover:bg-[#FFF7F4] transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Inline Create Folder Input */}
      {isAdding && (
        <form onSubmit={handleCreateFolder} className="mb-3 p-2 bg-[#FFF7F4] border border-[#E9E5E4] rounded-lg">
          <input
            type="text"
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name..."
            className="w-full px-2 py-1 text-xs bg-white border border-[#E9E5E4] rounded text-[#182033] focus:outline-none focus:border-[#E85D8A]"
          />
          <div className="flex items-center justify-end gap-1 mt-1.5">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewFolderName('');
              }}
              className="p-1 text-[#667085] hover:text-[#D6455D]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              type="submit"
              disabled={!newFolderName.trim()}
              className="px-2 py-0.5 bg-[#E85D8A] text-white rounded text-[11px] font-medium disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </form>
      )}

      {/* Folder Navigation */}
      <div className="space-y-1">
        {folders.map((folderName) => {
          const isSelected = activeFolder === folderName;
          const isTrash = folderName === 'Trash';
          const count = getFolderCount(folderName);
          const Icon = isTrash ? Trash2 : Folder;

          return (
            <button
              key={folderName}
              onClick={() => setActiveFolder(folderName)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all',
                isSelected
                  ? 'bg-[#F8DCE5] text-[#182033] font-semibold shadow-2xs'
                  : 'text-[#344054] hover:bg-[#FFF7F4] hover:text-[#182033]'
              )}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0',
                    isSelected ? 'text-[#E85D8A]' : 'text-[#667085]'
                  )}
                />
                <span className="truncate">{folderName}</span>
              </div>
              <span
                className={cn(
                  'text-[11px] px-1.5 py-0.2 rounded-full font-normal',
                  isSelected ? 'bg-white/80 text-[#182033]' : 'text-[#98A2B3]'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
