'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, CheckCircle2, ArrowRight } from 'lucide-react';
import { authService } from '../../../services/authService';
import { useToast } from '../../../hooks/useToast';
import { PasswordInput } from '../../../components/ui/PasswordInput';
import { Button } from '../../../components/ui/Button';
import { FormError } from '../../../components/ui/FormError';
import { PasswordStrengthIndicator } from '../../../components/auth/PasswordStrengthIndicator';

const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        passwordComplexityRegex,
        'Password must contain uppercase, lowercase, number, and special character'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { success } = useToast();

  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password');

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setServerError('Missing reset token. Please open the link received in your email.');
      return;
    }

    setServerError(null);
    setIsSubmitting(true);
    try {
      await authService.resetPassword({
        token,
        password: data.password,
      });
      setIsSuccess(true);
      success('Password reset successfully');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: any) {
      setServerError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white py-8 px-6 shadow-card sm:rounded-2xl sm:px-10 border border-[#E9E5E4]">
      {isSuccess ? (
        <div className="text-center py-6 space-y-4">
          <div className="w-12 h-12 bg-[#EAF7F0] text-[#22A06B] rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#182033]">Password Reset Completed</h3>
          <p className="text-xs text-[#667085]">
            Your password has been securely updated. Redirecting to login...
          </p>
          <div className="pt-2">
            <Button onClick={() => router.push('/login')} size="sm">
              Go to Sign In
            </Button>
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormError message={serverError} />

          {!token && (
            <div className="p-3 text-xs bg-[#FFF0D8] border border-[#E59A23]/30 text-[#E59A23] rounded-lg">
              Warning: No reset token detected in URL query parameter.
            </div>
          )}

          <div>
            <PasswordInput
              label="New Password"
              placeholder="••••••••"
              error={errors.password?.message}
              autoComplete="new-password"
              {...register('password')}
            />
            <PasswordStrengthIndicator password={passwordValue} />
          </div>

          <PasswordInput
            label="Confirm New Password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            autoComplete="new-password"
            {...register('confirmPassword')}
          />

          <Button
            type="submit"
            className="w-full mt-2"
            size="lg"
            isLoading={isSubmitting}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Reset Password
          </Button>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="text-xs font-semibold text-[#667085] hover:text-[#182033] transition-colors"
            >
              Cancel and return to sign in
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#FFFDFB]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#E85D8A] text-white shadow-xs mb-4">
          <Zap className="w-6 h-6 fill-white text-white" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#182033] sm:text-3xl">
          Set new password
        </h2>
        <p className="mt-1.5 text-xs text-[#667085]">
          Create a new, strong password to secure your Kaira Connect account
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={<div className="text-center p-8 text-xs text-[#667085]">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
