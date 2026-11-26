import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  smtpConnectionService,
  SmtpConnectionConfig,
} from '../src/services/smtpConnection.service.js';
import {
  emailActionService,
  EmailActionConfig,
} from '../src/services/emailAction.service.js';
import {
  WorkflowExecutionEngine,
  WorkflowDefinition,
} from '../src/services/workflowExecution.service.js';
import { taskService } from '../src/services/task.service.js';

describe('Phase 3: Generic SMTP Email Integration & Dispatch Suite', () => {
  let engine: WorkflowExecutionEngine;
  let mockSendMail: jest.Mock;
  let mockVerify: jest.Mock;

  const validSmtpConfig: Omit<SmtpConnectionConfig, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'status'> = {
    name: 'Production SendGrid Mailer',
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    username: 'apikey',
    password: 'SG.super_secret_password_1234567890',
    senderEmail: 'notifications@acmecorp.com',
    senderName: 'Acme Notifications',
  };

  beforeEach(() => {
    smtpConnectionService.resetAll();
    engine = new WorkflowExecutionEngine();
    jest.clearAllMocks();

    mockSendMail = jest.fn().mockImplementation((_opts: any) =>
      Promise.resolve({
        messageId: '<test_msg_987654@acmecorp.com>',
        accepted: ['recipient@client.com'],
        rejected: [],
      })
    );

    mockVerify = jest.fn().mockImplementation(() => Promise.resolve(true));

    smtpConnectionService.setMockTransporterFactory((_config) => ({
      verify: mockVerify,
      sendMail: mockSendMail,
    }));
  });

  describe('1. SMTP Connection Validation & Credential Redaction', () => {
    it('rejects incomplete or invalid SMTP configurations', () => {
      expect(() => {
        smtpConnectionService.validateSmtpConfig({ host: '' });
      }).toThrow('Connection name is required');

      expect(() => {
        smtpConnectionService.validateSmtpConfig({ name: 'Mailer', host: '' });
      }).toThrow('SMTP host is required');

      expect(() => {
        smtpConnectionService.validateSmtpConfig({ name: 'Mailer', host: 'smtp.test.com', port: -1 });
      }).toThrow('Valid SMTP port is required');

      expect(() => {
        smtpConnectionService.validateSmtpConfig({
          name: 'Mailer',
          host: 'smtp.test.com',
          port: 587,
          username: '',
        });
      }).toThrow('SMTP username is required');

      expect(() => {
        smtpConnectionService.validateSmtpConfig({
          name: 'Mailer',
          host: 'smtp.test.com',
          port: 587,
          username: 'user',
          password: '',
        });
      }).toThrow('SMTP password is required');

      expect(() => {
        smtpConnectionService.validateSmtpConfig({
          name: 'Mailer',
          host: 'smtp.test.com',
          port: 587,
          username: 'user',
          password: 'pass',
          senderEmail: 'invalid-email-format',
        });
      }).toThrow('Valid sender email address is required');
    });

    it('saves valid connection and returns sanitized data with masked password (********)', async () => {
      const saved = await smtpConnectionService.saveConnection('usr_tenant_1', validSmtpConfig);

      expect(saved.id).toBeDefined();
      expect(saved.name).toBe('Production SendGrid Mailer');
      expect(saved.host).toBe('smtp.sendgrid.net');
      expect(saved.passwordMasked).toBe('********');
      expect((saved as any).password).toBeUndefined();

      // Verify connection listing for user also redacts password
      const userConns = smtpConnectionService.getUserConnections('usr_tenant_1');
      expect(userConns).toHaveLength(1);
      expect(userConns[0].passwordMasked).toBe('********');
      expect((userConns[0] as any).password).toBeUndefined();
    });

    it('enforces multi-tenant isolation: User B cannot access or delete User A connections', async () => {
      const conn = await smtpConnectionService.saveConnection('usr_alice', validSmtpConfig);

      // User Bob cannot delete Alice's connection
      expect(() => {
        smtpConnectionService.deleteConnection(conn.id, 'usr_bob');
      }).toThrow('Access denied');

      // User Bob cannot get Alice's connection
      expect(() => {
        smtpConnectionService.getConnectionInternal(conn.id, 'usr_bob');
      }).toThrow('Access denied');
    });

    it('scrubs passwords and auth headers from error messages', () => {
      const rawError = 'Authentication failed for user apikey password=SG.super_secret_123 Bearer abc12345';
      const sanitized = smtpConnectionService.sanitizeErrorMessage(rawError);

      expect(sanitized).not.toContain('SG.super_secret_123');
      expect(sanitized).toContain('password=********');
      expect(sanitized).toContain('Bearer ********');
    });
  });

  describe('2. Generic Email Action & Variable Interpolation', () => {
    it('supports To, CC, BCC, Subject, plain-text body, HTML body, and dynamic tokens', () => {
      const config: EmailActionConfig = {
        to: '{{1.customerEmail}}',
        cc: 'manager@acmecorp.com, {{1.agentEmail}}',
        bcc: 'audit@acmecorp.com',
        subject: 'Invoice #{{1.order.id}} for {{1.customerName}}',
        body: 'Hello {{1.customerName}},\n\nYour order total is ${{1.order.amount}}.',
        html: '<p>Hello <b>{{1.customerName}}</b>,</p><p>Total: ${{1.order.amount}}</p>',
        fromName: 'Acme Billing',
        fromEmail: 'billing@acmecorp.com',
      };

      const payload = {
        customerEmail: 'client@domain.com',
        agentEmail: 'agent007@acmecorp.com',
        customerName: 'Marcus Vance',
        order: {
          id: 'ORD-991',
          amount: 450.0,
        },
      };

      const preview = emailActionService.previewEmailAction(config, payload);

      expect(preview.interpolatedTo).toBe('client@domain.com');
      expect(preview.interpolatedCc).toBe('manager@acmecorp.com, agent007@acmecorp.com');
      expect(preview.interpolatedBcc).toBe('audit@acmecorp.com');
      expect(preview.interpolatedSubject).toBe('Invoice #ORD-991 for Marcus Vance');
      expect(preview.interpolatedBody).toContain('Marcus Vance');
      expect(preview.interpolatedBody).toContain('$450');
      expect(preview.interpolatedHtml).toContain('<b>Marcus Vance</b>');
      expect(preview.isReadyForDispatch).toBe(true);
    });

    it('rejects invalid recipient email formats during dispatch', async () => {
      const conn = await smtpConnectionService.saveConnection('usr_test', validSmtpConfig);
      const internalConn = smtpConnectionService.getConnectionInternal(conn.id, 'usr_test')!;

      await expect(
        emailActionService.dispatchEmailAction({
          config: {
            to: 'not-an-email',
            subject: 'Test',
            body: 'Hello',
          },
          payload: {},
          connection: internalConn,
          isDryRun: false,
        })
      ).rejects.toThrow('Invalid recipient email address');
    });
  });

  describe('3. Workflow Execution & Real SMTP Dispatch', () => {
    const workflow: WorkflowDefinition = {
      id: 'wf_smtp_dispatch_01',
      name: 'Order Fulfillment Router',
      userId: 'usr_merchant_1',
      trigger: { type: 'webhook' },
      condition: {
        field: 'status',
        branches: [
          {
            id: 'branch_paid',
            name: 'Order Paid',
            conditionValue: 'paid',
            emailAction: {
              to: '{{1.customerEmail}}',
              cc: 'fulfillment@store.com',
              subject: 'Order Confirmed: #{{1.orderId}}',
              body: 'Thank you {{1.customerName}}! Your order #{{1.orderId}} has been paid.',
              fromName: 'Store Care',
            },
          },
          {
            id: 'branch_failed',
            name: 'Payment Failed',
            conditionValue: 'failed',
            emailAction: {
              to: '{{1.customerEmail}}',
              subject: 'Action Required: Payment Failed for #{{1.orderId}}',
              body: 'Hello {{1.customerName}},\n\nPlease update your payment method.',
              fromName: 'Billing Team',
            },
          },
        ],
      },
    };

    const paidPayload = {
      orderId: 'ORD-8821',
      status: 'paid',
      customerName: 'Alice Cooper',
      customerEmail: 'alice@music.com',
    };

    it('dry-run execution NEVER calls transport.sendMail and NEVER consumes tasks', async () => {
      const taskRecordSpy = jest.spyOn(taskService, 'recordExecution');

      const result = await engine.execute({
        workflow,
        payload: paidPayload,
        isDryRun: true,
        userId: 'usr_merchant_1',
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.isDryRun).toBe(true);
      expect(result.selectedBranchName).toBe('Order Paid');
      expect(result.taskDeducted).toBe(false);
      expect(result.renderedEmail?.to).toBe('alice@music.com');

      // Crucial requirement: No real email dispatch during dry-run
      expect(mockSendMail).not.toHaveBeenCalled();
      expect(taskRecordSpy).not.toHaveBeenCalled();
    });

    it('production execution dispatches email via configured SMTP and consumes exactly 1 task', async () => {
      // Setup saved SMTP connection for user
      const savedConn = await smtpConnectionService.saveConnection('usr_merchant_1', validSmtpConfig);

      const taskRecordSpy = jest.spyOn(taskService, 'recordExecution').mockResolvedValueOnce({
        success: true,
        executionId: 'exec_test',
        taskDeducted: true,
        tasksRemaining: 99,
        tasksConsumedThisMonth: 1,
      } as any);

      const result = await engine.execute({
        workflow: {
          ...workflow,
          condition: {
            ...workflow.condition!,
            branches: workflow.condition!.branches.map((b) => ({
              ...b,
              emailAction: { ...b.emailAction, connectionId: savedConn.id },
            })),
          },
        },
        payload: paidPayload,
        isDryRun: false,
        userId: 'usr_merchant_1',
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.isDryRun).toBe(false);
      expect(result.taskDeducted).toBe(true);

      // Verify real SMTP transport dispatch was called with correct parameters
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toEqual(['alice@music.com']);
      expect(callArgs.cc).toEqual(['fulfillment@store.com']);
      expect(callArgs.subject).toBe('Order Confirmed: #ORD-8821');
      expect(callArgs.text).toContain('Thank you Alice Cooper!');
      expect(callArgs.from).toContain('notifications@acmecorp.com');

      // Verify task accounting: Exactly 1 task consumed for complete workflow
      expect(taskRecordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'usr_merchant_1',
          workflowId: 'wf_smtp_dispatch_01',
          isTest: false,
          isTrustedEngine: true,
        })
      );
    });

    it('branch execution isolation: only the matching condition branch email is dispatched', async () => {
      const savedConn = await smtpConnectionService.saveConnection('usr_merchant_1', validSmtpConfig);

      const failedPayload = {
        orderId: 'ORD-8822',
        status: 'failed',
        customerName: 'Bob Dylan',
        customerEmail: 'bob@folk.com',
      };

      jest.spyOn(taskService, 'recordExecution').mockResolvedValueOnce({} as any);

      const result = await engine.execute({
        workflow: {
          ...workflow,
          condition: {
            ...workflow.condition!,
            branches: workflow.condition!.branches.map((b) => ({
              ...b,
              emailAction: { ...b.emailAction, connectionId: savedConn.id },
            })),
          },
        },
        payload: failedPayload,
        isDryRun: false,
        userId: 'usr_merchant_1',
      });

      expect(result.selectedBranchName).toBe('Payment Failed');
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.subject).toBe('Action Required: Payment Failed for #ORD-8822');
      expect(callArgs.text).toContain('Please update your payment method');
    });

    it('failed email dispatch logs step failure and NEVER deducts tasks', async () => {
      const savedConn = await smtpConnectionService.saveConnection('usr_merchant_1', validSmtpConfig);
      const taskRecordSpy = jest.spyOn(taskService, 'recordExecution');

      // Simulate SMTP server network or authentication failure
      mockSendMail.mockRejectedValueOnce(new Error('535 5.7.8 Username and Password not accepted'));

      const result = await engine.execute({
        workflow: {
          ...workflow,
          condition: {
            ...workflow.condition!,
            branches: workflow.condition!.branches.map((b) => ({
              ...b,
              emailAction: { ...b.emailAction, connectionId: savedConn.id },
            })),
          },
        },
        payload: paidPayload,
        isDryRun: false,
        userId: 'usr_merchant_1',
      });

      expect(result.status).toBe('FAILED');
      expect(result.taskDeducted).toBe(false);
      expect(result.error).toContain('Username and Password not accepted');

      // Crucial billing rule: Failed execution must never deduct tasks
      expect(taskRecordSpy).not.toHaveBeenCalled();

      // Step logs capture failure cleanly
      expect(result.stepLogs[2].status).toBe('FAILED');
      expect(result.stepLogs[2].details.error).toContain('Username and Password not accepted');
    });
  });
});
