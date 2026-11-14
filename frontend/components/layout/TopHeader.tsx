'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  HelpCircle,
  Grid,
  Bell,
  ChevronDown,
  User as UserIcon,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../ui/Avatar';
import { useWorkflowStore } from '../../store/workflowStore';

interface TopHeaderProps {
  onOpenHelp?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenHelp }) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { searchQuery, setSearchQuery } = useWorkflowStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-[#E9E5E4] px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Brand name display */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-black overflow-hidden flex items-center justify-center border border-slate-800 shadow-2xs">
          <img src="/logo.png" alt="Kaira Logo" className="w-full h-full object-contain p-0.5" />
        </div>
        <span className="text-base font-bold text-[#182033] tracking-tight">
          Kaira Connect
        </span>
      </div>

      {/* Center/Main: Large search bar */}
      <div className="flex-1 max-w-xl mx-4 sm:mx-8">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#667085]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Workflow by Name or Webhook URL"
            className="w-full pl-10 pr-9 py-2 bg-[#FFFDFB] border border-[#E9E5E4] rounded-lg text-sm text-[#182033] placeholder-[#98A2B3] focus:outline-none focus:border-[#E85D8A] focus:ring-1 focus:ring-[#E85D8A] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#98A2B3] hover:text-[#182033]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Help icon button */}
        <button
          onClick={onOpenHelp ? onOpenHelp : () => router.push('/help')}
          title="Help & Documentation"
          className="p-2 rounded-lg text-[#667085] hover:text-[#182033] hover:bg-[#FFF7F4] transition-colors"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Apps Grid button */}
        <Link
          href="/workflows"
          title="Applications"
          className="p-2 rounded-lg text-[#667085] hover:text-[#182033] hover:bg-[#FFF7F4] transition-colors hidden sm:inline-flex"
        >
          <Grid className="w-5 h-5" />
        </Link>

        {/* User Menu Dropdown */}
        <div className="relative pl-2 border-l border-[#E9E5E4]">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-[#FFF7F4] transition-colors focus:outline-none"
          >
            <Avatar name={user?.name || 'User'} src={user?.avatar} size="sm" />
            <div className="text-left hidden md:block">
              <span className="text-xs font-semibold text-[#182033] block leading-tight">
                {user?.name || 'Account'}
              </span>
              <span className="text-[10px] text-[#667085] block leading-tight">
                {user?.role || 'USER'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-[#667085]" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-dropdown border border-[#E9E5E4] py-1.5 z-40 animate-scaleUp">
                <div className="px-4 py-2 border-b border-[#E9E5E4]/60">
                  <p className="text-xs font-semibold text-[#182033]">{user?.name}</p>
                  <p className="text-xs text-[#667085] truncate">{user?.email}</p>
                </div>

                <Link
                  href="/settings/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#344054] hover:bg-[#FFF7F4] hover:text-[#182033] transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-[#667085]" />
                  <span>Profile</span>
                </Link>

                <Link
                  href="/settings/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#344054] hover:bg-[#FFF7F4] hover:text-[#182033] transition-colors"
                >
                  <Settings className="w-4 h-4 text-[#667085]" />
                  <span>Settings</span>
                </Link>

                <div className="border-t border-[#E9E5E4]/60 my-1" />

                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#D6455D] hover:bg-[#F8DCE5]/40 transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4 text-[#D6455D]" />
                  <span>{isLoggingOut ? 'Signing out...' : 'Logout'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

