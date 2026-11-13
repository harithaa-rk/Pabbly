'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { Input } from '../../../components/ui/Input';
import { PasswordInput } from '../../../components/ui/PasswordInput';
import { Button } from '../../../components/ui/Button';
import { FormError } from '../../../components/ui/FormError';
import { GoogleButton } from '../../../components/auth/GoogleButton';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { success } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Read Google OAuth callback error query parameters safely on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get('error');
      if (oauthError) {
        if (oauthError === 'cancelled') {
          setServerError('Google authentication was cancelled.');
        } else if (oauthError === 'invalid_state') {
          setServerError('Unable to sign in with Google. Session expired or invalid state.');
        } else if (oauthError === 'missing_code') {
          setServerError('Unable to sign in with Google. No authorization code received.');
        } else {
          setServerError('Unable to sign in with Google. Please try again.');
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const user = await login(data);
      success(`Welcome back, ${user.name}!`);
      router.push('/dashboard');
    } catch (err: any) {
      setServerError(err.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#FFFDFB]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-black overflow-hidden shadow-xs border border-slate-700/60 mb-4 p-1">
          <img src="/logo.png" alt="Kaira Logo" className="w-full h-full object-contain" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#182033] sm:text-3xl">
          Welcome back
        </h2>
        <p className="mt-1.5 text-xs text-[#667085]">
          Sign in to your Kaira Connect automation platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-card sm:rounded-2xl sm:px-10 border border-[#E9E5E4]">
          <FormError message={serverError} />

          {/* Google OAuth Button */}
          <div className="mb-5">
            <GoogleButton />
          </div>

          {/* Divider */}
          <div className="relative flex py-2 items-center mb-5">
            <div className="flex-grow border-t border-[#E9E5E4]"></div>
            <span className="flex-shrink mx-3 text-xs text-[#98A2B3] uppercase tracking-wider font-medium">
              or continue with email
            </span>
            <div className="flex-grow border-t border-[#E9E5E4]"></div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Input
              label="Email"
              type="email"
              placeholder="user@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              autoComplete="email"
              {...register('email')}
            />

            <div>
              <PasswordInput
                label="Password"
                placeholder="••••••••"
                error={errors.password?.message}
                autoComplete="current-password"
                {...register('password')}
              />
              <div className="flex items-center justify-end mt-1.5">
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-[#E85D8A] hover:text-[#D64B78] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Login
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#E9E5E4] text-center">
            <p className="text-xs text-[#667085]">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="font-semibold text-[#E85D8A] hover:text-[#D64B78] transition-colors"
              >
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
