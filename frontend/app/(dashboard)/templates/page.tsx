'use client';

import React from 'react';
import { FileBox } from 'lucide-react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function TemplatesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Automation Templates</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pre-built workflow recipes and automations for common SaaS platforms
          </p>
        </div>

        <EmptyState
          icon={FileBox}
          title="Workflow Recipes & Templates (Coming Soon)"
          description="Browse curated automations for CRM, lead management, email notifications, and database sync."
        />
      </div>
    </DashboardLayout>
  );
}

