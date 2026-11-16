'use client';

import React from 'react';
import { Webhook, Play, ChevronRight, Plus, ArrowDown } from 'lucide-react';
import { WorkflowTrigger } from '../../types/workflow';

interface TriggerCanvasNodeProps {
  trigger: WorkflowTrigger;
  onClick: () => void;
}

export const TriggerCanvasNode: React.FC<TriggerCanvasNodeProps> = ({
  trigger,
  onClick,
}) => {
  const isWebhook = trigger.type === 'webhook';

  return (
    <div className="flex flex-col items-center select-none animate-fadeIn">
      {/* Trigger Card Node */}
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        className="w-80 sm:w-96 bg-white border border-[#E9E5E4] hover:border-[#E85D8A] rounded-2xl p-4 shadow-xs hover:shadow-md transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[#E85D8A]/20"
      >
        {/* Node Top Header: Tag & Status */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F2F4F7]">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#98A2B3] bg-[#F2F4F7] px-2 py-0.5 rounded-md">
              1. Trigger
            </span>
            <span className="text-xs font-semibold text-[#667085]">
              {isWebhook ? 'Webhook' : 'Manual'}
            </span>
          </div>

          {/* Trigger Enabled/Disabled Status Badge */}
          {trigger.enabled ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EAF7F0] text-[#22A06B] border border-[#22A06B]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B]" />
              Enabled
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F2F4F7] text-[#667085] border border-[#E9E5E4]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#98A2B3]" />
              Disabled
            </span>
          )}
        </div>

        {/* Node Main Info */}
        <div className="flex items-center justify-between pt-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isWebhook
                  ? 'bg-[#F8DCE5] text-[#E85D8A]'
                  : 'bg-[#E0E7FF] text-[#4F46E5]'
              }`}
            >
              {isWebhook ? (
                <Webhook className="w-5 h-5" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </div>

            <div className="min-w-0">
              <h4 className="text-sm font-bold text-[#182033] group-hover:text-[#E85D8A] transition-colors truncate">
                {trigger.name}
              </h4>
              <p className="text-xs text-[#667085] truncate mt-0.5">
                {isWebhook ? 'Method: POST • Webhook Received' : 'Starts manually on demand'}
              </p>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#98A2B3] group-hover:text-[#182033] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
        </div>
      </div>

      {/* Downward Connection Line & Indicator */}
      <div className="flex flex-col items-center">
        <div className="w-0.5 h-8 bg-[#CBD5E1]" />
        <div className="w-6 h-6 rounded-full bg-white border border-[#CBD5E1] text-[#667085] flex items-center justify-center -my-1 shadow-2xs z-10">
          <ArrowDown className="w-3.5 h-3.5" />
        </div>
        <div className="w-0.5 h-8 bg-[#CBD5E1]" />
      </div>

      {/* Action Area Placeholder (Section 6 & 28: Clean foundation for future Action modules) */}
      <div className="w-80 sm:w-96 border-2 border-dashed border-[#D0D5DD] rounded-2xl p-4 bg-white/70 flex items-center justify-center gap-2 text-[#667085] hover:border-[#98A2B3] transition-colors">
        <Plus className="w-4 h-4 text-[#98A2B3]" />
        <span className="text-xs font-semibold text-[#475467]">
          Add Action Step (Next Module)
        </span>
      </div>
    </div>
  );
};
