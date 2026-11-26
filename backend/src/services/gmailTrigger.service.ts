import { gmailConnectionService } from './gmailConnection.service.js';
import { AppError } from '../utils/apiResponse.js';

export interface GmailTriggerConfig {
  connectionId: string;
  triggerEvent: 'new_email' | 'search_filter' | 'sender_filter';
  searchQuery?: string;
  senderEmail?: string;
  subjectFilter?: string;
  maxResults?: number;
}

export interface ParsedGmailMessage {
  messageId: string;
  threadId: string;
  from: string;
  to: string;
  cc?: string;
  subject: string;
  date: string;
  snippet: string;
  bodyText: string;
  bodyHtml?: string;
  labels: string[];
  hasAttachments: boolean;
  receivedAt: string;
}

export class GmailTriggerService {
  // Set of processed message IDs to prevent duplicate trigger invocations
  private processedMessageIds = new Set<string>();

  // Map of last seen message timestamps per connection/query
  private lastPolledTimestamp = new Map<string, number>();

  /**
   * Helper to decode Base64Url string from Gmail message payload
   */
  public decodeBase64Url(data?: string): string {
    if (!data) return '';
    try {
      const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
      return Buffer.from(normalized, 'base64').toString('utf8');
    } catch {
      return '';
    }
  }

  /**
   * Recursively extract plain text and HTML bodies from Gmail message payload parts
   */
  public extractBodyParts(payload: any): { text: string; html: string; hasAttachments: boolean } {
    let text = '';
    let html = '';
    let hasAttachments = false;

    if (!payload) return { text, html, hasAttachments };

    if (payload.mimeType === 'text/plain' && payload.body?.data) {
      text += this.decodeBase64Url(payload.body.data);
    } else if (payload.mimeType === 'text/html' && payload.body?.data) {
      html += this.decodeBase64Url(payload.body.data);
    }

    if (payload.filename && payload.filename.length > 0) {
      hasAttachments = true;
    }

    if (Array.isArray(payload.parts)) {
      for (const part of payload.parts) {
        const sub = this.extractBodyParts(part);
        if (sub.text) text += (text ? '\n' : '') + sub.text;
        if (sub.html) html += sub.html;
        if (sub.hasAttachments) hasAttachments = true;
      }
    }

    return { text, html, hasAttachments };
  }

  /**
   * Parse a raw Gmail message object into a clean normalized schema
   */
  public parseMessage(rawMsg: any): ParsedGmailMessage {
    const headers = rawMsg.payload?.headers || [];
    let from = '';
    let to = '';
    let cc = '';
    let subject = '';
    let date = '';

    for (const h of headers) {
      const name = h.name.toLowerCase();
      if (name === 'from') from = h.value;
      if (name === 'to') to = h.value;
      if (name === 'cc') cc = h.value;
      if (name === 'subject') subject = h.value;
      if (name === 'date') date = h.value;
    }

    const { text, html, hasAttachments } = this.extractBodyParts(rawMsg.payload);

    return {
      messageId: rawMsg.id,
      threadId: rawMsg.threadId,
      from: from || 'unknown@example.com',
      to: to || '',
      cc: cc || undefined,
      subject: subject || '(No Subject)',
      date: date || new Date().toISOString(),
      snippet: rawMsg.snippet || text.substring(0, 120) || '',
      bodyText: text || rawMsg.snippet || '',
      bodyHtml: html || (text ? `<p>${text.replace(/\n/g, '<br/>')}</p>` : ''),
      labels: rawMsg.labelIds || [],
      hasAttachments,
      receivedAt: new Date(parseInt(rawMsg.internalDate || String(Date.now()), 10)).toISOString(),
    };
  }

  /**
   * Build the Gmail API search query string based on trigger config
   */
  public buildQuery(config: GmailTriggerConfig): string {
    const queryParts: string[] = [];

    if (config.triggerEvent === 'sender_filter' && config.senderEmail) {
      queryParts.push(`from:${config.senderEmail.trim()}`);
    } else if (config.triggerEvent === 'search_filter' && config.searchQuery) {
      queryParts.push(config.searchQuery.trim());
    } else {
      // Default: new emails in INBOX
      queryParts.push('label:INBOX');
    }

    if (config.subjectFilter && config.subjectFilter.trim().length > 0) {
      queryParts.push(`subject:"${config.subjectFilter.trim()}"`);
    }

    return queryParts.join(' ');
  }

