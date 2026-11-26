'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Webhook,
  Copy,
  Check,
  Radio,
  FileCode,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Code,
  Table,
} from 'lucide-react';
import {
  SAMPLE_WEBHOOK_TEMPLATES,
  extractFieldsFromPayload,
  WebhookField,
  frontendWebhookService,
} from '../../services/webhookService';
import { WorkflowNode } from '../../store/workflowStore';

interface WebhookConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  node: WorkflowNode;
  onSave: (nodeId: string, updates: Partial<WorkflowNode>) => void;
}

export const WebhookConfigModal: React.FC<WebhookConfigModalProps> = ({
  isOpen,
  onClose,
  workflowId,
  node,
  onSave,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [urlType, setUrlType] = useState<'cloud' | 'local'>('cloud');
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState<'templates' | 'custom'>('templates');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('contactForm');
  const [customJsonInput, setCustomJsonInput] = useState<string>('');
  const [customJsonError, setCustomJsonError] = useState<string | null>(null);

  // Current captured payload and extracted fields
  const [currentPayload, setCurrentPayload] = useState<Record<string, any> | null>(() => {
    return node.config?.samplePayload || SAMPLE_WEBHOOK_TEMPLATES.contactForm.payload;
  });

  const [detectedFields, setDetectedFields] = useState<WebhookField[]>(() => {
    if (node.config?.detectedFields && Array.isArray(node.config.detectedFields)) {
      return node.config.detectedFields;
    }
    return extractFieldsFromPayload(SAMPLE_WEBHOOK_TEMPLATES.contactForm.payload);
  });

  const [showJsonRaw, setShowJsonRaw] = useState(false);

  // Polling ref for listening mode
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const cloudWebhookUrl = `https://api.kairaconnect.com/v1/wh/${workflowId}`;
  const localWebhookUrl = `http://localhost:5000/api/webhooks/${workflowId}`;
  const activeWebhookUrl = urlType === 'cloud' ? cloudWebhookUrl : localWebhookUrl;

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(activeWebhookUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleStartListening = () => {
    setIsListening(true);

    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }

    // Poll backend every 2s for latest webhook payload
    pollTimerRef.current = setInterval(async () => {
      const payload = await frontendWebhookService.getLatestPayload(workflowId);
      if (payload) {
        setCurrentPayload(payload);
        const fields = extractFieldsFromPayload(payload);
        setDetectedFields(fields);
        setIsListening(false);
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
        }
      }
    }, 2000);
  };

  const handleStopListening = () => {
    setIsListening(false);
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }
  };

  const handleSelectTemplate = (templateKey: keyof typeof SAMPLE_WEBHOOK_TEMPLATES) => {
    setSelectedTemplateKey(templateKey);
    const template = SAMPLE_WEBHOOK_TEMPLATES[templateKey];
    if (template) {
      setCurrentPayload(template.payload);
      setDetectedFields(extractFieldsFromPayload(template.payload));
      setCustomJsonError(null);
    }
  };

  const handleApplyCustomJson = () => {
    try {
      const parsed = JSON.parse(customJsonInput);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setCustomJsonError('Payload must be a valid JSON object (e.g. { "name": "value" })');
        return;
      }
      setCustomJsonError(null);
      setCurrentPayload(parsed);
      setDetectedFields(extractFieldsFromPayload(parsed));
    } catch (e: any) {
      setCustomJsonError('Invalid JSON format: ' + (e?.message || 'Check syntax'));
    }
  };

  const handleSaveConfiguration = () => {
    onSave(node.id, {
      app: 'Webhook',
      event: 'Catch Hook (Instant)',
      status: 'configured',
      title: 'Webhook: Catch Hook',
      subtitle: `Captured ${detectedFields.length} fields`,
      config: {
        webhookUrl: activeWebhookUrl,
        samplePayload: currentPayload,
        detectedFields: detectedFields,
        sampleData: currentPayload,
        configuredAt: new Date().toISOString(),
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-[#E9E5E4] shadow-2xl max-w-2xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#F0ECE9] flex items-center justify-between bg-[#FFFDFB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF0F5] border border-[#E85D8A]/20 text-[#E85D8A] flex items-center justify-center shrink-0">
              <Webhook className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#182033]">
                  Configure Webhook Trigger
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF7F0] text-[#22A06B] border border-[#22A06B]/20">
                  Instant Trigger
                </span>
              </div>
              <p className="text-xs text-[#667085]">
                Step 1: Receive incoming data from any application via HTTP POST
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
        <div className="px-6 py-5 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Section 1: Unique Webhook URL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#182033] flex items-center gap-1.5">
                <span>Unique Webhook URL</span>
                <span className="text-[10px] text-[#E85D8A] font-semibold bg-[#FFF0F5] px-1.5 py-0.5 rounded">
                  Workflow Target
                </span>
              </label>

              {/* URL selector toggle */}
              <div className="flex items-center gap-1 bg-[#FAF9F8] p-0.5 rounded-lg border border-[#F0ECE9] text-[11px]">
                <button
                  type="button"
                  onClick={() => setUrlType('cloud')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                    urlType === 'cloud'
                      ? 'bg-white shadow-2xs text-[#182033]'
                      : 'text-[#667085] hover:text-[#182033]'
                  }`}
                >
                  Cloud Endpoint
                </button>
                <button
                  type="button"
                  onClick={() => setUrlType('local')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                    urlType === 'local'
                      ? 'bg-white shadow-2xs text-[#182033]'
                      : 'text-[#667085] hover:text-[#182033]'
                  }`}
                >
                  Local API (5000)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#FAF9F8] border border-[#E9E5E4] rounded-xl px-3.5 py-2 font-mono text-xs text-[#182033] select-all truncate">
                {activeWebhookUrl}
              </div>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="px-3 py-2 rounded-xl border border-[#E9E5E4] hover:border-[#E85D8A] bg-white hover:bg-[#FFF0F5] text-xs font-semibold text-[#182033] hover:text-[#E85D8A] flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#22A06B]" />
                    <span className="text-[#22A06B]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-[#667085]">
              Copy and paste this webhook URL into your trigger source (e.g. form submission, payment gateway, or cURL).
            </p>
          </div>

          {/* Section 2: Sample Payload Capture & Mode Selection */}
          <div className="space-y-3 pt-2 border-t border-[#F0ECE9]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#182033]">
                Sample Payload Detection
              </label>

              {/* Live listener button */}
              {isListening ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E85D8A] bg-[#FFF0F5] px-2.5 py-1 rounded-lg border border-[#E85D8A]/20 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Waiting for Webhook Response...</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleStopListening}
                    className="text-[11px] font-semibold text-[#D92D20] hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleStartListening}
                  className="px-3 py-1 rounded-lg bg-[#FAF9F8] border border-[#E9E5E4] hover:border-[#E85D8A] hover:bg-[#FFF0F5] text-xs font-semibold text-[#182033] hover:text-[#E85D8A] flex items-center gap-1.5 transition-colors"
                >
                  <Radio className="w-3 h-3 text-[#E85D8A]" />
                  <span>Capture Live Webhook Response</span>
                </button>
              )}
            </div>

            {/* Tabs for Template vs Custom JSON */}
            <div className="flex items-center gap-2 border-b border-[#F0ECE9] pb-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('templates')}
                className={`flex items-center gap-1.5 font-bold pb-1 transition-colors border-b-2 ${
                  activeTab === 'templates'
                    ? 'border-[#E85D8A] text-[#E85D8A]'
                    : 'border-transparent text-[#667085] hover:text-[#182033]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pre-built Payload Templates</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('custom')}
                className={`flex items-center gap-1.5 font-bold pb-1 transition-colors border-b-2 ${
                  activeTab === 'custom'
                    ? 'border-[#E85D8A] text-[#E85D8A]'
                    : 'border-transparent text-[#667085] hover:text-[#182033]'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Paste Custom JSON</span>
              </button>
            </div>

            {/* Template options */}
            {activeTab === 'templates' ? (
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(SAMPLE_WEBHOOK_TEMPLATES).map(([key, item]) => {
                  const isSelected = selectedTemplateKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectTemplate(key as keyof typeof SAMPLE_WEBHOOK_TEMPLATES)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-[#E85D8A] bg-[#FFF0F5] shadow-2xs'
                          : 'border-[#E9E5E4] bg-white hover:border-[#D0C9C7]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085]">
                          Sample Template
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-3 h-3 text-[#E85D8A]" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-[#182033] block">
                        {item.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={customJsonInput}
                  onChange={(e) => setCustomJsonInput(e.target.value)}
                  placeholder={`{\n  "name": "Alex Carter",\n  "email": "alex@example.com",\n  "plan": "Pro"\n}`}
                  rows={4}
                  className="w-full font-mono text-xs p-3 rounded-xl border border-[#E9E5E4] focus:border-[#E85D8A] focus:ring-1 focus:ring-[#E85D8A] outline-hidden bg-[#FAF9F8]"
                />
                {customJsonError && (
                  <p className="text-[11px] text-[#D92D20] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {customJsonError}
                  </p>
                )}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleApplyCustomJson}
                    className="px-3 py-1.5 rounded-lg bg-[#182033] hover:bg-[#E85D8A] text-white text-xs font-semibold transition-colors"
                  >
                    Parse & Detect Fields
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Detected Fields Display */}
          <div className="space-y-3 pt-2 border-t border-[#F0ECE9]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[#182033]">
                  Detected Payload Fields
                </label>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF0F5] text-[#E85D8A] border border-[#E85D8A]/20">
                  {detectedFields.length} Parameters Available
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowJsonRaw(!showJsonRaw)}
                className="text-[11px] font-semibold text-[#667085] hover:text-[#182033] flex items-center gap-1"
              >
                {showJsonRaw ? (
                  <>
                    <Table className="w-3 h-3" />
                    <span>View Table</span>
                  </>
                ) : (
                  <>
                    <Code className="w-3 h-3" />
                    <span>View Raw JSON</span>
                  </>
                )}
              </button>
            </div>

            {showJsonRaw ? (
              <pre className="p-3 bg-[#182033] text-[#A6E3A1] rounded-xl text-xs font-mono max-h-48 overflow-auto border border-[#313244]">
                {JSON.stringify(currentPayload, null, 2)}
              </pre>
            ) : (
              <div className="border border-[#E9E5E4] rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#FAF9F8] text-[#667085] border-b border-[#F0ECE9] sticky top-0">
                    <tr>
                      <th className="py-2 px-3 font-bold text-[11px]">Parameter Key</th>
                      <th className="py-2 px-2 font-bold text-[11px] w-20">Data Type</th>
                      <th className="py-2 px-3 font-bold text-[11px]">Captured Sample Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0ECE9]">
                    {detectedFields.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-xs text-[#98A2B3]">
                          No payload fields detected yet. Select a template or send a webhook test.
                        </td>
                      </tr>
                    ) : (
                      detectedFields.map((field) => (
                        <tr key={field.key} className="hover:bg-[#FFFDFB] transition-colors">
                          <td className="py-2 px-3 font-mono font-bold text-[#E85D8A] text-[11px]">
                            {field.key}
                          </td>
                          <td className="py-2 px-2">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-[#FAF9F8] text-[#667085] border border-[#E9E5E4]">
                              {field.type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[#182033] font-mono text-[11px] truncate max-w-[200px]">
                            {String(field.value)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#F0ECE9] bg-[#FAF9F8] flex items-center justify-between">
          <p className="text-[11px] text-[#667085]">
            Webhook trigger will supply sample variables to subsequent steps.
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
              className="px-4 py-2 rounded-xl bg-[#E85D8A] hover:bg-[#D94C79] text-white text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save & Continue</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
