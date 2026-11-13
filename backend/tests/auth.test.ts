import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';

const app = createApp();

describe('Auth Endpoints & Workflows', () => {
  const uniquePrefix = `test_${Date.now()}`;
  const testUser = {
    name: 'Haritha Testing',
    email: `${uniquePrefix}@example.com`,
    password: 'Password@123',
  };

  afterAll(async () => {
    // Cleanup created test records
    await prisma.session.deleteMany({
      where: { user: { email: { contains: uniquePrefix } } },
    });
    await prisma.verificationToken.deleteMany({
      where: { user: { email: { contains: uniquePrefix } } },
    });
    await prisma.passwordResetToken.deleteMany({
      where: { user: { email: { contains: uniquePrefix } } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: uniquePrefix } },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully with USER role and hashed password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.name).toBe(testUser.name);
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.role).toBe('USER');
      expect(res.body.user.passwordHash).toBeUndefined();

      // Check cookie is set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/kaira_token=/);

      // Verify in database that password was hashed
      const dbUser = await prisma.user.findUnique({
        where: { email: testUser.email },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.passwordHash).not.toBe(testUser.password);
      expect(dbUser?.passwordHash.startsWith('$2')).toBe(true);
    });

    it('should reject registration with duplicate email (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should reject registration with invalid password complexity (400)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid User',
          email: `${uniquePrefix}_inv@example.com`,
          password: 'simplepassword',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should fail with unknown email (401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unknown_nonexistent@example.com',
          password: 'Password@123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password.');
    });

    it('should fail with invalid password (401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword@999',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password.');
    });

    it('should login successfully, return user info, and update lastLoginAt', async () => {
      const beforeLogin = new Date();
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.lastLoginAt).toBeDefined();

      const dbUser = await prisma.user.findUnique({
        where: { email: testUser.email },
      });
      expect(dbUser?.lastLoginAt).not.toBeNull();
      expect(new Date(dbUser!.lastLoginAt!).getTime()).toBeGreaterThanOrEqual(
        beforeLogin.getTime() - 2000
      );
    });
  });

  describe('GET /api/auth/me', () => {
    let authCookie: string;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      authCookie = loginRes.headers['set-cookie'][0];
    });

    it('should return 401 when accessing without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return current user when authenticated via cookie', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [authCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.passwordHash).toBeUndefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear authentication cookie and return success', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged out successfully');

      const cookies = res.headers['set-cookie'];
      expect(cookies[0]).toMatch(/kaira_token=;/);
    });
  });

  describe('Password Reset Flow', () => {
    it('should return generic message on forgot-password without revealing existence', async () => {
      const res1 = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      expect(res1.status).toBe(200);
      expect(res1.body.message).toContain('If the email exists');

      const res2 = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@randomdomain.xyz' });

      expect(res2.status).toBe(200);
      expect(res2.body.message).toContain('If the email exists');
    });

    it('should allow resetting password with valid token and invalidate token afterwards', async () => {
      // Find the token created in forgot-password test
      const user = await prisma.user.findUnique({ where: { email: testUser.email } });
      const resetToken = await prisma.passwordResetToken.findFirst({
        where: { userId: user!.id },
      });
      expect(resetToken).not.toBeNull();

      const newPassword = 'NewSecretPassword@456';
      const resetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken!.token,
          password: newPassword,
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // Verify token was deleted / invalidated
      const checkToken = await prisma.passwordResetToken.findUnique({
        where: { token: resetToken!.token },
      });
      expect(checkToken).toBeNull();

      // Verify login with old password fails
      const failLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      expect(failLogin.status).toBe(401);

      // Verify login with new password succeeds
      const successLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: newPassword });
      expect(successLogin.status).toBe(200);
    });
  });
});

