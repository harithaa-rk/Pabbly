import nodemailer, { Transporter } from 'nodemailer';
import { AppError } from '../utils/apiResponse.js';

export interface SmtpConnectionConfig {
  id: string;
  userId: string;
  name: string; // e.g. "Work Mailgun", "Transactional SendGrid", "Google Workspace"
  host: string;
  port: number;
  secure: boolean; // true for 465 (SSL), false for 587/25 (STARTTLS)
  username: string;
  password: string; // plaintext internally, securely held
  senderEmail: string;
  senderName?: string;
  createdAt: Date;
  updatedAt: Date;
  lastTestedAt?: Date;
  status: 'CONNECTED' | 'FAILED' | 'UNTESTED';
  statusMessage?: string;
}

export interface SanitizedSmtpConnection {
  id: string;
  userId: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  passwordMasked: string; // Always "********" - never leaks!
  senderEmail: string;
  senderName?: string;
  createdAt: Date;
  updatedAt: Date;
  lastTestedAt?: Date;
  status: 'CONNECTED' | 'FAILED' | 'UNTESTED';
  statusMessage?: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  timestamp: Date;
  details?: {
    host: string;
    port: number;
    senderEmail: string;
  };
}

export class SmtpConnectionService {
  // In-memory credential store (database-independent, multi-tenant isolated)
  private connections = new Map<string, SmtpConnectionConfig>();

  // Custom transporter factory hook for testing/mocking
  private mockTransporterFactory?: (config: SmtpConnectionConfig) => any;

  /**
   * Set a custom transport factory (used for unit tests without live internet)
   */
  setMockTransporterFactory(factory?: (config: SmtpConnectionConfig) => any): void {
    this.mockTransporterFactory = factory;
  }

  /**
   * Validates standard email address format
   */
  validateEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Validates comma-separated email list or single email
   */
  validateEmailList(emailListStr: string): { valid: boolean; invalidEmails: string[]; emails: string[] } {
    if (!emailListStr || typeof emailListStr !== 'string') {
      return { valid: false, invalidEmails: [], emails: [] };
    }

    const rawList = emailListStr.split(',').map((e) => e.trim()).filter(Boolean);
    if (rawList.length === 0) {
      return { valid: false, invalidEmails: [], emails: [] };
    }

    const invalidEmails: string[] = [];
    const validEmails: string[] = [];

    for (const email of rawList) {
      // If it contains unresolved template token (e.g. {{1.email}}), treat as token pending interpolation
      if (email.startsWith('{{') && email.endsWith('}}')) {
        validEmails.push(email);
      } else if (this.validateEmail(email)) {
        validEmails.push(email);
      } else {
        invalidEmails.push(email);
      }
    }

    return {
      valid: invalidEmails.length === 0 && validEmails.length > 0,
      invalidEmails,
      emails: validEmails,
    };
  }

  /**
   * Validates SMTP configuration completeness and data integrity
   */
  validateSmtpConfig(config: Partial<SmtpConnectionConfig>): void {
    if (!config.name || typeof config.name !== 'string' || !config.name.trim()) {
      throw new AppError('Connection name is required', 400);
    }

    if (!config.host || typeof config.host !== 'string' || !config.host.trim()) {
      throw new AppError('SMTP host is required (e.g. smtp.mailgun.org, smtp.sendgrid.net)', 400);
    }

    const portNum = Number(config.port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      throw new AppError('Valid SMTP port is required (e.g. 587, 465, 25)', 400);
    }

    if (!config.username || typeof config.username !== 'string' || !config.username.trim()) {
      throw new AppError('SMTP username is required', 400);
    }

    if (!config.password || typeof config.password !== 'string' || !config.password.trim()) {
      throw new AppError('SMTP password is required', 400);
    }

    if (!config.senderEmail || !this.validateEmail(config.senderEmail)) {
      throw new AppError('Valid sender email address is required (e.g. alerts@yourbusiness.com)', 400);
    }
  }

