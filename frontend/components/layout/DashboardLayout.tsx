'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { HelpButton } from '../ui/HelpButton';
import { ProtectedRoute } from '../auth/ProtectedRoute';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-[#FFFDFB] text-[#344054] font-sans antialiased">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopHeader />
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
        <HelpButton />
      </div>
    </ProtectedRoute>
  );
};
