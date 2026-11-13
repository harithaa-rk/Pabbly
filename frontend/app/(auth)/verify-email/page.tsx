'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Zap, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { authService } from '../../../services/authService';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../../components/ui/Button';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { refreshUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      if (!token) {
        setIsLoading(false);
        setErrorMessage('No verification token found in URL.');
        return;
      }

      try {
        await authService.verifyEmail(token);
        await refreshUser();
        setSuccess(true);
      } catch (err: any) {
        setErrorMessage(
          err.response?.data?.message || err.message || 'Verification token is invalid or expired.'
        );
      } finally {
        setIsLoading(false);
      }
    }

    verify();
  }, [token]);

  return (
    <div className="bg-white py-8 px-6 shadow-card sm:rounded-2xl sm:px-10 border border-[#E9E5E4] text-center">
      {isLoading ? (
        <div className="py-8 flex flex-col items-center">
          <LoadingSpinner size="lg" className="text-[#E85D8A] mb-4" />
          <p className="text-xs font-semibold text-[#182033]">Verifying your email address...</p>
        </div>
      ) : success ? (
        <div className="space-y-4 py-4">
          <div className="w-12 h-12 bg-[#EAF7F0] text-[#22A06B] rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-[#182033]">Email Verified</h3>
          <p className="text-xs text-[#667085] leading-relaxed">
            Your email address has been confirmed. You now have full access to Kaira Connect.
          </p>
          <div className="pt-2">
            <Link href="/dashboard">
              <Button size="md" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4 py-4">
          <div className="w-12 h-12 bg-[#FFF7F4] text-[#D6455D] border border-[#E9E5E4] rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-[#182033]">Verification Failed</h3>
          <p className="text-xs text-[#D6455D] leading-relaxed">
            {errorMessage}
          </p>
          <div className="pt-2">
            <Link href="/login">
              <Button size="md" className="w-full">
                Return to Sign In
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#FFFDFB]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#E85D8A] text-white shadow-xs mb-4">
          <Zap className="w-6 h-6 fill-white text-white" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#182033] sm:text-3xl">
          Email Verification
        </h2>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={<div className="text-center p-8 text-xs text-[#667085]">Loading...</div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
