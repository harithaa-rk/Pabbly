import { api } from '../lib/api';
import {
  ApiResponse,
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from '../types/auth';
import { User } from '../types/user';

export const authService = {
  async register(data: RegisterInput): Promise<{ message: string; user: User }> {
    const response = await api.post<ApiResponse<{ token?: string }>>('/auth/register', data);
    return {
      message: response.data.message,
      user: response.data.user!,
    };
  },

  async login(data: LoginInput): Promise<{ message: string; user: User }> {
    const response = await api.post<ApiResponse<{ token?: string }>>('/auth/login', data);
    return {
      message: response.data.message,
      user: response.data.user!,
    };
  },

  async logout(): Promise<void> {
    await api.post<ApiResponse>('/auth/logout');
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<ApiResponse>('/auth/me');
    return response.data.user!;
  },

  async forgotPassword(data: ForgotPasswordInput): Promise<string> {
    const response = await api.post<ApiResponse>('/auth/forgot-password', data);
    return response.data.message;
  },

  async resetPassword(data: ResetPasswordInput): Promise<string> {
    const response = await api.post<ApiResponse>('/auth/reset-password', data);
    return response.data.message;
  },

  async changePassword(data: ChangePasswordInput): Promise<string> {
    const response = await api.post<ApiResponse>('/auth/change-password', data);
    return response.data.message;
  },

  async verifyEmail(token: string): Promise<{ message: string; user: User }> {
    const response = await api.get<ApiResponse>(`/auth/verify-email?token=${encodeURIComponent(token)}`);
    return {
      message: response.data.message,
      user: response.data.user!,
    };
  },
};

