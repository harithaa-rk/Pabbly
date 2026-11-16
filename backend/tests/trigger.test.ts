import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';

const app = createApp();

describe('Trigger System Endpoints & Isolation (Module 5)', () => {
  const uniquePrefix = `trig_test_${Date.now()}`;
  const userA = {
    name: 'Trigger Owner A',
    email: `${uniquePrefix}_a@example.com`,
    password: 'Password@123',
  };
  const userB = {
    name: 'Trigger Owner B',
    email: `${uniquePrefix}_b@example.com`,
    password: 'Password@123',
  };

  let tokenA: string;
  let tokenB: string;
  let workflowAId: string;
  let workflowBId: string;

  beforeAll(async () => {
    // Register User A
    const resA = await request(app).post('/api/auth/register').send(userA);
    expect(resA.status).toBe(201);
    const cookiesA = resA.headers['set-cookie'] as unknown as string[];
    tokenA = cookiesA[0].split(';')[0];

    // Register User B
    const resB = await request(app).post('/api/auth/register').send(userB);
    expect(resB.status).toBe(201);
    const cookiesB = resB.headers['set-cookie'] as unknown as string[];
    tokenB = cookiesB[0].split(';')[0];

    // Create Workflow A for User A
    const wfResA = await request(app)
      .post('/api/workflows')
      .set('Cookie', tokenA)
      .send({ name: 'Lead Registration Pipeline' });
    expect(wfResA.status).toBe(201);
    workflowAId = wfResA.body.data.id;

    // Create Workflow B for User A (to test independence)
    const wfResB = await request(app)
      .post('/api/workflows')
      .set('Cookie', tokenA)
      .send({ name: 'Inventory Notification Flow' });
    expect(wfResB.status).toBe(201);
    workflowBId = wfResB.body.data.id;
  });

  afterAll(async () => {
    // Cleanup workflows, sessions, and users
    await prisma.workflow.deleteMany({
      where: {
        owner: {
          email: { contains: uniquePrefix },
        },
      },
    });
    await prisma.session.deleteMany({
      where: { user: { email: { contains: uniquePrefix } } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: uniquePrefix } },
    });
    await prisma.$disconnect();
  });

  describe('Authentication Gate', () => {
    it('should reject unauthenticated trigger requests with 401', async () => {
      const res = await request(app)
        .put(`/api/workflows/${workflowAId}/trigger`)
        .send({ type: 'webhook', name: 'My Webhook' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should reject unsupported trigger types (e.g., slack, fake integrations) with 400', async () => {
      const res = await request(app)
        .put(`/api/workflows/${workflowAId}/trigger`)
        .set('Cookie', tokenA)
        .send({ type: 'slack', name: 'Slack Trigger' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject trigger with empty name with 400', async () => {
      const res = await request(app)
        .put(`/api/workflows/${workflowAId}/trigger`)
        .set('Cookie', tokenA)
        .send({ type: 'webhook', name: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/workflows/:id/trigger (Configure Webhook Trigger)', () => {
    it('should save a webhook trigger, generate unique webhookId & webhookUrl, and add node', async () => {
      const res = await request(app)
        .put(`/api/workflows/${workflowAId}/trigger`)
        .set('Cookie', tokenA)
        .send({
          type: 'webhook',
          name: 'Customer Registration Webhook',
          enabled: true,
          config: { method: 'POST' },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.trigger).toBeDefined();
      expect(res.body.data.trigger.type).toBe('webhook');
      expect(res.body.data.trigger.name).toBe('Customer Registration Webhook');
      expect(res.body.data.trigger.enabled).toBe(true);
      expect(res.body.data.trigger.webhookId).toBeDefined();
      expect(res.body.data.trigger.webhookId).toMatch(/^wh_/);
      expect(res.body.data.trigger.webhookUrl).toContain('/api/webhooks/');
      expect(res.body.data.webhookId).toBe(res.body.data.trigger.webhookId);

      // Verify node was added for visual builder foundation
      expect(Array.isArray(res.body.data.nodes)).toBe(true);
      expect(res.body.data.nodes.length).toBeGreaterThanOrEqual(1);
      const triggerNode = res.body.data.nodes.find((n: any) => n.type === 'trigger');
      expect(triggerNode).toBeDefined();
      expect(triggerNode.app).toBe('webhook');
      expect(triggerNode.name).toBe('Customer Registration Webhook');
    });

    it('persists trigger in database and returns it on GET /api/workflows/:id', async () => {
      const res = await request(app)
        .get(`/api/workflows/${workflowAId}`)
        .set('Cookie', tokenA);

      expect(res.status).toBe(200);
      expect(res.body.data.trigger).toBeDefined();
      expect(res.body.data.trigger.type).toBe('webhook');
      expect(res.body.data.trigger.name).toBe('Customer Registration Webhook');
      expect(res.body.data.trigger.webhookId).toBeDefined();
    });
  });

  describe('PUT /api/workflows/:id/trigger (Configure Manual Trigger)', () => {
    it('should save a manual trigger on Workflow B', async () => {
      const res = await request(app)
        .put(`/api/workflows/${workflowBId}/trigger`)
        .set('Cookie', tokenA)
        .send({
          type: 'manual',
          name: 'Manual Test Execution',
          enabled: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.trigger.type).toBe('manual');
      expect(res.body.data.trigger.name).toBe('Manual Test Execution');
      expect(res.body.data.trigger.enabled).toBe(true);
      expect(res.body.data.trigger.webhookId).toBeUndefined();
    });
  });

  describe('Edit Trigger', () => {
    it('should update trigger name and preserve existing webhookId', async () => {
      // First get existing webhookId
      const getRes = await request(app)
        .get(`/api/workflows/${workflowAId}`)
        .set('Cookie', tokenA);
      const originalWebhookId = getRes.body.data.trigger.webhookId;

      // Update name
      const updateRes = await request(app)
        .put(`/api/workflows/${workflowAId}/trigger`)
        .set('Cookie', tokenA)
        .send({
          type: 'webhook',
          name: 'Updated Lead Webhook V2',
          enabled: true,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.trigger.name).toBe('Updated Lead Webhook V2');
      expect(updateRes.body.data.trigger.webhookId).toBe(originalWebhookId);
    });
  });

  describe('PATCH /api/workflows/:id/trigger/status (Enable / Disable)', () => {
    it('should disable the trigger', async () => {
      const res = await request(app)
        .patch(`/api/workflows/${workflowAId}/trigger/status`)
        .set('Cookie', tokenA)
        .send({ enabled: false });

      expect(res.status).toBe(200);
      expect(res.body.data.trigger.enabled).toBe(false);

      // Node state should match
      const triggerNode = res.body.data.nodes.find((n: any) => n.type === 'trigger');
      expect(triggerNode.enabled).toBe(false);
    });

    it('should enable the trigger', async () => {
      const res = await request(app)
        .patch(`/api/workflows/${workflowAId}/trigger/status`)
        .set('Cookie', tokenA)
        .send({ enabled: true });

      expect(res.status).toBe(200);
      expect(res.body.data.trigger.enabled).toBe(true);
    });
  });

  describe('Workflow & Trigger Independence', () => {
    it('Workflow A trigger must never affect or bleed into Workflow B', async () => {
      const resA = await request(app)
        .get(`/api/workflows/${workflowAId}`)
        .set('Cookie', tokenA);
      const resB = await request(app)
        .get(`/api/workflows/${workflowBId}`)
        .set('Cookie', tokenA);

      expect(resA.body.data.trigger.type).toBe('webhook');
      expect(resB.body.data.trigger.type).toBe('manual');
      expect(resA.body.data.trigger.name).not.toBe(resB.body.data.trigger.name);
    });

    it('Duplicating a workflow with webhook trigger generates a unique, independent webhookId', async () => {
      const dupRes = await request(app)
        .post(`/api/workflows/${workflowAId}/duplicate`)
        .set('Cookie', tokenA);

      expect(dupRes.status).toBe(201);
      const original = (
        await request(app).get(`/api/workflows/${workflowAId}`).set('Cookie', tokenA)
      ).body.data;

      const duplicated = dupRes.body.data;
      expect(duplicated.id).not.toBe(original.id);
      expect(duplicated.trigger).toBeDefined();
      expect(duplicated.trigger.webhookId).toBeDefined();
      expect(duplicated.trigger.webhookId).not.toBe(original.trigger.webhookId);
      expect(duplicated.trigger.webhookUrl).not.toBe(original.trigger.webhookUrl);
    });
  });

  describe('DELETE /api/workflows/:id/trigger (Remove Trigger)', () => {
    it('should remove the trigger and reset trigger nodes while keeping workflow intact', async () => {
      const res = await request(app)
        .delete(`/api/workflows/${workflowBId}/trigger`)
        .set('Cookie', tokenA);

      expect(res.status).toBe(200);
      expect(res.body.data.trigger).toBeNull();
      expect(res.body.data.webhookId).toBeNull();

      const triggerNode = res.body.data.nodes?.find((n: any) => n.type === 'trigger');
      expect(triggerNode).toBeUndefined();

      // Verify workflow itself still exists
      const checkRes = await request(app)
        .get(`/api/workflows/${workflowBId}`)
        .set('Cookie', tokenA);
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.data.id).toBe(workflowBId);
      expect(checkRes.body.data.trigger).toBeNull();
    });
  });

  describe('Strict Ownership Isolation (User B cannot touch User A Trigger)', () => {
    it('User B cannot save trigger to User A workflow (403 Forbidden)', async () => {
      const res = await request(app)
        .put(`/api/workflows/${workflowAId}/trigger`)
        .set('Cookie', tokenB)
        .send({ type: 'webhook', name: 'Malicious Webhook' });

      expect(res.status).toBe(403);
    });

    it('User B cannot toggle trigger status on User A workflow (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/workflows/${workflowAId}/trigger/status`)
        .set('Cookie', tokenB)
        .send({ enabled: false });

      expect(res.status).toBe(403);
    });

    it('User B cannot remove trigger from User A workflow (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/workflows/${workflowAId}/trigger`)
        .set('Cookie', tokenB);

      expect(res.status).toBe(403);
    });
  });
});
