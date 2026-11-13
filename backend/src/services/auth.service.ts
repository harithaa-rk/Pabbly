import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { AppError } from '../utils/apiResponse.js';
import { emailService } from './email.service.js';
import {
  RegisterInput,
  LoginInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from '../validators/auth.validator.js';
import { UserPayload, UserRole } from '../types/index.js';
import { GoogleUserProfile } from './googleAuth.service.js';

function formatSafeUser(user: any): UserPayload {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    avatar: user.avatar,
    googleId: user.googleId || null,
    authProvider: user.authProvider || 'local',
    isEmailVerified: user.isEmailVerified,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
  };
}

class AuthService {
  async register(input: RegisterInput): Promise<{ user: UserPayload; token: string }> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new AppError('An account with this email address already exists.', 409);
    }

    const hashedPassword = await hashPassword(input.password);

    // Create user with default USER role (cannot be overridden by public registration)
    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email: input.email.toLowerCase(),
        passwordHash: hashedPassword,
        role: 'USER',
        isEmailVerified: false,
        isActive: true,
      },
    });

    // Create verification token (valid for 24 hours)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt,
      },
    });

    // Send verification email (or log to console in dev)
    await emailService.sendVerificationEmail(user.email, user.name, verificationToken);

    // Sign JWT
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    return {
      user: formatSafeUser(user),
      token,
    };
  }

  async login(
    input: LoginInput,
    metadata?: { userAgent?: string; ipAddress?: string }
  ): Promise<{ user: UserPayload; token: string }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    if (!user.passwordHash) {
      throw new AppError(
        'This account was created with Google Sign In. Please use "Continue with Google" to log in.',
        400
      );
    }

    const isMatch = await comparePassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated. Please contact support.', 403);
    }

    // Update lastLoginAt
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signToken({
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role as UserRole,
    });

    // Create session record for tracking
    try {
      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          userAgent: metadata?.userAgent || null,
          ipAddress: metadata?.ipAddress || null,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    } catch (e) {
      // Non-fatal if session table creation logs collision
    }

    return {
      user: formatSafeUser(updatedUser),
      token,
    };
  }

  /**
   * Handles Google OAuth login & signup.
   * If user with googleId exists -> login.
   * If user with email exists -> safely link googleId without removing password.
   * If new user -> create user with authProvider: 'google', emailVerified: true.
   * Creates application JWT session and returns safe user.
   */
  async handleGoogleAuth(
    profile: GoogleUserProfile,
    metadata?: { userAgent?: string; ipAddress?: string }
  ): Promise<{ user: UserPayload; token: string }> {
    const email = profile.email.toLowerCase();

    // 1. Check if user already exists with this Google sub ID
    let user = await prisma.user.findFirst({
      where: { googleId: profile.sub },
    });

    if (user) {
      if (!user.isActive) {
        throw new AppError('Your account has been deactivated. Please contact support.', 403);
      }

      // Update lastLoginAt and avatar if not set
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          avatar: user.avatar || profile.picture || null,
        },
      });
    } else {
      // 2. Check if user already exists with this email address
      const existingEmailUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingEmailUser) {
        if (!existingEmailUser.isActive) {
          throw new AppError('Your account has been deactivated. Please contact support.', 403);
        }

        // Safely link Google identity to existing account (preserves existing password if set)
        user = await prisma.user.update({
          where: { id: existingEmailUser.id },
          data: {
            googleId: profile.sub,
            isEmailVerified: true, // Google identity has verified email
            avatar: existingEmailUser.avatar || profile.picture || null,
            lastLoginAt: new Date(),
          },
        });
      } else {
        // 3. New user signup via Google
        user = await prisma.user.create({
          data: {
            name: profile.name.trim() || email.split('@')[0],
            email,
            googleId: profile.sub,
            authProvider: 'google',
            role: 'USER',
            avatar: profile.picture || null,
            isEmailVerified: true,
            isActive: true,
            lastLoginAt: new Date(),
          },
        });
      }
    }

    // 4. Create application session and JWT
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    try {
      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          userAgent: metadata?.userAgent || null,
          ipAddress: metadata?.ipAddress || null,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    } catch {
      // Non-fatal if session record logging fails
    }

    return {
      user: formatSafeUser(user),
      token,
    };
  }

  async logout(token?: string): Promise<void> {
    if (token) {
      try {
        await prisma.session.deleteMany({
          where: { token },
        });
      } catch (err) {
        // Ignore if already deleted
      }
    }
  }

  async getCurrentUser(userId: string): Promise<UserPayload> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found.', 401);
    }

    if (!user.isActive) {
      throw new AppError('User account is deactivated.', 403);
    }

    return formatSafeUser(user);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Security best practice: Never reveal if email exists. Always return success.
    if (!user || !user.isActive) {
      return;
    }

    // Clean up old tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Create 1-hour reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    await emailService.sendPasswordResetEmail(user.email, user.name, token);
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token: input.token },
      include: { user: true },
    });

    if (!resetRecord) {
      throw new AppError('Invalid or expired password reset token.', 400);
    }

    if (resetRecord.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: resetRecord.id } });
      throw new AppError('Password reset token has expired. Please request a new one.', 400);
    }

    const newHash = await hashPassword(input.password);

    // Update password
    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash: newHash },
    });

    // Invalidate reset token after successful use
    await prisma.passwordResetToken.delete({
      where: { id: resetRecord.id },
    });

    // Invalidate active sessions for security
    await prisma.session.deleteMany({
      where: { userId: resetRecord.userId },
    });
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    if (!user.passwordHash) {
      throw new AppError(
        'Your account was created via Google Sign In and does not have a current password. Please use Forgot Password to set one.',
        400
      );
    }

    const isMatch = await comparePassword(input.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Current password does not match.', 400);
    }

    if (input.currentPassword === input.newPassword) {
      throw new AppError('New password cannot be the same as your current password.', 400);
    }

    const newHash = await hashPassword(input.newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
  }

  async verifyEmail(token: string): Promise<UserPayload> {
    const record = await prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record) {
      throw new AppError('Invalid or expired verification token.', 400);
    }

    if (record.expiresAt < new Date()) {
      await prisma.verificationToken.delete({ where: { id: record.id } });
      throw new AppError('Verification token has expired. Please request a new verification email.', 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: record.userId },
      data: { isEmailVerified: true },
    });

    // Invalidate token
    await prisma.verificationToken.delete({
      where: { id: record.id },
    });

    return formatSafeUser(updatedUser);
  }
}

export const authService = new AuthService();