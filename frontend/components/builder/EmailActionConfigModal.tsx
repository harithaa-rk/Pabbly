'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Check,
  X,
  AlertCircle,
  Eye,
  Info,
  Variable,
  Send,
  Database,
  Sparkles,
  ArrowRight,
  Server,
  Code,
  FileText,
} from 'lucide-react';
import {
  WebhookField,
  frontendWebhookService,
  EmailPreviewResult,
} from '../../services/webhookService';
import { connectionService, SmtpConnection } from '../../services/connectionService';
import { WorkflowNode } from '../../store/workflowStore';

interface EmailActionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  node: WorkflowNode;
  triggerNode?: WorkflowNode;
  onSave: (nodeId: string, updates: Partial<WorkflowNode>) => void;
}

export const EmailActionConfigModal: React.FC<EmailActionConfigModalProps> = ({
  isOpen,
  onClose,
  workflowId,
  node,
  triggerNode,
  onSave,
}) => {
  // Config state
  const [connectionId, setConnectionId] = useState<string>(node.config?.connectionId || '');
  const [to, setTo] = useState<string>(node.config?.to || '{{1.email}}');
  const [cc, setCc] = useState<string>(node.config?.cc || '');
  const [bcc, setBcc] = useState<string>(node.config?.bcc || '');
  const [subject, setSubject] = useState<string>(
    node.config?.subject || 'Notification: {{1.fullName}}'
  );
  const [bodyFormat, setBodyFormat] = useState<'text' | 'html'>('text');
  const [body, setBody] = useState<string>(
    node.config?.body ||
      'Hello {{1.fullName}},\n\nYour request has been processed successfully.\n\nBest regards,\nKAIRA Connect Team'
  );
  const [html, setHtml] = useState<string>(
    node.config?.html ||
      '<p>Hello <b>{{1.fullName}}</b>,</p><p>Your request has been processed successfully.</p><br/><p>Best regards,<br/>KAIRA Connect Team</p>'
  );
  const [fromName, setFromName] = useState<string>(node.config?.fromName || 'KAIRA Connect');
  const [fromEmail, setFromEmail] = useState<string>(node.config?.fromEmail || '');

  // Active focused input for pill insertion
  const [activeInput, setActiveInput] = useState<'to' | 'cc' | 'bcc' | 'subject' | 'body' | 'html' | 'fromName' | 'fromEmail'>('to');

  // Trigger sample data
  const triggerPayload = triggerNode?.config?.samplePayload || triggerNode?.config?.sampleData || {};
  const triggerFields: WebhookField[] = triggerNode?.config?.detectedFields || [];

  // Available SMTP Connections
  const [connections, setConnections] = useState<SmtpConnection[]>([]);

  // Live preview result
  const [preview, setPreview] = useState<EmailPreviewResult | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    connectionService.getSmtpConnections().then((conns) => {
      setConnections(conns);
      if (!connectionId && conns.length > 0) {
        setConnectionId(conns[0].id);
      }
    });
  }, []);

  // Update preview whenever inputs or trigger payload change
  useEffect(() => {
    let isCurrent = true;
    frontendWebhookService
      .previewEmailAction(
        {
          connectionId,
          to,
          cc,
          bcc,
          subject,
          body,
          html: bodyFormat === 'html' ? html : undefined,
          fromName,
          fromEmail,
        },
        triggerPayload
      )
      .then((res) => {
        if (isCurrent) {
          setPreview(res);
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [connectionId, to, cc, bcc, subject, body, html, bodyFormat, fromName, fromEmail, triggerPayload]);

  if (!isOpen) return null;

  // Insert token into active field
  const handleInsertVariable = (variableKey: string) => {
    const token = `{{1.${variableKey}}}`;
    if (activeInput === 'to') setTo((prev) => (prev ? `${prev} ${token}` : token));
    else if (activeInput === 'cc') setCc((prev) => (prev ? `${prev} ${token}` : token));
    else if (activeInput === 'bcc') setBcc((prev) => (prev ? `${prev} ${token}` : token));
    else if (activeInput === 'subject') setSubject((prev) => (prev ? `${prev} ${token}` : token));
    else if (activeInput === 'body') setBody((prev) => (prev ? `${prev} ${token}` : token));
    else if (activeInput === 'html') setHtml((prev) => (prev ? `${prev} ${token}` : token));
    else if (activeInput === 'fromName') setFromName((prev) => (prev ? `${prev} ${token}` : token));
    else if (activeInput === 'fromEmail') setFromEmail((prev) => (prev ? `${prev} ${token}` : token));
  };

  const handleSaveConfiguration = () => {
    if (!to.trim()) {
      setValidationError('Recipient "To" field is required.');
      return;
    }
    if (!subject.trim()) {
      setValidationError('Email "Subject" field is required.');
      return;
    }
    if (!body.trim() && !html.trim()) {
      setValidationError('Email body content is required.');
      return;
    }

    setValidationError(null);

    onSave(node.id, {
      app: 'Email',
      event: 'Send Email',
      status: 'configured',
      title: 'Email: Send Email',
      subtitle: `To: ${to.substring(0, 24)}...`,
      config: {
        connectionId,
        to,
        cc,
        bcc,
        subject,
        body,
        html: bodyFormat === 'html' ? html : undefined,
        fromName,
        fromEmail,
        mappedVariables: preview?.mappedVariables || [],
        configuredAt: new Date().toISOString(),
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-[#E9E5E4] shadow-2xl max-w-2xl w-full my-8 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#F0ECE9] flex items-center justify-between bg-[#FFFDFB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0F4FE] border border-[#3B66DE]/20 text-[#3B66DE] flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#182033]">
                  Configure Email Action
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0F4FE] text-[#3B66DE] border border-[#3B66DE]/20">
                  SMTP Dispatch
                </span>
              </div>
              <p className="text-xs text-[#667085]">
                Dispatch generic emails with To, CC, BCC, HTML body, and dynamic payload variables
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
        <div className="px-6 py-5 overflow-y-auto space-y-4 flex-1 text-sm">
          {/* SMTP Connection Selector Bar */}
          <div className="p-3 rounded-xl bg-[#FAF9F8] border border-[#E9E5E4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[#3B66DE] shrink-0" />
              <div>
                <span className="text-xs font-bold text-[#182033] block">SMTP Mailer Connection</span>
                <span className="text-[10px] text-[#667085]">Select which connection sends this email</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={connectionId}
                onChange={(e) => setConnectionId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[#E9E5E4] bg-white text-xs font-semibold text-[#182033] focus:border-[#3B66DE] outline-hidden min-w-[180px]"
              >
                {connections.length > 0 ? (
                  connections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.senderEmail})
                    </option>
                  ))
                ) : (
                  <option value="">Default System Mailer</option>
                )}
              </select>
            </div>
          </div>

          {/* Dynamic Variables Pill Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#182033] flex items-center gap-1.5">
                <Variable className="w-3.5 h-3.5 text-[#E85D8A]" />
                <span>Insert Dynamic Variables</span>
              </label>
              <span className="text-[10px] text-[#667085]">
                Target: <b className="text-[#182033] uppercase">{activeInput}</b>
              </span>
            </div>

            {triggerFields.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 p-2 bg-[#FAF9F8] rounded-xl border border-[#F0ECE9] max-h-20 overflow-y-auto">
                {triggerFields.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => handleInsertVariable(field.key)}
                    className="px-2 py-0.5 rounded-md bg-white hover:bg-[#FFF0F5] border border-[#E9E5E4] hover:border-[#E85D8A] text-[10px] font-mono text-[#182033] hover:text-[#E85D8A] flex items-center gap-1 transition-colors shadow-2xs group"
                    title={`Value: ${String(field.value)}`}
                  >
                    <span className="text-[#E85D8A] font-bold">+</span>
                    <span>1.{field.key}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-2.5 bg-[#FAF9F8] rounded-xl border border-[#F0ECE9] text-xs text-[#667085] flex items-center justify-between">
                <span>Variables from preceding steps map automatically (e.g. &#123;&#123;1.email&#125;&#125;).</span>
              </div>
            )}
          </div>

          {/* Form Inputs */}
          <div className="space-y-3">
            {/* Recipient To */}
            <div>
              <label className="block text-xs font-bold text-[#182033] mb-1">
                To (Recipient Email or comma-separated list) <span className="text-[#D92D20]">*</span>
              </label>
              <input
                type="text"
                value={to}
                onFocus={() => setActiveInput('to')}
                onChange={(e) => setTo(e.target.value)}
                placeholder="e.g. {{1.email}} or user1@client.com, user2@client.com"
                className="w-full px-3 py-2 rounded-xl border border-[#E9E5E4] focus:border-[#3B66DE] focus:ring-1 focus:ring-[#3B66DE] outline-hidden text-xs font-mono bg-white"
              />
            </div>

            {/* CC and BCC Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#182033] mb-1">
                  CC (Optional)
                </label>
                <input
                  type="text"
                  value={cc}
                  onFocus={() => setActiveInput('cc')}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="e.g. manager@mybusiness.com"
                  className="w-full px-3 py-1.5 rounded-xl border border-[#E9E5E4] focus:border-[#3B66DE] outline-hidden text-xs font-mono bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#182033] mb-1">
                  BCC (Optional)
                </label>
                <input
                  type="text"
                  value={bcc}
                  onFocus={() => setActiveInput('bcc')}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="e.g. audit-archive@mybusiness.com"
                  className="w-full px-3 py-1.5 rounded-xl border border-[#E9E5E4] focus:border-[#3B66DE] outline-hidden text-xs font-mono bg-white"
                />
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-bold text-[#182033] mb-1">
                Subject Line <span className="text-[#D92D20]">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onFocus={() => setActiveInput('subject')}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Order Confirmation: {{1.orderId}} for {{1.customerName}}"
                className="w-full px-3 py-2 rounded-xl border border-[#E9E5E4] focus:border-[#3B66DE] focus:ring-1 focus:ring-[#3B66DE] outline-hidden text-xs bg-white"
              />
            </div>

            {/* Sender Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#182033] mb-1">
                  From Name (Display Name)
                </label>
                <input
                  type="text"
                  value={fromName}
                  onFocus={() => setActiveInput('fromName')}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="e.g. Support Team"
                  className="w-full px-3 py-1.5 rounded-xl border border-[#E9E5E4] focus:border-[#3B66DE] outline-hidden text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#182033] mb-1">
                  Sender Email Override (Optional)
                </label>
                <input
                  type="email"
                  value={fromEmail}
                  onFocus={() => setActiveInput('fromEmail')}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="Defaults to connection sender"
                  className="w-full px-3 py-1.5 rounded-xl border border-[#E9E5E4] focus:border-[#3B66DE] outline-hidden text-xs bg-white"
                />
              </div>
            </div>

            {/* Body Content with Format Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#182033]">
                  Email Content <span className="text-[#D92D20]">*</span>
                </label>
                <div className="flex items-center rounded-lg border border-[#E9E5E4] bg-[#FAF9F8] p-0.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setBodyFormat('text')}
                    className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                      bodyFormat === 'text' ? 'bg-white text-[#182033] shadow-2xs' : 'text-[#667085]'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>Plain Text</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBodyFormat('html')}
                    className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                      bodyFormat === 'html' ? 'bg-white text-[#182033] shadow-2xs' : 'text-[#667085]'
                    }`}
                  >
                    <Code className="w-3 h-3" />
                    <span>HTML Markup</span>
                  </button>
                </div>
              </div>

              {bodyFormat === 'text' ? (
                <textarea
                  value={body}
                  onFocus={() => setActiveInput('body')}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder="Enter email content with dynamic {{1.fieldName}} variables..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E9E5E4] focus:border-[#3B66DE] outline-hidden text-xs font-sans bg-white leading-relaxed"
                />
              ) : (
                <textarea
                  value={html}
                  onFocus={() => setActiveInput('html')}
                  onChange={(e) => setHtml(e.target.value)}
                  rows={4}
                  placeholder="<p>Hello <b>{{1.fullName}}</b>,</p><p>Your order #{{1.orderId}} is confirmed.</p>"
                  className="w-full px-3 py-2 rounded-xl border border-[#E9E5E4] focus:border-[#3B66DE] outline-hidden text-xs font-mono bg-white leading-relaxed"
                />
              )}
            </div>

            {validationError && (
              <p className="text-xs text-[#D92D20] flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                {validationError}
              </p>
            )}
          </div>

          {/* Live Rendered Email Preview */}
          <div className="space-y-2 pt-2 border-t border-[#F0ECE9]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#182033] flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-[#3B66DE]" />
                  <span>Live Rendered Email Preview</span>
                </span>
                {preview?.mappedVariables && preview.mappedVariables.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF7F0] text-[#22A06B]">
                    {preview.mappedVariables.length} Tokens Interpolated
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-[11px] font-semibold text-[#667085] hover:text-[#182033]"
              >
                {showPreview ? 'Collapse Preview' : 'Show Preview'}
              </button>
            </div>

            {showPreview && preview && (
              <div className="bg-[#FAF9F8] rounded-xl border border-[#E9E5E4] p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-2 border-b border-[#F0ECE9] pb-2">
                  <span className="font-bold text-[#667085] w-14 shrink-0 text-[11px]">To:</span>
                  <span className="font-mono text-[#182033] truncate">
                    {preview.interpolatedTo || '(Empty)'}
                  </span>
                </div>
                {preview.interpolatedCc && (
                  <div className="flex items-center gap-2 border-b border-[#F0ECE9] pb-2">
                    <span className="font-bold text-[#667085] w-14 shrink-0 text-[11px]">CC:</span>
                    <span className="font-mono text-[#182033] truncate">{preview.interpolatedCc}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 border-b border-[#F0ECE9] pb-2">
                  <span className="font-bold text-[#667085] w-14 shrink-0 text-[11px]">Subject:</span>
                  <span className="font-bold text-[#182033] truncate">
                    {preview.interpolatedSubject || '(Empty)'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-[#667085] block mb-1 text-[11px]">Rendered Content:</span>
                  <div className="whitespace-pre-wrap font-sans text-xs text-[#182033] bg-white p-3 rounded-lg border border-[#F0ECE9] min-h-[60px]">
                    {bodyFormat === 'html' && preview.interpolatedHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: preview.interpolatedHtml }} />
                    ) : (
                      preview.interpolatedBody || '(Empty)'
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#F0ECE9] bg-[#FAF9F8] flex items-center justify-between">
          <p className="text-[11px] text-[#667085]">
            Saves email action configuration to workflow.
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
              className="px-4 py-2 rounded-xl bg-[#3B66DE] hover:bg-[#2D54C4] text-white text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Action</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
