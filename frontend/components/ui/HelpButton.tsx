'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, BookOpen, Mail, FileQuestion, X, ExternalLink, Keyboard } from 'lucide-react';

export const HelpButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating trigger button */}
      <div className="fixed bottom-6 right-6 z-40 select-none">
        <button
          onClick={() => setIsOpen(!isOpen)}
          title="Kaira Help & Support"
          className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-[#E9E5E4] text-[#182033] hover:border-[#E85D8A] hover:bg-[#FFF7F4] rounded-full shadow-md hover:shadow-lg transition-all duration-150 group"
        >
          <div className="w-5 h-5 rounded-full bg-[#F8DCE5] text-[#E85D8A] flex items-center justify-center font-bold text-xs">
            ?
          </div>
          <span className="text-xs font-semibold text-[#182033]">Help</span>
        </button>
      </div>

      {/* Help Modal */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 animate-fadeIn"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed bottom-20 right-6 w-80 bg-white rounded-2xl shadow-xl border border-[#E9E5E4] p-5 z-50 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#E9E5E4]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#F8DCE5] text-[#E85D8A] flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#182033]">Help & Resources</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#667085] hover:text-[#182033] p-1 rounded-md hover:bg-[#FFF7F4]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 space-y-1">
              <Link
                href="/help"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#FFF7F4] text-[#344054] hover:text-[#182033] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-[#E85D8A]" />
                  <div>
                    <div className="text-xs font-semibold">Documentation</div>
                    <div className="text-[11px] text-[#667085]">Guides and API reference</div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[#667085] opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <a
                href="mailto:support@kairaconnect.com"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#FFF7F4] text-[#344054] hover:text-[#182033] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#22A06B]" />
                  <div>
                    <div className="text-xs font-semibold">Contact Support</div>
                    <div className="text-[11px] text-[#667085]">support@kairaconnect.com</div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[#667085] opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>

              <Link
                href="/help#faq"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#FFF7F4] text-[#344054] hover:text-[#182033] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <FileQuestion className="w-4 h-4 text-[#E59A23]" />
                  <div>
                    <div className="text-xs font-semibold">FAQ</div>
                    <div className="text-[11px] text-[#667085]">Frequently asked questions</div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[#667085] opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <Link
                href="/developer"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#FFF7F4] text-[#344054] hover:text-[#182033] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Keyboard className="w-4 h-4 text-[#818CF8]" />
                  <div>
                    <div className="text-xs font-semibold">Developer Portal</div>
                    <div className="text-[11px] text-[#667085]">Webhooks & REST endpoints</div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[#667085] opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
};

