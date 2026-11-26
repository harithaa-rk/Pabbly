'use client';

import React, { useState } from 'react';
import {
  GitBranch,
  Check,
  X,
  Play,
  ArrowRight,
  Mail,
  AlertCircle,
  Plus,
  Trash2,
  Sparkles,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Edit2,
  Sliders,
} from 'lucide-react';
import {
  SAMPLE_WEBHOOK_TEMPLATES,
  WebhookField,
  frontendWebhookService,
} from '../../services/webhookService';
import { WorkflowNode } from '../../store/workflowStore';

export interface DynamicWorkflowBranch {
  id: string;
  name: string;
  conditionValue: string;
  operator?: string;
  emailAction: {
    connectionId?: string;
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    body: string;
    html?: string;
    fromName?: string;
    fromEmail?: string;
  };
}

interface ConditionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  workflowName: string;
  node: WorkflowNode;
  triggerNode?: WorkflowNode;
  onSave: (nodeId: string, updates: Partial<WorkflowNode>) => void;
}

export const ConditionConfigModal: React.FC<ConditionConfigModalProps> = ({
  isOpen,
  onClose,
  workflowId,
  workflowName,
  node,
  triggerNode,
  onSave,
}) => {
  // Condition field to evaluate (e.g. status, order_status, priority, amount)
  const [conditionField, setConditionField] = useState<string>(
    node.config?.condition?.field || node.config?.field || 'status'
  );
  const [globalOperator, setGlobalOperator] = useState<string>(
    node.config?.operator || 'equals'
  );

  // Initialize dynamic branches from existing node config or defaults
  const initialBranches: DynamicWorkflowBranch[] =
    node.config?.branches && Array.isArray(node.config.branches) && node.config.branches.length > 0
      ? node.config.branches
      : [
          {
            id: 'branch-1',
            name: 'Branch 1 (Primary Condition)',
            conditionValue: 'confirmed',
            emailAction: {
              to: '{{1.email}}',
              subject: 'Update: {{1.fullName}}',
              body: 'Hello {{1.fullName}},\n\nYour request has been processed successfully.\n\nBest regards,\nKAIRA Connect Team',
              fromName: 'KAIRA Connect',
            },
          },
          {
            id: 'branch-2',
            name: 'Branch 2 (Alternative Condition)',
            conditionValue: 'cancelled',
            emailAction: {
              to: '{{1.email}}',
              subject: 'Notice: {{1.fullName}}',
              body: 'Hello {{1.fullName}},\n\nYour request has been updated.\n\nBest regards,\nKAIRA Connect Team',
              fromName: 'KAIRA Connect',
            },
          },
        ];

  const [branches, setBranches] = useState<DynamicWorkflowBranch[]>(initialBranches);
  const [activeBranchId, setActiveBranchId] = useState<string>(initialBranches[0]?.id || 'branch-1');
  const [isDryRunActive, setIsDryRunActive] = useState<boolean>(false);

  // Dry-Run Testing State
  const [dryRunPayloadKey, setDryRunPayloadKey] = useState<string>('contactLead');
  const [customDryRunJson, setCustomDryRunJson] = useState<string>('');
  const [useCustomJson, setUseCustomJson] = useState<boolean>(false);
  const [isRunningDryRun, setIsRunningDryRun] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<any>(null);

  // Active input tracking for variable pill insertion
  const [activeInput, setActiveInput] = useState<'to' | 'subject' | 'body' | 'fromName'>('subject');

  // Trigger detected fields or fallback from sample templates
  const triggerFields: WebhookField[] = triggerNode?.config?.detectedFields?.length
    ? triggerNode.config.detectedFields
    : [
        { key: 'status', value: 'confirmed', type: 'string' },
        { key: 'email', value: 'customer@example.com', type: 'string' },
        { key: 'fullName', value: 'Sarah Jenkins', type: 'string' },
        { key: 'orderId', value: 'ORD-98421', type: 'string' },
        { key: 'amount', value: 149.99, type: 'number' },
        { key: 'priority', value: 'urgent', type: 'string' },
      ];

  if (!isOpen) return null;

  const activeBranch = branches.find((b) => b.id === activeBranchId) || branches[0];

  const handleAddBranch = () => {
    const newIndex = branches.length + 1;
    const newId = `branch-${Date.now()}`;
    const newBranch: DynamicWorkflowBranch = {
      id: newId,
      name: `Branch ${newIndex}`,
      conditionValue: `value_${newIndex}`,
      emailAction: {
        to: '{{1.email}}',
        subject: `Notification: Step ${newIndex}`,
        body: `Hello {{1.fullName}},\n\nThis branch was triggered for value: value_${newIndex}.\n\nBest regards,\nKAIRA Connect Team`,
        fromName: 'KAIRA Connect',
      },
    };
    setBranches([...branches, newBranch]);
    setActiveBranchId(newId);
    setIsDryRunActive(false);
  };

  const handleDeleteBranch = (branchId: string) => {
    if (branches.length <= 1) return;
    const remaining = branches.filter((b) => b.id !== branchId);
    setBranches(remaining);
    if (activeBranchId === branchId) {
      setActiveBranchId(remaining[0].id);
    }
  };

  const handleUpdateActiveBranch = (updates: Partial<DynamicWorkflowBranch>) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === activeBranchId ? { ...b, ...updates } : b))
    );
  };

  const handleUpdateActiveEmailAction = (field: 'to' | 'subject' | 'body' | 'fromName', value: string) => {
    setBranches((prev) =>
      prev.map((b) =>
        b.id === activeBranchId
          ? {
              ...b,
              emailAction: {
                ...b.emailAction,
                [field]: value,
              },
            }
          : b
      )
    );
  };

  const handleInsertVariable = (fieldKey: string) => {
    const token = `{{1.${fieldKey}}}`;
    if (!activeBranch) return;

    const currentVal = activeBranch.emailAction[activeInput] || '';
    const updatedVal = currentVal ? `${currentVal} ${token}` : token;
    handleUpdateActiveEmailAction(activeInput, updatedVal);
  };

  const handleRunDryRun = async () => {
    setIsRunningDryRun(true);

    let testPayload: Record<string, any>;
    if (useCustomJson && customDryRunJson.trim()) {
      try {
        testPayload = JSON.parse(customDryRunJson);
      } catch {
        testPayload = SAMPLE_WEBHOOK_TEMPLATES[dryRunPayloadKey]?.payload || {
          [conditionField]: activeBranch?.conditionValue || 'confirmed',
          email: 'test@example.com',
          fullName: 'Test User',
        };
      }
    } else {
      testPayload = SAMPLE_WEBHOOK_TEMPLATES[dryRunPayloadKey]?.payload || {
        [conditionField]: activeBranch?.conditionValue || 'confirmed',
        email: 'test@example.com',
        fullName: 'Test User',
      };
    }

    const workflowDef = {
      id: workflowId,
      name: workflowName || 'Generic Automation Workflow',
      trigger: { type: 'webhook' },
      condition: {
        field: conditionField.trim() || 'status',
        branches: branches.map((b) => ({
          id: b.id,
          name: b.name,
          conditionValue: b.conditionValue,
          operator: b.operator || globalOperator,
          rule: {
            field: conditionField.trim() || 'status',
            operator: (b.operator || globalOperator) as any,
            value: b.conditionValue,
          },
          emailAction: b.emailAction,
        })),
      },
    };

    const res = await frontendWebhookService.executeWorkflowDryRun(workflowDef, testPayload);
    setDryRunResult(res);
    setIsRunningDryRun(false);
  };

  const handleSaveConfiguration = () => {
    const activeField = conditionField.trim() || 'status';
    onSave(node.id, {
      app: 'Condition',
      status: 'configured',
      title: 'Condition (Router)',
      event: `Route by ${activeField} (${branches.length} ${branches.length === 1 ? 'Branch' : 'Branches'})`,
      subtitle: `${branches.map((b) => b.name).join(' | ')}`,
      config: {
        field: activeField,
        operator: globalOperator,
        branches,
        configuredAt: new Date().toISOString(),
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-[#E9E5E4] shadow-2xl max-w-3xl w-full my-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#F0ECE9] flex items-center justify-between bg-[#FFFDFB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] border border-[#22A06B]/20 text-[#22A06B] flex items-center justify-center shrink-0">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#182033]">
                  Configure Condition Router (Branching)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0FDF4] text-[#22A06B] border border-[#22A06B]/20">
                  {branches.length} {branches.length === 1 ? 'Dynamic Branch' : 'Dynamic Branches'}
                </span>
              </div>
              <p className="text-xs text-[#667085]">
                Evaluate any incoming payload field and route execution dynamically to dedicated branch actions
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#98A2B3] hover:text-[#182033] hover:bg-[#FAF9F8] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-5 flex-1 text-sm">
          {/* Section 1: Generic Condition Rule Setup */}
          <div className="p-3.5 rounded-xl bg-[#FAF9F8] border border-[#E9E5E4] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#182033] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#22A06B]" />
                <span>1. Rule Configuration (Applies to all branches)</span>
              </span>
              <span className="text-[11px] text-[#667085]">
                Select any detected payload field or enter custom key
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-[11px] font-bold text-[#182033] mb-1">
                  Field to Evaluate
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={conditionField}
                    onChange={(e) => setConditionField(e.target.value)}
                    placeholder="e.g. status, priority, order_status, category"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E9E5E4] bg-white text-xs font-mono font-bold text-[#182033] focus:border-[#22A06B] outline-hidden"
                  />
                  {triggerFields.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) setConditionField(e.target.value);
                      }}
                      className="px-2 py-1.5 rounded-lg border border-[#E9E5E4] bg-white text-xs text-[#667085] hover:border-[#22A06B] outline-hidden shrink-0"
                      value=""
                    >
                      <option value="" disabled>
                        Pick Field...
                      </option>
                      {triggerFields.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.key} ({f.type})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#182033] mb-1">
                  Comparison Operator
                </label>
                <select
                  value={globalOperator}
                  onChange={(e) => setGlobalOperator(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E9E5E4] bg-white text-xs font-semibold text-[#182033] focus:border-[#22A06B] outline-hidden"
                >
                  <option value="equals">equals (case-insensitive)</option>
                  <option value="not_equals">does not equal</option>
                  <option value="contains">contains substring</option>
                  <option value="starts_with">starts with</option>
                  <option value="ends_with">ends with</option>
                  <option value="greater_than">greater than (numeric or text)</option>
                  <option value="less_than">less than (numeric or text)</option>
                  <option value="is_empty">is empty</option>
                  <option value="is_not_empty">is not empty</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Dynamic Branches Tab Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#F0ECE9] pb-1 gap-2 flex-wrap">
              {/* Dynamic Branch Tab Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-[75%]">
                {branches.map((branch, index) => {
                  const isActive = !isDryRunActive && activeBranchId === branch.id;
                  return (
                    <div
                      key={branch.id}
                      className={`flex items-center rounded-lg border transition-all ${
                        isActive
                          ? 'border-[#22A06B] bg-[#F0FDF4] shadow-2xs'
                          : 'border-[#E9E5E4] bg-white hover:border-[#D0C9C7]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveBranchId(branch.id);
                          setIsDryRunActive(false);
                        }}
                        className={`px-2.5 py-1 text-xs font-bold transition-colors ${
                          isActive ? 'text-[#22A06B]' : 'text-[#667085] hover:text-[#182033]'
                        }`}
                      >
                        <span>{branch.name || `Branch ${index + 1}`}</span>
                        <span className="ml-1 text-[10px] font-mono opacity-70">
                          ({branch.conditionValue || 'any'})
                        </span>
                      </button>

                      {branches.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteBranch(branch.id)}
                          className="px-1.5 py-1 text-[#98A2B3] hover:text-[#D92D20] transition-colors"
                          title="Delete branch"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={handleAddBranch}
                  className="px-2 py-1 rounded-lg border border-dashed border-[#D0C9C7] hover:border-[#22A06B] text-[11px] font-bold text-[#667085] hover:text-[#22A06B] bg-white hover:bg-[#F0FDF4] flex items-center gap-1 transition-all shrink-0"
                  title="Add new branch"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Branch</span>
                </button>
              </div>

              {/* Dry-Run Tab Switcher */}
              <button
                type="button"
                onClick={() => {
                  setIsDryRunActive(true);
                  handleRunDryRun();
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 shrink-0 ${
                  isDryRunActive
                    ? 'bg-[#3B66DE] text-white border-[#3B66DE] shadow-2xs'
                    : 'border-[#E9E5E4] bg-white text-[#667085] hover:text-[#3B66DE] hover:border-[#3B66DE]'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>Dry-Run Test</span>
              </button>
            </div>

            {/* Dynamic Variable Chip Inserter */}
            {!isDryRunActive && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#667085]">
                    Detected Dynamic Variables (Click to Insert)
                  </span>
                  <span className="text-[10px] text-[#98A2B3]">
                    Inserting into: <b className="uppercase text-[#182033]">{activeInput}</b>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2 bg-[#FAF9F8] rounded-xl border border-[#F0ECE9] max-h-20 overflow-y-auto">
                  {triggerFields.map((field) => (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => handleInsertVariable(field.key)}
                      className="px-2 py-0.5 rounded-md bg-white hover:bg-[#F0FDF4] border border-[#E9E5E4] hover:border-[#22A06B] text-[10px] font-mono text-[#182033] hover:text-[#22A06B] flex items-center gap-1 transition-colors shadow-2xs"
                    >
                      <span className="text-[#22A06B] font-bold">+</span>
                      <span>1.{field.key}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Active Branch Configuration */}
            {!isDryRunActive && activeBranch && (
              <div className="space-y-3.5 p-4 rounded-xl border border-[#E9E5E4] bg-white shadow-2xs">
                {/* Branch Rule Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3 border-b border-[#F0ECE9]">
                  <div>
                    <label className="block text-[11px] font-bold text-[#182033] mb-1">
                      Branch Label
                    </label>
                    <input
                      type="text"
                      value={activeBranch.name}
                      onChange={(e) => handleUpdateActiveBranch({ name: e.target.value })}
                      placeholder="e.g. Order Paid, Urgent Ticket, VIP Lead"
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E9E5E4] bg-white text-xs font-semibold text-[#182033] focus:border-[#22A06B] outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#182033] mb-1">
                      Matching Value for [{conditionField}]
                    </label>
                    <input
                      type="text"
                      value={activeBranch.conditionValue}
                      onChange={(e) => handleUpdateActiveBranch({ conditionValue: e.target.value })}
                      placeholder="e.g. paid, urgent, confirmed, true, 100"
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E9E5E4] bg-white text-xs font-mono font-bold text-[#182033] focus:border-[#22A06B] outline-hidden"
                    />
                  </div>
                </div>

                {/* Email Action for this Branch */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#3B66DE] flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-[#3B66DE]" />
                      <span>Dedicated Action: Send Email for this Branch</span>
                    </span>
                    <span className="text-[10px] font-semibold text-[#667085] bg-[#F0F4FE] text-[#3B66DE] px-2 py-0.5 rounded-md border border-[#3B66DE]/20">
                      Fires when [{conditionField}] {globalOperator} &quot;{activeBranch.conditionValue}&quot;
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#182033] mb-1">
                        To (Recipient)
                      </label>
                      <input
                        type="text"
                        value={activeBranch.emailAction.to}
                        onFocus={() => setActiveInput('to')}
                        onChange={(e) => handleUpdateActiveEmailAction('to', e.target.value)}
                        placeholder="e.g. {{1.email}} or admin@mybusiness.com"
                        className="w-full px-3 py-1.5 rounded-lg border border-[#E9E5E4] bg-white text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#182033] mb-1">
                        Sender Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={activeBranch.emailAction.fromName || ''}
                        onFocus={() => setActiveInput('fromName')}
                        onChange={(e) => handleUpdateActiveEmailAction('fromName', e.target.value)}
                        placeholder="e.g. Customer Care, Billing Desk"
                        className="w-full px-3 py-1.5 rounded-lg border border-[#E9E5E4] bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#182033] mb-1">
                      Email Subject
                    </label>
                    <input
                      type="text"
                      value={activeBranch.emailAction.subject}
                      onFocus={() => setActiveInput('subject')}
                      onChange={(e) => handleUpdateActiveEmailAction('subject', e.target.value)}
                      placeholder="e.g. Order Confirmation: {{1.orderId}} for {{1.customerName}}"
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E9E5E4] bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#182033] mb-1">
                      Email Body (Supports dynamic variables & multiline text)
                    </label>
                    <textarea
                      rows={4}
                      value={activeBranch.emailAction.body}
                      onFocus={() => setActiveInput('body')}
                      onChange={(e) => handleUpdateActiveEmailAction('body', e.target.value)}
                      placeholder="Write your email template here with dynamic {{1.fieldName}} placeholders..."
                      className="w-full px-3 py-2 rounded-lg border border-[#E9E5E4] bg-white text-xs font-sans"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Dry-Run Execution Tab */}
            {isDryRunActive && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-[#FAF9F8] border border-[#E9E5E4] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#182033]">
                      Dry-Run Test Payload (Industry Agnostic)
                    </span>
                    <button
                      type="button"
                      onClick={() => setUseCustomJson(!useCustomJson)}
                      className="text-[11px] text-[#3B66DE] hover:underline font-semibold"
                    >
                      {useCustomJson ? 'Use Template Scenarios' : 'Paste Custom JSON'}
                    </button>
                  </div>

                  {!useCustomJson ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {Object.entries(SAMPLE_WEBHOOK_TEMPLATES)
                        .filter(([k]) => ['contactLead', 'ecommerceOrder', 'supportTicket', 'saasSignup', 'serviceAppointment', 'bookingConfirmed', 'bookingCancelled', 'bookingRescheduled'].includes(k))
                        .slice(0, 6)
                        .map(([key, template]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setDryRunPayloadKey(key)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                              dryRunPayloadKey === key
                                ? 'bg-[#182033] text-white shadow-2xs'
                                : 'bg-white border border-[#E9E5E4] text-[#667085] hover:text-[#182033]'
                            }`}
                          >
                            {template.name.split(' (')[0]}
                          </button>
                        ))}
                    </div>
                  ) : (
                    <div>
                      <textarea
                        rows={3}
                        value={customDryRunJson}
                        onChange={(e) => setCustomDryRunJson(e.target.value)}
                        placeholder='{"status": "confirmed", "email": "user@example.com", "name": "Jane"}'
                        className="w-full px-3 py-2 rounded-lg border border-[#E9E5E4] bg-white text-xs font-mono"
                      />
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleRunDryRun}
                      disabled={isRunningDryRun}
                      className="px-4 py-2 rounded-lg bg-[#3B66DE] hover:bg-[#2D54C4] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{isRunningDryRun ? 'Simulating Flow...' : 'Execute Dry-Run'}</span>
                    </button>
                  </div>
                </div>

                {dryRunResult && (
                  <div className="space-y-3 border border-[#E9E5E4] rounded-xl p-4 bg-white shadow-2xs">
                    {/* Status Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#F0ECE9]">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            dryRunResult.status === 'SUCCESS'
                              ? 'bg-[#EAF7F0] text-[#22A06B]'
                              : 'bg-[#FEF3F2] text-[#D92D20]'
                          }`}
                        >
                          {dryRunResult.status === 'SUCCESS' ? 'SUCCESS (Dry-Run)' : 'UNMATCHED / TERMINATED (Dry-Run)'}
                        </span>
                        <span className="text-xs font-bold text-[#182033]">
                          Selected Branch:{' '}
                          <b className={dryRunResult.selectedBranchName ? 'text-[#3B66DE]' : 'text-[#D92D20]'}>
                            {dryRunResult.selectedBranchName || 'None (Safe Unmatched)'}
                          </b>
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-[#22A06B] font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>0 Tasks Consumed (Dry-Run Mode)</span>
                      </div>
                    </div>

                    {/* Unmatched / Error Notice */}
                    {dryRunResult.status !== 'SUCCESS' && dryRunResult.error && (
                      <div className="p-3 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-xs text-[#B42318] flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">Safe Workflow Termination:</span>
                          <span>{dryRunResult.error}</span>
                        </div>
                      </div>
                    )}

                    {/* Step Execution Trace */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-[#667085]">Step Execution Trace</span>
                      <div className="space-y-1 font-mono text-[11px]">
                        {dryRunResult.stepLogs?.map((log: any) => (
                          <div
                            key={log.stepNumber}
                            className="p-2 rounded-lg bg-[#FAF9F8] border border-[#F0ECE9] flex items-center justify-between"
                          >
                            <span className="font-semibold text-[#182033]">
                              Step {log.stepNumber}: {log.stepName}
                            </span>
                            <span
                              className={`font-bold uppercase text-[10px] ${
                                log.status === 'SUCCESS'
                                  ? 'text-[#22A06B]'
                                  : log.status === 'FAILED'
                                  ? 'text-[#D92D20]'
                                  : 'text-[#98A2B3]'
                              }`}
                            >
                              {log.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rendered Email Preview */}
                    {dryRunResult.renderedEmail && (
                      <div className="space-y-1.5 pt-2 border-t border-[#F0ECE9]">
                        <span className="text-[11px] font-bold text-[#667085]">Rendered Email Preview</span>
                        <div className="bg-[#FAF9F8] p-3 rounded-xl border border-[#E9E5E4] space-y-1.5 text-xs">
                          <p>
                            <b className="text-[#667085]">To:</b>{' '}
                            <span className="font-mono text-[#182033]">{dryRunResult.renderedEmail.to}</span>
                          </p>
                          {dryRunResult.renderedEmail.fromName && (
                            <p>
                              <b className="text-[#667085]">From:</b>{' '}
                              <span className="text-[#182033]">{dryRunResult.renderedEmail.fromName}</span>
                            </p>
                          )}
                          <p>
                            <b className="text-[#667085]">Subject:</b>{' '}
                            <span className="font-bold text-[#182033]">{dryRunResult.renderedEmail.subject}</span>
                          </p>
                          <div className="mt-1 pt-1 border-t border-[#F0ECE9] whitespace-pre-wrap font-sans text-[#182033]">
                            {dryRunResult.renderedEmail.body}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#F0ECE9] bg-[#FAF9F8] flex items-center justify-between">
          <p className="text-[11px] text-[#667085]">
            Conditions evaluate incoming webhooks dynamically without consuming tasks in dry-run mode.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E9E5E4] hover:bg-white text-xs font-semibold text-[#667085] hover:text-[#182033] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveConfiguration}
              className="px-4 py-2 rounded-xl bg-[#22A06B] hover:bg-[#1B8357] text-white text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Condition</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
