'use client';

import React from 'react';
import {
  Zap,
  Play,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Webhook,
  Mail,
  GitBranch,
  Settings,
  ArrowDown,
} from 'lucide-react';
import { WorkflowNode, WorkflowItem } from '../../store/workflowStore';
import { cn } from '../../lib/utils';

interface ManualBuilderProps {
  workflow: WorkflowItem;
  nodes: WorkflowNode[];
  onAddNode: (afterNodeId?: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onSelectApp: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  onReorderNodes?: (startIndex: number, endIndex: number) => void;
}

export const ManualBuilder: React.FC<ManualBuilderProps> = ({
  workflow,
  nodes,
  onAddNode,
  onDeleteNode,
  onSelectApp,
  onDuplicateNode,
  onReorderNodes,
}) => {
  const configuredCount = nodes.filter((n) => n.status === 'configured' && n.app).length;
  const isAllReady = nodes.length > 0 && configuredCount === nodes.length;

  return (
    <div className="w-full h-full overflow-y-auto bg-[#FAF9F7] p-4 md:p-8 select-none">
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        {/* Step-by-Step Overview Banner */}
        <div className="bg-white rounded-2xl border border-[#E9E5E4] p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#182033] text-white">
                Step-by-Step Mode
              </span>
              <span className="text-xs text-[#667085]">
                {configuredCount} of {nodes.length} steps configured
              </span>
            </div>
            <h2 className="text-base font-bold text-[#182033] mt-1">
              Linear Workflow Sequence
            </h2>
            <p className="text-xs text-[#667085] mt-0.5">
              Set up your workflow steps in sequential order from top to bottom.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAllReady ? (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#EDFDF3] text-[#067647] border border-[#ABEFC6] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#12B76A]" />
                All Steps Ready
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF4E5] text-[#B54708] border border-[#FFD6A4] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-[#F79009]" />
                Setup Needed
              </span>
            )}
            <button
              type="button"
              onClick={() => onAddNode()}
              className="px-3.5 py-1.5 rounded-xl bg-[#182033] hover:bg-[#E85D8A] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Step
            </button>
          </div>
        </div>

        {/* Vertical Steps List */}
        <div className="space-y-4">
          {nodes.map((node, index) => {
            const isTrigger = node.type === 'trigger';
            const isCondition = node.type === 'condition' || node.app === 'Condition';
            const isGmail = node.app === 'Gmail';
            const isConfigured = Boolean(node.status === 'configured' && node.app);
            const isFirstAction = index === 1;
            const isLastStep = index === nodes.length - 1;

            return (
              <React.Fragment key={node.id}>
                {/* Step Card */}
                <div
                  className={cn(
                    'bg-white rounded-2xl border transition-all duration-150 shadow-2xs hover:shadow-xs p-5',
                    isConfigured
                      ? 'border-[#E9E5E4] hover:border-[#D0C9C7]'
                      : 'border-[#F8D8C5] bg-[#FFFDFB]'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Step Badge & App Icon */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <span
                          className={cn(
                            'w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold border shadow-2xs',
                            isTrigger
                              ? 'bg-[#FFF0F5] border-[#E85D8A]/30 text-[#E85D8A]'
                              : isCondition
                              ? 'bg-[#F0FDF4] border-[#22A06B]/30 text-[#22A06B]'
                              : isGmail
                              ? 'bg-[#FEECEB] border-[#EA4335]/30 text-[#EA4335]'
                              : 'bg-[#F0F4FE] border-[#3B66DE]/30 text-[#3B66DE]'
                          )}
                        >
                          {node.stepNumber}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#98A2B3]">
                          {isTrigger ? 'Trigger' : isCondition ? 'Router' : 'Action'}
                        </span>
                      </div>

                      {/* Middle: App Title, Details & Validation */}
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-[#182033]">
                            {isConfigured ? `${node.app}` : node.title}
                          </h3>
                          {isConfigured ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EDFDF3] text-[#067647] border border-[#ABEFC6] flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5 text-[#12B76A]" />
                              Configured
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFF4E5] text-[#B54708] border border-[#FFD6A4] flex items-center gap-1">
                              <AlertCircle className="w-2.5 h-2.5 text-[#F79009]" />
                              Configuration Pending
                            </span>
                          )}
                        </div>

                        {/* Step summary description */}
                        {isConfigured ? (
                          <div className="text-xs text-[#667085] space-y-1">
                            <p className="font-medium text-[#344054]">
                              Event: <span className="text-[#182033] font-semibold">{node.event || 'Custom Event'}</span>
                            </p>
                            {node.app === 'Webhook' && (
                              <p className="text-[11px] text-[#667085] font-mono bg-[#FAF9F8] p-1.5 rounded-lg border border-[#F0ECE9] break-all">
                                Payload: Ingests arbitrary JSON data & detects variables
                              </p>
                            )}
                            {node.app === 'Gmail' && (
                              <p className="text-[11px] text-[#667085] bg-[#FAF9F8] p-1.5 rounded-lg border border-[#F0ECE9]">
                                {isTrigger
                                  ? 'Gmail Trigger: Polls and extracts sender, subject, body, and thread ID.'
                                  : 'Gmail Action: Dispatches base64url MIME email or threaded replies.'}
                              </p>
                            )}
                            {node.app === 'Condition' && (
                              <p className="text-[11px] text-[#667085] bg-[#FAF9F8] p-1.5 rounded-lg border border-[#F0ECE9]">
                                Router: Evaluates rules and routes dynamically to configured branches.
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-[#98A2B3]">
                            {isTrigger
                              ? 'Select a trigger app (Webhook or Gmail) to start this workflow.'
                              : 'Select an action application or condition router for this step.'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions (Reorder, Duplicate, Configure, Delete) */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Move Up / Down (for action steps) */}
                      {!isTrigger && onReorderNodes && (
                        <div className="flex flex-col gap-0.5 mr-1">
                          <button
                            type="button"
                            onClick={() => onReorderNodes(index, index - 1)}
                            disabled={isFirstAction}
                            className={cn(
                              'p-1 rounded hover:bg-[#F2EFE9] transition-colors',
                              isFirstAction ? 'text-[#D0D5DD] cursor-not-allowed' : 'text-[#667085]'
                            )}
                            title="Move Step Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onReorderNodes(index, index + 1)}
                            disabled={isLastStep}
                            className={cn(
                              'p-1 rounded hover:bg-[#F2EFE9] transition-colors',
                              isLastStep ? 'text-[#D0D5DD] cursor-not-allowed' : 'text-[#667085]'
                            )}
                            title="Move Step Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Duplicate Step */}
                      {!isTrigger && onDuplicateNode && (
                        <button
                          type="button"
                          onClick={() => onDuplicateNode(node.id)}
                          className="p-1.5 rounded-lg text-[#667085] hover:text-[#182033] hover:bg-[#F2EFE9] transition-colors"
                          title="Duplicate Step"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Configure / Edit Button */}
                      <button
                        type="button"
                        onClick={() => onSelectApp(node.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs',
                          isConfigured
                            ? 'bg-[#F2EFE9] text-[#182033] hover:bg-[#E9E5E4]'
                            : 'bg-[#E85D8A] text-white hover:bg-[#D44876]'
                        )}
                      >
                        {isConfigured ? (
                          <>
                            <Edit2 className="w-3 h-3" />
                            Edit Step
                          </>
                        ) : (
                          <>
                            <Settings className="w-3 h-3" />
                            Configure Step
                          </>
                        )}
                      </button>

                      {/* Delete Step */}
                      {!isTrigger && nodes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteNode(node.id)}
                          className="p-1.5 rounded-lg text-[#98A2B3] hover:text-[#D92D20] hover:bg-[#FEF3F2] transition-colors"
                          title="Delete Step"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Vertical Intermediary Connector with (+) Insert Step Button */}
                <div className="flex flex-col items-center justify-center my-1">
                  <div className="h-4 w-0.5 bg-[#E9E5E4]" />
                  <button
                    type="button"
                    onClick={() => onAddNode(node.id)}
                    className="p-1.5 rounded-full bg-white hover:bg-[#FFF0F5] border border-[#E9E5E4] hover:border-[#E85D8A] text-[#667085] hover:text-[#E85D8A] shadow-2xs transition-all my-0.5 group"
                    title="Insert Step Here"
                  >
                    <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  </button>
                  <div className="h-4 w-0.5 bg-[#E9E5E4]" />
                </div>
              </React.Fragment>
            );
          })}

          {/* Bottom Add Step Button */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => onAddNode()}
              className="w-full py-3.5 rounded-2xl border-2 border-dashed border-[#D0C9C7] hover:border-[#E85D8A] bg-white hover:bg-[#FFF7F4] text-xs font-bold text-[#182033] hover:text-[#E85D8A] flex items-center justify-center gap-2 transition-all shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              Add Another Action / Router Step
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
