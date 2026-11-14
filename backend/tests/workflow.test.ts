import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';

const app = createApp();

describe('Workflow Endpoints & Ownership Isolation (Module 4)', () => {
  const uniquePrefix = `wf_test_${Date.now()}`;
  const userA = {
    name: 'Workflow Owner A',
    email: `${uniquePrefix}_a@example.com`,
    password: 'Password@123',
  };
  const userB = {
    name: 'Workflow Owner B',
    email: `${uniquePrefix}_b@example.com`,
    password: 'Password@123',
  };

  let tokenA: string;
  let tokenB: string;
  let createdWorkflowId: string;

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
    it('should return 401 when accessing workflows without authentication', async () => {
      const res = await request(app).get('/api/workflows');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/workflows (Create)', () => {
    it('should fail with 400 if name is missing or empty', async () => {
      const res = await request(app)
        .post('/api/workflows')
        .set('Cookie', tokenA)
        .send({ name: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should create a new workflow in DRAFT status with version 1', async () => {
      const res = await request(app)
        .post('/api/workflows')
        .set('Cookie', tokenA)
        .send({
          name: 'Lead Sync to Google Sheets',
          description: 'Syncs incoming webhook leads automatically',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBe('Lead Sync to Google Sheets');
      expect(res.body.data.description).toBe('Syncs incoming webhook leads automatically');
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.version).toBe(1);
      expect(Array.isArray(res.body.data.nodes)).toBe(true);
      expect(Array.isArray(res.body.data.connections)).toBe(true);
      expect(res.body.data.id).toBeDefined();

      createdWorkflowId = res.body.data.id;
    });
  });

  describe('GET /api/workflows (List & Query Filters)', () => {
    it('should list workflows belonging to User A', async () => {
      const res = await request(app)
        .get('/api/workflows')
        .set('Cookie', tokenA);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.some((w: any) => w.id === createdWorkflowId)).toBe(true);
    });

    it('should filter workflows by search query', async () => {
      const res = await request(app)
        .get('/api/workflows?search=Lead+Sync')
        .set('Cookie', tokenA);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(createdWorkflowId);

      const noMatchRes = await request(app)
        .get('/api/workflows?search=NonExistentWorkflowTerm')
        .set('Cookie', tokenA);

      expect(noMatchRes.status).toBe(200);
      expect(noMatchRes.body.data.length).toBe(0);
    });

    it('should filter workflows by status', async () => {
      const draftRes = await request(app)
        .get('/api/workflows?status=DRAFT')
        .set('Cookie', tokenA);

      expect(draftRes.status).toBe(200);
      expect(draftRes.body.data.some((w: any) => w.id === createdWorkflowId)).toBe(true);

      const activeRes = await request(app)
        .get('/api/workflows?status=ACTIVE')
        .set('Cookie', tokenA);

      expect(activeRes.status).toBe(200);
      expect(activeRes.body.data.some((w: any) => w.id === createdWorkflowId)).toBe(false);
    });
  });

  describe('GET /api/workflows/:id (Get Single)', () => {
    it('should return workflow details for the owner', async () => {
      const res = await request(app)
        .get(`/api/workflows/${createdWorkflowId}`)
        .set('Cookie', tokenA);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdWorkflowId);
      expect(res.body.data.name).toBe('Lead Sync to Google Sheets');
    });

    it('should return 404 for a non-existent workflow id', async () => {
      const res = await request(app)
        .get('/api/workflows/60b8d29f8f1b2c001f8e4e1a')
        .set('Cookie', tokenA);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/workflows/:id (Update Metadata)', () => {
    it('should update workflow name and description', async () => {
      const res = await request(app)
        .put(`/api/workflows/${createdWorkflowId}`)
        .set('Cookie', tokenA)
        .send({
          name: 'Updated Lead Sync Pipeline',
          description: 'Updated description for automation',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Lead Sync Pipeline');
      expect(res.body.data.description).toBe('Updated description for automation');
    });
  });

  describe('PATCH /api/workflows/:id/status (Lifecycle Status)', () => {
    it('should activate workflow status to ACTIVE', async () => {
      const res = await request(app)
        .patch(`/api/workflows/${createdWorkflowId}/status`)
        .set('Cookie', tokenA)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACTIVE');
    });

    it('should deactivate workflow status to INACTIVE', async () => {
      const res = await request(app)
        .patch(`/api/workflows/${createdWorkflowId}/status`)
        .set('Cookie', tokenA)
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('INACTIVE');
    });

    it('should reject invalid status values', async () => {
      const res = await request(app)
        .patch(`/api/workflows/${createdWorkflowId}/status`)
        .set('Cookie', tokenA)
        .send({ status: 'INVALID_STATUS' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/workflows/:id/duplicate (Duplication)', () => {
    it('should duplicate a workflow with `${name} Copy`, DRAFT status and version 1', async () => {
      const res = await request(app)
        .post(`/api/workflows/${createdWorkflowId}/duplicate`)
        .set('Cookie', tokenA);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).not.toBe(createdWorkflowId);
      expect(res.body.data.name).toBe('Updated Lead Sync Pipeline Copy');
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.version).toBe(1);
    });
  });

  describe('Strict Ownership Isolation (User B cannot access or modify User A)', () => {
    it('User B should not see User A workflows in their list', async () => {
      const res = await request(app)
        .get('/api/workflows')
        .set('Cookie', tokenB);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
      expect(res.body.data.some((w: any) => w.id === createdWorkflowId)).toBe(false);
    });

    it('User B cannot get User A workflow details (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/workflows/${createdWorkflowId}`)
        .set('Cookie', tokenB);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('User B cannot update User A workflow (403 Forbidden)', async () => {
      const res = await request(app)
        .put(`/api/workflows/${createdWorkflowId}`)
        .set('Cookie', tokenB)
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('User B cannot change User A workflow status (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/workflows/${createdWorkflowId}/status`)
        .set('Cookie', tokenB)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('User B cannot duplicate User A workflow (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/workflows/${createdWorkflowId}/duplicate`)
        .set('Cookie', tokenB);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('User B cannot delete User A workflow (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/workflows/${createdWorkflowId}`)
        .set('Cookie', tokenB);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/workflows/:id (Delete)', () => {
    it('should allow User A to delete their workflow', async () => {
      const res = await request(app)
        .delete(`/api/workflows/${createdWorkflowId}`)
        .set('Cookie', tokenA);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it is gone
      const checkRes = await request(app)
        .get(`/api/workflows/${createdWorkflowId}`)
        .set('Cookie', tokenA);

      expect(checkRes.status).toBe(404);
    });
  });
});
