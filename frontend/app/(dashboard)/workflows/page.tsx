'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { WorkflowToolbar } from '../../../components/dashboard/WorkflowToolbar';
import { WorkflowTable } from '../../../components/dashboard/WorkflowTable';
import { CreateWorkflowModal } from '../../../components/dashboard/CreateWorkflowModal';
import { Button } from '../../../components/ui/Button';

export default function WorkflowsPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#182033]">
              Workflows
            </h1>
            <p className="text-xs sm:text-sm text-[#667085] mt-0.5">
              Manage your active, inactive, and draft automations.
            </p>
          </div>

          <Button
            onClick={() => setModalOpen(true)}
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Workflow
          </Button>
        </div>

        {/* Workflow Management Panel */}
        <div className="bg-white border border-[#E9E5E4] rounded-2xl shadow-xs overflow-hidden flex flex-col min-w-0">
          <WorkflowToolbar />
          <WorkflowTable onCreateClick={() => setModalOpen(true)} />
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
