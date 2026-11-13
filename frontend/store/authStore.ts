import { create } from 'zustand';
import { User, UpdateProfileInput } from '../types/user';
import { RegisterInput, LoginInput } from '../types/auth';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { extractErrorMessage } from '../lib/api';

interface AuthStoreState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<User | null>;
  refreshUser: () => Promise<User | null>;
  updateProfile: (input: UpdateProfileInput) => Promise<User>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    });
  },

  login: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await authService.login(input);
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      return user;
    } catch (err) {
      const msg = extractErrorMessage(err);
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  register: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await authService.register(input);
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      return user;
    } catch (err) {
      const msg = extractErrorMessage(err);
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Logout API warning:', err);
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  checkAuth: async () => {
    try {
      const user = await authService.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      return user;
    } catch (err) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  refreshUser: async () => {
    try {
      const user = await authService.getCurrentUser();
      set({ user, isAuthenticated: true, error: null });
      return user;
    } catch (err) {
      set({ user: null, isAuthenticated: false });
      return null;
    }
  },

  updateProfile: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await userService.updateProfile(input);
      set({ user: updatedUser, isLoading: false });
      return updatedUser;
    } catch (err) {
      const msg = extractErrorMessage(err);
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  clearError: () => set({ error: null }),
}));

