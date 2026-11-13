'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User as UserIcon,
  Mail,
  Shield,
  Save,
  LogOut,
  Image,
  Lock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../../../hooks/useAuth';
import { useToast } from '../../../../hooks/useToast';
import { authService } from '../../../../services/authService';
import { DashboardLayout } from '../../../../components/layout/DashboardLayout';
import { Input } from '../../../../components/ui/Input';
import { PasswordInput } from '../../../../components/ui/PasswordInput';
import { Button } from '../../../../components/ui/Button';
import { Avatar } from '../../../../components/ui/Avatar';
import { FormError } from '../../../../components/ui/FormError';
import { formatDate } from '../../../../lib/utils';
import { PasswordStrengthIndicator } from '../../../../components/auth/PasswordStrengthIndicator';

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  avatar: z.string().trim().url('Must be a valid URL').or(z.literal('')).optional(),
});

type ProfileFormData = z.infer<typeof updateProfileSchema>;

const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .regex(
        passwordComplexityRegex,
        'Password must contain uppercase, lowercase, number, and special character'
      ),
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  });

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export default function SettingsPage() {
  const { user, updateProfile, logout } = useAuth();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'account'>('profile');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Profile Form
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    values: {
      name: user?.name || '',
      avatar: user?.avatar || '',
    },
  });

  // Password Form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPasswordForm,
    watch: watchPassword,
    formState: { errors: passwordFormErrors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const newPasswordValue = watchPassword('newPassword');

  const onUpdateProfile = async (data: ProfileFormData) => {
    setProfileError(null);
    setIsUpdatingProfile(true);
    try {
      await updateProfile({
        name: data.name,
        avatar: data.avatar || null,
      });
      success('Profile updated successfully');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
      toastError(err.message || 'Failed to update profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const onChangePassword = async (data: ChangePasswordFormData) => {
    setPasswordError(null);
    setIsChangingPassword(true);
    try {
      await authService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      success('Password changed successfully');
      resetPasswordForm();
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.');
      toastError(err.message || 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#182033]">
            Settings
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Manage your account preferences, profile credentials, and security settings.
          </p>
        </div>

        {/* Settings Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-[#E9E5E4] pb-3 text-xs font-semibold select-none">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'profile'
                ? 'bg-[#182033] text-white shadow-xs'
                : 'text-[#667085] hover:text-[#182033] hover:bg-[#FFF7F4]'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'security'
                ? 'bg-[#182033] text-white shadow-xs'
                : 'text-[#667085] hover:text-[#182033] hover:bg-[#FFF7F4]'
            }`}
          >
            Security
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'account'
                ? 'bg-[#182033] text-white shadow-xs'
                : 'text-[#667085] hover:text-[#182033] hover:bg-[#FFF7F4]'
            }`}
          >
            Account
          </button>
        </div>

        {/* Tab 1: Profile */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-[#E9E5E4] rounded-2xl shadow-xs overflow-hidden">
            <div className="p-6 border-b border-[#E9E5E4]">
              <h3 className="text-sm font-bold text-[#182033]">Profile Information</h3>
              <p className="text-xs text-[#667085] mt-0.5">Update your display name and public avatar.</p>
            </div>

            <form onSubmit={handleSubmitProfile(onUpdateProfile)} className="p-6 space-y-5" noValidate>
              <FormError message={profileError} />

              <div className="flex items-center gap-4 p-4 rounded-xl bg-[#FFF7F4] border border-[#E9E5E4]">
                <Avatar name={user?.name || 'User'} src={user?.avatar} size="lg" />
                <div>
                  <h4 className="text-xs font-bold text-[#182033]">{user?.name}</h4>
                  <p className="text-xs text-[#667085]">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Full Name"
                  placeholder="Your full name"
                  leftIcon={<UserIcon className="w-4 h-4" />}
                  error={profileErrors.name?.message}
                  {...registerProfile('name')}
                />

                <Input
                  label="Avatar Image URL (optional)"
                  placeholder="https://example.com/avatar.jpg"
                  leftIcon={<Image className="w-4 h-4" />}
                  hint="Direct URL to image (PNG, JPG, WebP) or leave empty"
                  error={profileErrors.avatar?.message}
                  {...registerProfile('avatar')}
                />

                <Input
                  label="Email Address"
                  value={user?.email || ''}
                  disabled
                  leftIcon={<Mail className="w-4 h-4" />}
                  hint="Contact support to update your registered email address"
                />
              </div>

              <div className="flex justify-end pt-3 border-t border-[#E9E5E4]">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isUpdatingProfile}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Security (Change Password) */}
        {activeTab === 'security' && (
          <div className="bg-white border border-[#E9E5E4] rounded-2xl shadow-xs overflow-hidden">
            <div className="p-6 border-b border-[#E9E5E4]">
              <h3 className="text-sm font-bold text-[#182033]">Change Password</h3>
              <p className="text-xs text-[#667085] mt-0.5">Protect your account with a strong, complex password.</p>
            </div>

            <form onSubmit={handleSubmitPassword(onChangePassword)} className="p-6 space-y-4" noValidate>
              <FormError message={passwordError} />

              <PasswordInput
                label="Current Password"
                placeholder="••••••••"
                error={passwordFormErrors.currentPassword?.message}
                autoComplete="current-password"
                {...registerPassword('currentPassword')}
              />

              <div>
                <PasswordInput
                  label="New Password"
                  placeholder="••••••••"
                  error={passwordFormErrors.newPassword?.message}
                  autoComplete="new-password"
                  {...registerPassword('newPassword')}
                />
                <PasswordStrengthIndicator password={newPasswordValue} />
              </div>

              <PasswordInput
                label="Confirm New Password"
                placeholder="••••••••"
                error={passwordFormErrors.confirmNewPassword?.message}
                autoComplete="new-password"
                {...registerPassword('confirmNewPassword')}
              />

              <div className="flex justify-end pt-3 border-t border-[#E9E5E4]">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isChangingPassword}
                  leftIcon={<Lock className="w-4 h-4" />}
                >
                  Update Password
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Account */}
        {activeTab === 'account' && (
          <div className="bg-white border border-[#E9E5E4] rounded-2xl shadow-xs overflow-hidden">
            <div className="p-6 border-b border-[#E9E5E4]">
              <h3 className="text-sm font-bold text-[#182033]">Account Details</h3>
              <p className="text-xs text-[#667085] mt-0.5">Account identity and session controls.</p>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-[#E9E5E4]">
                <span className="text-[#667085] font-medium">Account ID</span>
                <span className="font-mono text-[#182033]">{user?.id}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#E9E5E4]">
                <span className="text-[#667085] font-medium">Role</span>
                <span className="font-semibold text-[#182033]">{user?.role}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#E9E5E4]">
                <span className="text-[#667085] font-medium">Email Verification</span>
                <span className="text-[#22A06B] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {user?.isEmailVerified ? 'Verified' : 'Pending Verification'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#E9E5E4]">
                <span className="text-[#667085] font-medium">Member Since</span>
                <span className="text-[#182033]">{formatDate(user?.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[#667085] font-medium">Last Login</span>
                <span className="text-[#182033]">{formatDate(user?.lastLoginAt)}</span>
              </div>
            </div>

            <div className="p-4 bg-[#FFF7F4] border-t border-[#E9E5E4] flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#182033]">Sign out of Kaira Connect</p>
                <p className="text-[11px] text-[#667085]">Terminate your active session</p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={logout}
                leftIcon={<LogOut className="w-3.5 h-3.5" />}
              >
                Log Out
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
