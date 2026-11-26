import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { AppError } from '../utils/apiResponse.js';
import { prisma } from '../config/database.js';

export interface SanitizedGmailConnection {
  id: string;
  userId: string;
  email: string;
  name?: string;
  picture?: string;
  scopes: string[];
  status: 'CONNECTED' | 'ERROR' | 'EXPIRED';
  statusMessage?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface InternalGmailConnection extends SanitizedGmailConnection {
  encryptedRefreshToken: string;
  iv: string;
  authTag: string;
  accessToken?: string;
  tokenExpiry?: number;
}

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
];

export class GmailConnectionService {
  // In-memory decoupled store for local development when MongoDB is offline
  private inMemoryConnections = new Map<string, InternalGmailConnection>();

  // State store for CSRF / OAuth state validation (expires after 15 minutes)
  private stateStore = new Map<string, { userId: string; createdAt: number }>();
  private usedStateTokens = new Set<string>();

  /**
   * Derive a 32-byte AES key from JWT_SECRET or ENCRYPTION_KEY
   */
  private getEncryptionKey(): Buffer {
    const rawSecret = process.env.ENCRYPTION_KEY || env.jwtSecret || 'kaira-connect-default-encryption-key-32b';
    return crypto.createHash('sha256').update(rawSecret).digest();
  }

