'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Webhook,
  Play,
  Copy,
  Check,
  Power,
  Trash2,
  Loader2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { TriggerType, WorkflowTrigger, SaveTriggerInput } from '../../types/workflow';
import { Button } from '../ui/Button';

interface TriggerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  triggerType: TriggerType;
  existingTrigger?: WorkflowTrigger | null;
  onSave: (data: SaveTriggerInput) => Promise<void>;
  onToggleStatus: (enabled: boolean) => Promise<void>;
  onRemove: () => Promise<void>;
}

export const TriggerDrawer: React.FC<TriggerDrawerProps> = ({
  isOpen,
  onClose,
  triggerType,
  existingTrigger,
  onSave,
  onToggleStatus,
  onRemove,
}) => {
  const [name, setName] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isWebhook = triggerType === 'webhook';
  const isExisting = Boolean(existingTrigger);

  useEffect(() => {
    if (existingTrigger) {
      setName(existingTrigger.name);
      setEnabled(existingTrigger.enabled);
    } else {
      setName(isWebhook ? 'Incoming Webhook Trigger' : 'Manual Trigger');
      setEnabled(true);
    }
    setFormError(null);
    setConfirmRemoveOpen(false);
  }, [existingTrigger, triggerType, isWebhook, isOpen]);

  if (!isOpen) return null;

  const handleCopyWebhookUrl = () => {
    if (existingTrigger?.webhookUrl) {
      navigator.clipboard.writeText(existingTrigger.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setFormError('Trigger name is required');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await onSave({
        type: triggerType,
        name: cleanName,
        enabled,
        config: isWebhook ? { method: 'POST' } : {},
      });
      onClose();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save trigger');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!isExisting) {
      setEnabled(!enabled);
      return;
    }

    const nextState = !enabled;
    setStatusUpdating(true);
    try {
      await onToggleStatus(nextState);
      setEnabled(nextState);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update trigger status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleRemoveConfirm = async () => {
    setRemoving(true);
    try {
      await onRemove();
      setConfirmRemoveOpen(false);
      onClose();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to remove trigger');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-[#E9E5E4] shadow-2xl flex flex-col justify-between animate-slideLeft">
          {/* Drawer Header */}
          <div className="p-5 border-b border-[#E9E5E4] flex items-center justify-between bg-[#FFFDFB]">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isWebhook ? 'bg-[#F8DCE5] text-[#E85D8A]' : 'bg-[#E0E7FF] text-[#4F46E5]'
                }`}
              >
                {isWebhook ? <Webhook className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#182033]">
                  {isExisting ? 'Edit Trigger' : 'Configure Trigger'}
                </h3>
                <p className="text-xs text-[#667085]">
                  {isWebhook ? 'Webhook Trigger Settings' : 'Manual Trigger Settings'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#667085] hover:text-[#182033] hover:bg-[#FFF7F4] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body / Form */}
          <form id="trigger-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
            {formError && (
              <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {formError}
              </div>
            )}

            {/* Trigger Type Info Card */}
            <div className="p-3 bg-[#FFFDFB] border border-[#E9E5E4] rounded-xl flex items-center justify-between">
              <span className="text-xs font-semibold text-[#667085]">Trigger Type</span>
              <span className="text-xs font-bold text-[#182033] uppercase tracking-wider bg-white px-2.5 py-1 rounded-md border border-[#E9E5E4]">
                {isWebhook ? 'Webhook' : 'Manual'}
              </span>
            </div>

            {/* Trigger Name Field */}
            <div>
              <label className="block text-xs font-semibold text-[#182033] mb-1.5">
                Trigger Name <span className="text-[#E85D8A]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (formError) setFormError(null);
                }}
                maxLength={100}
                required
                placeholder={isWebhook ? 'e.g. Lead Registration Webhook' : 'e.g. Test Run Trigger'}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E9E5E4] rounded-lg text-[#182033] placeholder-[#98A2B3] focus:outline-none focus:border-[#E85D8A] focus:ring-1 focus:ring-[#E85D8A]"
              />
            </div>

            {/* Webhook-Specific Configuration */}
            {isWebhook && (
              <div className="space-y-4">
                {/* Method */}
                <div>
                  <label className="block text-xs font-semibold text-[#182033] mb-1.5">
                    HTTP Method
                  </label>
                  <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#F2F4F7] text-xs font-bold text-[#344054] border border-[#E9E5E4]">
                    POST
                  </div>
                </div>

                {/* Webhook URL Field */}
                <div>
                  <label className="block text-xs font-semibold text-[#182033] mb-1.5">
                    Webhook URL
                  </label>
                  {existingTrigger?.webhookUrl ? (
                    <div className="space-y-1.5">
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          readOnly
                          value={existingTrigger.webhookUrl}
                          className="w-full pr-20 pl-3 py-2 text-xs font-mono bg-[#FFFDFB] border border-[#E9E5E4] rounded-lg text-[#182033] select-all focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleCopyWebhookUrl}
                          className="absolute right-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-white border border-[#E9E5E4] hover:bg-[#FFF7F4] text-[#182033] transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#22A06B]" />
                              <span className="text-[#22A06B]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-[#667085]" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-[#667085] flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-[#98A2B3] shrink-0" />
                        Send an HTTP POST request with a JSON payload to start this workflow.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-[#FFFDFB] border border-[#E9E5E4] rounded-lg text-xs text-[#667085] flex items-start gap-2">
                      <Info className="w-4 h-4 text-[#E85D8A] shrink-0 mt-0.5" />
                      <span>
                        A unique and secure webhook URL will be generated and managed by the backend when you save this trigger.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Manual-Specific Configuration Notice */}
            {!isWebhook && (
              <div className="p-3 bg-[#FFFDFB] border border-[#E9E5E4] rounded-lg text-xs text-[#667085] flex items-start gap-2">
                <Info className="w-4 h-4 text-[#4F46E5] shrink-0 mt-0.5" />
                <span>
                  This workflow is configured for manual execution. It can be triggered on demand during testing and manual workflows.
                </span>
              </div>
            )}

            {/* Enable / Disable Status Control */}
            <div className="pt-2 border-t border-[#E9E5E4]">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-[#182033] block">
                    Trigger Status
                  </label>
                  <span className="text-[11px] text-[#667085]">
                    {enabled
                      ? 'Trigger is active and accepting events'
                      : 'Trigger is paused and will ignore events'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleToggle}
                  disabled={statusUpdating}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    enabled ? 'bg-[#22A06B]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Confirmation Box for Remove */}
            {confirmRemoveOpen && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3 animate-scaleUp">
                <div className="flex items-start gap-2 text-red-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold">Remove this trigger?</h5>
                    <p className="text-[11px] text-red-700 mt-0.5">
                      This will remove the trigger configuration from this workflow. The workflow itself will remain intact.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmRemoveOpen(false)}
                    disabled={removing}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleRemoveConfirm}
                    disabled={removing}
                    leftIcon={removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : undefined}
                  >
                    {removing ? 'Removing...' : 'Confirm Remove'}
                  </Button>
                </div>
              </div>
            )}
          </form>

          {/* Drawer Footer Actions */}
          <div className="p-5 border-t border-[#E9E5E4] bg-[#FFFDFB] flex items-center justify-between gap-3">
            <div>
              {isExisting && !confirmRemoveOpen && (
                <button
                  type="button"
                  onClick={() => setConfirmRemoveOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Trigger</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={saving || removing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="trigger-form"
                variant="primary"
                size="sm"
                disabled={saving || !name.trim()}
                leftIcon={saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : undefined}
              >
                {saving ? 'Saving...' : 'Save Trigger'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