  /**
   * Creates a nodemailer transporter instance
   */
  createTransporter(config: SmtpConnectionConfig): any {
    if (this.mockTransporterFactory) {
      return this.mockTransporterFactory(config);
    }

    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure ?? (config.port === 465),
      auth: {
        user: config.username,
        pass: config.password,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });
  }

  /**
   * Tests SMTP connectivity and credentials via verify()
   * (Zero task deductions)
   */
  async testConnection(config: SmtpConnectionConfig): Promise<TestConnectionResult> {
    this.validateSmtpConfig(config);

    try {
      const transporter = this.createTransporter(config);
      await transporter.verify();

      return {
        success: true,
        message: `SMTP connection established successfully to ${config.host}:${config.port}`,
        timestamp: new Date(),
        details: {
          host: config.host,
          port: config.port,
          senderEmail: config.senderEmail,
        },
      };
    } catch (err: any) {
      // Sanitize error message to ensure no passwords or credentials leak in errors (Requirement 4 & 5)
      const sanitizedError = this.sanitizeErrorMessage(err.message || 'SMTP Authentication failed');
      return {
        success: false,
        message: `SMTP connection test failed: ${sanitizedError}`,
        timestamp: new Date(),
        details: {
          host: config.host,
          port: config.port,
          senderEmail: config.senderEmail,
        },
      };
    }
  }

  /**
   * Sanitizes error messages by scrubbing out passwords, tokens, or auth headers
   */
  sanitizeErrorMessage(errorStr: string): string {
    if (!errorStr) return 'Unknown SMTP error';
    return errorStr
      .replace(/pass(word)?\s*[:=]\s*[^\s,]+/gi, 'password=********')
      .replace(/auth(entication)?\s*[:=]\s*[^\s,]+/gi, 'auth=********')
      .replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer ********');
  }

  /**
   * Returns a sanitized connection object with password stripped
   */
  sanitizeConnection(connection: SmtpConnectionConfig): SanitizedSmtpConnection {
    const { password, ...rest } = connection;
    return {
      ...rest,
      passwordMasked: '********',
    };
  }

  /**
   * Registers or updates an SMTP connection for a user
   */
  async saveConnection(
    userId: string,
    data: Omit<SmtpConnectionConfig, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string }
  ): Promise<SanitizedSmtpConnection> {
    if (!userId) {
      throw new AppError('Authentication required to save SMTP connection', 401);
    }

    this.validateSmtpConfig(data);

    const now = new Date();
    const connectionId = data.id || `smtp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const existing = this.connections.get(connectionId);
    if (existing && existing.userId !== userId) {
      throw new AppError('Access denied: You do not have permission to modify this connection', 403);
    }

    const fullConnection: SmtpConnectionConfig = {
      id: connectionId,
      userId,
      name: data.name.trim(),
      host: data.host.trim(),
      port: Number(data.port),
      secure: Boolean(data.secure),
      username: data.username.trim(),
      password: data.password, // securely stored internally
      senderEmail: data.senderEmail.trim(),
      senderName: data.senderName?.trim() || 'KAIRA Connect Notifications',
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      status: existing ? existing.status : 'UNTESTED',
      statusMessage: existing ? existing.statusMessage : 'Connection created. Test connection to verify.',
    };

    this.connections.set(connectionId, fullConnection);
    return this.sanitizeConnection(fullConnection);
  }

  /**
   * Retrieves all connections belonging to a user (passwords redacted)
   */
  getUserConnections(userId: string): SanitizedSmtpConnection[] {
    const result: SanitizedSmtpConnection[] = [];
    for (const conn of this.connections.values()) {
      if (conn.userId === userId) {
        result.push(this.sanitizeConnection(conn));
      }
    }
    return result;
  }

  /**
   * Retrieves internal connection including credentials for backend-only dispatch
   */
  getConnectionInternal(connectionId: string, userId: string): SmtpConnectionConfig | null {
    const conn = this.connections.get(connectionId);
    if (!conn) return null;
    if (conn.userId !== userId && userId !== 'system_trusted_engine') {
      throw new AppError('Access denied: Unauthorized access to connection credentials', 403);
    }
    return conn;
  }

  /**
   * Deletes a connection with user ownership check
   */
  deleteConnection(connectionId: string, userId: string): boolean {
    const conn = this.connections.get(connectionId);
    if (!conn) return false;
    if (conn.userId !== userId) {
      throw new AppError('Access denied: You cannot delete another user\'s connection', 403);
    }
    return this.connections.delete(connectionId);
  }

  /**
   * Clears in-memory buffer (for testing teardown)
   */
  resetAll(): void {
    this.connections.clear();
    this.mockTransporterFactory = undefined;
  }
}

export const smtpConnectionService = new SmtpConnectionService();
