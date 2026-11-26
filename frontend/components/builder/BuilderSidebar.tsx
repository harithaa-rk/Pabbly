'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  GitBranch,
  History,
  Link2,
  Settings,
  HelpCircle,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const BuilderSidebar: React.FC = () => {
  const pathname = usePathname();

  const mainNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Workflows', href: '/workflows', icon: GitBranch },
    { name: 'History', href: '/history', icon: History },
    { name: 'Connections', href: '/connections', icon: Link2 },
    { name: 'Settings', href: '/settings/profile', icon: Settings },
  ];

  return (
    <aside className="w-[76px] bg-[#182033] border-r border-[#222C44] flex flex-col shrink-0 h-screen select-none z-30">
      {/* Brand Logo Header */}
      <div className="h-16 flex flex-col items-center justify-center border-b border-[#222C44]/80 px-2">
        <Link
          href="/dashboard"
          className="flex flex-col items-center group relative"
          title="KAIRA Connect"
        >
          <div className="w-9 h-9 rounded-xl bg-black overflow-hidden flex items-center justify-center shadow-xs border border-slate-700/60 transition-transform group-hover:scale-105">
            <img
              src="/logo.png"
              alt="KAIRA"
              className="w-full h-full object-contain p-0.5"
            />
          </div>
          <span className="text-[9px] font-bold text-white/90 tracking-wider uppercase mt-1">
            KAIRA
          </span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-2 flex flex-col items-center">
        {mainNavigation.map((item) => {
          const isActive = item.name === 'Workflows' || pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              className={cn(
                'w-full flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all duration-150 group text-center relative',
                isActive
                  ? 'bg-[#E85D8A] text-white shadow-xs'
                  : 'text-[#A0AEC0] hover:text-white hover:bg-[#222C44]'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 mb-1 transition-transform group-hover:scale-110',
                  isActive ? 'text-white' : 'text-[#CBD5E1] group-hover:text-white'
                )}
              />
              <span
                className={cn(
                  'text-[10px] leading-tight font-medium tracking-tight',
                  isActive ? 'text-white font-semibold' : 'text-[#CBD5E1]'
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="py-4 px-2 border-t border-[#222C44]/80 space-y-2 flex flex-col items-center">
        <Link
          href="/help"
          title="Help & Support"
          className="w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-150 text-center text-[#A0AEC0] hover:text-white hover:bg-[#222C44]"
        >
          <HelpCircle className="w-4 h-4 mb-1 text-[#CBD5E1]" />
          <span className="text-[10px] font-medium text-[#CBD5E1]">Help</span>
        </Link>
      </div>
    </aside>
  );
};
