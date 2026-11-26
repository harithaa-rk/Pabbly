'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Webhook,
  Mail,
  X,
  GitBranch,
} from 'lucide-react';
import { ProtectedRoute } from '../../../../components/auth/ProtectedRoute';
import { BuilderSidebar } from '../../../../components/builder/BuilderSidebar';
import { WorkflowEditorHeader } from '../../../../components/builder/WorkflowEditorHeader';
import { VisualCanvas } from '../../../../components/builder/VisualCanvas';
import { ManualBuilder } from '../../../../components/builder/ManualBuilder';
import { WebhookConfigModal } from '../../../../components/builder/WebhookConfigModal';
import { EmailActionConfigModal } from '../../../../components/builder/EmailActionConfigModal';
import { ConditionConfigModal } from '../../../../components/builder/ConditionConfigModal';
import { GmailTriggerConfigModal } from '../../../../components/builder/GmailTriggerConfigModal';
import { GmailActionConfigModal } from '../../../../components/builder/GmailActionConfigModal';
import {
  useWorkflowStore,
  BuilderMode,
  Workflow,
  WorkflowNode,
  createDefaultNodes,
  createDefaultEdges,
} from '../../../../store/workflowStore';
import { WorkflowService } from '../../../../services/workflowService';
import { useToast } from '../../../../hooks/useToast';
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner';
import { extractErrorMessage } from '../../../../lib/api';

