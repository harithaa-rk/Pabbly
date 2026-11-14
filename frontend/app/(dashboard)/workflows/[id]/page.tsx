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
  Calendar,
  Clock,
  Layers,
  GitBranch,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { DashboardLayout } from '../../../../components/layout/DashboardLayout';
import { WorkflowService } from '../../../../services/workflowService';
import { Workflow, WorkflowStatus } from '../../../../types/workflow';
import { WorkflowStatusBadge } from '../../../../components/dashboard/WorkflowStatusBadge';
import { DeleteWorkflowModal } from '../../../../components/dashboard/DeleteWorkflowModal';
import { Button } from '../../../../components/ui/Button';
import { useToast } from '../../../../hooks/useToast';
import { formatDate } from '../../../../lib/utils';
import { extractErrorMessage } from '../../../../lib/api';

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const workflowId = params.id as string;

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [deletingModalOpen, setDeletingModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

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
          setDescription(data.description || '');
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toastError('Workflow name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const updated = await WorkflowService.updateWorkflow(workflowId, {
        name: name.trim(),
        description: description.trim() || null,
      });
      setWorkflow(updated);
      success('Workflow updated successfully');
    } catch (err: any) {
      toastError(err?.message || 'Failed to update workflow');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!workflow) return;
    setStatusUpdating(true);
    const nextStatus: WorkflowStatus = workflow.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const updated = await WorkflowService.updateStatus(workflow.id, nextStatus);
      setWorkflow(updated);
      success(`Workflow is now ${nextStatus.toLowerCase()}`);
    } catch (err: any) {
      toastError(err?.message || 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#E85D8A] mb-3" />
          <p className="text-xs font-medium text-[#667085]">Loading workflow details...</p>
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
      <div className="space-y-6 max-w-4xl">
        {/* Top Navigation & Action Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-[#E9E5E4] rounded-2xl shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/workflows"
              className="p-2 rounded-xl text-[#667085] hover:text-[#182033] hover:bg-[#FFF7F4] border border-[#E9E5E4] transition-colors"
              title="Back to Workflows"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2.5">
              <span className="text-sm sm:text-base font-bold text-[#182033] truncate max-w-xs sm:max-w-md">
                {workflow.name}
              </span>
              <WorkflowStatusBadge status={workflow.status} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleStatus}
              disabled={statusUpdating}
              leftIcon={<Power className="w-3.5 h-3.5 text-[#E85D8A]" />}
            >
              {workflow.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
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

        {/* Workflow Details & Edit Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Edit Column */}
          <div className="md:col-span-2 bg-white border border-[#E9E5E4] rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-[#182033] mb-4">
              Workflow Settings
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#182033] mb-1.5">
                  Workflow Name <span className="text-[#E85D8A]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Google Sheets Sync"
                  maxLength={100}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#E9E5E4] rounded-lg text-[#182033] placeholder-[#98A2B3] focus:outline-none focus:border-[#E85D8A] focus:ring-1 focus:ring-[#E85D8A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#182033] mb-1.5">
                  Description <span className="text-xs font-normal text-[#98A2B3]">(Optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what triggers this workflow and what it automates..."
                  rows={4}
                  maxLength={500}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#E9E5E4] rounded-lg text-[#182033] placeholder-[#98A2B3] focus:outline-none focus:border-[#E85D8A] focus:ring-1 focus:ring-[#E85D8A] resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={saving || !name.trim()}
                  leftIcon={saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>

          {/* Metadata Sidebar Column */}
          <div className="space-y-4">
            <div className="bg-white border border-[#E9E5E4] rounded-2xl p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-[#182033] uppercase tracking-wider mb-2">
                Workflow Details
              </h4>

              <div className="flex items-center justify-between text-xs py-1 border-b border-[#F2F4F7]">
                <span className="text-[#667085] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#98A2B3]" />
                  Version
                </span>
                <span className="font-semibold text-[#182033]">v{workflow.version}</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-b border-[#F2F4F7]">
                <span className="text-[#667085] flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-[#98A2B3]" />
                  Status
                </span>
                <span className="font-semibold text-[#182033] capitalize">{workflow.status.toLowerCase()}</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-b border-[#F2F4F7]">
                <span className="text-[#667085] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#98A2B3]" />
                  Created
                </span>
                <span className="font-medium text-[#475467]">{formatDate(workflow.createdAt)}</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-[#667085] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#98A2B3]" />
                  Modified
                </span>
                <span className="font-medium text-[#475467]">{formatDate(workflow.updatedAt)}</span>
              </div>
            </div>

            {/* Automation Steps / Canvas info */}
            <div className="bg-[#FFFDFB] border border-[#E9E5E4] rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-[#F8DCE5] text-[#E85D8A] flex items-center justify-center">
                  <GitBranch className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold text-[#182033]">
                  Workflow Nodes & Steps
                </h4>
              </div>
              <p className="text-[11px] text-[#667085] leading-relaxed">
                Workflow container initialized with {workflow.nodes?.length || 0} nodes and {workflow.connections?.length || 0} connections. Visual canvas builder connects in the next module.
              </p>
            </div>
          </div>
        </div>

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
