'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Check,
  X,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Search,
  ExternalLink,
  Variable,
  Clock,
  Layers,
} from 'lucide-react';
import { connectionService, GmailConnection } from '../../services/connectionService';
import { WorkflowNode } from '../../store/workflowStore';
import { cn } from '../../lib/utils';

interface GmailTriggerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  node: WorkflowNode;
  onSave: (nodeId: string, updates: Partial<WorkflowNode>) => void;
}

export const GmailTriggerConfigModal: React.FC<GmailTriggerConfigModalProps> = ({
  isOpen,
  onClose,
  workflowId,
  node,
  onSave,
}) => {
  const [connections, setConnections] = useState<GmailConnection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>(
    node.config?.connectionId || ''
  );
  const [triggerEvent, setTriggerEvent] = useState<'new_email' | 'search_filter' | 'sender_filter'>(
    node.config?.triggerEvent || 'new_email'
  );
  const [searchQuery, setSearchQuery] = useState<string>(
    node.config?.searchQuery || 'label:INBOX is:unread'
  );
  const [senderEmail, setSenderEmail] = useState<string>(
    node.config?.senderEmail || ''
  );
  const [subjectFilter, setSubjectFilter] = useState<string>(
    node.config?.subjectFilter || ''
  );

  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [isTestingTrigger, setIsTestingTrigger] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [sampleData, setSampleData] = useState<Record<string, any> | null>(
    node.config?.samplePayload || null
  );

  // Load existing Gmail connections
  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingConnections(true);
    connectionService.getGmailConnections().then((conns) => {
      setConnections(conns);
      if (conns.length > 0 && !selectedConnectionId) {
        setSelectedConnectionId(conns[0].id);
      }
      setIsLoadingConnections(false);
    });
  }, [isOpen, selectedConnectionId]);

  if (!isOpen) return null;

  const handleConnectNew = async () => {
    const url = await connectionService.getGmailAuthUrl();
    window.open(url, '_blank', 'width=600,height=700');
  };

  const handleTestTrigger = () => {
    setIsTestingTrigger(true);
    setTimeout(() => {
      const sample = {
        from: senderEmail ? `Client <${senderEmail}>` : 'Alex Morgan <alex.morgan@clientfirm.com>',
        to: 'me@kairaconnect.com',
        cc: 'operations@clientfirm.com',
        subject: subjectFilter ? `${subjectFilter} - Inquiry` : 'New Project Requirements Review',
        date: new Date().toUTCString(),
        snippet: 'Hi team, please find attached the reviewed contract and technical specifications...',
        bodyText: 'Hi team,\n\nPlease find attached the reviewed contract and technical specifications for the upcoming sprint.\n\nBest regards,\nAlex',
        messageId: '18dc7a1b4e2f901a',
        threadId: '18dc7a1b4e2f901a',
      };
      setSampleData(sample);
      setIsTestingTrigger(false);
      setTestSuccess(true);
    }, 600);
  };

  const handleSave = () => {
    const selectedConn = connections.find((c) => c.id === selectedConnectionId);
    const eventName =
      triggerEvent === 'new_email'
        ? 'New Email Received'
        : triggerEvent === 'search_filter'
        ? 'Email Matching Search'
        : 'Email from Sender';

    const sample = sampleData || {
      from: 'alex.morgan@clientfirm.com',
      to: 'me@kairaconnect.com',
      subject: 'New Project Contract',
      bodyText: 'Sample email body for mapping.',
      snippet: 'Sample email snippet...',
      messageId: '18dc7a1b4e2f901a',
      threadId: '18dc7a1b4e2f901a',
    };

    onSave(node.id, {
      app: 'Gmail',
      event: `${eventName} (${selectedConn?.email || 'Connected Account'})`,
      status: 'configured',
      config: {
        connectionId: selectedConnectionId,
        accountEmail: selectedConn?.email || '',
        triggerEvent,
        searchQuery: triggerEvent === 'search_filter' ? searchQuery : undefined,
        senderEmail: triggerEvent === 'sender_filter' ? senderEmail : undefined,
        subjectFilter: subjectFilter || undefined,
        samplePayload: sample,
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#E9E5E4] shadow-2xl max-w-lg w-full p-6 space-y-5 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE9]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FEECEB] border border-[#EA4335]/30 text-[#EA4335] flex items-center justify-center shadow-2xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#182033]">Configure Gmail Trigger</h3>
              <p className="text-[11px] text-[#667085]">Step {node.stepNumber} • Ingest incoming Gmail messages</p>
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

        {/* Polling Notice Banner */}
        <div className="bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-3 flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-[#495057] shrink-0 mt-0.5" />
          <div className="text-[11px] text-[#495057]">
            <span className="font-bold">Polling-Based Trigger:</span> KAIRA Connect checks your Gmail mailbox at regular intervals (every 5 minutes in production) and processes newly arrived matching emails.
          </div>
        </div>

        {/* 1. Account Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#182033]">Select Gmail Account</label>
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
              value={selectedConnectionId}
              onChange={(e) => setSelectedConnectionId(e.target.value)}
              className="w-full text-xs font-medium rounded-xl border border-[#E9E5E4] p-2.5 bg-white text-[#182033] focus:outline-none focus:border-[#EA4335]"
            >
              {connections.map((conn) => (
                <option key={conn.id} value={conn.id}>
                  {conn.email} ({conn.status})
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

        {/* 2. Trigger Event Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#182033]">Trigger Event</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'new_email', label: 'New Email', desc: 'Any new message in Inbox' },
              { id: 'search_filter', label: 'Search Query', desc: 'Matches Gmail query' },
              { id: 'sender_filter', label: 'Specific Sender', desc: 'From email address' },
            ].map((evt) => (
              <button
                key={evt.id}
                type="button"
                onClick={() => setTriggerEvent(evt.id as any)}
                className={cn(
                  'p-2.5 rounded-xl border text-left transition-all',
                  triggerEvent === evt.id
                    ? 'border-[#EA4335] bg-[#FEECEB]/40 ring-1 ring-[#EA4335]'
                    : 'border-[#E9E5E4] hover:bg-[#FAF9F8]'
                )}
              >
                <span className="text-xs font-bold text-[#182033] block">{evt.label}</span>
                <span className="text-[10px] text-[#667085] block mt-0.5">{evt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Conditional Parameters */}
        {triggerEvent === 'search_filter' && (
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#182033]">Gmail Search Query</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. has:attachment label:INBOX from:vendor"
              className="w-full text-xs font-mono rounded-xl border border-[#E9E5E4] p-2.5 focus:outline-none focus:border-[#EA4335]"
            />
            <p className="text-[10px] text-[#667085]">Uses native Gmail search syntax operators (has:, label:, from:, is:unread).</p>
          </div>
        )}

        {triggerEvent === 'sender_filter' && (
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#182033]">Sender Email Address</label>
            <input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="e.g. client@example.com"
              className="w-full text-xs font-medium rounded-xl border border-[#E9E5E4] p-2.5 focus:outline-none focus:border-[#EA4335]"
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold text-[#182033]">Subject Filter (Optional)</label>
          <input
            type="text"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            placeholder="e.g. Invoice, Urgent, Booking"
            className="w-full text-xs rounded-xl border border-[#E9E5E4] p-2.5 focus:outline-none focus:border-[#EA4335]"
          />
        </div>

        {/* 4. Sample Data Capture */}
        <div className="space-y-2 pt-2 border-t border-[#F0ECE9]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#182033] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#EA4335]" />
              Captured Email Variables
            </span>
            <button
              type="button"
              onClick={handleTestTrigger}
              disabled={isTestingTrigger}
              className="px-2.5 py-1 rounded-lg bg-[#FAF9F8] border border-[#E9E5E4] text-[11px] font-semibold text-[#182033] hover:border-[#EA4335] hover:text-[#EA4335] flex items-center gap-1 transition-colors"
            >
              <RefreshCw className={cn('w-3 h-3', isTestingTrigger && 'animate-spin')} />
              {isTestingTrigger ? 'Polling...' : 'Fetch Test Sample'}
            </button>
          </div>

          <div className="bg-[#FAF9F8] rounded-xl border border-[#E9E5E4] p-3 text-xs space-y-1.5 font-mono max-h-36 overflow-y-auto">
            <div className="flex justify-between text-[#667085] text-[11px] pb-1 border-b border-[#F0ECE9]">
              <span>Variable Token</span>
              <span>Sample Value</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#EA4335] font-bold">{'{{1.from}}'}</span>
              <span className="text-[#182033] truncate max-w-[200px]">{sampleData?.from || 'Alex <alex@example.com>'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#EA4335] font-bold">{'{{1.subject}}'}</span>
              <span className="text-[#182033] truncate max-w-[200px]">{sampleData?.subject || 'Project Requirements'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#EA4335] font-bold">{'{{1.snippet}}'}</span>
              <span className="text-[#182033] truncate max-w-[200px]">{sampleData?.snippet || 'Hi team, please find...'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#EA4335] font-bold">{'{{1.threadId}}'}</span>
              <span className="text-[#182033] truncate max-w-[200px]">{sampleData?.threadId || '18dc7a1b4e2f901a'}</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F0ECE9]">
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
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
};
