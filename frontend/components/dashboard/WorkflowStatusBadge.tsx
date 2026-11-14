import React from 'react';
import { WorkflowStatus } from '../../types/workflow';

interface WorkflowStatusBadgeProps {
  status: WorkflowStatus;
}

export const WorkflowStatusBadge: React.FC<WorkflowStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'ACTIVE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAF7F0] text-[#22A06B] border border-[#22A06B]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B]" />
          Active
        </span>
      );
    case 'INACTIVE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F2F4F7] text-[#667085] border border-[#E9E5E4]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#98A2B3]" />
          Inactive
        </span>
      );
    case 'DRAFT':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF0D8] text-[#E59A23] border border-[#E59A23]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E59A23]" />
          Draft
        </span>
      );
    default:
      return null;
  }
};
