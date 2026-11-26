import crypto from 'crypto';
import { AppError } from '../utils/apiResponse.js';

export interface WebhookEvent {
  id: string;
  workflowId: string;
  payload: Record<string, any>;
  receivedAt: Date;
  expiresAt: Date;
  headers: Record<string, string | string[] | undefined>;
}

export interface WorkflowWebhookRegistration {
  workflowId: string;
  userId: string;
  secretToken: string;
  createdAt: Date;
  updatedAt: Date;
}

export class WebhookService {
  // In-memory buffer storing recent webhook captures per workflowId
  private capturedWebhooks = new Map<string, WebhookEvent[]>();

  // In-memory registry tracking workflow ownership and secret tokens
  private workflowRegistrations = new Map<string, WorkflowWebhookRegistration>();

  // Configurable TTL for in-memory buffer (defaults to 1 hour = 3600000 ms)
  private ttlMs: number = 60 * 60 * 1000;

  constructor(defaultTtlMs: number = 60 * 60 * 1000) {
    this.ttlMs = defaultTtlMs;
  }

  /**
   * Set or update TTL in milliseconds
   */
  setTTL(ms: number): void {
    if (ms <= 0) {
      throw new Error('TTL must be a positive integer in milliseconds');
    }
    this.ttlMs = ms;
  }

  getTTL(): number {
    return this.ttlMs;
  }

  /**
   * Generates a cryptographically secure random token (e.g. whsec_...)
   */
  generateSecureSecret(): string {
    return 'whsec_' + crypto.randomBytes(24).toString('hex');
  }

  /**
   * Registers workflow ownership with a cryptographically secure secret token.
   * If already registered, verifies ownership.
   */
  registerWorkflow(workflowId: string, userId: string, secretToken?: string): WorkflowWebhookRegistration {
    const existing = this.workflowRegistrations.get(workflowId);

    if (existing) {
      if (existing.userId !== userId) {
        throw new AppError('Access denied: Workflow is registered to another user', 403);
      }
      return existing;
    }

    const registration: WorkflowWebhookRegistration = {
      workflowId,
      userId,
      secretToken: secretToken || this.generateSecureSecret(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workflowRegistrations.set(workflowId, registration);
    return registration;
  }

  /**
   * Verifies if a given userId owns the workflow.
   * If workflow is not yet registered in memory, claims ownership for this user.
   */
  verifyOwnership(workflowId: string, userId: string): boolean {
    if (!workflowId || !userId) return false;

    const existing = this.workflowRegistrations.get(workflowId);
    if (!existing) {
      // First authorized owner claim
      this.registerWorkflow(workflowId, userId);
      return true;
    }

    return existing.userId === userId;
  }

  /**
   * Gets the registration for a workflow if the requesting user is the owner.
   */
  getRegistration(workflowId: string, userId: string): WorkflowWebhookRegistration | null {
    const reg = this.workflowRegistrations.get(workflowId);
    if (!reg) return null;
    if (reg.userId !== userId) {
      throw new AppError('Access denied: You do not have permission to view this workflow secret', 403);
    }
    return reg;
  }

  /**
   * Verifies an incoming webhook secret token using timing-safe comparison.
   * Every registered production webhook strictly requires a valid secret.
   * Unregistered workflows are rejected to eliminate security gaps after restart.
   */
  verifySecret(
    workflowId: string,
    providedSecret?: string
  ): { isValid: boolean; reason?: 'unregistered_workflow' | 'missing_secret' | 'invalid_secret' } {
    const reg = this.workflowRegistrations.get(workflowId);
    if (!reg) {
      // Security fix: Unregistered production workflows are strictly rejected
      return { isValid: false, reason: 'unregistered_workflow' };
    }

    if (!providedSecret) {
      // Registered webhook strictly requires secret
      return { isValid: false, reason: 'missing_secret' };
    }

    const expectedBuffer = Buffer.from(reg.secretToken);
    const providedBuffer = Buffer.from(providedSecret);

    if (expectedBuffer.length !== providedBuffer.length) {
      return { isValid: false, reason: 'invalid_secret' };
    }

    const isMatch = crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    return isMatch ? { isValid: true } : { isValid: false, reason: 'invalid_secret' };
  }

  /**
   * Captures an incoming HTTP POST webhook payload in memory.
   * Uses cryptographically secure event IDs and sets expiration according to TTL.
   */
  captureWebhook(
    workflowId: string,
    payload: Record<string, any>,
    headers: Record<string, string | string[] | undefined> = {}
  ): WebhookEvent {
    const safePayload =
      typeof payload === 'object' && payload !== null ? payload : { raw: payload };

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlMs);

    const event: WebhookEvent = {
      id: 'wh_evt_' + crypto.randomBytes(12).toString('hex'),
      workflowId,
      payload: safePayload,
      receivedAt: now,
      expiresAt,
      headers: {
        'content-type': headers['content-type'] as string,
        'user-agent': headers['user-agent'] as string,
      },
    };

    const existing = this.capturedWebhooks.get(workflowId) || [];

    // Filter out any expired events in the buffer first
    const activeEvents = existing.filter((evt) => evt.expiresAt.getTime() > now.getTime());
    activeEvents.unshift(event);

    // Keep up to 10 most recent events in memory
    if (activeEvents.length > 10) {
      activeEvents.pop();
    }

    this.capturedWebhooks.set(workflowId, activeEvents);
    return event;
  }

  /**
   * Retrieves the most recently captured unexpired payload for a workflow.
   * Automatically purges expired payloads and cleans up empty workflow entries.
   */
  getLatestPayload(workflowId: string): WebhookEvent | null {
    const events = this.capturedWebhooks.get(workflowId);
    if (!events || events.length === 0) {
      return null;
    }

    const now = Date.now();
    // Filter out expired items
    const unexpired = events.filter((evt) => evt.expiresAt.getTime() > now);

    if (unexpired.length === 0) {
      // All events expired: purge workflow entry to avoid memory leak
      this.capturedWebhooks.delete(workflowId);
      return null;
    }

    if (unexpired.length !== events.length) {
      this.capturedWebhooks.set(workflowId, unexpired);
    }

    return unexpired[0];
  }

  /**
   * Cleans all expired events across all registered workflows.
   */
  pruneExpired(): number {
    const now = Date.now();
    let prunedCount = 0;

    for (const [wfId, events] of this.capturedWebhooks.entries()) {
      const remaining = events.filter((e) => e.expiresAt.getTime() > now);
      prunedCount += events.length - remaining.length;

      if (remaining.length === 0) {
        this.capturedWebhooks.delete(wfId);
      } else if (remaining.length !== events.length) {
        this.capturedWebhooks.set(wfId, remaining);
      }
    }

    return prunedCount;
  }

  /**
   * Clears captured payloads for a workflow.
   */
  clearPayloads(workflowId: string): void {
    this.capturedWebhooks.delete(workflowId);
  }

  /**
   * Reset all in-memory buffers (primarily for test resets)
   */
  resetAll(): void {
    this.capturedWebhooks.clear();
    this.workflowRegistrations.clear();
    this.ttlMs = 60 * 60 * 1000;
  }
}

export const webhookService = new WebhookService();
