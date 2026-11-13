import { api } from '../lib/api';
import { ApiResponse } from '../types/auth';
import { User, UpdateProfileInput } from '../types/user';

export const userService = {
  async getProfile(): Promise<User> {
    const response = await api.get<ApiResponse>('/users/profile');
    return response.data.user!;
  },

  async updateProfile(data: UpdateProfileInput): Promise<User> {
    const response = await api.patch<ApiResponse>('/users/profile', data);
    return response.data.user!;
  },
};

