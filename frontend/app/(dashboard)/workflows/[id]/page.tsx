'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Webhook,
  Plus,
  Play,
  Save,
  CheckCircle2,
  Globe,
  Settings,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import { DashboardLayout } from '../../../../components/layout/DashboardLayout';
import { useWorkflowStore } from '../../../../store/workflowStore';
import { Button } from '../../../../components/ui/Button';
import { useToast } from '../../../../hooks/useToast';

export default function WorkflowBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const { workflows, updateWorkflow, toggleStatus } = useWorkflowStore();
  const { success } = useToast();

  const workflowId = params.id as string;
  const workflow = workflows.find((w) => w.id === workflowId);

  const [workflowName, setWorkflowName] = useState(workflow?.name || 'New Automation Workflow');
  const [copied, setCopied] = useState(false);
  const [selectedStep, setSelectedStep] = useState<'trigger' | 'action1'>('trigger');

  const webhookUrl = workflow?.webhookUrl || `https://api.kairaconnect.com/v1/wh/${workflowId}`;

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    success('Webhook URL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (workflow) {
      updateWorkflow(workflow.id, { name: workflowName });
    }
    success('Workflow saved successfully');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Builder Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-[#E9E5E4] rounded-xl shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-1.5 rounded-lg text-[#667085] hover:text-[#182033] hover:bg-[#FFF7F4]"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="Workflow Name"
                className="text-base font-bold text-[#182033] bg-transparent border-b border-transparent hover:border-[#E9E5E4] focus:border-[#E85D8A] focus:outline-none px-1 py-0.5"
              />
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#EAF7F0] text-[#22A06B] border border-[#22A06B]/20">
                {workflow?.status || 'ACTIVE'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              Save
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (workflow) toggleStatus(workflow.id);
                success('Status updated');
              }}
            >
              {workflow?.status === 'ACTIVE' ? 'Pause' : 'Activate'}
            </Button>
          </div>
        </div>

        {/* Builder Canvas Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workflow Sequence Steps */}
          <div className="lg:col-span-2 space-y-4">
            {/* Step 1: Trigger */}
            <div
              onClick={() => setSelectedStep('trigger')}
              className={`p-5 rounded-xl border bg-white shadow-xs cursor-pointer transition-all ${
                selectedStep === 'trigger'
                  ? 'border-[#E85D8A] ring-2 ring-[#E85D8A]/20'
                  : 'border-[#E9E5E4] hover:border-[#D8D2D0]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FFF7F4] border border-[#F8D8C5] text-[#E85D8A] flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#E85D8A]">
                      Trigger
                    </span>
                    <h4 className="text-sm font-bold text-[#182033]">
                      Webhook by Kaira
                    </h4>
                  </div>
                </div>
                <span className="text-xs text-[#22A06B] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ready
                </span>
              </div>

              <p className="text-xs text-[#667085] leading-relaxed mb-3">
                Receive instant payloads from any external app, website, or service via HTTP POST.
              </p>

              {/* Webhook URL Field */}
              <div className="flex items-center gap-2 p-2 bg-[#FFF7F4] border border-[#E9E5E4] rounded-lg">
                <code className="text-xs text-[#182033] font-mono flex-1 truncate">
                  {webhookUrl}
                </code>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyWebhook();
                  }}
                  className="px-2 py-1 bg-white border border-[#E9E5E4] hover:bg-[#FFFDFB] text-xs font-semibold rounded text-[#182033] flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3 text-[#22A06B]" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Connecting Line */}
            <div className="flex justify-center">
              <div className="w-0.5 h-6 bg-[#E9E5E4]" />
            </div>

            {/* Step 2: Action */}
            <div
              onClick={() => setSelectedStep('action1')}
              className={`p-5 rounded-xl border bg-white shadow-xs cursor-pointer transition-all ${
                selectedStep === 'action1'
                  ? 'border-[#E85D8A] ring-2 ring-[#E85D8A]/20'
                  : 'border-[#E9E5E4] hover:border-[#D8D2D0]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E8DDF0] border border-[#E9E5E4] text-[#6D4298] flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6D4298]">
                      Action
                    </span>
                    <h4 className="text-sm font-bold text-[#182033]">
                      API / HTTP Request
                    </h4>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#667085] leading-relaxed">
                Forward transformed data, send notifications, or invoke REST API actions.
              </p>
            </div>
          </div>

          {/* Configuration Inspector Sidebar */}
          <div className="p-5 bg-white border border-[#E9E5E4] rounded-xl shadow-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#667085]">
              Step Configuration
            </h4>

            {selectedStep === 'trigger' ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-[#182033] mb-1">
                    Trigger Event
                  </label>
                  <select className="w-full px-2.5 py-1.5 bg-white border border-[#E9E5E4] rounded-lg text-[#182033]">
                    <option>Catch Hook (Instant JSON / POST)</option>
                    <option>Catch Raw Payload</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#182033] mb-1">
                    HTTP Method
                  </label>
                  <input
                    type="text"
                    disabled
                    value="POST"
                    className="w-full px-2.5 py-1.5 bg-[#FFF7F4] border border-[#E9E5E4] rounded-lg text-[#182033] font-mono text-xs"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    leftIcon={<Play className="w-3 h-3 text-[#22A06B]" />}
                    onClick={() => success('Listening for test payload on webhook URL...')}
                  >
                    Capture Test Request
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-[#182033] mb-1">
                    Action Event
                  </label>
                  <select className="w-full px-2.5 py-1.5 bg-white border border-[#E9E5E4] rounded-lg text-[#182033]">
                    <option>Send Custom HTTP Request</option>
                    <option>JSON Webhook Dispatch</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#182033] mb-1">
                    Endpoint URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://api.example.com/endpoint"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E9E5E4] rounded-lg text-[#182033] focus:border-[#E85D8A]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

