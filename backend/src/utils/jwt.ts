import jwt from 'jsonwebtoken';
import { Response, CookieOptions } from 'express';
import { env } from '../config/env.js';
import { AuthenticatedUser } from '../types/index.js';

export const COOKIE_NAME = 'kaira_token';

export function signToken(payload: AuthenticatedUser): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as any,
  });
}

export function verifyToken(token: string): AuthenticatedUser {
  return jwt.verify(token, env.jwtSecret) as AuthenticatedUser;
}

export function getCookieOptions(): CookieOptions {
  const isProduction = env.nodeEnv === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
    path: '/',
    ...(env.cookieDomain ? { domain: env.cookieDomain } : {}),
  };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, getCookieOptions());
}

export function clearAuthCookie(res: Response): void {
  const isProduction = env.nodeEnv === 'production';
  res.cookie(COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    expires: new Date(0),
    path: '/',
    ...(env.cookieDomain ? { domain: env.cookieDomain } : {}),
  });
}

