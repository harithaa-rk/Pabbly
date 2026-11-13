'use client';

import React from 'react';
import { Plug } from 'lucide-react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function ConnectionsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">App Connections</h1>
          <p className="text-sm text-slate-500 mt-1">
            Connect APIs, databases, webhooks, and third-party SaaS services
          </p>
        </div>

        <EmptyState
          icon={Plug}
          title="App Integrations & OAuth (Coming in Module 4)"
          description="Webhook triggers, OAuth integrations, and API credentials will be available in Module 4 & Module 6."
        />
      </div>
    </DashboardLayout>
  );
}

