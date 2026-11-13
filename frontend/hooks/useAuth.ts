'use client';

import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    checkAuth,
    refreshUser,
    updateProfile,
    clearError,
  } = useAuthStore();

  useEffect(() => {
    // Only check auth once on initial mount if still in loading state
    if (isLoading && user === null) {
      checkAuth();
    }
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    checkAuth,
    refreshUser,
    updateProfile,
    clearError,
  };
}

