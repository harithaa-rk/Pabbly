'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Check,
  X,
  AlertCircle,
  Variable,
  ExternalLink,
  Sparkles,
  Send,
  Reply,
  Users,
  Eye,
} from 'lucide-react';
import { connectionService, GmailConnection } from '../../services/connectionService';
import { WorkflowNode } from '../../store/workflowStore';
import { cn } from '../../lib/utils';

interface GmailActionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  node: WorkflowNode;
  triggerNode?: WorkflowNode;
  onSave: (nodeId: string, updates: Partial<WorkflowNode>) => void;
}

export const GmailActionConfigModal: React.FC<GmailActionConfigModalProps> = ({
  isOpen,
  onClose,
  workflowId,
  node,
  triggerNode,
  onSave,
}) => {
  const [connections, setConnections] = useState<GmailConnection[]>([]);
  const [connectionId, setConnectionId] = useState<string>(
    node.config?.connectionId || ''
  );
  const [actionType, setActionType] = useState<'send' | 'reply' | 'reply_all'>(
    node.config?.actionType || 'send'
  );

  const [to, setTo] = useState<string>(node.config?.to || (triggerNode?.app === 'Gmail' ? '{{1.from}}' : '{{1.email}}'));
  const [cc, setCc] = useState<string>(node.config?.cc || '');
  const [bcc, setBcc] = useState<string>(node.config?.bcc || '');
  const [subject, setSubject] = useState<string>(
    node.config?.subject || (actionType === 'send' ? 'Welcome to KAIRA Connect' : 'Re: {{1.subject}}')
  );
  const [body, setBody] = useState<string>(
    node.config?.body || 'Hello {{1.fullName}},\n\nThank you for reaching out. We have received your request.'
  );
  const [messageId, setMessageId] = useState<string>(
    node.config?.messageId || '{{1.messageId}}'
  );
  const [threadId, setThreadId] = useState<string>(
    node.config?.threadId || '{{1.threadId}}'
  );
  const [fromName, setFromName] = useState<string>(
    node.config?.fromName || 'KAIRA Automation'
  );

  const [dryRunPreview, setDryRunPreview] = useState<{
    renderedTo: string;
    renderedSubject: string;
    renderedBody: string;
  } | null>(null);

  // Load Gmail accounts
  useEffect(() => {
    if (!isOpen) return;
    connectionService.getGmailConnections().then((conns) => {
      setConnections(conns);
      if (conns.length > 0 && !connectionId) {
        setConnectionId(conns[0].id);
      }
    });
  }, [isOpen, connectionId]);

  if (!isOpen) return null;

  const handleConnectNew = async () => {
    const url = await connectionService.getGmailAuthUrl();
    window.open(url, '_blank', 'width=600,height=700');
  };

  // Available upstream variables from trigger
  const availableVariables = [
    { label: 'Sender Email / User Email', token: triggerNode?.app === 'Gmail' ? '{{1.from}}' : '{{1.email}}' },
    { label: 'Full Name', token: '{{1.fullName}}' },
    { label: 'Subject', token: '{{1.subject}}' },
    { label: 'Message ID', token: '{{1.messageId}}' },
    { label: 'Thread ID', token: '{{1.threadId}}' },
    { label: 'Snippet / Summary', token: '{{1.snippet}}' },
  ];

  const handleInsertToken = (token: string, targetField: 'to' | 'subject' | 'body') => {
    if (targetField === 'to') setTo((prev) => (prev ? `${prev}, ${token}` : token));
    if (targetField === 'subject') setSubject((prev) => `${prev} ${token}`);
    if (targetField === 'body') setBody((prev) => `${prev} ${token}`);
  };

  const handleDryRun = () => {
    // Generate dry-run preview with substituted values
    const interpolate = (str: string) => {
      return str
        .replace(/\{\{1\.email\}\}/g, 'user@example.com')
        .replace(/\{\{1\.from\}\}/g, 'client@firm.com')
        .replace(/\{\{1\.fullName\}\}/g, 'Alex Morgan')
        .replace(/\{\{1\.subject\}\}/g, 'Project Consultation')
        .replace(/\{\{1\.messageId\}\}/g, '18dc7a1b4e2f901a')
        .replace(/\{\{1\.threadId\}\}/g, '18dc7a1b4e2f901a');
    };

    setDryRunPreview({
      renderedTo: interpolate(to),
      renderedSubject: interpolate(subject),
      renderedBody: interpolate(body),
    });
  };

  const handleSave = () => {
    const selectedConn = connections.find((c) => c.id === connectionId);
    const actionLabel =
      actionType === 'send'
        ? 'Send Email'
        : actionType === 'reply'
        ? 'Reply to Email'
        : 'Reply All';

    onSave(node.id, {
      app: 'Gmail',
      event: `${actionLabel} via ${selectedConn?.email || 'Gmail API'}`,
      status: 'configured',
      config: {
        connectionId,
        accountEmail: selectedConn?.email || '',
        actionType,
        to,
        cc: cc || undefined,
        bcc: bcc || undefined,
        subject,
        body,
        fromName,
        messageId: actionType !== 'send' ? messageId : undefined,
        threadId: actionType !== 'send' ? threadId : undefined,
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#E9E5E4] shadow-2xl max-w-xl w-full p-6 space-y-4 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE9]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FEECEB] border border-[#EA4335]/30 text-[#EA4335] flex items-center justify-center shadow-2xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#182033]">Configure Gmail Action</h3>
              <p className="text-[11px] text-[#667085]">Step {node.stepNumber} • Send or reply via Gmail API</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#98A2B3] hover:text-[#182033] hover:bg-[#FFF7F4] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Account Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#182033]">Gmail Account</label>
            <button
              type="button"
              onClick={handleConnectNew}
              className="text-[11px] font-semibold text-[#EA4335] hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              + Connect New Account
            </button>
          </div>

          {connections.length > 0 ? (
            <select
              value={connectionId}
              onChange={(e) => setConnectionId(e.target.value)}
              className="w-full text-xs font-medium rounded-xl border border-[#E9E5E4] p-2.5 bg-white text-[#182033] focus:outline-none focus:border-[#EA4335]"
            >
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.email} (Connected)
                </option>
              ))}
            </select>
          ) : (
            <div className="p-3 bg-[#FFF5F5] rounded-xl border border-[#FED7D7] flex items-center justify-between">
              <span className="text-xs text-[#C53030]">No connected Gmail account found</span>
              <button
                type="button"
                onClick={handleConnectNew}
                className="px-2.5 py-1 rounded-lg bg-[#EA4335] text-white text-[11px] font-semibold hover:bg-[#D93025] transition-colors"
              >
                Connect Now
              </button>
            </div>
          )}
        </div>

        {/* 2. Action Type Switcher */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#182033]">Action Type</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'send', label: 'Send Email', icon: Send },
              { id: 'reply', label: 'Reply', icon: Reply },
              { id: 'reply_all', label: 'Reply All', icon: Users },
            ].map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => {
                    setActionType(act.id as any);
                    if (act.id !== 'send' && !subject.startsWith('Re:')) {
                      setSubject('Re: {{1.subject}}');
                    }
                  }}
                  className={cn(
                    'p-2 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all',
                    actionType === act.id
                      ? 'border-[#EA4335] bg-[#FEECEB]/40 text-[#EA4335] ring-1 ring-[#EA4335]'
                      : 'border-[#E9E5E4] text-[#667085] hover:bg-[#FAF9F8]'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {act.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Variables Quick Helper */}
        <div className="bg-[#FAF9F8] p-2 rounded-xl border border-[#E9E5E4] flex items-center justify-between gap-2 overflow-x-auto text-[11px]">
          <span className="font-semibold text-[#667085] shrink-0 flex items-center gap-1">
            <Variable className="w-3 h-3 text-[#EA4335]" />
            Insert Variable:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {availableVariables.map((v) => (
              <button
                key={v.token}
                type="button"
                onClick={() => handleInsertToken(v.token, 'body')}
                className="px-2 py-0.5 rounded-md bg-white border border-[#E9E5E4] hover:border-[#EA4335] hover:text-[#EA4335] text-[#182033] font-mono text-[10px] transition-colors"
                title={`Insert ${v.token} into body`}
              >
                {v.token}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Action Fields */}
        <div className="space-y-3">
          {actionType === 'send' ? (
            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-bold text-[#182033] block">To (Recipient)</label>
                <input
                  type="text"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="e.g. {{1.email}} or client@example.com"
                  className="w-full text-xs font-mono rounded-xl border border-[#E9E5E4] p-2 focus:outline-none focus:border-[#EA4335]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-[#182033] block">CC (Optional)</label>
                  <input
                    type="text"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="e.g. manager@example.com"
                    className="w-full text-xs font-mono rounded-xl border border-[#E9E5E4] p-2 focus:outline-none focus:border-[#EA4335]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#182033] block">BCC (Optional)</label>
                  <input
                    type="text"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="e.g. audit@example.com"
                    className="w-full text-xs font-mono rounded-xl border border-[#E9E5E4] p-2 focus:outline-none focus:border-[#EA4335]"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-[#182033] block">Original Message ID</label>
                <input
                  type="text"
                  value={messageId}
                  onChange={(e) => setMessageId(e.target.value)}
                  placeholder="{{1.messageId}}"
                  className="w-full text-xs font-mono rounded-xl border border-[#E9E5E4] p-2 focus:outline-none focus:border-[#EA4335]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#182033] block">Original Thread ID</label>
                <input
                  type="text"
                  value={threadId}
                  onChange={(e) => setThreadId(e.target.value)}
                  placeholder="{{1.threadId}}"
                  className="w-full text-xs font-mono rounded-xl border border-[#E9E5E4] p-2 focus:outline-none focus:border-[#EA4335]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-[#182033] block">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email Subject"
              className="w-full text-xs rounded-xl border border-[#E9E5E4] p-2 focus:outline-none focus:border-[#EA4335]"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#182033] block">Message Body</label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email body here. Use {{1.fieldName}} for dynamic values."
              className="w-full text-xs rounded-xl border border-[#E9E5E4] p-2.5 focus:outline-none focus:border-[#EA4335]"
            />
          </div>
        </div>

        {/* 5. Dry Run Preview Box */}
        {dryRunPreview && (
          <div className="bg-[#FAF9F8] p-3 rounded-xl border border-[#E9E5E4] space-y-1 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#067647] flex items-center gap-1">
              <Check className="w-3 h-3 text-[#12B76A]" />
              Dry-Run Output (0 Tasks Deducted)
            </span>
            <p className="font-semibold text-[#182033]">To: {dryRunPreview.renderedTo}</p>
            <p className="font-semibold text-[#182033]">Subject: {dryRunPreview.renderedSubject}</p>
            <p className="text-[#667085] whitespace-pre-wrap text-[11px] pt-1 border-t border-[#F0ECE9]">
              {dryRunPreview.renderedBody}
            </p>
          </div>
        )}

        {/* Modal Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE9]">
          <button
            type="button"
            onClick={handleDryRun}
            className="px-3 py-1.5 rounded-xl border border-[#E9E5E4] hover:border-[#EA4335] text-xs font-semibold text-[#182033] hover:text-[#EA4335] flex items-center gap-1.5 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Dry-Run Test
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#667085] hover:bg-[#FAF9F8] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#EA4335] hover:bg-[#D93025] text-white text-xs font-bold transition-colors shadow-2xs"
            >
              Save Step
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
