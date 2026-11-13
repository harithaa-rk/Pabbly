import { prisma } from '../config/database.js';
import { AppError } from '../utils/apiResponse.js';
import { UpdateProfileInput, UpdateRoleInput, UpdateStatusInput } from '../validators/user.validator.js';
import { UserPayload, UserRole } from '../types/index.js';

function formatSafeUser(user: any): UserPayload {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    avatar: user.avatar,
    isEmailVerified: user.isEmailVerified,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
  };
}

class UserService {
  async getProfile(userId: string): Promise<UserPayload> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    return formatSafeUser(user);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserPayload> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    const dataToUpdate: { name?: string; avatar?: string | null } = {};
    if (input.name !== undefined) {
      dataToUpdate.name = input.name.trim();
    }
    if (input.avatar !== undefined) {
      dataToUpdate.avatar = input.avatar === '' ? null : input.avatar;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    return formatSafeUser(updated);
  }

  // Admin User Management Architecture
  async getAllUsers(page = 1, limit = 20): Promise<{ users: UserPayload[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    return {
      users: users.map(formatSafeUser),
      total,
      page,
      limit,
    };
  }

  async updateUserRole(currentAdminId: string, targetUserId: string, input: UpdateRoleInput): Promise<UserPayload> {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new AppError('Target user not found.', 404);
    }

    // Prevent admin from removing their own admin status accidentally
    if (currentAdminId === targetUserId && input.role !== 'ADMIN') {
      throw new AppError('You cannot revoke your own administrator privileges.', 400);
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: input.role as any },
    });

    return formatSafeUser(updated);
  }

  async updateUserStatus(currentAdminId: string, targetUserId: string, input: UpdateStatusInput): Promise<UserPayload> {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new AppError('Target user not found.', 404);
    }

    // Prevent admin from deactivating their own account
    if (currentAdminId === targetUserId && !input.isActive) {
      throw new AppError('You cannot deactivate your own administrator account.', 400);
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { isActive: input.isActive },
    });

    return formatSafeUser(updated);
  }
}

export const userService = new UserService();

