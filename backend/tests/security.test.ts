import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';

const app = createApp();

describe('Role Authorization & Security Controls', () => {
  let adminCookie: string;
  let userCookie: string;
  let regularUserId: string;

  beforeAll(async () => {
    // Login as seeded admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@kairaconnect.com', password: 'AdminPassword@123' });
    adminCookie = adminLogin.headers['set-cookie'][0];

    // Login as seeded user
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'Password@123' });
    userCookie = userLogin.headers['set-cookie'][0];
    regularUserId = userLogin.body.user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Admin Authorization Guards', () => {
    it('should forbid regular USER from accessing /api/admin/users (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Cookie', [userCookie]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    it('should allow ADMIN to access /api/admin/users (200 OK)', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(res.body.data.total).toBeGreaterThanOrEqual(2);
    });

    it('should allow ADMIN to update a target user role to TEAM_MEMBER', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${regularUserId}/role`)
        .set('Cookie', [adminCookie])
        .send({ role: 'TEAM_MEMBER' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('TEAM_MEMBER');

      // Revert back to USER
      await request(app)
        .patch(`/api/admin/users/${regularUserId}/role`)
        .set('Cookie', [adminCookie])
        .send({ role: 'USER' });
    });
  });

  describe('Email Verification Architecture', () => {
    it('should verify email when valid token is supplied', async () => {
      const uniqueEmail = `verify_${Date.now()}@example.com`;
      const reg = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Verify Candidate',
          email: uniqueEmail,
          password: 'Password@123',
        });

      const tokenRecord = await prisma.verificationToken.findFirst({
        where: { userId: reg.body.user.id },
      });
      expect(tokenRecord).not.toBeNull();

      const verifyRes = await request(app)
        .get(`/api/auth/verify-email?token=${tokenRecord!.token}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.user.isEmailVerified).toBe(true);

      // Verify token deleted
      const check = await prisma.verificationToken.findUnique({
        where: { token: tokenRecord!.token },
      });
      expect(check).toBeNull();

      // Cleanup
      await prisma.user.delete({ where: { id: reg.body.user.id } });
    });
  });
});

