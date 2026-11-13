export type UserRole = 'ADMIN' | 'USER' | 'TEAM_MEMBER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string | null;
  googleId?: string | null;
  authProvider?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export interface UpdateProfileInput {
  name?: string;
  avatar?: string | null;
}