export default function WorkflowBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const { success, info, error: errorToast } = useToast();

  const workflowId = (params?.id as string) || '';

  const {
    workflows,
    ensureWorkflowInitialized,
    updateWorkflow,
    toggleStatus,
    setBuilderMode,
    updateWorkflowNodes,
    updateNodePosition,
    addNode,
    deleteNode,
    updateNode,
    duplicateNode,
    reorderNodes,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useWorkflowStore();

  const [isMounted, setIsMounted] = useState(false);
  const [isLoadingApi, setIsLoadingApi] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAppCatalogModal, setShowAppCatalogModal] = useState(false);
  const [catalogTargetNodeId, setCatalogTargetNodeId] = useState<string | null>(null);

  // Configuration modals for Webhook, Email, Condition, and Gmail
  const [webhookModalNode, setWebhookModalNode] = useState<WorkflowNode | null>(null);
  const [emailModalNode, setEmailModalNode] = useState<WorkflowNode | null>(null);
  const [conditionModalNode, setConditionModalNode] = useState<WorkflowNode | null>(null);
  const [gmailTriggerModalNode, setGmailTriggerModalNode] = useState<WorkflowNode | null>(null);
  const [gmailActionModalNode, setGmailActionModalNode] = useState<WorkflowNode | null>(null);

  // Fetch workflow from backend API on mount
  useEffect(() => {
    setIsMounted(true);
    let active = true;

    async function loadWorkflowFromApi() {
      if (!workflowId) return;
      try {
        const fetched = await WorkflowService.getWorkflowById(workflowId);
        if (active && fetched) {
          // Sync fetched workflow into store
          const nodes = Array.isArray(fetched.nodes) && fetched.nodes.length > 0
            ? (fetched.nodes as WorkflowNode[])
            : createDefaultNodes();
          const connections = Array.isArray(fetched.connections) && fetched.connections.length > 0
            ? fetched.connections
            : createDefaultEdges(nodes);

          const store = useWorkflowStore.getState();
          const existing = store.workflows.find((w) => w.id === workflowId);
          if (existing) {
            store.updateWorkflowNodes(workflowId, nodes, connections);
          } else {
            store.ensureWorkflowInitialized(workflowId, fetched.name);
            store.updateWorkflowNodes(workflowId, nodes, connections);
          }
        }
      } catch (err) {
        // Fall back gracefully to initialized workflow in local store
        console.warn('API getWorkflowById fallback to local store:', err);
      } finally {
        if (active) {
          setIsLoadingApi(false);
        }
      }
    }

    loadWorkflowFromApi();

    return () => {
      active = false;
    };
  }, [workflowId]);

  // Ensure workflow exists and is initialized
  const workflow: Workflow | undefined = useMemo(() => {
    if (!workflowId || !isMounted) return undefined;
    return ensureWorkflowInitialized(workflowId);
  }, [workflowId, isMounted, ensureWorkflowInitialized, workflows]);

  // Nodes and edges directly from shared store
  const nodes: WorkflowNode[] = useMemo(() => {
    if (!workflow?.nodes || workflow.nodes.length === 0) {
      return createDefaultNodes();
    }
    return workflow.nodes;
  }, [workflow?.nodes]);

  const edges = useMemo(() => {
    const rawEdges = (workflow as any)?.edges || workflow?.connections;
    if (!rawEdges || rawEdges.length === 0) {
      return createDefaultEdges(nodes);
    }
    return rawEdges;
  }, [workflow, nodes]);

  const currentMode: BuilderMode = workflow?.builderMode || 'visual';

  // Handlers
  const handleModeChange = useCallback(
    (mode: BuilderMode) => {
      if (!workflowId) return;
      setBuilderMode(workflowId, mode);
    },
    [workflowId, setBuilderMode]
  );

  const handleNameChange = useCallback(
    async (newName: string) => {
      if (!workflowId || !newName.trim()) return;
      try {
        await updateWorkflow(workflowId, { name: newName.trim() });
        success('Workflow renamed');
      } catch (err) {
        errorToast(extractErrorMessage(err) || 'Failed to rename workflow');
      }
    },
    [workflowId, updateWorkflow, success, errorToast]
  );

  const handleToggleStatus = useCallback(async () => {
    if (!workflowId) return;
    try {
      const permitted = await toggleStatus(workflowId);
      if (!permitted) {
        info('A workflow requires configured trigger and action apps before it can be activated.');
      } else {
        const updated = workflows.find((w) => w.id === workflowId);
        success(`Workflow status: ${updated?.status}`);
      }
    } catch (err) {
      errorToast(extractErrorMessage(err) || 'Failed to update workflow status');
    }
  }, [workflowId, toggleStatus, workflows, success, info, errorToast]);

  const handleSave = useCallback(async () => {
    if (!workflow) return;
    setIsSaving(true);
    try {
      await updateWorkflow(workflow.id, {
        name: workflow.name,
        nodes,
        connections: edges,
      });
      success('Workflow saved');
    } catch (err) {
      errorToast(extractErrorMessage(err) || 'Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  }, [workflow, nodes, edges, updateWorkflow, success, errorToast]);

  const handleTest = useCallback(() => {
    const triggerNode = nodes.find((n) => n.type === 'trigger');
    const conditionNode = nodes.find((n) => n.type === 'condition' || n.app === 'Condition');
    const actionNode = nodes.find((n) => n.type === 'action');

    const triggerConfigured = triggerNode?.status === 'configured';
    const hasNextConfiguredStep =
      (conditionNode && conditionNode.status === 'configured') ||
      (actionNode && actionNode.status === 'configured');

    if (!triggerConfigured || !hasNextConfiguredStep) {
      info('Configure Webhook Trigger and next step (Condition or Email Action) before testing.');
      return;
    }

    if (conditionNode) {
      setConditionModalNode(conditionNode);
      info('Opening Execution Engine Dry-Run panel for Condition & Email branches (0 tasks consumed).');
    } else {
      info('Test run completed: Sample payload mapped to Email Action. (Free test run - 0 tasks consumed).');
    }
  }, [nodes, info]);

  const handleAddNode = useCallback(
    (afterNodeId?: string) => {
      if (!workflowId) return;
      addNode(workflowId, afterNodeId);
      success('Step added');
    },
    [workflowId, addNode, success]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (!workflowId) return;
      deleteNode(workflowId, nodeId);
      success('Step removed');
    },
    [workflowId, deleteNode, success]
  );

  const handleSelectApp = useCallback(
    (nodeId: string) => {
      const target = nodes.find((n) => n.id === nodeId);
      if (!target) return;

      // If already configured, open respective configuration modal directly
      if (target.app === 'Webhook') {
        setWebhookModalNode(target);
        return;
      }
      if (target.app === 'Gmail') {
        if (target.type === 'trigger') {
          setGmailTriggerModalNode(target);
        } else {
          setGmailActionModalNode(target);
        }
        return;
      }
      if (target.app === 'Condition' || target.type === 'condition') {
        setConditionModalNode(target);
        return;
      }
      if (target.app === 'Email') {
        setEmailModalNode(target);
        return;
      }

      // Otherwise show application catalog to choose
      setCatalogTargetNodeId(nodeId);
      setShowAppCatalogModal(true);
    },
    [nodes]
  );

  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      if (!workflowId) return;
      duplicateNode(workflowId, nodeId);
      success('Step duplicated');
    },
    [workflowId, duplicateNode, success]
  );

  const handleReorderNodes = useCallback(
    (startIndex: number, endIndex: number) => {
      if (!workflowId) return;
      reorderNodes(workflowId, startIndex, endIndex);
      success('Steps reordered');
    },
    [workflowId, reorderNodes, success]
  );

  const handleUndo = useCallback(() => {
    if (!workflowId) return;
    const ok = undo(workflowId);
    if (ok) success('Action undone');
  }, [workflowId, undo, success]);

  const handleRedo = useCallback(() => {
    if (!workflowId) return;
    const ok = redo(workflowId);
    if (ok) success('Action redone');
  }, [workflowId, redo, success]);

  const handleSaveNodeConfig = useCallback(
    (nodeId: string, updates: Partial<WorkflowNode>) => {
      if (!workflowId) return;
      updateNode(workflowId, nodeId, updates);

      const target = nodes.find((n) => n.id === nodeId);
      const appName = updates.app || target?.app;
      if (appName && workflow) {
        const currentApps = workflow.apps || [];
        if (!currentApps.includes(appName)) {
          updateWorkflow(workflowId, { apps: [...currentApps, appName] } as any);
        }
      }
      success('Step configuration saved');
    },
    [workflowId, updateNode, nodes, workflow, updateWorkflow, success]
  );

  const handleUpdateNodePosition = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      if (!workflowId) return;
      updateNodePosition(workflowId, nodeId, position);
    },
    [workflowId, updateNodePosition]
  );

  const handleResetLayout = useCallback(() => {
    if (!workflowId || !workflow) return;
    // Align horizontally from left to right: Trigger on left (140), subsequent actions to right
    const reorderedNodes = nodes.map((node, index) => ({
      ...node,
      position: {
        x: 140 + index * 360,
        y: 220,
      },
    }));
    updateWorkflowNodes(workflowId, reorderedNodes);
    success('Canvas layout aligned');
  }, [workflowId, workflow, nodes, updateWorkflowNodes, success]);

  if (!isMounted || !workflow || (isLoadingApi && !workflow.name)) {
    return (
      <ProtectedRoute>
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FFFDFB]">
          <LoadingSpinner size="lg" className="text-[#E85D8A] mb-3" />
          <p className="text-xs font-semibold text-[#667085]">
            Loading KAIRA Workflow Editor...
          </p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="h-screen w-screen overflow-hidden flex flex-row bg-[#FFFDFB] text-[#182033]">
        {/* Left Sidebar */}
        <BuilderSidebar />

        {/* Main Editor Surface */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Top Toolbar */}
          <WorkflowEditorHeader
            workflow={workflow as any}
            mode={currentMode}
            onModeChange={handleModeChange}
            onNameChange={handleNameChange}
            onToggleStatus={handleToggleStatus}
            onSave={handleSave}
            onTest={handleTest}
            onResetLayout={handleResetLayout}
            isSaving={isSaving}
          />

          {/* Builder Canvas / Step Viewport */}
          <main className="flex-1 min-h-0 relative overflow-hidden bg-[#FFFDFB]">
            {currentMode === 'visual' ? (
              <VisualCanvas
                workflow={workflow as any}
                nodes={nodes}
                edges={edges}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                onSelectApp={handleSelectApp}
                onUpdateNodePosition={handleUpdateNodePosition}
                onAddNode={handleAddNode}
                onDeleteNode={handleDeleteNode}
                onDuplicateNode={handleDuplicateNode}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={canUndo(workflowId)}
                canRedo={canRedo(workflowId)}
              />
            ) : (
              <ManualBuilder
                workflow={workflow as any}
                nodes={nodes}
                onAddNode={handleAddNode}
                onDeleteNode={handleDeleteNode}
                onSelectApp={handleSelectApp}
                onDuplicateNode={handleDuplicateNode}
                onReorderNodes={handleReorderNodes}
              />
            )}
          </main>
        </div>

        {/* Application Directory Modal */}
        {showAppCatalogModal && (() => {
          const targetNode = nodes.find((n) => n.id === catalogTargetNodeId);
          const isTrigger = targetNode?.type === 'trigger';

          return (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl border border-[#E9E5E4] shadow-xl max-w-md w-full p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#F0ECE9]">
                  <div>
                    <h3 className="text-sm font-bold text-[#182033]">
                      Choose {isTrigger ? 'Trigger Application' : 'Action Application'}
                    </h3>
                    <p className="text-[11px] text-[#667085]">
                      Select a supported integration to power step {targetNode?.stepNumber || 1}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAppCatalogModal(false)}
                    className="p-1 rounded-lg text-[#98A2B3] hover:text-[#182033] hover:bg-[#FFF7F4]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Available & Ready Apps */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085]">
                    Available Integrations
                  </span>
                  {isTrigger ? (
                    <div className="space-y-2">
                      {/* Webhook Trigger */}
                      <div
                        onClick={() => {
                          setShowAppCatalogModal(false);
                          if (targetNode) setWebhookModalNode(targetNode);
                        }}
                        className="p-3 rounded-xl border border-[#E85D8A] bg-[#FFF0F5]/50 flex items-center justify-between hover:bg-[#FFF0F5] cursor-pointer transition-colors shadow-2xs group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-white border border-[#E85D8A]/30 text-[#E85D8A] flex items-center justify-center shrink-0 shadow-2xs">
                            <Webhook className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#182033] block group-hover:text-[#E85D8A] transition-colors">
                              Webhook
                            </span>
                            <span className="text-[11px] text-[#667085] block">
                              Catch Hook (Instant trigger from HTTP POST)
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF7F0] text-[#22A06B] border border-[#22A06B]/20 shrink-0">
                          Active
                        </span>
                      </div>

                      {/* Gmail Trigger */}
                      <div
                        onClick={() => {
                          setShowAppCatalogModal(false);
                          if (targetNode) {
                            const updated: WorkflowNode = {
                              ...targetNode,
                              app: 'Gmail',
                              title: 'Gmail Trigger',
                            };
                            updateNode(workflowId, targetNode.id, { app: 'Gmail', title: 'Gmail Trigger' });
                            setGmailTriggerModalNode(updated);
                          }
                        }}
                        className="p-3 rounded-xl border border-[#EA4335] bg-[#FEECEB]/40 flex items-center justify-between hover:bg-[#FEECEB] cursor-pointer transition-colors shadow-2xs group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-white border border-[#EA4335]/30 text-[#EA4335] flex items-center justify-center shrink-0 shadow-2xs">
                            <Mail className="w-5 h-5 text-[#EA4335]" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#182033] block group-hover:text-[#EA4335] transition-colors">
                              Gmail
                            </span>
                            <span className="text-[11px] text-[#667085] block">
                              New Email, Search Filter, or Specific Sender
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF7F0] text-[#22A06B] border border-[#22A06B]/20 shrink-0">
                          Active
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Condition / Router Option */}
                      <div
                        onClick={() => {
                          setShowAppCatalogModal(false);
                          if (targetNode) {
                            const conditionNode: WorkflowNode = {
                              ...targetNode,
                              type: 'condition',
                              app: 'Condition',
                              title: 'Condition (Router)',
                              event: 'Route by Field Rules',
                            };
                            updateNode(workflowId, targetNode.id, {
                              type: 'condition',
                              app: 'Condition',
                              title: 'Condition (Router)',
                              event: 'Route by Field Rules',
                            });
                            setConditionModalNode(conditionNode);
                          }
                        }}
                        className="p-3 rounded-xl border border-[#22A06B] bg-[#F0FDF4]/50 flex items-center justify-between hover:bg-[#F0FDF4] cursor-pointer transition-colors shadow-2xs group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-white border border-[#22A06B]/30 text-[#22A06B] flex items-center justify-center shrink-0 shadow-2xs">
                            <GitBranch className="w-5 h-5 text-[#22A06B]" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#182033] block group-hover:text-[#22A06B] transition-colors">
                              Condition (Router / Branching)
                            </span>
                            <span className="text-[11px] text-[#667085] block">
                              Split flow dynamically into branches based on payload fields
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF7F0] text-[#22A06B] border border-[#22A06B]/20 shrink-0">
                          Active
                        </span>
                      </div>

                      {/* Gmail Action Option */}
                      <div
                        onClick={() => {
                          setShowAppCatalogModal(false);
                          if (targetNode) {
                            const updated: WorkflowNode = {
                              ...targetNode,
                              app: 'Gmail',
                              title: 'Gmail Action',
                            };
                            updateNode(workflowId, targetNode.id, { app: 'Gmail', title: 'Gmail Action' });
                            setGmailActionModalNode(updated);
                          }
                        }}
                        className="p-3 rounded-xl border border-[#EA4335] bg-[#FEECEB]/40 flex items-center justify-between hover:bg-[#FEECEB] cursor-pointer transition-colors shadow-2xs group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-white border border-[#EA4335]/30 text-[#EA4335] flex items-center justify-center shrink-0 shadow-2xs">
                            <Mail className="w-5 h-5 text-[#EA4335]" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#182033] block group-hover:text-[#EA4335] transition-colors">
                              Gmail (API Action)
                            </span>
                            <span className="text-[11px] text-[#667085] block">
                              Send Email, Reply to Thread, or Reply All via Gmail API
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF7F0] text-[#22A06B] border border-[#22A06B]/20 shrink-0">
                          Active
                        </span>
                      </div>

                      {/* SMTP Email Option */}
                      <div
                        onClick={() => {
                          setShowAppCatalogModal(false);
                          if (targetNode) setEmailModalNode(targetNode);
                        }}
                        className="p-3 rounded-xl border border-[#3B66DE] bg-[#F0F4FE]/50 flex items-center justify-between hover:bg-[#F0F4FE] cursor-pointer transition-colors shadow-2xs group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-white border border-[#3B66DE]/30 text-[#3B66DE] flex items-center justify-center shrink-0 shadow-2xs">
                            <Mail className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#182033] block group-hover:text-[#3B66DE] transition-colors">
                              Email (SMTP Mailer)
                            </span>
                            <span className="text-[11px] text-[#667085] block">
                              Send notifications using custom SMTP host & credentials
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF7F0] text-[#22A06B] border border-[#22A06B]/20 shrink-0">
                          Active
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end border-t border-[#F0ECE9]">
                  <button
                    type="button"
                    onClick={() => setShowAppCatalogModal(false)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#182033] hover:bg-[#E85D8A] text-white text-xs font-semibold transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Webhook Configuration Modal */}
        {webhookModalNode && (
          <WebhookConfigModal
            isOpen={Boolean(webhookModalNode)}
            onClose={() => setWebhookModalNode(null)}
            workflowId={workflow.id}
            node={webhookModalNode}
            onSave={handleSaveNodeConfig}
          />
        )}

        {/* Gmail Trigger Configuration Modal */}
        {gmailTriggerModalNode && (
          <GmailTriggerConfigModal
            isOpen={Boolean(gmailTriggerModalNode)}
            onClose={() => setGmailTriggerModalNode(null)}
            workflowId={workflow.id}
            node={gmailTriggerModalNode}
            onSave={handleSaveNodeConfig}
          />
        )}

        {/* Condition Configuration Modal */}
        {conditionModalNode && (
          <ConditionConfigModal
            isOpen={Boolean(conditionModalNode)}
            onClose={() => setConditionModalNode(null)}
            workflowId={workflow.id}
            workflowName={workflow.name}
            node={conditionModalNode}
            triggerNode={nodes.find((n) => n.type === 'trigger')}
            onSave={handleSaveNodeConfig}
          />
        )}

        {/* Gmail Action Configuration Modal */}
        {gmailActionModalNode && (
          <GmailActionConfigModal
            isOpen={Boolean(gmailActionModalNode)}
            onClose={() => setGmailActionModalNode(null)}
            workflowId={workflow.id}
            node={gmailActionModalNode}
            triggerNode={nodes.find((n) => n.type === 'trigger')}
            onSave={handleSaveNodeConfig}
          />
        )}

        {/* Email (SMTP) Action Configuration Modal */}
        {emailModalNode && (
          <EmailActionConfigModal
            isOpen={Boolean(emailModalNode)}
            onClose={() => setEmailModalNode(null)}
            workflowId={workflow.id}
            node={emailModalNode}
            triggerNode={nodes.find((n) => n.type === 'trigger')}
            onSave={handleSaveNodeConfig}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