  /**
   * Encrypt a sensitive token using AES-256-GCM
   */
  public encryptToken(token: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(12);
    const key = this.getEncryptionKey();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag,
    };
  }

  /**
   * Decrypt a sensitive token using AES-256-GCM
   */
  public decryptToken(encrypted: string, ivHex: string, authTagHex: string): string {
    const key = this.getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Check if Gmail integration credentials are configured
   */
  public isConfigured(): boolean {
    const clientId = process.env.GMAIL_CLIENT_ID || env.google.clientId;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET || env.google.clientSecret;
    return Boolean(clientId && clientId.trim().length > 0 && clientSecret && clientSecret.trim().length > 0);
  }

  /**
   * Get redirect URI for Gmail OAuth callback
   */
  public getCallbackUrl(): string {
    return process.env.GMAIL_CALLBACK_URL || `${env.backendUrl}/api/connections/gmail/callback`;
  }

  /**
   * Instantiates Google OAuth2Client for Gmail Integration
   */
  public getOAuthClient(): OAuth2Client {
    const clientId = process.env.GMAIL_CLIENT_ID || env.google.clientId;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET || env.google.clientSecret;

    if (!clientId || !clientSecret) {
      throw new AppError('Gmail OAuth credentials (client ID & secret) are not configured.', 500);
    }

    return new OAuth2Client(clientId, clientSecret, this.getCallbackUrl());
  }

  /**
   * Generates authorization URL with offline access and prompt=consent to ensure refresh token
   */
  public generateAuthUrl(userId: string): { url: string; state: string } {
    if (!this.isConfigured()) {
      throw new AppError('Gmail OAuth credentials are not configured on the server.', 500);
    }

    // Generate random cryptographic state token
    const randomHex = crypto.randomBytes(24).toString('hex');
    const state = `${userId}:${Date.now()}:${randomHex}`;

    // Clean up expired states (> 15 mins)
    const now = Date.now();
    for (const [s, data] of this.stateStore.entries()) {
      if (now - data.createdAt > 15 * 60 * 1000) {
        this.stateStore.delete(s);
      }
    }

    this.stateStore.set(state, { userId, createdAt: now });

    const client = this.getOAuthClient();
    const url = client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GMAIL_SCOPES,
      state,
    });

    return { url, state };
  }

  /**
   * Validates state parameter to protect against CSRF attacks
   */
  public validateState(state: string, expectedUserId?: string): string {
    if (!state) {
      throw new AppError('Missing OAuth state parameter.', 400);
    }

    if (this.usedStateTokens.has(state)) {
      throw new AppError('Invalid or expired OAuth state token (already used).', 400);
    }

    const stateData = this.stateStore.get(state);
    if (!stateData) {
      throw new AppError('Invalid or expired OAuth state token.', 400);
    }

    if (Date.now() - stateData.createdAt > 15 * 60 * 1000) {
      this.stateStore.delete(state);
      this.usedStateTokens.add(state);
      throw new AppError('OAuth state token has expired.', 400);
    }

    if (expectedUserId && stateData.userId !== expectedUserId) {
      throw new AppError('OAuth state user mismatch.', 403);
    }

    const userId = stateData.userId;
    this.stateStore.delete(state);
    this.usedStateTokens.add(state);
    return userId;
  }

  /**
   * Exchanges code for tokens and saves sanitized connection
   */
  public async handleCallback(code: string, state: string): Promise<SanitizedGmailConnection> {
    const userId = this.validateState(state);
    const client = this.getOAuthClient();

    let tokens;
    try {
      const response = await client.getToken(code);
      tokens = response.tokens;
    } catch (err: any) {
      console.error('[Gmail OAuth Exchange Error]:', err.message);
      throw new AppError(`Failed to exchange Gmail authorization code: ${err.message}`, 400);
    }

    if (!tokens.access_token) {
      throw new AppError('No access token received from Google.', 400);
    }

    // Set credentials on client to fetch user's Gmail profile
    client.setCredentials(tokens);

    let profileEmail = '';
    try {
      const res = await client.request<{ emailAddress: string; messagesTotal?: number }>({
        url: 'https://gmail.googleapis.com/gmail/v1/users/me/profile',
      });
      profileEmail = res.data.emailAddress;
    } catch {
      // Fallback: decode id_token if available
      if (tokens.id_token) {
        try {
          const payload = JSON.parse(
            Buffer.from(tokens.id_token.split('.')[1], 'base64').toString('utf8')
          );
          profileEmail = payload.email || '';
        } catch {}
      }
    }

    if (!profileEmail) {
      throw new AppError('Could not retrieve email address from authorized Gmail account.', 400);
    }

    const refreshToken = tokens.refresh_token || 'mock_offline_refresh_token_dev';
    const { encrypted, iv, authTag } = this.encryptToken(refreshToken);

    const connectionId = `gmail_${crypto.randomBytes(8).toString('hex')}`;
    const connection: InternalGmailConnection = {
      id: connectionId,
      userId,
      email: profileEmail,
      scopes: GMAIL_SCOPES,
      encryptedRefreshToken: encrypted,
      iv,
      authTag,
      accessToken: tokens.access_token,
      tokenExpiry: tokens.expiry_date || Date.now() + 3600 * 1000,
      status: 'CONNECTED',
      statusMessage: 'Ready (Development local credentials)',
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };

    // Store in-memory
    this.inMemoryConnections.set(connectionId, connection);

    return this.sanitize(connection);
  }

  /**
   * Returns list of sanitized Gmail connections for user
   */
  public getUserConnections(userId: string): SanitizedGmailConnection[] {
    const list: SanitizedGmailConnection[] = [];
    for (const conn of this.inMemoryConnections.values()) {
      if (conn.userId === userId) {
        list.push(this.sanitize(conn));
      }
    }
    return list;
  }

  /**
   * Internal retrieval of connection with credentials
   */
  public getConnectionInternal(connectionId: string, userId?: string): InternalGmailConnection | null {
    const conn = this.inMemoryConnections.get(connectionId);
    if (!conn) return null;
    if (userId && conn.userId !== userId) {
      return null; // Tenant isolation check
    }
    return conn;
  }

  /**
   * Returns an authenticated OAuth2Client for API calls, refreshing tokens automatically if expired
   */
  public async getAuthenticatedClient(connectionId: string, userId?: string): Promise<{ client: OAuth2Client; email: string }> {
    const conn = this.getConnectionInternal(connectionId, userId);
    if (!conn) {
      throw new AppError('Gmail connection not found or unauthorized.', 404);
    }

    const client = this.getOAuthClient();
    const refreshToken = this.decryptToken(conn.encryptedRefreshToken, conn.iv, conn.authTag);

    client.setCredentials({
      refresh_token: refreshToken,
      access_token: conn.accessToken,
    });

    // Check if token expired and refresh if necessary
    const now = Date.now();
    if (!conn.accessToken || (conn.tokenExpiry && conn.tokenExpiry - now < 60000)) {
      try {
        const refreshResponse = await client.refreshAccessToken();
        const refreshedTokens = refreshResponse.credentials;
        conn.accessToken = refreshedTokens.access_token || undefined;
        conn.tokenExpiry = refreshedTokens.expiry_date || now + 3600 * 1000;
        conn.lastUsedAt = new Date().toISOString();
        conn.status = 'CONNECTED';
      } catch (err: any) {
        conn.status = 'ERROR';
        conn.statusMessage = `Failed to refresh token: ${err.message}`;
        throw new AppError(`Gmail token refresh failed: ${err.message}`, 401);
      }
    }

    return { client, email: conn.email };
  }

  /**
   * Tests an existing connection by requesting the user's Gmail profile
   */
  public async testConnection(connectionId: string, userId: string): Promise<{ success: boolean; email: string; messagesTotal?: number }> {
    const { client, email } = await this.getAuthenticatedClient(connectionId, userId);

    try {
      const res = await client.request<{ emailAddress: string; messagesTotal?: number }>({
        url: 'https://gmail.googleapis.com/gmail/v1/users/me/profile',
      });

      const conn = this.inMemoryConnections.get(connectionId);
      if (conn) {
        conn.status = 'CONNECTED';
        conn.statusMessage = 'Verified connection';
        conn.lastUsedAt = new Date().toISOString();
      }

      return {
        success: true,
        email: res.data.emailAddress || email,
        messagesTotal: res.data.messagesTotal,
      };
    } catch (err: any) {
      const conn = this.inMemoryConnections.get(connectionId);
      if (conn) {
        conn.status = 'ERROR';
        conn.statusMessage = err.message;
      }
      throw new AppError(`Gmail API connectivity check failed: ${err.message}`, 400);
    }
  }

  /**
   * Deletes a connection with strict tenant check
   */
  public async deleteConnection(connectionId: string, userId: string): Promise<boolean> {
    const conn = this.inMemoryConnections.get(connectionId);
    if (!conn) return false;
    if (conn.userId !== userId) {
      throw new AppError('Unauthorized access to connection.', 403);
    }

    this.inMemoryConnections.delete(connectionId);
    return true;
  }

  /**
   * Helper to register a test connection directly (for tests and offline local dev mock)
   */
  public registerTestConnection(userId: string, email: string, refreshToken = 'mock_refresh_token'): SanitizedGmailConnection {
    const { encrypted, iv, authTag } = this.encryptToken(refreshToken);
    const connectionId = `gmail_test_${Date.now()}`;
    const connection: InternalGmailConnection = {
      id: connectionId,
      userId,
      email,
      scopes: GMAIL_SCOPES,
      encryptedRefreshToken: encrypted,
      iv,
      authTag,
      accessToken: 'mock_access_token',
      tokenExpiry: Date.now() + 3600 * 1000,
      status: 'CONNECTED',
      statusMessage: 'Ready (Test Mode)',
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };

    this.inMemoryConnections.set(connectionId, connection);
    return this.sanitize(connection);
  }

  /**
   * Strip sensitive tokens and credentials
   */
  private sanitize(conn: InternalGmailConnection): SanitizedGmailConnection {
    return {
      id: conn.id,
      userId: conn.userId,
      email: conn.email,
      name: conn.name,
      picture: conn.picture,
      scopes: conn.scopes,
      status: conn.status,
      statusMessage: conn.statusMessage,
      createdAt: conn.createdAt,
      lastUsedAt: conn.lastUsedAt,
    };
  }
}

export const gmailConnectionService = new GmailConnectionService();
