'use client';

import React, { useState } from 'react';
import { History as HistoryIcon, Filter, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { cn } from '../../../lib/utils';

export default function HistoryPage() {
  const [filter, setFilter] = useState<'ALL' | 'COMPLETED' | 'FAILED' | 'DELAYED'>('ALL');

  const tabs: Array<{ label: string; value: 'ALL' | 'COMPLETED' | 'FAILED' | 'DELAYED' }> = [
    { label: 'All', value: 'ALL' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Failed', value: 'FAILED' },
    { label: 'Delayed', value: 'DELAYED' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#182033]">
            Execution History
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Monitor real-time workflow runs, step traces, and execution status.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 border-b border-[#E9E5E4] pb-3 text-xs font-semibold select-none">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-colors',
                filter === tab.value
                  ? 'bg-[#182033] text-white shadow-xs'
                  : 'text-[#667085] hover:text-[#182033] hover:bg-[#FFF7F4]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Clean Empty State */}
        <div className="bg-white border border-[#E9E5E4] rounded-2xl p-16 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF7F4] border border-[#F8D8C5] text-[#E85D8A] flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
            <HistoryIcon className="w-6 h-6 stroke-[1.75]" />
          </div>
          <h3 className="text-base font-bold text-[#182033] mb-1">
            No execution history yet
          </h3>
          <p className="text-xs text-[#667085] max-w-sm mx-auto">
            When your workflows are triggered, detailed execution records and payload logs will appear here.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

