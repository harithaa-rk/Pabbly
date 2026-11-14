'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { WorkflowToolbar } from '../../../components/dashboard/WorkflowToolbar';
import { WorkflowTable } from '../../../components/dashboard/WorkflowTable';
import { CreateWorkflowModal } from '../../../components/dashboard/CreateWorkflowModal';
import { Button } from '../../../components/ui/Button';

export default function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Main Dashboard Action Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#182033]">
              Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-[#667085] mt-0.5">
              Create and manage all of your automation workflows in one place.
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

        {/* Workflow Management Panel (Clean UI: Real database data, no fake metrics) */}
        <div className="bg-white border border-[#E9E5E4] rounded-2xl shadow-xs overflow-hidden">
          {/* Panel Header */}
          <div className="px-6 py-4 border-b border-[#E9E5E4] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#182033]">
              Workflows
            </h2>
          </div>

          {/* Workflow Toolbar & Live Table */}
          <div className="flex flex-col min-w-0">
            <WorkflowToolbar />
            <WorkflowTable onCreateClick={() => setModalOpen(true)} />
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
