'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { UsageCards } from '../../../components/dashboard/UsageCards';
import { FolderSidebar } from '../../../components/dashboard/FolderSidebar';
import { WorkflowToolbar } from '../../../components/dashboard/WorkflowToolbar';
import { WorkflowTable } from '../../../components/dashboard/WorkflowTable';
import { CreateWorkflowModal } from '../../../components/dashboard/CreateWorkflowModal';
import { Button } from '../../../components/ui/Button';

export default function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Main Dashboard Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#182033]">
              Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-[#667085] mt-0.5">
              Create & manage all of your automation workflows in one place.
            </p>
          </div>

          <div>
            <Button
              onClick={() => setModalOpen(true)}
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Workflow
            </Button>
          </div>
        </div>

        {/* Statistics Row: 4 Neutral / Real Cards */}
        <UsageCards
          tasksAllotted={0}
          tasksConsumed={0}
          tasksRemaining={0}
          freeTasksConsumed={0}
        />

        {/* Workflow Management Panel */}
        <div className="bg-white border border-[#E9E5E4] rounded-2xl shadow-xs overflow-hidden">
          {/* Panel Header */}
          <div className="px-6 py-4 border-b border-[#E9E5E4] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#182033]">
              Workflows
            </h2>
          </div>

          {/* Two-Column Folders + Workflows Panel */}
          <div className="flex flex-col md:flex-row">
            <FolderSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <WorkflowToolbar />
              <WorkflowTable onCreateClick={() => setModalOpen(true)} />
            </div>
          </div>
        </div>

        {/* Create Workflow Modal */}
        <CreateWorkflowModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      </div>
    </DashboardLayout>
  );
}
