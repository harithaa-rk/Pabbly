'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Play,
  Layers,
  ListTree,
  MoreVertical,
  Check,
  Pencil,
  Download,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { BuilderMode, WorkflowItem } from '../../store/workflowStore';
import { cn } from '../../lib/utils';

interface WorkflowEditorHeaderProps {
  workflow: WorkflowItem;
  mode: BuilderMode;
  onModeChange: (mode: BuilderMode) => void;
  onNameChange: (newName: string) => void;
  onToggleStatus: () => void;
  onSave: () => void;
  onTest: () => void;
  onResetLayout?: () => void;
  isSaving?: boolean;
}

export const WorkflowEditorHeader: React.FC<WorkflowEditorHeaderProps> = ({
  workflow,
  mode,
  onModeChange,
  onNameChange,
  onToggleStatus,
  onSave,
  onTest,
  onResetLayout,
  isSaving = false,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(workflow.name);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameValue(workflow.name);
  }, [workflow.name]);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFinishEditing = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== workflow.name) {
      onNameChange(trimmed);
    } else {
      setNameValue(workflow.name);
    }
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishEditing();
    } else if (e.key === 'Escape') {
      setNameValue(workflow.name);
      setIsEditingName(false);
    }
  };

  const triggerSaveWithFeedback = () => {
    onSave();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const isActive = workflow.status === 'ACTIVE';

  return (
    <header className="h-14 px-3 md:px-5 bg-white border-b border-[#E9E5E4] flex items-center justify-between gap-3 z-20 shrink-0 select-none shadow-2xs">
      {/* Left side: Back button & Workflow Name */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Link
          href="/workflows"
          className="p-1.5 rounded-lg text-[#667085] hover:text-[#182033] hover:bg-[#FFF7F4] transition-colors shrink-0"
          title="Back to Workflows"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="h-4 w-px bg-[#E9E5E4] shrink-0" />

        {/* Workflow Title & Status */}
        <div className="flex items-center gap-2 min-w-0">
          {isEditingName ? (
            <div className="flex items-center gap-1.5">
              <input
                ref={inputRef}
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={handleFinishEditing}
                onKeyDown={handleKeyDown}
                className="text-xs md:text-sm font-bold text-[#182033] bg-[#FFF7F4] border border-[#E85D8A] rounded-md px-2 py-0.5 outline-none min-w-[180px]"
                maxLength={80}
              />
              <button
                type="button"
                onClick={handleFinishEditing}
                className="p-1 rounded-md text-[#22A06B] hover:bg-[#EAF7F0]"
                title="Save name"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingName(true)}
              className="group flex items-center gap-1.5 cursor-pointer py-1 px-1.5 rounded-md hover:bg-[#FFF7F4] transition-colors min-w-0"
              title="Click to rename workflow"
            >
              <h1 className="text-xs md:text-sm font-bold text-[#182033] truncate max-w-[180px] md:max-w-xs">
                {workflow.name}
              </h1>
              <Pencil className="w-3 h-3 text-[#667085] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          )}

          {/* Status Badge */}
          <span
            className={cn(
              'text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0',
              isActive
                ? 'bg-[#EAF7F0] text-[#22A06B] border-[#22A06B]/25'
                : 'bg-[#F2F4F7] text-[#667085] border-[#D0D5DD]'
            )}
          >
            {workflow.status}
          </span>
        </div>
      </div>

      {/* Center: Builder Mode Switcher */}
      <div className="hidden sm:flex items-center p-0.5 bg-[#FFF7F4] border border-[#E9E5E4] rounded-lg">
        <button
          type="button"
          onClick={() => onModeChange('visual')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all',
            mode === 'visual'
              ? 'bg-white text-[#182033] shadow-2xs border border-[#E9E5E4]'
              : 'text-[#667085] hover:text-[#182033]'
          )}
        >
          <Layers className="w-3 h-3 text-[#E85D8A]" />
          <span>Visual Canvas</span>
        </button>

        <button
          type="button"
          onClick={() => onModeChange('manual')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all',
            mode === 'manual'
              ? 'bg-white text-[#182033] shadow-2xs border border-[#E9E5E4]'
              : 'text-[#667085] hover:text-[#182033]'
          )}
        >
          <ListTree className="w-3 h-3 text-[#E85D8A]" />
          <span>Manual Steps</span>
        </button>
      </div>

      {/* Right side: Actions, Toggle Switch & More Options */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Active/Inactive Toggle Switch */}
        <div className="flex items-center gap-1.5 pl-1 pr-1.5 py-0.5 bg-[#FFF7F4] rounded-lg border border-[#E9E5E4]">
          <span className="text-[10px] font-medium text-[#667085] hidden md:inline">
            Status
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={onToggleStatus}
            className={cn(
              'w-8 h-4 rounded-full transition-colors relative focus:outline-none focus:ring-1 focus:ring-[#E85D8A]',
              isActive ? 'bg-[#22A06B]' : 'bg-[#D0D5DD]'
            )}
            title={isActive ? 'Deactivate Workflow' : 'Activate Workflow'}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow-xs',
                isActive ? 'translate-x-4' : 'translate-x-0'
              )}
            />
          </button>
        </div>

        {/* Test Workflow Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onTest}
          leftIcon={<Play className="w-3 h-3 text-[#22A06B]" />}
          className="hidden sm:inline-flex border-[#E9E5E4] hover:bg-[#FFF7F4] h-8 text-xs py-1"
        >
          Test
        </Button>

        {/* Save Workflow Button */}
        <Button
          variant="primary"
          size="sm"
          onClick={triggerSaveWithFeedback}
          disabled={isSaving}
          leftIcon={
            justSaved ? (
              <Check className="w-3 h-3 text-white" />
            ) : (
              <Save className="w-3 h-3 text-white" />
            )
          }
          className="bg-[#E85D8A] hover:bg-[#D64B78] text-white shadow-xs h-8 text-xs py-1 min-w-[68px]"
        >
          {justSaved ? 'Saved' : 'Save'}
        </Button>

        {/* More Options Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="p-1.5 rounded-lg text-[#667085] hover:text-[#182033] hover:bg-[#FFF7F4] border border-[#E9E5E4] transition-colors"
            title="More Options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {showMoreMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-[#E9E5E4] py-1 z-50 text-xs">
              {/* Mobile mode switcher */}
              <div className="sm:hidden px-3 py-1.5 border-b border-[#E9E5E4] mb-1">
                <span className="text-[10px] uppercase font-bold text-[#667085] block mb-1">
                  Builder Mode
                </span>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onModeChange('visual');
                      setShowMoreMenu(false);
                    }}
                    className={cn(
                      'py-1 text-center rounded text-[11px] font-semibold',
                      mode === 'visual' ? 'bg-[#FFF7F4] text-[#E85D8A]' : 'text-[#667085]'
                    )}
                  >
                    Visual
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onModeChange('manual');
                      setShowMoreMenu(false);
                    }}
                    className={cn(
                      'py-1 text-center rounded text-[11px] font-semibold',
                      mode === 'manual' ? 'bg-[#FFF7F4] text-[#E85D8A]' : 'text-[#667085]'
                    )}
                  >
                    Manual
                  </button>
                </div>
              </div>

              {onResetLayout && (
                <button
                  type="button"
                  onClick={() => {
                    onResetLayout();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[#182033] hover:bg-[#FFF7F4] flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#667085]" />
                  <span>Align Workflow Layout</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(workflow, null, 2));
                  setShowMoreMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-[#182033] hover:bg-[#FFF7F4] flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-[#667085]" />
                <span>Export Workflow JSON</span>
              </button>

              <Link
                href="/history"
                className="w-full text-left px-3 py-1.5 text-[#182033] hover:bg-[#FFF7F4] flex items-center gap-2"
                onClick={() => setShowMoreMenu(false)}
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#667085]" />
                <span>View Execution Logs</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
