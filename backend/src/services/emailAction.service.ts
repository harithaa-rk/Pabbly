import {
  smtpConnectionService,
  SmtpConnectionConfig,
} from './smtpConnection.service.js';
import { AppError } from '../utils/apiResponse.js';

export interface EmailActionConfig {
  connectionId?: string;
  to: string; // Recipient(s), can be comma-separated or dynamic tokens like {{1.email}}
  cc?: string;
  bcc?: string;
  subject: string;
  body?: string; // Plain text
  html?: string; // HTML markup
  fromName?: string;
  fromEmail?: string;
}

export interface EmailPreviewResult {
  interpolatedTo: string;
  interpolatedCc?: string;
  interpolatedBcc?: string;
  interpolatedSubject: string;
  interpolatedBody: string;
  interpolatedHtml?: string;
  fromName: string;
  fromEmail?: string;
  mappedVariables: string[];
  isReadyForDispatch: boolean;
  statusNote: string;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId: string;
  accepted: string[];
  rejected: string[];
  subject: string;
  sentAt: Date;
  deliveryMode: 'SMTP_REAL' | 'SMTP_MOCK' | 'DRY_RUN_PREVIEW';
}

export class EmailActionService {
  /**
   * Replaces dynamic variable tokens like {{1.fieldName}} or {{fieldName}}
   * with actual data from preceding webhook payload. Supports nested objects.
   */
  interpolate(template: string, sampleData: Record<string, any>): { result: string; tokensUsed: string[] } {
    if (!template) return { result: '', tokensUsed: [] };

    const tokensUsed: string[] = [];
    const regex = /\{\{([^}]+)\}\}/g;

    const result = template.replace(regex, (_match, rawKey) => {
      const trimmed = rawKey.trim();
      tokensUsed.push(trimmed);

      // Support "1.fieldName" or just "fieldName"
      const keyParts = trimmed.split('.');
      const cleanParts = keyParts[0].match(/^[0-9]+$/) ? keyParts.slice(1) : keyParts;

      let current: any = sampleData;
      for (const part of cleanParts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part];
        } else {
          current = undefined;
          break;
        }
      }

      if (current !== undefined && current !== null) {
        return typeof current === 'object' ? JSON.stringify(current) : String(current);
      }

      // If key is directly in sampleData as-is
      if (trimmed in sampleData) {
        const val = sampleData[trimmed];
        return typeof val === 'object' ? JSON.stringify(val) : String(val);
      }

      // If not found in sample data, retain token placeholder
      return `{{${trimmed}}}`;
    });

    return { result, tokensUsed };
  }

  /**
   * Generates a dry-run preview of an email action with mapped sample data.
   * Zero SMTP dispatch, zero task deduction.
   */
  previewEmailAction(config: Partial<EmailActionConfig> = {}, sampleData: Record<string, any> = {}): EmailPreviewResult {
    const toResult = this.interpolate(config?.to || '', sampleData);
    const ccResult = this.interpolate(config?.cc || '', sampleData);
    const bccResult = this.interpolate(config?.bcc || '', sampleData);
    const subjectResult = this.interpolate(config?.subject || '', sampleData);
    const bodyResult = this.interpolate(config?.body || '', sampleData);
    const htmlResult = this.interpolate(config?.html || '', sampleData);

    const mappedVariables = Array.from(
      new Set([
        ...toResult.tokensUsed,
        ...ccResult.tokensUsed,
        ...bccResult.tokensUsed,
        ...subjectResult.tokensUsed,
        ...bodyResult.tokensUsed,
        ...htmlResult.tokensUsed,
      ])
    );

    const isReadyForDispatch = Boolean(
      toResult.result.trim() &&
        subjectResult.result.trim() &&
        (bodyResult.result.trim() || htmlResult.result.trim())
    );

    return {
      interpolatedTo: toResult.result,
      interpolatedCc: ccResult.result || undefined,
      interpolatedBcc: bccResult.result || undefined,
      interpolatedSubject: subjectResult.result,
      interpolatedBody: bodyResult.result,
      interpolatedHtml: htmlResult.result || undefined,
      fromName: config?.fromName || 'KAIRA Connect',
      fromEmail: config?.fromEmail || undefined,
      mappedVariables,
      isReadyForDispatch,
      statusNote: 'Preview validated. In dry-run mode, zero emails are sent and zero tasks are consumed.',
    };
  }

  /**
   * Dispatches email via configured SMTP connection (Backend-Only, Trusted Execution)
   */
  async dispatchEmailAction(params: {
    config: EmailActionConfig;
    payload: Record<string, any>;
    connection: SmtpConnectionConfig;
    isDryRun?: boolean;
  }): Promise<EmailDispatchResult> {
    const { config, payload, connection, isDryRun = false } = params;

    const preview = this.previewEmailAction(config, payload);

    if (isDryRun) {
      return {
        success: true,
        messageId: `dry_run_${Date.now()}`,
        accepted: [preview.interpolatedTo],
        rejected: [],
        subject: preview.interpolatedSubject,
        sentAt: new Date(),
        deliveryMode: 'DRY_RUN_PREVIEW',
      };
    }

    if (!connection) {
      throw new AppError('No SMTP connection configured for real email dispatch', 400);
    }

    // Validate recipient addresses
    const toCheck = smtpConnectionService.validateEmailList(preview.interpolatedTo);
    if (!toCheck.valid) {
      throw new AppError(
        `Invalid recipient email address: ${toCheck.invalidEmails.join(', ')}`,
        400
      );
    }

    const transporter = smtpConnectionService.createTransporter(connection);

    try {
      const mailOptions: any = {
        from: `"${preview.fromName || connection.senderName || 'KAIRA Connect'}" <${connection.senderEmail}>`,
        to: toCheck.emails,
        subject: preview.interpolatedSubject,
        text: preview.interpolatedBody,
      };

      if (preview.interpolatedCc) {
        const ccCheck = smtpConnectionService.validateEmailList(preview.interpolatedCc);
        if (ccCheck.valid) mailOptions.cc = ccCheck.emails;
      }

      if (preview.interpolatedBcc) {
        const bccCheck = smtpConnectionService.validateEmailList(preview.interpolatedBcc);
        if (bccCheck.valid) mailOptions.bcc = bccCheck.emails;
      }

      if (preview.interpolatedHtml) {
        mailOptions.html = preview.interpolatedHtml;
      }

      const info = await transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId || `msg_${Date.now()}`,
        accepted: (info.accepted as string[]) || toCheck.emails,
        rejected: (info.rejected as string[]) || [],
        subject: preview.interpolatedSubject,
        sentAt: new Date(),
        deliveryMode: 'SMTP_REAL',
      };
    } catch (err: any) {
      // Scrub any sensitive auth tokens or passwords from error message
      const sanitizedError = smtpConnectionService.sanitizeErrorMessage(err.message || 'SMTP dispatch failed');
      throw new AppError(`SMTP Email Dispatch Failed: ${sanitizedError}`, 502);
    }
  }
}

export const emailActionService = new EmailActionService();
