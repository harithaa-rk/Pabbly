import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  WorkflowExecutionEngine,
  WorkflowDefinition,
} from '../src/services/workflowExecution.service.js';
import { taskService } from '../src/services/task.service.js';
import { webhookService } from '../src/services/webhook.service.js';
import { smtpConnectionService } from '../src/services/smtpConnection.service.js';
import * as webhookController from '../src/controllers/webhook.controller.js';

describe('Workflow Execution Engine (Phase 2)', () => {
  let engine: WorkflowExecutionEngine;

  const sampleWorkflow: WorkflowDefinition = {
    id: 'wf_exec_test_01',
    name: 'Booking Notification Workflow',
    userId: 'usr_test_123',
    trigger: {
      type: 'webhook',
    },
    condition: {
      field: 'booking_status',
      branches: [
        {
          id: 'branch_confirmed',
          name: 'Confirmed',
          conditionValue: 'confirmed',
          emailAction: {
            to: '{{1.email}}',
            subject: 'Booking Confirmed: {{1.fullName}} (#{{1.bookingId}})',
            body: 'Dear {{1.fullName}},\n\nYour appointment on {{1.appointmentDate}} is confirmed.',
            fromName: 'Booking Desk',
          },
        },
        {
          id: 'branch_cancelled',
          name: 'Cancelled',
          conditionValue: 'cancelled',
          emailAction: {
            to: '{{1.email}}',
            subject: 'Booking Cancelled: {{1.fullName}} (#{{1.bookingId}})',
            body: 'Dear {{1.fullName}},\n\nYour appointment on {{1.appointmentDate}} has been cancelled.',
            fromName: 'Cancellation Desk',
          },
        },
      ],
    },
  };

  const confirmedPayload = {
    bookingId: 'BK-9921',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    booking_status: 'confirmed',
    appointmentDate: '2026-11-25',
    service: 'Consultation',
  };

  const cancelledPayload = {
    bookingId: 'BK-9922',
    fullName: 'John Smith',
    email: 'john@example.com',
    booking_status: 'cancelled',
    appointmentDate: '2026-11-26',
    service: 'Follow-up',
  };

  beforeEach(() => {
    engine = new WorkflowExecutionEngine();
    webhookService.resetAll();
    jest.clearAllMocks();
  });

  describe('Rule Evaluation and Field Extraction', () => {
    it('extracts direct and prefixed payload fields correctly', () => {
      const payload = {
        booking_status: 'confirmed',
        '1.email': 'test@example.com',
        user: { name: 'Alice' },
      };

      expect(engine.extractPayloadValue(payload, 'booking_status')).toBe('confirmed');
      expect(engine.extractPayloadValue(payload, '1.booking_status')).toBe('confirmed');
      expect(engine.extractPayloadValue(payload, 'email')).toBe('test@example.com');
      expect(engine.extractPayloadValue(payload, 'user.name')).toBe('Alice');
      expect(engine.extractPayloadValue(payload, 'nonexistent')).toBeUndefined();
    });

    it('evaluates condition rules case-insensitively', () => {
      expect(engine.evaluateRule('confirmed', 'equals', 'confirmed')).toBe(true);
      expect(engine.evaluateRule('CONFIRMED', 'equals', 'confirmed')).toBe(true);
      expect(engine.evaluateRule(' Confirmed ', 'equals', 'confirmed')).toBe(true);
      expect(engine.evaluateRule('pending', 'equals', 'confirmed')).toBe(false);
      expect(engine.evaluateRule(undefined, 'equals', 'confirmed')).toBe(false);
      expect(engine.evaluateRule('cancelled', 'not_equals', 'confirmed')).toBe(true);
      expect(engine.evaluateRule('booking confirmed today', 'contains', 'confirmed')).toBe(true);
    });
  });

  describe('Condition Branch Selection & Flow Execution', () => {
    it('selects Confirmed branch when booking_status equals confirmed', async () => {
      const result = await engine.execute({
        workflow: sampleWorkflow,
        payload: confirmedPayload,
        isDryRun: true,
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.selectedBranchId).toBe('branch_confirmed');
      expect(result.selectedBranchName).toBe('Confirmed');
      expect(result.evaluatedCondition?.actualValue).toBe('confirmed');
      expect(result.renderedEmail?.to).toBe('jane@example.com');
      expect(result.renderedEmail?.subject).toBe('Booking Confirmed: Jane Doe (#BK-9921)');
      expect(result.renderedEmail?.body).toContain('Dear Jane Doe');
      expect(result.stepLogs).toHaveLength(3);
      expect(result.stepLogs[0].stepName).toBe('Webhook Trigger');
      expect(result.stepLogs[1].stepName).toContain('Condition');
      expect(result.stepLogs[2].stepName).toContain('Email Action (Confirmed)');
    });

    it('selects Cancelled branch when booking_status equals cancelled', async () => {
      const result = await engine.execute({
        workflow: sampleWorkflow,
        payload: cancelledPayload,
        isDryRun: true,
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.selectedBranchId).toBe('branch_cancelled');
      expect(result.selectedBranchName).toBe('Cancelled');
      expect(result.evaluatedCondition?.actualValue).toBe('cancelled');
      expect(result.renderedEmail?.to).toBe('john@example.com');
      expect(result.renderedEmail?.subject).toBe('Booking Cancelled: John Smith (#BK-9922)');
      expect(result.renderedEmail?.body).toContain('appointment on 2026-11-26 has been cancelled');
      expect(result.stepLogs[2].stepName).toContain('Email Action (Cancelled)');
    });

    it('fails gracefully when condition field is missing from payload', async () => {
      const incompletePayload = {
        fullName: 'Anonymous',
        email: 'anon@example.com',
      };

      const result = await engine.execute({
        workflow: sampleWorkflow,
        payload: incompletePayload,
        isDryRun: true,
      });

      expect(result.status).toBe('FAILED');
      expect(result.error).toContain('Field "booking_status" not found');
      expect(result.stepLogs[1].status).toBe('FAILED');
      expect(result.taskDeducted).toBe(false);
    });

    it('fails gracefully when payload value does not match any configured branch', async () => {
      const unknownPayload = {
        ...confirmedPayload,
        booking_status: 'rescheduled',
      };

      const result = await engine.execute({
        workflow: sampleWorkflow,
        payload: unknownPayload,
        isDryRun: true,
      });

      expect(result.status).toBe('FAILED');
      expect(result.error).toContain('No matching condition branch found');
      expect(result.taskDeducted).toBe(false);
    });
  });

  describe('Workflow Definition Validation', () => {
    it('rejects definition missing workflow id', () => {
      expect(() => {
        engine.validateWorkflowDefinition({} as any);
      }).toThrow('Missing workflow ID');
    });

    it('rejects definition missing condition field', () => {
      expect(() => {
        engine.validateWorkflowDefinition({
          id: 'wf_err',
          name: 'Err',
          condition: {
            field: '',
            branches: [],
          },
        });
      }).toThrow('Condition field name is required');
    });

    it('rejects condition without branches', () => {
      expect(() => {
        engine.validateWorkflowDefinition({
          id: 'wf_err',
          name: 'Err',
          condition: {
            field: 'status',
            branches: [],
          },
        });
      }).toThrow('At least one branch must be configured');
    });

    it('rejects branch without email action', () => {
      expect(() => {
        engine.validateWorkflowDefinition({
          id: 'wf_err',
          name: 'Err',
          condition: {
            field: 'status',
            branches: [
              {
                id: 'b1',
                name: 'B1',
                conditionValue: 'val',
                emailAction: undefined as any,
              },
            ],
          },
        });
      }).toThrow('requires an emailAction configuration');
    });
  });

  describe('Dry-Run Execution & Task Billing Rules', () => {
    it('dry-run execution never calls taskService and never deducts tasks', async () => {
      const recordExecutionSpy = jest.spyOn(taskService, 'recordExecution');

      const result = await engine.execute({
        workflow: sampleWorkflow,
        payload: confirmedPayload,
        isDryRun: true,
      });

      expect(result.isDryRun).toBe(true);
      expect(result.taskDeducted).toBe(false);
      expect(result.taskStatusNote).toContain('Zero tasks consumed');
      expect(recordExecutionSpy).not.toHaveBeenCalled();
    });

    it('production run records execution through trusted engine', async () => {
      await smtpConnectionService.saveConnection('usr_premium_1', {
        name: 'Default Mailer',
        host: 'smtp.mock.com',
        port: 587,
        secure: false,
        username: 'user',
        password: 'pwd',
        senderEmail: 'test@mock.com',
      });
      smtpConnectionService.setMockTransporterFactory(() => ({
        verify: () => Promise.resolve(true),
        sendMail: () => Promise.resolve({ messageId: 'msg_1' }),
      }));

      const recordExecutionSpy = jest
        .spyOn(taskService, 'recordExecution')
        .mockResolvedValueOnce({
          success: true,
          executionId: 'exec_mock',
          taskDeducted: true,
          tasksRemaining: 99,
          tasksConsumedThisMonth: 1,
        } as any);

      const result = await engine.execute({
        workflow: sampleWorkflow,
        payload: confirmedPayload,
        isDryRun: false,
        userId: 'usr_premium_1',
      });

      expect(result.isDryRun).toBe(false);
      expect(result.taskDeducted).toBe(true);
      expect(recordExecutionSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'usr_premium_1',
          workflowId: 'wf_exec_test_01',
          isTest: false,
          isTrustedEngine: true,
        })
      );
    });
  });

  describe('Webhook Ingestion and Endpoint Security', () => {
    function createMockResponse() {
      const res: any = {
        statusCode: 200,
        body: null,
      };
      res.status = function (code: number) {
        res.statusCode = code;
        return res;
      };
      res.json = function (data: any) {
        res.body = data;
        return res;
      };
      return res;
    }

    it('rejects unregistered production webhook requests with 404', async () => {
      const req: any = {
        params: { workflowId: 'wf_unregistered_999' },
        headers: { 'x-webhook-secret': 'some_random_secret' },
        body: { test: true },
        method: 'POST',
      };
      const res = createMockResponse();
      const next = jest.fn();

      await webhookController.receiveWebhook(req, res, next);

      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(404);
      expect(err.message).toContain('Workflow is unregistered or inactive');
    });

    it('rejects production webhook missing secret header with 401', async () => {
      // Register a workflow first
      webhookService.registerWorkflow('wf_reg_sec_01', 'usr_owner_1');

      const req: any = {
        params: { workflowId: 'wf_reg_sec_01' },
        headers: {},
        body: { booking_status: 'confirmed' },
        method: 'POST',
      };
      const res = createMockResponse();
      const next = jest.fn();

      await webhookController.receiveWebhook(req, res, next);

      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
      expect(err.message).toContain('Missing required X-Webhook-Secret header');
    });

    it('accepts safe local builder test webhook without requiring production secret', async () => {
      const req: any = {
        params: { workflowId: 'wf_local_builder_test' },
        headers: {},
        body: confirmedPayload,
        method: 'POST',
      };
      const res = createMockResponse();
      const next = jest.fn();

      await webhookController.receiveTestWebhook(req, res, next);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isTest).toBe(true);
      const captured = webhookService.getLatestPayload('wf_local_builder_test');
      expect(captured?.payload.booking_status).toBe('confirmed');
    });

    it('executes dry run via controller and returns complete execution result', async () => {
      const req: any = {
        body: {
          workflow: sampleWorkflow,
          payload: confirmedPayload,
        },
        method: 'POST',
      };
      const res = createMockResponse();
      const next = jest.fn();

      await webhookController.executeDryRun(req, res, next);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.result.selectedBranchName).toBe('Confirmed');
      expect(res.body.data.result.taskDeducted).toBe(false);
      expect(res.body.data.result.renderedEmail.to).toBe('jane@example.com');
    });
  });
});
