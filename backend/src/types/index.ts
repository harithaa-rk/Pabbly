import { Request } from 'express';

export type UserRole = 'ADMIN' | 'USER' | 'TEAM_MEMBER';

export interface UserPayload {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string | null;
  googleId?: string | null;
  authProvider?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  user?: T;
  errors?: any[];
}

