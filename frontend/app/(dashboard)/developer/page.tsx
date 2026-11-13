'use client';

import React from 'react';
import { Code2, Key, Globe, Shield, Copy } from 'lucide-react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';

export default function DeveloperPortalPage() {
  const { user } = useAuth();
  const { success } = useToast();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    success('Copied to clipboard');
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#182033]">
            Developer Portal
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            API keys, webhook endpoints, and programmatic access for Kaira Connect.
          </p>
        </div>

        {/* API Credentials Card */}
        <div className="bg-white border border-[#E9E5E4] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E9E5E4]">
            <Key className="w-4 h-4 text-[#E85D8A]" />
            <h3 className="text-sm font-bold text-[#182033]">API Credentials</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-[#182033] mb-1">
                Account ID
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled
                  value={user?.id || '6730a84c98234...'}
                  className="w-full px-3 py-2 bg-[#FFF7F4] border border-[#E9E5E4] rounded-lg font-mono text-xs text-[#182033]"
                />
                <button
                  onClick={() => handleCopy(user?.id || '')}
                  className="px-3 py-2 bg-white border border-[#E9E5E4] hover:bg-[#FFF7F4] rounded-lg text-xs font-semibold text-[#182033] shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#182033] mb-1">
                REST API Base URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled
                  value="https://api.kairaconnect.com/api"
                  className="w-full px-3 py-2 bg-[#FFF7F4] border border-[#E9E5E4] rounded-lg font-mono text-xs text-[#182033]"
                />
                <button
                  onClick={() => handleCopy('https://api.kairaconnect.com/api')}
                  className="px-3 py-2 bg-white border border-[#E9E5E4] hover:bg-[#FFF7F4] rounded-lg text-xs font-semibold text-[#182033] shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Webhook Endpoints Card */}
        <div className="bg-white border border-[#E9E5E4] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E9E5E4]">
            <Globe className="w-4 h-4 text-[#22A06B]" />
            <h3 className="text-sm font-bold text-[#182033]">Webhook Payload Format</h3>
          </div>

          <p className="text-xs text-[#667085] leading-relaxed">
            Kaira Connect accepts standard JSON payloads over HTTP POST. Example payload:
          </p>

          <pre className="p-4 bg-[#182033] text-white rounded-xl text-xs font-mono overflow-x-auto leading-relaxed">
{`{
  "event": "lead.created",
  "data": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "company": "Acme Corp"
  },
  "timestamp": "2026-11-10T12:00:00Z"
}`}
          </pre>
        </div>
      </div>
    </DashboardLayout>
  );
}

