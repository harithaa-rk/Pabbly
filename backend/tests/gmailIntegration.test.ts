import { gmailConnectionService, GMAIL_SCOPES } from '../src/services/gmailConnection.service.js';
import { gmailApiService } from '../src/services/gmailApi.service.js';
import { gmailTriggerService } from '../src/services/gmailTrigger.service.js';
import { workflowExecutionEngine, WorkflowDefinition } from '../src/services/workflowExecution.service.js';

describe('Phase 4, 5, 6, 8: Gmail Integration & Execution Engine Suite', () => {
  const userA = 'user_alpha_101';
  const userB = 'user_bravo_202';
  let connA: ReturnType<typeof gmailConnectionService.registerTestConnection>;

  beforeEach(() => {
    gmailTriggerService.clearProcessedCache();
    connA = gmailConnectionService.registerTestConnection(userA, 'alpha@example.com', 'test_refresh_token_123');
  });

  describe('1. AES-256-GCM Token Encryption & Decryption', () => {
    it('should encrypt a refresh token and produce encrypted text, iv, and authTag', () => {
      const rawToken = 'ya29.a0AfH6SMA_mock_refresh_token_xyz';
      const result = gmailConnectionService.encryptToken(rawToken);

      expect(result.encrypted).toBeDefined();
      expect(result.iv).toHaveLength(24); // 12 bytes = 24 hex chars
      expect(result.authTag).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(result.encrypted).not.toEqual(rawToken);
    });

    it('should accurately decrypt the encrypted token using AES-256-GCM', () => {
      const rawToken = 'ya29.a0AfH6SMA_secret_token_value_789';
      const { encrypted, iv, authTag } = gmailConnectionService.encryptToken(rawToken);
      const decrypted = gmailConnectionService.decryptToken(encrypted, iv, authTag);

      expect(decrypted).toEqual(rawToken);
    });

    it('should throw an error if authTag or ciphertext is tampered with', () => {
      const rawToken = 'sensitive_oauth_token';
      const { encrypted, iv } = gmailConnectionService.encryptToken(rawToken);
      const fakeAuthTag = '00'.repeat(16);

      expect(() => {
        gmailConnectionService.decryptToken(encrypted, iv, fakeAuthTag);
      }).toThrow();
    });
  });

  describe('2. Gmail OAuth State Generation & Validation', () => {
    it('should generate valid state token tied to userId and timestamp', () => {
      const { state } = gmailConnectionService.generateAuthUrl(userA);
      expect(state).toContain(userA);

      const validatedUserId = gmailConnectionService.validateState(state, userA);
      expect(validatedUserId).toEqual(userA);
    });

    it('should reject state token when user mismatch occurs', () => {
      const { state } = gmailConnectionService.generateAuthUrl(userA);

      expect(() => {
        gmailConnectionService.validateState(state, userB);
      }).toThrow(/user mismatch/i);
    });

    it('should reject state token after it has already been used once (one-time CSRF protection)', () => {
      const { state } = gmailConnectionService.generateAuthUrl(userA);
      gmailConnectionService.validateState(state, userA);

      expect(() => {
        gmailConnectionService.validateState(state, userA);
      }).toThrow(/invalid or expired/i);
    });
  });

  describe('3. Multi-Tenant Connection Isolation', () => {
    it('should return only connections owned by the specified user', () => {
      gmailConnectionService.registerTestConnection(userB, 'bravo@example.com');

      const userAConns = gmailConnectionService.getUserConnections(userA);
      const userBConns = gmailConnectionService.getUserConnections(userB);

      expect(userAConns.every((c) => c.userId === userA)).toBe(true);
      expect(userBConns.every((c) => c.userId === userB)).toBe(true);
      expect(userAConns.some((c) => c.email === 'bravo@example.com')).toBe(false);
    });

    it('should never expose sensitive tokens in sanitized connection objects', () => {
      const conns = gmailConnectionService.getUserConnections(userA);
      const first = conns[0] as any;

      expect(first.encryptedRefreshToken).toBeUndefined();
      expect(first.iv).toBeUndefined();
      expect(first.authTag).toBeUndefined();
      expect(first.email).toEqual('alpha@example.com');
      expect(first.scopes).toEqual(GMAIL_SCOPES);
    });

    it('should prevent User B from deleting or testing User A connection', async () => {
      await expect(gmailConnectionService.deleteConnection(connA.id, userB)).rejects.toThrow(/unauthorized/i);
      await expect(gmailConnectionService.testConnection(connA.id, userB)).rejects.toThrow(/not found or unauthorized/i);
    });
  });

  describe('4. MIME Message Construction & RFC 2822 Compliance', () => {
    it('should construct valid base64url encoded MIME messages', () => {
      const rawMime = gmailApiService.buildMimeMessage({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        cc: 'cc@example.com',
        subject: 'Invoice #1042',
        bodyText: 'Please review invoice.',
      });

      expect(rawMime).toContain('From: sender@example.com');
      expect(rawMime).toContain('To: recipient@example.com');
      expect(rawMime).toContain('Cc: cc@example.com');
      expect(rawMime).toContain('multipart/alternative');

      const base64Url = gmailApiService.encodeBase64Url(rawMime);
      expect(base64Url).not.toContain('+');
      expect(base64Url).not.toContain('/');
      expect(base64Url).not.toContain('=');
    });

    it('should extract clean recipient email addresses for reply all', () => {
      const header = 'Alex Morgan <alex@firm.com>, "Taylor, Chris" <chris@firm.com>, dev@kaira.com';
      const extracted = gmailApiService.extractEmailAddresses(header);

      expect(extracted).toEqual(['alex@firm.com', 'chris@firm.com', 'dev@kaira.com']);
    });
  });

  describe('5. Gmail Action Execution (Dry Run & Real Engine)', () => {
    it('should render Send Email dry run preview with variable interpolation and 0 task consumption', async () => {
      const result = await gmailApiService.sendEmail({
        connectionId: connA.id,
        userId: userA,
        to: 'client@example.com',
        subject: 'Welcome to KAIRA',
        bodyText: 'Hello from automation',
        isDryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.isDryRun).toBe(true);
      expect(result.deliveryMode).toEqual('DRY_RUN_PREVIEW');
      expect(result.to).toEqual('client@example.com');
      expect(result.subject).toEqual('Welcome to KAIRA');
    });

    it('should render Reply dry run preview preserving threadId and Re: subject', async () => {
      const result = await gmailApiService.replyToEmail({
        connectionId: connA.id,
        userId: userA,
        messageId: 'msg_98765',
        threadId: 'th_54321',
        bodyText: 'Thank you for your inquiry, we are reviewing your ticket.',
        isDryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.isDryRun).toBe(true);
      expect(result.threadId).toEqual('th_54321');
      expect(result.subject).toContain('Re:');
    });

    it('should render Reply All dry run preview targeting all participants', async () => {
      const result = await gmailApiService.replyAllToEmail({
        connectionId: connA.id,
        userId: userA,
        messageId: 'msg_98765',
        threadId: 'th_54321',
        bodyText: 'Replying to all parties in discussion thread.',
        isDryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.isDryRun).toBe(true);
      expect(result.deliveryMode).toEqual('DRY_RUN_PREVIEW');
    });
  });

  describe('6. Gmail Trigger Polling & Duplicate Prevention', () => {
    it('should construct proper Gmail search query for search_filter', () => {
      const query = gmailTriggerService.buildQuery({
        connectionId: connA.id,
        triggerEvent: 'search_filter',
        searchQuery: 'label:INBOX has:attachment',
        subjectFilter: 'Contract',
      });

      expect(query).toContain('label:INBOX has:attachment');
      expect(query).toContain('subject:"Contract"');
    });

    it('should construct proper Gmail search query for sender_filter', () => {
      const query = gmailTriggerService.buildQuery({
        connectionId: connA.id,
        triggerEvent: 'sender_filter',
        senderEmail: 'client@acme.com',
      });

      expect(query).toContain('from:client@acme.com');
    });

    it('should parse message parts into normalized structure', () => {
      const rawMessage = {
        id: 'msg_112233',
        threadId: 'th_112233',
        snippet: 'Important invoice inside',
        labelIds: ['INBOX', 'UNREAD'],
        internalDate: String(Date.now()),
        payload: {
          headers: [
            { name: 'From', value: 'Billing <billing@stripe.com>' },
            { name: 'To', value: 'me@example.com' },
            { name: 'Subject', value: 'Receipt for Subscription' },
            { name: 'Date', value: 'Wed, 25 Nov 2026 10:00:00 GMT' },
          ],
          mimeType: 'text/plain',
          body: {
            data: Buffer.from('Here is your receipt for November.').toString('base64'),
          },
        },
      };

      const parsed = gmailTriggerService.parseMessage(rawMessage);
      expect(parsed.messageId).toEqual('msg_112233');
      expect(parsed.from).toEqual('Billing <billing@stripe.com>');
      expect(parsed.subject).toEqual('Receipt for Subscription');
      expect(parsed.bodyText).toContain('Here is your receipt');
      expect(parsed.labels).toContain('INBOX');
    });

    it('should provide complete sample payload and variable tokens for builder mapping', () => {
      const sample = gmailTriggerService.getSamplePayload('new_email');
      expect(sample.from).toBeDefined();
      expect(sample.subject).toBeDefined();
      expect(sample.threadId).toBeDefined();

      const variables = gmailTriggerService.getAvailableVariables(sample);
      const tokenKeys = variables.map((v) => v.token);

      expect(tokenKeys).toContain('{{1.from}}');
      expect(tokenKeys).toContain('{{1.subject}}');
      expect(tokenKeys).toContain('{{1.threadId}}');
      expect(tokenKeys).toContain('{{1.messageId}}');
    });
  });

  describe('7. End-to-End Workflow Execution: Webhook to Gmail', () => {
    it('Demo A: Webhook Trigger -> Gmail Send Email executes dry run without deducting tasks', async () => {
      const workflow: WorkflowDefinition = {
        id: 'wf_demo_a',
        name: 'Webhook to Gmail Send Demo',
        userId: userA,
        trigger: { type: 'webhook' },
        actionType: 'gmail_send',
        defaultGmailAction: {
          connectionId: connA.id,
          actionType: 'send',
          to: '{{1.customerEmail}}',
          subject: 'Order Confirmation #{{1.orderId}}',
          body: 'Hello {{1.customerName}}, your order {{1.orderId}} is received!',
        },
      };

      const payload = {
        customerEmail: 'sam@buyer.com',
        customerName: 'Sam Altman',
        orderId: 'ORD-9921',
      };

      const result = await workflowExecutionEngine.execute({
        workflow,
        payload,
        isDryRun: true,
        userId: userA,
      });

      expect(result.status).toEqual('SUCCESS');
      expect(result.isDryRun).toBe(true);
      expect(result.taskDeducted).toBe(false);
      expect(result.renderedEmail?.to).toEqual('sam@buyer.com');
      expect(result.renderedEmail?.subject).toEqual('Order Confirmation #ORD-9921');
      expect(result.renderedEmail?.body).toContain('Sam Altman');

      const actionLog = result.stepLogs.find((s) => s.type === 'action');
      expect(actionLog?.status).toEqual('SUCCESS');
      expect(actionLog?.details.deliveryMode).toBeDefined();
    });

    it('Demo B: Gmail New Email Trigger -> Condition -> Gmail Send Email executes matching branch', async () => {
      const workflow: WorkflowDefinition = {
        id: 'wf_demo_b',
        name: 'Gmail Trigger to Condition to Gmail Reply Demo',
        userId: userA,
        trigger: { type: 'gmail' },
        condition: {
          field: 'priority',
          branches: [
            {
              id: 'branch_high',
              name: 'Urgent Branch',
              conditionValue: 'URGENT',
              operator: 'equals',
              actionType: 'gmail_send',
              gmailAction: {
                connectionId: connA.id,
                actionType: 'send',
                to: '{{1.from}}',
                subject: 'URGENT ESCALATION: {{1.subject}}',
                body: 'We are immediately escalating your email to on-call engineers.',
              },
            },
            {
              id: 'branch_normal',
              name: 'Normal Branch',
              conditionValue: 'NORMAL',
              operator: 'equals',
              actionType: 'gmail_send',
              gmailAction: {
                connectionId: connA.id,
                actionType: 'send',
                to: '{{1.from}}',
                subject: 'Ticket Received: {{1.subject}}',
                body: 'Your ticket has been logged into our queue.',
              },
            },
          ],
        },
      };

      const triggerPayload = {
        from: 'client@enterprise.com',
        subject: 'Database latency spike',
        priority: 'URGENT',
        threadId: 'th_enterprise_1',
      };

      const result = await workflowExecutionEngine.execute({
        workflow,
        payload: triggerPayload,
        isDryRun: true,
        userId: userA,
      });

      expect(result.status).toEqual('SUCCESS');
      expect(result.selectedBranchId).toEqual('branch_high');
      expect(result.selectedBranchName).toEqual('Urgent Branch');
      expect(result.renderedEmail?.subject).toEqual('URGENT ESCALATION: Database latency spike');
      expect(result.renderedEmail?.to).toEqual('client@enterprise.com');
      expect(result.taskDeducted).toBe(false);
    });

    it('Demo C: Gmail New Email Trigger -> Gmail Threaded Reply', async () => {
      const workflow: WorkflowDefinition = {
        id: 'wf_demo_c',
        name: 'Gmail Trigger to Reply Demo',
        userId: userA,
        trigger: { type: 'gmail' },
        actionType: 'gmail_reply',
        defaultGmailAction: {
          connectionId: connA.id,
          actionType: 'reply',
          messageId: '{{1.messageId}}',
          threadId: '{{1.threadId}}',
          body: 'Thanks for writing in! We got your message.',
        },
      };

      const triggerPayload = {
        from: 'inquiry@lead.com',
        subject: 'Demo Request',
        messageId: 'msg_lead_123',
        threadId: 'th_lead_123',
      };

      const result = await workflowExecutionEngine.execute({
        workflow,
        payload: triggerPayload,
        isDryRun: true,
        userId: userA,
      });

      expect(result.status).toEqual('SUCCESS');
      expect(result.stepLogs.find((s) => s.stepName.includes('REPLY'))).toBeDefined();
      expect(result.taskDeducted).toBe(false);
    });
  });
});
