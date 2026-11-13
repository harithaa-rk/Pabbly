'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  GitBranch,
  History,
  Settings,
  HelpCircle,
  Code2,
  Zap,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  const mainNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Workflow', href: '/workflows', icon: GitBranch },
    { name: 'History', href: '/history', icon: History },
    { name: 'Settings', href: '/settings/profile', icon: Settings },
  ];

  const bottomNavigation = [
    { name: 'Help', href: '/help', icon: HelpCircle },
    { name: 'Developer Portal', href: '/developer', icon: Code2 },
  ];

  const isCurrentActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/workflows') return pathname.startsWith('/workflows') || pathname.startsWith('/workflow');
    if (href === '/settings/profile') return pathname.startsWith('/settings');
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-[104px] bg-[#182033] border-r border-[#222C44] flex flex-col shrink-0 min-h-screen text-slate-300 select-none z-40">
      {/* Brand Logo Header */}
      <div className="h-16 flex flex-col items-center justify-center border-b border-[#222C44]/80 px-2">
        <Link href="/dashboard" className="flex flex-col items-center group">
          <div className="w-9 h-9 rounded-xl bg-black overflow-hidden flex items-center justify-center shadow-xs border border-slate-700/60 transition-transform group-hover:scale-105">
            <img
              src="/logo.png"
              alt="Kaira Logo"
              className="w-full h-full object-contain p-0.5"
            />
          </div>
          <span className="text-[10px] font-bold text-white tracking-wider uppercase mt-1">
            Kaira
          </span>
        </Link>
      </div>

      {/* Main Navigation (Icon + Label underneath) */}
      <nav className="flex-1 py-4 px-2 space-y-1.5 flex flex-col items-center">
        {mainNavigation.map((item) => {
          const isActive = isCurrentActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              className={cn(
                'w-full flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all duration-150 group text-center',
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
                  'text-[11px] leading-tight font-medium tracking-tight',
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
      <div className="py-4 px-2 border-t border-[#222C44]/80 space-y-1.5 flex flex-col items-center">
        {bottomNavigation.map((item) => {
          const isActive = isCurrentActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              className={cn(
                'w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-150 group text-center',
                isActive
                  ? 'bg-[#E85D8A] text-white shadow-xs'
                  : 'text-[#A0AEC0] hover:text-white hover:bg-[#222C44]'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 mb-1 transition-transform group-hover:scale-110',
                  isActive ? 'text-white' : 'text-[#CBD5E1] group-hover:text-white'
                )}
              />
              <span className="text-[10px] leading-tight font-medium text-[#CBD5E1]">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
};
