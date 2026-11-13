'use client';

import React, { useState } from 'react';
import { Search, Filter, Check, ChevronDown, AlignJustify } from 'lucide-react';
import { useWorkflowStore, WorkflowStatus } from '../../store/workflowStore';
import { cn } from '../../lib/utils';

export const WorkflowToolbar: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    isDense,
    toggleDenseMode,
  } = useWorkflowStore();

  const [filterOpen, setFilterOpen] = useState(false);

  const filterOptions: Array<{ label: string; value: 'ALL' | WorkflowStatus }> = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
    { label: 'Draft', value: 'DRAFT' },
  ];

  return (
    <div className="p-4 border-b border-[#E9E5E4] flex flex-wrap items-center justify-between gap-3 bg-[#FFFDFB]">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667085]">
          <Search className="w-3.5 h-3.5" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search workflows..."
          className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E9E5E4] rounded-lg text-[#182033] placeholder-[#98A2B3] focus:outline-none focus:border-[#E85D8A]"
        />
      </div>

      {/* Filter and Dense Toggle */}
      <div className="flex items-center gap-2">
        {/* Status Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              statusFilter !== 'ALL'
                ? 'bg-[#F8DCE5] border-[#E85D8A]/40 text-[#182033]'
                : 'bg-white border-[#E9E5E4] text-[#344054] hover:bg-[#FFF7F4]'
            )}
          >
            <Filter className="w-3.5 h-3.5 text-[#667085]" />
            <span>
              {statusFilter === 'ALL'
                ? 'Filters'
                : filterOptions.find((f) => f.value === statusFilter)?.label}
            </span>
            <ChevronDown className="w-3 h-3 text-[#667085]" />
          </button>

          {filterOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setFilterOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-dropdown border border-[#E9E5E4] py-1 z-40 text-xs animate-scaleUp">
                {filterOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setStatusFilter(opt.value);
                      setFilterOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-left text-[#344054] hover:bg-[#FFF7F4] hover:text-[#182033]"
                  >
                    <span>{opt.label}</span>
                    {statusFilter === opt.value && (
                      <Check className="w-3.5 h-3.5 text-[#E85D8A]" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Dense Toggle */}
        <button
          onClick={toggleDenseMode}
          title={isDense ? 'Standard View' : 'Dense View'}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
            isDense
              ? 'bg-[#182033] text-white border-[#182033]'
              : 'bg-white border-[#E9E5E4] text-[#344054] hover:bg-[#FFF7F4]'
          )}
        >
          <AlignJustify className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Dense</span>
        </button>
      </div>
    </div>
  );
};

