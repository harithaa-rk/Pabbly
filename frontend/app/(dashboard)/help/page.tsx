'use client';

import React from 'react';
import { BookOpen, Mail, HelpCircle, FileText, ExternalLink } from 'lucide-react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';

export default function HelpPage() {
  const faqs = [
    {
      q: 'How do I create a workflow in Kaira Connect?',
      a: 'Click the "+ Create Workflow" button on the dashboard or in the Workflows section. Name your workflow, select a folder, and configure your trigger and actions.',
    },
    {
      q: 'What is a Webhook Trigger?',
      a: 'A Webhook trigger provides an HTTP URL that listens for incoming events from any external platform or application and triggers your automation steps instantly.',
    },
    {
      q: 'How do tasks consumption work?',
      a: 'Each action successfully executed by a workflow consumes one automation task from your allotted plan balance.',
    },
    {
      q: 'Where do I find my account security and profile?',
      a: 'Navigate to Settings from the sidebar or click your user avatar in the top right header to update your name, avatar, and password.',
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#182033]">
            Help & Documentation
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Guides, support channels, and answers to common automation questions.
          </p>
        </div>

        {/* Support Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-[#E9E5E4] rounded-xl p-5 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7F4] border border-[#F8D8C5] text-[#E85D8A] flex items-center justify-center mb-3">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#182033] mb-1">Documentation</h3>
            <p className="text-xs text-[#667085] leading-relaxed mb-4">
              Explore step-by-step guides for connecting third-party webhooks, REST APIs, and automating repetitive tasks.
            </p>
            <a
              href="#faq"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E85D8A] hover:underline"
            >
              Browse FAQs below
            </a>
          </div>

          <div className="bg-white border border-[#E9E5E4] rounded-xl p-5 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-[#E8DDF0] border border-[#E9E5E4] text-[#6D4298] flex items-center justify-center mb-3">
              <Mail className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#182033] mb-1">Direct Support</h3>
            <p className="text-xs text-[#667085] leading-relaxed mb-4">
              Have questions about integrations or need help with a custom workflow? Our team is here to help.
            </p>
            <a
              href="mailto:support@kairaconnect.com"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E85D8A] hover:underline"
            >
              Email support@kairaconnect.com
            </a>
          </div>
        </div>

        {/* FAQs */}
        <div id="faq" className="bg-white border border-[#E9E5E4] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E9E5E4]">
            <HelpCircle className="w-4 h-4 text-[#E85D8A]" />
            <h3 className="text-sm font-bold text-[#182033]">Frequently Asked Questions</h3>
          </div>

          <div className="divide-y divide-[#E9E5E4] text-xs">
            {faqs.map((f, i) => (
              <div key={i} className="py-3.5 space-y-1">
                <h4 className="font-bold text-[#182033]">{f.q}</h4>
                <p className="text-[#667085] leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

