import { WebhookService, webhookService } from '../src/services/webhook.service.js';
import { EmailActionService, emailActionService } from '../src/services/emailAction.service.js';
import * as webhookController from '../src/controllers/webhook.controller.js';
import { errorHandler } from '../src/middleware/error.middleware.js';
import { webhookIngestLimiter } from '../src/middleware/rateLimit.middleware.js';
import { requireAuth } from '../src/middleware/auth.middleware.js';
import { signToken } from '../src/utils/jwt.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/config/database.js';

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

describe('Webhook Trigger & Email Action Final Security Review Suite', () => {
  const userAliceId = 'usr_alice_' + Date.now();
  const userBobId = 'usr_bob_' + Date.now();
  const testWorkflowId = 'wf_test_' + Date.now();

  beforeEach(() => {
    webhookService.resetAll();
  });

  afterAll(() => {
    webhookService.resetAll();
  });

  describe('Point 1, 2, 3 & 6: Webhook Secret Enforcement & Leakage Prevention', () => {
    it('generates cryptographically secure random secret tokens with high entropy', () => {
      const secret1 = webhookService.generateSecureSecret();
      const secret2 = webhookService.generateSecureSecret();

      expect(secret1).toMatch(/^whsec_[0-9a-f]{48}$/);
      expect(secret2).toMatch(/^whsec_[0-9a-f]{48}$/);
      expect(secret1).not.toBe(secret2);
    });

    it('generates cryptographically secure event IDs', () => {
      const event = webhookService.captureWebhook(testWorkflowId, { test: 1 });
      expect(event.id).toMatch(/^wh_evt_[0-9a-f]{24}$/);
    });

    it('rejects registered webhooks when secret is missing with 401 Unauthorized', async () => {
      // Register workflow to User Alice (generates secret)
      webhookService.registerWorkflow(testWorkflowId, userAliceId);

      // Webhook arrives without X-Webhook-Secret header
      const mockReq: any = {
        params: { workflowId: testWorkflowId },
        headers: {},
        query: {},
        body: { customer: 'Acme Corp' },
      };
      const mockRes = createMockResponse();
      const mockNext = jest.fn();

      await webhookController.receiveWebhook(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const err = mockNext.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
      expect(err.message).toContain('Missing required X-Webhook-Secret header');
    });

    it('rejects query-string secrets with 400 Bad Request to prevent access log leakage', async () => {
      const reg = webhookService.registerWorkflow(testWorkflowId, userAliceId);

      // Attempt to pass secret via query string
      const mockReq: any = {
        params: { workflowId: testWorkflowId },
        headers: {},
        query: { secret: reg.secretToken },
        body: { customer: 'Acme Corp' },
      };
      const mockRes = createMockResponse();
      const mockNext = jest.fn();

      await webhookController.receiveWebhook(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const err = mockNext.mock.calls[0][0];
      expect(err.statusCode).toBe(400);
      expect(err.message).toContain('Query string webhook secrets are deprecated and insecure');
    });

    it('rejects webhooks with an incorrect secret with 401 Unauthorized', async () => {
      webhookService.registerWorkflow(testWorkflowId, userAliceId);

      const mockReq: any = {
        params: { workflowId: testWorkflowId },
        headers: { 'x-webhook-secret': 'whsec_incorrect_secret_token_12345' },
        query: {},
        body: { customer: 'Acme Corp' },
      };
      const mockRes = createMockResponse();
      const mockNext = jest.fn();

      await webhookController.receiveWebhook(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const err = mockNext.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
      expect(err.message).toContain('Invalid X-Webhook-Secret header');
    });

    it('accepts webhooks with valid secret provided via X-Webhook-Secret header (200 OK)', async () => {
      const reg = webhookService.registerWorkflow(testWorkflowId, userAliceId);

      const mockReq: any = {
        params: { workflowId: testWorkflowId },
        headers: { 'x-webhook-secret': reg.secretToken },
        query: {},
        body: { customer: 'Acme Corp', amount: 199.99 },
      };
      const mockRes = createMockResponse();
      const mockNext = jest.fn();

      await webhookController.receiveWebhook(mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.body.success).toBe(true);
      expect(mockRes.body.data.workflowId).toBe(testWorkflowId);
    });

    it('prevents secret leakage: secret is NEVER returned in response or stored in event.headers', async () => {
      const reg = webhookService.registerWorkflow(testWorkflowId, userAliceId);

      const postReq: any = {
        params: { workflowId: testWorkflowId },
        headers: {
          'x-webhook-secret': reg.secretToken,
          'content-type': 'application/json',
          'user-agent': 'WebhookTester/1.0',
        },
        query: {},
        body: { event: 'order.created' },
      };
      const postRes = createMockResponse();
      await webhookController.receiveWebhook(postReq, postRes, jest.fn());

      // 1. Secret is NOT in post response
      expect(postRes.body.data.secretToken).toBeUndefined();
      expect(postRes.body.data.secret).toBeUndefined();

      // 2. Query latest payload response
      const getReq: any = {
        params: { workflowId: testWorkflowId },
        user: { id: userAliceId },
      };
      const getRes = createMockResponse();
      await webhookController.getLatestWebhook(getReq, getRes, jest.fn());

      // Secret is NOT in get response
      expect(getRes.body.data.secretToken).toBeUndefined();
      expect(getRes.body.data.event.secretToken).toBeUndefined();

      // 3. Secret is NOT stored inside captured event headers
      expect(getRes.body.data.event.headers['x-webhook-secret']).toBeUndefined();
      expect(getRes.body.data.event.headers['content-type']).toBe('application/json');
    });
  });

  describe('Point 5: Auth Middleware Security & Production Integrity', () => {
    it('rejects unauthenticated requests missing cookies or bearer token with 401', async () => {
      const req: any = { cookies: {}, headers: {} };
      const res: any = createMockResponse();
      const next = jest.fn();

      await requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
      expect(err.message).toContain('Authentication required');
    });

    it('rejects forged or expired JWT tokens with 401 Unauthorized', async () => {
      const req: any = {
        cookies: {},
        headers: { authorization: 'Bearer forged.token.value' },
      };
      const res: any = createMockResponse();
      const next = jest.fn();

      await requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
      expect(err.message).toContain('Invalid or expired authentication token');
    });

    it('in production mode, database connection failure yields 503 and never bypasses verification', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalConfigEnv = env.nodeEnv;
      process.env.NODE_ENV = 'production';
      (env as any).nodeEnv = 'production';

      const findUniqueSpy = jest
        .spyOn(prisma.user, 'findUnique')
        .mockRejectedValue(new Error('Connection timed out'));

      const validToken = signToken({
        id: 'usr_prod_test_1',
        email: 'prod@example.com',
        role: 'USER',
      });

      const req: any = {
        cookies: {},
        headers: { authorization: `Bearer ${validToken}` },
      };
      const res: any = createMockResponse();
      const next = jest.fn();

      await requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      // In production mode, DB disconnection returns 503 Service Unavailable, NEVER bypassing DB
      expect(err.statusCode).toBe(503);
      expect(err.message).toContain('Authentication service temporarily unavailable');

      findUniqueSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
      (env as any).nodeEnv = originalConfigEnv;
    });
  });

  describe('Multi-Tenant Isolation & Ownership Access Controls', () => {
    it('prevents cross-user data access: User B cannot view User A webhook data (403 Forbidden)', async () => {
      webhookService.registerWorkflow(testWorkflowId, userAliceId);
      webhookService.captureWebhook(testWorkflowId, { secretRevenue: 500000 });

      const mockReqBob: any = {
        params: { workflowId: testWorkflowId },
        user: { id: userBobId, email: 'bob@example.com', role: 'USER' },
      };
      const mockResBob = createMockResponse();
      const mockNextBob = jest.fn();

      await webhookController.getLatestWebhook(mockReqBob, mockResBob, mockNextBob);

      expect(mockNextBob).toHaveBeenCalled();
      const err = mockNextBob.mock.calls[0][0];
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('Access denied');
    });

    it('prevents cross-user data tampering: User B cannot delete User A webhook data (403 Forbidden)', async () => {
      webhookService.registerWorkflow(testWorkflowId, userAliceId);
      webhookService.captureWebhook(testWorkflowId, { active: true });

      const mockReqBob: any = {
        params: { workflowId: testWorkflowId },
        user: { id: userBobId, email: 'bob@example.com', role: 'USER' },
      };
      const mockResBob = createMockResponse();
      const mockNextBob = jest.fn();

      await webhookController.clearWebhooks(mockReqBob, mockResBob, mockNextBob);

      expect(mockNextBob).toHaveBeenCalled();
      const err = mockNextBob.mock.calls[0][0];
      expect(err.statusCode).toBe(403);

      expect(webhookService.getLatestPayload(testWorkflowId)).not.toBeNull();
    });
  });

  describe('Configurable TTL Expiration & Memory Pruning', () => {
    it('defaults to 1-hour TTL and discards expired payloads after TTL has elapsed', async () => {
      expect(webhookService.getTTL()).toBe(60 * 60 * 1000);

      webhookService.setTTL(40);
      webhookService.captureWebhook(testWorkflowId, { temporaryData: 'Expires Soon' });

      expect(webhookService.getLatestPayload(testWorkflowId)).not.toBeNull();

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(webhookService.getLatestPayload(testWorkflowId)).toBeNull();
    });

    it('prunes expired payloads across all workflows in the system', async () => {
      webhookService.setTTL(30);

      webhookService.captureWebhook('wf_ttl_1', { data: 1 });
      webhookService.captureWebhook('wf_ttl_2', { data: 2 });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const prunedCount = webhookService.pruneExpired();
      expect(prunedCount).toBe(2);
      expect(webhookService.getLatestPayload('wf_ttl_1')).toBeNull();
      expect(webhookService.getLatestPayload('wf_ttl_2')).toBeNull();
    });
  });

  describe('Abuse Protection & Rate Limiting', () => {
    it('applies webhookIngestLimiter without error', async () => {
      const mockReq: any = {
        ip: '127.0.0.1',
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
        app: { get: () => false },
      };
      const mockRes: any = createMockResponse();
      mockRes.setHeader = jest.fn();
      mockRes.getHeader = jest.fn();

      await new Promise<void>((resolve) => {
        webhookIngestLimiter(mockReq, mockRes, () => resolve());
      });
    });

    it('rejects malformed workflow identifiers in ingest endpoint with 400 Bad Request', async () => {
      const mockReq: any = {
        params: { workflowId: '../../etc/shadow' },
        headers: {},
        query: {},
        body: {},
      };
      const mockRes = createMockResponse();
      const mockNext = jest.fn();

      await webhookController.receiveWebhook(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
    });
  });

  describe('Email Action & Dynamic Variable Mapping Functionality', () => {
    it('substitutes dynamic variables in email action preview', async () => {
      const sampleData = {
        fullName: 'Sarah Jenkins',
        email: 'sarah.jenkins@example.com',
        company: 'Acme Cloud Corp',
        message: 'Demonstration request',
      };

      const emailConfig = {
        to: '{{1.email}}',
        subject: 'Welcome {{1.fullName}} from {{1.company}}!',
        body: 'Hi {{1.fullName}},\n\nWe received: "{{1.message}}"\n\nThanks,\nKAIRA Team',
        fromName: 'KAIRA Connect',
      };

      const mockReq: any = {
        body: { config: emailConfig, sampleData },
      };
      const mockRes = createMockResponse();
      const mockNext = jest.fn();

      await webhookController.previewEmailAction(mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.body.data.preview.interpolatedTo).toBe('sarah.jenkins@example.com');
      expect(mockRes.body.data.preview.interpolatedSubject).toBe('Welcome Sarah Jenkins from Acme Cloud Corp!');
      expect(mockRes.body.data.preview.isReadyForDispatch).toBe(true);
    });

    it('handles malformed JSON syntax gracefully with 400 Bad Request', () => {
      const syntaxErr: any = new SyntaxError('Unexpected token in JSON at position 12');
      syntaxErr.status = 400;
      syntaxErr.body = '{"bad": json';

      const mockRes = createMockResponse();
      const mockReq: any = {};
      const mockNext = jest.fn();

      errorHandler(syntaxErr, mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(400);
      expect(mockRes.body.success).toBe(false);
      expect(mockRes.body.message).toContain('Malformed JSON payload');
    });

    it('handles oversized payloads safely with 413 Payload Too Large', () => {
      const largeErr: any = new Error('request entity too large');
      largeErr.status = 413;
      largeErr.type = 'entity.too.large';

      const mockRes = createMockResponse();
      const mockReq: any = {};
      const mockNext = jest.fn();

      errorHandler(largeErr, mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(413);
      expect(mockRes.body.message).toContain('Payload too large');
    });
  });
});
