'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Power,
  Copy,
  Trash2,
  GitBranch,
  Loader2,
  AlertCircle,
  Check,
} from 'lucide-react';
import { DashboardLayout } from '../../../../components/layout/DashboardLayout';
import { WorkflowService } from '../../../../services/workflowService';
import {
  Workflow,
  WorkflowStatus,
  TriggerType,
  SaveTriggerInput,
} from '../../../../types/workflow';
import { WorkflowStatusBadge } from '../../../../components/dashboard/WorkflowStatusBadge';
import { DeleteWorkflowModal } from '../../../../components/dashboard/DeleteWorkflowModal';
import { TriggerSelector } from '../../../../components/workflow/TriggerSelector';
import { TriggerCanvasNode } from '../../../../components/workflow/TriggerCanvasNode';
import { TriggerDrawer } from '../../../../components/workflow/TriggerDrawer';
import { Button } from '../../../../components/ui/Button';
import { useToast } from '../../../../hooks/useToast';
import { extractErrorMessage } from '../../../../lib/api';

export default function WorkflowEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const workflowId = params.id as string;

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [deletingModalOpen, setDeletingModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editable workflow metadata
  const [name, setName] = useState('');
  const [hasNameChanged, setHasNameChanged] = useState(false);

  // Trigger drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTriggerType, setSelectedTriggerType] = useState<TriggerType>('webhook');

  useEffect(() => {
    let isMounted = true;

    async function loadWorkflow() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const data = await WorkflowService.getWorkflowById(workflowId);
        if (isMounted) {
          setWorkflow(data);
          setName(data.name);
          setHasNameChanged(false);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(extractErrorMessage(err));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (workflowId) {
      loadWorkflow();
    }

    return () => {
      isMounted = false;
    };
  }, [workflowId]);

  // Handle saving workflow name changes
  const handleSaveName = async () => {
    if (!name.trim()) {
      toastError('Workflow name cannot be empty');
      return;
    }

    setSavingName(true);
    try {
      const updated = await WorkflowService.updateWorkflow(workflowId, {
        name: name.trim(),
      });
      setWorkflow(updated);
      setHasNameChanged(false);
      success('Workflow name updated');
    } catch (err: any) {
      toastError(err?.message || 'Failed to update workflow name');
    } finally {
      setSavingName(false);
    }
  };

  // Toggle workflow lifecycle status (ACTIVE / INACTIVE)
  const handleToggleWorkflowStatus = async () => {
    if (!workflow) return;
    setStatusUpdating(true);
    const nextStatus: WorkflowStatus = workflow.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const updated = await WorkflowService.updateStatus(workflow.id, nextStatus);
      setWorkflow(updated);
      success(`Workflow is now ${nextStatus.toLowerCase()}`);
    } catch (err: any) {
      toastError(err?.message || 'Failed to update workflow status');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Duplicate workflow
  const handleDuplicate = async () => {
    if (!workflow) return;
    setDuplicating(true);
    try {
      const duplicated = await WorkflowService.duplicateWorkflow(workflow.id);
      success(`Workflow duplicated as "${duplicated.name}"`);
      router.push(`/workflows/${duplicated.id}`);
    } catch (err: any) {
      toastError(err?.message || 'Failed to duplicate workflow');
      setDuplicating(false);
    }
  };

  // Delete workflow
  const handleDelete = async () => {
    if (!workflow) return;
    setDeleting(true);
    try {
      await WorkflowService.deleteWorkflow(workflow.id);
      success('Workflow deleted successfully');
      router.push('/workflows');
    } catch (err: any) {
      toastError(err?.message || 'Failed to delete workflow');
      setDeleting(false);
      setDeletingModalOpen(false);
    }
  };

  // Trigger operations (Module 5)
  const handleSelectTriggerType = (type: TriggerType) => {
    setSelectedTriggerType(type);
    setDrawerOpen(true);
  };

  const handleOpenExistingTrigger = () => {
    if (workflow?.trigger) {
      setSelectedTriggerType(workflow.trigger.type);
      setDrawerOpen(true);
    }
  };

  const handleSaveTrigger = async (data: SaveTriggerInput) => {
    const updated = await WorkflowService.saveTrigger(workflowId, data);
    setWorkflow(updated);
    success('Trigger configured and saved to database');
  };

  const handleToggleTriggerStatus = async (enabled: boolean) => {
    const updated = await WorkflowService.updateTriggerStatus(workflowId, enabled);
    setWorkflow(updated);
    success(`Trigger ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleRemoveTrigger = async () => {
    const updated = await WorkflowService.removeTrigger(workflowId);
    setWorkflow(updated);
    success('Trigger removed from workflow');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#E85D8A] mb-3" />
          <p className="text-xs font-medium text-[#667085]">Loading workflow editor...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (errorMessage || !workflow) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto my-16 bg-white border border-[#E9E5E4] rounded-2xl p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[#182033] mb-1">Workflow Not Found</h2>
          <p className="text-xs text-[#667085] mb-6">
            {errorMessage || 'The requested workflow does not exist or you do not have permission to view it.'}
          </p>
          <Button
            onClick={() => router.push('/workflows')}
            variant="primary"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Workflows
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Top Workflow Editor Navigation Bar */}
        <div className="bg-white border border-[#E9E5E4] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link
              href="/workflows"
              className="p-2 rounded-xl text-[#667085] hover:text-[#182033] hover:bg-[#FFF7F4] border border-[#E9E5E4] transition-colors shrink-0"
              title="Back to Workflows"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            {/* Editable Workflow Name */}
            <div className="flex items-center gap-2 min-w-0 max-w-md">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setHasNameChanged(e.target.value !== workflow.name);
                }}
                onBlur={() => {
                  if (hasNameChanged && name.trim()) {
                    handleSaveName();
                  }
                }}
                maxLength={100}
                className="text-base sm:text-lg font-bold text-[#182033] bg-transparent hover:bg-[#FFFDFB] focus:bg-white border border-transparent hover:border-[#E9E5E4] focus:border-[#E85D8A] focus:outline-none rounded-lg px-2 py-1 transition-all truncate"
                placeholder="Workflow Name"
              />
              {hasNameChanged && (
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={savingName || !name.trim()}
                  className="p-1.5 rounded-lg bg-[#E85D8A] text-white hover:bg-[#D94C79] transition-colors shrink-0"
                  title="Save Name"
                >
                  {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <WorkflowStatusBadge status={workflow.status} />
              <span className="text-[11px] font-semibold text-[#475467] bg-[#F2F4F7] px-2 py-0.5 rounded-md">
                v{workflow.version}
              </span>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleWorkflowStatus}
              disabled={statusUpdating}
              leftIcon={<Power className="w-3.5 h-3.5 text-[#E85D8A]" />}
            >
              {workflow.status === 'ACTIVE' ? 'Pause' : 'Activate'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDuplicate}
              disabled={duplicating}
              leftIcon={<Copy className="w-3.5 h-3.5 text-[#667085]" />}
            >
              Duplicate
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingModalOpen(true)}
              className="text-red-600 hover:bg-red-50 hover:border-red-200"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Workflow Editor Canvas Area */}
        <div className="relative min-h-[580px] bg-[#FFFDFB] border border-[#E9E5E4] rounded-2xl p-6 sm:p-12 flex flex-col items-center justify-center shadow-2xs overflow-hidden">
          {/* Subtle canvas grid pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.4]"
            style={{
              backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          <div className="relative z-10 w-full flex flex-col items-center">
            {workflow.trigger ? (
              <TriggerCanvasNode
                trigger={workflow.trigger}
                onClick={handleOpenExistingTrigger}
              />
            ) : (
              <TriggerSelector onSelect={handleSelectTriggerType} />
            )}
          </div>
        </div>

        {/* Trigger Configuration Drawer (Slide-Over) */}
        <TriggerDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          triggerType={selectedTriggerType}
          existingTrigger={workflow.trigger}
          onSave={handleSaveTrigger}
          onToggleStatus={handleToggleTriggerStatus}
          onRemove={handleRemoveTrigger}
        />

        {/* Delete Confirmation Modal */}
        <DeleteWorkflowModal
          isOpen={deletingModalOpen}
          workflowName={workflow.name}
          isDeleting={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeletingModalOpen(false)}
        />
      </div>
    </DashboardLayout>
  );
}
