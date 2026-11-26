import { gmailConnectionService, InternalGmailConnection } from './gmailConnection.service.js';
import { AppError } from '../utils/apiResponse.js';

export interface GmailSendEmailOptions {
  connectionId: string;
  userId?: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  fromName?: string;
  isDryRun?: boolean;
}

export interface GmailReplyOptions {
  connectionId: string;
  userId?: string;
  messageId: string;
  threadId: string;
  bodyText?: string;
  bodyHtml?: string;
  fromName?: string;
  isDryRun?: boolean;
}

export interface GmailReplyAllOptions extends GmailReplyOptions {
  additionalRecipients?: string;
}

export interface GmailActionResult {
  success: boolean;
  messageId: string;
  threadId: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  isDryRun: boolean;
  deliveryMode: 'GMAIL_API' | 'DRY_RUN_PREVIEW';
  previewSnippet?: string;
}

export class GmailApiService {
  /**
   * Helper to format email address header: "Name <email@example.com>" or "email@example.com"
   */
  public formatAddress(email: string, name?: string): string {
    const cleanEmail = email.trim();
    if (!name || name.trim().length === 0) return cleanEmail;
    return `"${name.trim().replace(/"/g, '')}" <${cleanEmail}>`;
  }

  /**
   * Converts a raw RFC 2822 MIME message string to URL-safe Base64
   */
  public encodeBase64Url(str: string): string {
    return Buffer.from(str, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Builds an RFC 2822 compliant MIME message string
   */
  public buildMimeMessage(params: {
    from: string;
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    bodyText?: string;
    bodyHtml?: string;
    inReplyTo?: string;
    references?: string;
  }): string {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const headers: string[] = [
      `From: ${params.from}`,
      `To: ${params.to}`,
    ];

    if (params.cc && params.cc.trim().length > 0) {
      headers.push(`Cc: ${params.cc.trim()}`);
    }
    if (params.bcc && params.bcc.trim().length > 0) {
      headers.push(`Bcc: ${params.bcc.trim()}`);
    }

    // UTF-8 Subject encoding (RFC 2047)
    const encodedSubject = `=?UTF-8?B?${Buffer.from(params.subject || 'No Subject', 'utf8').toString('base64')}?=`;
    headers.push(`Subject: ${encodedSubject}`);

    if (params.inReplyTo) {
      headers.push(`In-Reply-To: ${params.inReplyTo}`);
    }
    if (params.references) {
      headers.push(`References: ${params.references}`);
    }

    headers.push('MIME-Version: 1.0');

    const textPart = params.bodyText || '';
    const htmlPart = params.bodyHtml || (params.bodyText ? `<p>${params.bodyText.replace(/\n/g, '<br/>')}</p>` : '');

    // Multipart/Alternative for rich HTML with plain-text fallback
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

    const bodyLines = [
      headers.join('\r\n'),
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      textPart,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      htmlPart,
      '',
      `--${boundary}--`,
      '',
    ];

    return bodyLines.join('\r\n');
  }

  /**
   * Parses recipient email addresses from header strings (e.g. "John Doe <j@x.com>, Jane <k@y.com>")
   */
  public extractEmailAddresses(headerValue?: string): string[] {
    if (!headerValue) return [];
    const emails: string[] = [];
    const parts = headerValue.split(',');
    for (const part of parts) {
      const match = part.match(/<([^>]+)>/) || part.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (match && match[1]) {
        emails.push(match[1].toLowerCase().trim());
      }
    }
    return emails;
  }

  /**
   * ACTION 1: Send Email via Gmail API
   */
  public async sendEmail(options: GmailSendEmailOptions): Promise<GmailActionResult> {
    if (!options.to || options.to.trim().length === 0) {
      throw new AppError('Recipient email address (To) is required.', 400);
    }
    if (!options.subject || options.subject.trim().length === 0) {
      throw new AppError('Email subject is required.', 400);
    }

    if (options.isDryRun) {
      return {
        success: true,
        messageId: `dry_run_msg_${Date.now()}`,
        threadId: `dry_run_th_${Date.now()}`,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        isDryRun: true,
        deliveryMode: 'DRY_RUN_PREVIEW',
        previewSnippet: options.bodyText?.substring(0, 150) || 'Dry run email preview generated successfully.',
      };
    }

    const { client, email: senderEmail } = await gmailConnectionService.getAuthenticatedClient(
      options.connectionId,
      options.userId
    );

    const fromHeader = this.formatAddress(senderEmail, options.fromName);
    const rawMime = this.buildMimeMessage({
      from: fromHeader,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      bodyText: options.bodyText,
      bodyHtml: options.bodyHtml,
    });

    const encodedMessage = this.encodeBase64Url(rawMime);

    try {
      const res = await client.request<{ id: string; threadId: string }>({
        url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        method: 'POST',
        data: {
          raw: encodedMessage,
        },
      });

      return {
        success: true,
        messageId: res.data.id,
        threadId: res.data.threadId,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        isDryRun: false,
        deliveryMode: 'GMAIL_API',
      };
    } catch (err: any) {
      console.error('[Gmail Send Email Error]:', err.message);
      throw new AppError(`Gmail API Send Error: ${err.message}`, 400);
    }
  }

  /**
   * ACTION 2: Reply to an existing email/thread
   */
  public async replyToEmail(options: GmailReplyOptions): Promise<GmailActionResult> {
    if (!options.messageId) {
      throw new AppError('Original message ID is required to reply.', 400);
    }

    if (options.isDryRun) {
      return {
        success: true,
        messageId: `dry_run_reply_${Date.now()}`,
        threadId: options.threadId || `dry_run_th_${Date.now()}`,
        to: 'original_sender@example.com',
        subject: 'Re: Original Email',
        isDryRun: true,
        deliveryMode: 'DRY_RUN_PREVIEW',
        previewSnippet: options.bodyText?.substring(0, 150) || 'Dry run reply preview generated.',
      };
    }

    const { client, email: senderEmail } = await gmailConnectionService.getAuthenticatedClient(
      options.connectionId,
      options.userId
    );

    // Fetch original message to extract sender, subject, and messageId header
    let originalSender = '';
    let originalSubject = '';
    let originalRfcMessageId = '';
    let targetThreadId = options.threadId;

    try {
      const origRes = await client.request<{
        id: string;
        threadId: string;
        payload: { headers: Array<{ name: string; value: string }> };
      }>({
        url: `https://gmail.googleapis.com/gmail/v1/users/me/messages/${options.messageId}`,
        params: { format: 'metadata', metadataHeaders: ['From', 'Subject', 'Message-ID', 'References'] },
      });

      targetThreadId = origRes.data.threadId || targetThreadId;
      for (const h of origRes.data.payload.headers || []) {
        const name = h.name.toLowerCase();
        if (name === 'from') originalSender = h.value;
        if (name === 'subject') originalSubject = h.value;
        if (name === 'message-id') originalRfcMessageId = h.value;
      }
    } catch (fetchErr: any) {
      console.warn('[Gmail Fetch Original Message Warning]:', fetchErr.message);
      // Fallback if message metadata fetch failed
      originalRfcMessageId = `<${options.messageId}@mail.gmail.com>`;
    }

    const replySubject = originalSubject.toLowerCase().startsWith('re:')
      ? originalSubject
      : `Re: ${originalSubject || 'Message'}`;

    const fromHeader = this.formatAddress(senderEmail, options.fromName);
    const toAddress = originalSender || senderEmail;

    const rawMime = this.buildMimeMessage({
      from: fromHeader,
      to: toAddress,
      subject: replySubject,
      bodyText: options.bodyText,
      bodyHtml: options.bodyHtml,
      inReplyTo: originalRfcMessageId,
      references: originalRfcMessageId,
    });

    const encodedMessage = this.encodeBase64Url(rawMime);

    try {
      const res = await client.request<{ id: string; threadId: string }>({
        url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        method: 'POST',
        data: {
          raw: encodedMessage,
          threadId: targetThreadId,
        },
      });

      return {
        success: true,
        messageId: res.data.id,
        threadId: res.data.threadId,
        to: toAddress,
        subject: replySubject,
        isDryRun: false,
        deliveryMode: 'GMAIL_API',
      };
    } catch (err: any) {
      console.error('[Gmail Reply Error]:', err.message);
      throw new AppError(`Gmail Reply Error: ${err.message}`, 400);
    }
  }

  /**
   * ACTION 3: Reply All (replying to original sender + all CC participants, excluding self)
   */
  public async replyAllToEmail(options: GmailReplyAllOptions): Promise<GmailActionResult> {
    if (!options.messageId) {
      throw new AppError('Original message ID is required to reply all.', 400);
    }

    if (options.isDryRun) {
      return {
        success: true,
        messageId: `dry_run_replyall_${Date.now()}`,
        threadId: options.threadId || `dry_run_th_${Date.now()}`,
        to: 'participants@example.com',
        cc: 'team@example.com',
        subject: 'Re: Original Email',
        isDryRun: true,
        deliveryMode: 'DRY_RUN_PREVIEW',
        previewSnippet: options.bodyText?.substring(0, 150) || 'Dry run Reply-All preview generated.',
      };
    }

    const { client, email: senderEmail } = await gmailConnectionService.getAuthenticatedClient(
      options.connectionId,
      options.userId
    );

    let originalFrom = '';
    let originalTo = '';
    let originalCc = '';
    let originalSubject = '';
    let originalRfcMessageId = '';
    let targetThreadId = options.threadId;

    try {
      const origRes = await client.request<{
        id: string;
        threadId: string;
        payload: { headers: Array<{ name: string; value: string }> };
      }>({
        url: `https://gmail.googleapis.com/gmail/v1/users/me/messages/${options.messageId}`,
        params: { format: 'metadata', metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Message-ID'] },
      });

      targetThreadId = origRes.data.threadId || targetThreadId;
      for (const h of origRes.data.payload.headers || []) {
        const name = h.name.toLowerCase();
        if (name === 'from') originalFrom = h.value;
        if (name === 'to') originalTo = h.value;
        if (name === 'cc') originalCc = h.value;
        if (name === 'subject') originalSubject = h.value;
        if (name === 'message-id') originalRfcMessageId = h.value;
      }
    } catch (err: any) {
      console.warn('[Gmail Fetch for Reply All]:', err.message);
      originalRfcMessageId = `<${options.messageId}@mail.gmail.com>`;
    }

    const lowerSelf = senderEmail.toLowerCase().trim();

    // Extract all participants
    const fromEmails = this.extractEmailAddresses(originalFrom);
    const toEmails = this.extractEmailAddresses(originalTo);
    const ccEmails = this.extractEmailAddresses(originalCc);

    // Reply-To becomes original sender (if not self, otherwise first other recipient)
    let replyTo = fromEmails.filter((e) => e !== lowerSelf)[0] || '';
    if (!replyTo && toEmails.length > 0) {
      replyTo = toEmails.filter((e) => e !== lowerSelf)[0] || '';
    }
    if (!replyTo) {
      replyTo = senderEmail;
    }

    // CC becomes all remaining participants from original To + original Cc, excluding self and replyTo
    const allParticipants = new Set([...toEmails, ...ccEmails]);
    allParticipants.delete(lowerSelf);
    allParticipants.delete(replyTo.toLowerCase());

    const replyCc = Array.from(allParticipants).join(', ');

    const replySubject = originalSubject.toLowerCase().startsWith('re:')
      ? originalSubject
      : `Re: ${originalSubject || 'Message'}`;

    const fromHeader = this.formatAddress(senderEmail, options.fromName);

    const rawMime = this.buildMimeMessage({
      from: fromHeader,
      to: replyTo,
      cc: replyCc || undefined,
      subject: replySubject,
      bodyText: options.bodyText,
      bodyHtml: options.bodyHtml,
      inReplyTo: originalRfcMessageId,
      references: originalRfcMessageId,
    });

    const encodedMessage = this.encodeBase64Url(rawMime);

    try {
      const res = await client.request<{ id: string; threadId: string }>({
        url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        method: 'POST',
        data: {
          raw: encodedMessage,
          threadId: targetThreadId,
        },
      });

      return {
        success: true,
        messageId: res.data.id,
        threadId: res.data.threadId,
        to: replyTo,
        cc: replyCc,
        subject: replySubject,
        isDryRun: false,
        deliveryMode: 'GMAIL_API',
      };
    } catch (err: any) {
      console.error('[Gmail Reply All Error]:', err.message);
      throw new AppError(`Gmail Reply All Error: ${err.message}`, 400);
    }
  }
}

export const gmailApiService = new GmailApiService();
