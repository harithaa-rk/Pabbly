'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/user';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        router.push('/dashboard');
      }
    }
  }, [isLoading, isAuthenticated, user, router, allowedRoles]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFFDFB]">
        <LoadingSpinner size="lg" className="text-[#E85D8A] mb-3" />
        <p className="text-xs font-semibold text-[#667085]">
          Authenticating session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFFDFB] p-4">
        <div className="bg-white p-8 rounded-2xl border border-[#E9E5E4] shadow-card max-w-md text-center">
          <h2 className="text-base font-bold text-[#182033] mb-1.5">Access Denied</h2>
          <p className="text-xs text-[#667085] mb-5">
            You do not have the required permissions to view this section.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-[#E85D8A] text-white rounded-lg text-xs font-semibold hover:bg-[#D64B78] transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
