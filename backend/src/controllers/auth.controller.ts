import crypto from 'crypto';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index.js';
import { authService } from '../services/auth.service.js';
import { googleAuthService } from '../services/googleAuth.service.js';
import { env } from '../config/env.js';
import { setAuthCookie, clearAuthCookie, COOKIE_NAME } from '../utils/jwt.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function register(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user, token } = await authService.register(req.body);
    setAuthCookie(res, token);
    sendSuccess(
      res,
      'Registration successful. Please verify your email address.',
      { token },
      201,
      { user }
    );
  } catch (error) {
    next(error);
  }
}

export async function login(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const metadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
    };
    const { user, token } = await authService.login(req.body, metadata);
    setAuthCookie(res, token);
    sendSuccess(res, 'Login successful', { token }, 200, { user });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[COOKIE_NAME] || req.headers.authorization?.split(' ')[1];
    await authService.logout(token);
    clearAuthCookie(res);
    sendSuccess(res, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const user = await authService.getCurrentUser(userId);
    sendSuccess(res, 'User authenticated successfully', undefined, 200, { user });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.forgotPassword(req.body.email);
    sendSuccess(res, 'If the email exists, a password reset link has been sent.');
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.resetPassword(req.body);
    sendSuccess(res, 'Password has been reset successfully. Please log in with your new password.');
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    await authService.changePassword(userId, req.body);
    sendSuccess(res, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
}

export async function verifyEmail(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.query.token as string;
    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Verification token is required',
        errors: [],
      });
      return;
    }
    const user = await authService.verifyEmail(token);
    sendSuccess(res, 'Email verified successfully', undefined, 200, { user });
  } catch (error) {
    next(error);
  }
}

export async function googleAuthRedirect(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const state = crypto.randomBytes(32).toString('hex');
    const isProduction = env.nodeEnv === 'production';

    // Store state in a secure httpOnly cookie (valid for 10 minutes)
    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
      path: '/',
      ...(env.cookieDomain ? { domain: env.cookieDomain } : {}),
    });

    const authUrl = googleAuthService.getAuthorizationUrl(state);
    res.redirect(authUrl);
  } catch (error) {
    next(error);
  }
}

export async function googleAuthCallback(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const isProduction = env.nodeEnv === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    ...(env.cookieDomain ? { domain: env.cookieDomain } : {}),
  };

  try {
    const { code, state, error } = req.query as { code?: string; state?: string; error?: string };

    // 1. Handle user cancellation or Google authorization error
    if (error) {
      res.clearCookie('oauth_state', cookieOptions);
      const errCode = error === 'access_denied' ? 'cancelled' : 'google_oauth_denied';
      return res.redirect(`${env.frontendUrl}/login?error=${errCode}`);
    }

    // 2. CSRF State validation
    const savedState = req.cookies?.oauth_state;
    res.clearCookie('oauth_state', cookieOptions);

    if (!state || !savedState || state !== savedState) {
      console.warn('[Google OAuth Warning]: State mismatch or expired OAuth state');
      return res.redirect(`${env.frontendUrl}/login?error=invalid_state`);
    }

    // 3. Authorization code check
    if (!code) {
      return res.redirect(`${env.frontendUrl}/login?error=missing_code`);
    }

    // 4. Exchange code for tokens and verify ID token signature, issuer, aud, exp
    const googleProfile = await googleAuthService.verifyCallback(code);

    // 5. Find or create user in MongoDB and create application session
    const metadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
    };
    const { token } = await authService.handleGoogleAuth(googleProfile, metadata);

    // 6. Set HTTP-only application auth cookie
    setAuthCookie(res, token);

    // 7. Redirect to authenticated frontend dashboard
    return res.redirect(`${env.frontendUrl}/dashboard`);
  } catch (error: any) {
    console.error('[Google OAuth Callback Error]:', error.message || error);
    return res.redirect(`${env.frontendUrl}/login?error=auth_failed`);
  }
}

