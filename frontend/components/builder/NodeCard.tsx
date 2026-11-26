'use client';

import React from 'react';
import {
  Zap,
  Play,
  Plus,
  Trash2,
  Copy,
  ChevronRight,
  GripVertical,
  Layers,
  Edit2,
  CheckCircle2,
  Webhook,
  Mail,
  GitBranch,
} from 'lucide-react';
import { WorkflowNode } from '../../store/workflowStore';
import { cn } from '../../lib/utils';

interface NodeCardProps {
  node: WorkflowNode;
  isSelected?: boolean;
  onSelect?: () => void;
  onSelectApp?: () => void;
  onAddNextStep?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  canDelete?: boolean;
  isDragging?: boolean;
  onMouseDownDrag?: (e: React.MouseEvent) => void;
}

export const NodeCard: React.FC<NodeCardProps> = ({
  node,
  isSelected = false,
  onSelect,
  onSelectApp,
  onAddNextStep,
  onDelete,
  onDuplicate,
  canDelete = true,
  isDragging = false,
  onMouseDownDrag,
}) => {
  const isTrigger = node.type === 'trigger';
  const isCondition = node.type === 'condition' || node.app === 'Condition';
  const isGmail = node.app === 'Gmail';
  const isConfigured = Boolean(node.status === 'configured' && node.app);

  return (
    <div
      onClick={onSelect}
      className={cn(
        'w-[260px] bg-white rounded-xl border transition-all duration-150 select-none group relative shadow-2xs',
        isSelected
          ? 'border-[#E85D8A] ring-2 ring-[#E85D8A]/25 shadow-md'
          : 'border-[#E9E5E4] hover:border-[#D0C9C7] hover:shadow-xs',
        isDragging && 'shadow-xl ring-2 ring-[#E85D8A]/40 opacity-95 scale-[1.02]'
      )}
    >
      {/* Node Header & Drag Handle */}
      <div
        onMouseDown={onMouseDownDrag}
        className={cn(
          'px-3 py-2 border-b border-[#F0ECE9] flex items-center justify-between rounded-t-xl cursor-grab active:cursor-grabbing transition-colors',
          isTrigger ? 'bg-[#FFFDFB]' : 'bg-[#FAF9F8]'
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical className="w-3.5 h-3.5 text-[#A0AEC0] group-hover:text-[#667085] shrink-0" />

          {/* Minimal Step Badge */}
          <span
            className={cn(
              'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0',
              isTrigger
                ? 'bg-[#FFF0F5] text-[#E85D8A] border border-[#E85D8A]/20'
                : isCondition
                ? 'bg-[#F0FDF4] text-[#22A06B] border border-[#22A06B]/20'
                : isGmail
                ? 'bg-[#FEECEB] text-[#EA4335] border border-[#EA4335]/20'
                : 'bg-[#F0F4FE] text-[#3B66DE] border border-[#3B66DE]/20'
            )}
          >
            {node.stepNumber}. {isTrigger ? 'Trigger' : isCondition ? 'Condition' : 'Action'}
          </span>
        </div>

        {/* Action Controls: Duplicate & Delete */}
        <div className="flex items-center gap-1">
          {!isTrigger && onDuplicate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="p-1 rounded text-[#98A2B3] hover:text-[#182033] hover:bg-[#F2EFE9] transition-colors"
              title="Duplicate this step"
            >
              <Copy className="w-3 h-3" />
            </button>
          )}

          {canDelete && !isTrigger && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="p-1 rounded text-[#98A2B3] hover:text-[#D92D20] hover:bg-[#FEF3F2] transition-colors"
              title="Delete this step"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Node Body */}
      <div className="p-3.5">
        {isConfigured ? (
          /* Configured Node: App Icon, App Name, Event, Edit */
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border',
                    node.app === 'Webhook'
                      ? 'bg-[#FFF0F5] border-[#E85D8A]/30 text-[#E85D8A]'
                      : node.app === 'Gmail'
                      ? 'bg-[#FEECEB] border-[#EA4335]/30 text-[#EA4335]'
                      : node.app === 'Condition'
                      ? 'bg-[#F0FDF4] border-[#22A06B]/30 text-[#22A06B]'
                      : node.app === 'Email'
                      ? 'bg-[#F0F4FE] border-[#3B66DE]/30 text-[#3B66DE]'
                      : 'bg-[#FFF7F4] border-[#F8D8C5] text-[#E85D8A]'
                  )}
                >
                  {node.app === 'Webhook' ? (
                    <Webhook className="w-3.5 h-3.5" />
                  ) : node.app === 'Gmail' ? (
                    <Mail className="w-3.5 h-3.5 text-[#EA4335]" />
                  ) : node.app === 'Condition' ? (
                    <GitBranch className="w-3.5 h-3.5 text-[#22A06B]" />
                  ) : node.app === 'Email' ? (
                    <Mail className="w-3.5 h-3.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22A06B]" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-[#182033] block truncate">
                    {node.app}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectApp?.();
                }}
                className="text-[11px] font-semibold text-[#E85D8A] hover:underline flex items-center gap-0.5"
              >
                <Edit2 className="w-2.5 h-2.5" />
                Edit
              </button>
            </div>
            <p className="text-[11px] text-[#667085] truncate bg-[#FAF9F8] px-2 py-1 rounded-md border border-[#F0ECE9]">
              {node.event || 'Configured Event'}
            </p>
          </div>
        ) : (
          /* Unconfigured Node: Icon, Add Label, Choose App Button */
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border',
                  isTrigger
                    ? 'bg-[#FFF0F5] border-[#E85D8A]/20 text-[#E85D8A]'
                    : isCondition
                    ? 'bg-[#F0FDF4] border-[#22A06B]/20 text-[#22A06B]'
                    : 'bg-[#F0F4FE] border-[#3B66DE]/20 text-[#3B66DE]'
                )}
              >
                {isTrigger ? (
                  <Zap className="w-4 h-4" />
                ) : isCondition ? (
                  <GitBranch className="w-4 h-4 text-[#22A06B]" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </div>
              <span className="text-xs font-bold text-[#182033]">
                {node.title}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectApp?.();
              }}
              className="w-full py-1.5 px-2.5 rounded-lg border border-[#E9E5E4] hover:border-[#E85D8A] hover:bg-[#FFF7F4] text-[11px] font-semibold text-[#182033] hover:text-[#E85D8A] flex items-center justify-between transition-colors group/btn bg-white"
            >
              <span>{isTrigger ? 'Choose Trigger App' : isCondition ? 'Configure Condition' : 'Choose Action / Step'}</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#98A2B3] group-hover/btn:text-[#E85D8A] transition-colors" />
            </button>
          </div>
        )}
      </div>

      {/* Right Edge Add Step (+) Button for Horizontal Chaining */}
      {onAddNextStep && (
        <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddNextStep();
            }}
            className="w-6 h-6 rounded-full bg-[#182033] hover:bg-[#E85D8A] text-white flex items-center justify-center shadow-xs border-2 border-white transition-all transform hover:scale-110 active:scale-95"
            title="Insert Next Step to the Right"
          >
            <Plus className="w-3 h-3 stroke-[2.5]" />
          </button>
        </div>
      )}
    </div>
  );
};
