'use client';

import React from 'react';
import { Webhook, Play, Zap, ArrowRight } from 'lucide-react';
import { TriggerType } from '../../types/workflow';

interface TriggerSelectorProps {
  onSelect: (type: TriggerType) => void;
}

export const TriggerSelector: React.FC<TriggerSelectorProps> = ({ onSelect }) => {
  return (
    <div className="max-w-xl mx-auto w-full bg-white border border-[#E9E5E4] rounded-2xl p-6 sm:p-8 shadow-xs">
      <div className="text-center mb-6">
        <div className="w-10 h-10 rounded-2xl bg-[#FFF7F4] border border-[#F8D8C5] text-[#E85D8A] flex items-center justify-center mx-auto mb-3 shadow-2xs">
          <Zap className="w-5 h-5 stroke-[1.75]" />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-[#182033]">
          Choose a trigger
        </h2>
        <p className="text-xs text-[#667085] mt-1">
          What should start this automation workflow?
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Webhook Option */}
        <button
          type="button"
          onClick={() => onSelect('webhook')}
          className="group relative flex flex-col items-start p-4 bg-[#FFFDFB] hover:bg-[#FFF7F4] border border-[#E9E5E4] hover:border-[#E85D8A]/50 rounded-xl transition-all text-left shadow-2xs hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-[#E85D8A]/20"
        >
          <div className="flex items-center justify-between w-full mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#F8DCE5] text-[#E85D8A] flex items-center justify-center">
              <Webhook className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-[#E9E5E4] text-[#475467]">
              POST
            </span>
          </div>
          <h3 className="text-sm font-bold text-[#182033] group-hover:text-[#E85D8A] transition-colors">
            Webhook
          </h3>
          <p className="text-xs text-[#667085] mt-1 leading-relaxed">
            Start workflow when an incoming HTTP request or JSON payload is received.
          </p>
          <div className="mt-3 flex items-center text-xs font-semibold text-[#E85D8A] gap-1 group-hover:translate-x-0.5 transition-transform">
            <span>Configure Webhook</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Manual Option */}
        <button
          type="button"
          onClick={() => onSelect('manual')}
          className="group relative flex flex-col items-start p-4 bg-[#FFFDFB] hover:bg-[#F0F5FF] border border-[#E9E5E4] hover:border-[#4F46E5]/40 rounded-xl transition-all text-left shadow-2xs hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
        >
          <div className="flex items-center justify-between w-full mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#E0E7FF] text-[#4F46E5] flex items-center justify-center">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-[#E9E5E4] text-[#475467]">
              Instant
            </span>
          </div>
          <h3 className="text-sm font-bold text-[#182033] group-hover:text-[#4F46E5] transition-colors">
            Manual Execution
          </h3>
          <p className="text-xs text-[#667085] mt-1 leading-relaxed">
            Start the workflow manually on demand for testing and validation.
          </p>
          <div className="mt-3 flex items-center text-xs font-semibold text-[#4F46E5] gap-1 group-hover:translate-x-0.5 transition-transform">
            <span>Configure Manual</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>
    </div>
  );
};
