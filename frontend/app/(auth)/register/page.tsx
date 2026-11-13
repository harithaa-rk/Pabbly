'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, User as UserIcon, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { Input } from '../../../components/ui/Input';
import { PasswordInput } from '../../../components/ui/PasswordInput';
import { Button } from '../../../components/ui/Button';
import { FormError } from '../../../components/ui/FormError';
import { PasswordStrengthIndicator } from '../../../components/auth/PasswordStrengthIndicator';
import { GoogleButton } from '../../../components/auth/GoogleButton';

const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        passwordComplexityRegex,
        'Password must include uppercase, lowercase, number, and special character'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register: registerUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { success } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const user = await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      success(`Account created successfully for ${user.name}!`);
      setSuccessMessage('Registration successful! Redirecting to your dashboard...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1200);
    } catch (err: any) {
      setServerError(err.message || 'Registration failed. Please try again.');
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
          Create your account
        </h2>
        <p className="mt-1.5 text-xs text-[#667085]">
          Get started with automated workflows on Kaira Connect
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-card sm:rounded-2xl sm:px-10 border border-[#E9E5E4]">
          {!successMessage && (
            <>
              {/* Google OAuth Button */}
              <div className="mb-5">
                <GoogleButton />
              </div>

              {/* Divider */}
              <div className="relative flex py-2 items-center mb-5">
                <div className="flex-grow border-t border-[#E9E5E4]"></div>
                <span className="flex-shrink mx-3 text-xs text-[#98A2B3] uppercase tracking-wider font-medium">
                  or sign up with email
                </span>
                <div className="flex-grow border-t border-[#E9E5E4]"></div>
              </div>
            </>
          )}

          {successMessage ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 bg-[#EAF7F0] text-[#22A06B] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[#182033]">Registration Complete</h3>
              <p className="text-xs text-[#667085]">{successMessage}</p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <FormError message={serverError} />

              <Input
                label="Full Name"
                placeholder="Haritha"
                leftIcon={<UserIcon className="w-4 h-4" />}
                error={errors.name?.message}
                autoComplete="name"
                {...register('name')}
              />

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
                  placeholder="Min 8 chars, uppercase, number & symbol"
                  error={errors.password?.message}
                  autoComplete="new-password"
                  {...register('password')}
                />
                <PasswordStrengthIndicator password={passwordValue} />
              </div>

              <PasswordInput
                label="Confirm Password"
                placeholder="Re-enter your password"
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
                Create Account
              </Button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-[#E9E5E4] text-center">
            <p className="text-xs text-[#667085]">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-semibold text-[#E85D8A] hover:text-[#D64B78] transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
