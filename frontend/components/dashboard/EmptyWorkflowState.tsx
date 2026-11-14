import React from 'react';
import { GitBranch, Plus } from 'lucide-react';
import { Button } from '../ui/Button';

interface EmptyWorkflowStateProps {
  onCreateClick: () => void;
  isFiltered?: boolean;
  onClearFilters?: () => void;
}

export const EmptyWorkflowState: React.FC<EmptyWorkflowStateProps> = ({
  onCreateClick,
  isFiltered,
  onClearFilters,
}) => {
  if (isFiltered) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#FFF7F4] border border-[#F8D8C5] text-[#E85D8A] flex items-center justify-center mb-3.5 shadow-2xs">
          <GitBranch className="w-6 h-6 stroke-[1.75]" />
        </div>
        <h3 className="text-base font-bold text-[#182033] mb-1">
          No matching workflows found
        </h3>
        <p className="text-xs text-[#667085] max-w-sm mb-4">
          Try adjusting your search query or status filter.
        </p>
        {onClearFilters && (
          <Button onClick={onClearFilters} variant="outline" size="sm">
            Reset Filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[#FFF7F4] border border-[#F8D8C5] text-[#E85D8A] flex items-center justify-center mb-3.5 shadow-2xs">
        <GitBranch className="w-6 h-6 stroke-[1.75]" />
      </div>
      <h3 className="text-base font-bold text-[#182033] mb-1">
        No workflows yet
      </h3>
      <p className="text-xs text-[#667085] max-w-sm mb-5">
        Create your first workflow to start automating tasks.
      </p>
      <Button
        onClick={onCreateClick}
        variant="primary"
        size="md"
        leftIcon={<Plus className="w-4 h-4" />}
      >
        Create Workflow
      </Button>
    </div>
  );
};