  /**
   * Poll Gmail for messages matching trigger criteria
   */
  public async pollTrigger(config: GmailTriggerConfig, userId?: string): Promise<ParsedGmailMessage[]> {
    const { client } = await gmailConnectionService.getAuthenticatedClient(config.connectionId, userId);
    const query = this.buildQuery(config);
    const maxResults = config.maxResults || 5;

    let messageList: Array<{ id: string; threadId: string }> = [];
    try {
      const listRes = await client.request<{ messages?: Array<{ id: string; threadId: string }> }>({
        url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages',
        params: {
          q: query,
          maxResults,
        },
      });

      messageList = listRes.data.messages || [];
    } catch (err: any) {
      console.error('[Gmail Trigger Polling Error]:', err.message);
      throw new AppError(`Gmail Trigger Polling Failed: ${err.message}`, 400);
    }

    const newMessages: ParsedGmailMessage[] = [];

    for (const msgRef of messageList) {
      // Duplicate prevention: skip if already processed in this engine session
      if (this.processedMessageIds.has(msgRef.id)) {
        continue;
      }

      try {
        const fullMsg = await client.request<any>({
          url: `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgRef.id}`,
          params: { format: 'full' },
        });

        const parsed = this.parseMessage(fullMsg.data);
        this.processedMessageIds.add(msgRef.id);
        newMessages.push(parsed);
      } catch (fetchErr: any) {
        console.warn(`[Gmail Message Fetch Failed for ${msgRef.id}]:`, fetchErr.message);
      }
    }

    return newMessages;
  }

  /**
   * Provides realistic sample payloads for Visual & Manual Builder variable pickers
   */
  public getSamplePayload(triggerEvent: 'new_email' | 'search_filter' | 'sender_filter' = 'new_email'): ParsedGmailMessage {
    return {
      messageId: '18dc7a1b4e2f901a',
      threadId: '18dc7a1b4e2f901a',
      from: 'Alex Morgan <alex.morgan@clientfirm.com>',
      to: 'me@kairaconnect.com',
      cc: 'operations@clientfirm.com',
      subject: 'New Project Contract & Requirements Review',
      date: new Date().toUTCString(),
      snippet: 'Hi team, please find attached the reviewed contract and technical specifications for the upcoming sprint...',
      bodyText:
        'Hi team,\n\nPlease find attached the reviewed contract and technical specifications for the upcoming sprint. Looking forward to kickstarting on Monday.\n\nBest regards,\nAlex Morgan',
      bodyHtml:
        '<p>Hi team,</p><p>Please find attached the reviewed contract and technical specifications for the upcoming sprint. Looking forward to kickstarting on Monday.</p><p>Best regards,<br/>Alex Morgan</p>',
      labels: ['INBOX', 'IMPORTANT', 'CATEGORY_PERSONAL'],
      hasAttachments: true,
      receivedAt: new Date().toISOString(),
    };
  }

  /**
   * Converts a ParsedGmailMessage into mapped step variables for downstream mapping
   */
  public getAvailableVariables(msg?: ParsedGmailMessage): Array<{ name: string; key: string; example: string; token: string }> {
    const sample = msg || this.getSamplePayload();
    return [
      { name: 'Sender (From)', key: 'from', example: sample.from, token: '{{1.from}}' },
      { name: 'Recipient (To)', key: 'to', example: sample.to, token: '{{1.to}}' },
      { name: 'CC Participants', key: 'cc', example: sample.cc || '', token: '{{1.cc}}' },
      { name: 'Email Subject', key: 'subject', example: sample.subject, token: '{{1.subject}}' },
      { name: 'Email Snippet', key: 'snippet', example: sample.snippet, token: '{{1.snippet}}' },
      { name: 'Plain-text Body', key: 'bodyText', example: sample.bodyText, token: '{{1.bodyText}}' },
      { name: 'Message ID', key: 'messageId', example: sample.messageId, token: '{{1.messageId}}' },
      { name: 'Thread ID', key: 'threadId', example: sample.threadId, token: '{{1.threadId}}' },
      { name: 'Date Received', key: 'date', example: sample.date, token: '{{1.date}}' },
    ];
  }

  /**
   * Clear processed cache (for test cleanup)
   */
  public clearProcessedCache(): void {
    this.processedMessageIds.clear();
  }
}

export const gmailTriggerService = new GmailTriggerService();
