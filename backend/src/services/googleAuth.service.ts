import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { AppError } from '../utils/apiResponse.js';

export interface GoogleUserProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
}

export class GoogleAuthService {
  private client: OAuth2Client;

  constructor() {
    this.client = new OAuth2Client(
      env.google.clientId,
      env.google.clientSecret,
      env.google.callbackUrl
    );
  }

  /**
   * Generates the Google OAuth authorization URL.
   * Scopes requested are strictly: openid, email, profile.
   * Access type is online for login-only authentication.
   */
  getAuthorizationUrl(state: string): string {
    if (!env.google.clientId) {
      throw new AppError('Google OAuth is not configured on the server.', 500);
    }

    return this.client.generateAuthUrl({
      access_type: 'online',
      scope: ['openid', 'email', 'profile'],
      state,
      prompt: 'select_account',
    });
  }

  /**
   * Exchanges authorization code for tokens, verifies the ID token cryptographically
   * (validating signature, issuer, audience, and expiration), and extracts the verified user profile.
   */
  async verifyCallback(code: string): Promise<GoogleUserProfile> {
    if (!env.google.clientId || !env.google.clientSecret) {
      throw new AppError('Google OAuth is not configured on the server.', 500);
    }

    let tokens;
    try {
      const tokenResponse = await this.client.getToken(code);
      tokens = tokenResponse.tokens;
    } catch (err: any) {
      console.error('[Google OAuth Token Exchange Error]:', err.message);
      throw new AppError('Failed to exchange Google authorization code.', 400);
    }

    if (!tokens.id_token) {
      throw new AppError('No ID token received from Google.', 400);
    }

    let ticket;
    try {
      ticket = await this.client.verifyIdToken({
        idToken: tokens.id_token,
        audience: env.google.clientId,
      });
    } catch (err: any) {
      console.error('[Google ID Token Verification Error]:', err.message);
      throw new AppError('Failed to verify Google identity token.', 401);
    }

    const payload = ticket.getPayload();
    if (!payload) {
      throw new AppError('Empty payload from Google identity token.', 401);
    }

    if (!payload.sub) {
      throw new AppError('Missing Google unique identifier (sub).', 400);
    }

    if (!payload.email) {
      throw new AppError('Missing email address in Google account.', 400);
    }

    if (!payload.email_verified) {
      throw new AppError('Google email address is not verified. Please verify your Google email first.', 403);
    }

    return {
      sub: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name || payload.email.split('@')[0],
      picture: payload.picture,
      emailVerified: payload.email_verified,
    };
  }
}

export const googleAuthService = new GoogleAuthService();

