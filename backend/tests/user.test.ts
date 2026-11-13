import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';

const app = createApp();

describe('User Profile & Password Endpoints', () => {
  const uniquePrefix = `user_test_${Date.now()}`;
  const testUser = {
    name: 'Profile Tester',
    email: `${uniquePrefix}@example.com`,
    password: 'Password@123',
  };
  let authCookie: string;
  let userId: string;

  beforeAll(async () => {
    // Register test user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    userId = regRes.body.user.id;
    authCookie = regRes.headers['set-cookie'][0];
  });

  afterAll(async () => {
    await prisma.session.deleteMany({
      where: { user: { email: { contains: uniquePrefix } } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: uniquePrefix } },
    });
    await prisma.$disconnect();
  });

  describe('GET /api/users/profile', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/users/profile');
      expect(res.status).toBe(401);
    });

    it('should return user profile when authenticated', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Cookie', [authCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.name).toBe(testUser.name);
      expect(res.body.user.email).toBe(testUser.email);
    });
  });

  describe('PATCH /api/users/profile', () => {
    it('should update name and avatar successfully', async () => {
      const updateData = {
        name: 'Haritha Updated Name',
        avatar: 'https://images.example.com/avatar.png',
      };

      const res = await request(app)
        .patch('/api/users/profile')
        .set('Cookie', [authCookie])
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.name).toBe(updateData.name);
      expect(res.body.user.avatar).toBe(updateData.avatar);

      // Verify in DB
      const dbUser = await prisma.user.findUnique({ where: { id: userId } });
      expect(dbUser?.name).toBe(updateData.name);
      expect(dbUser?.avatar).toBe(updateData.avatar);
    });

    it('should reject invalid avatar URL (400)', async () => {
      const res = await request(app)
        .patch('/api/users/profile')
        .set('Cookie', [authCookie])
        .send({ avatar: 'not-a-valid-url' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should reject if current password is incorrect (400)', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Cookie', [authCookie])
        .send({
          currentPassword: 'WrongPassword@123',
          newPassword: 'BrandNewPassword@456',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Current password does not match');
    });

    it('should successfully change password when current password matches', async () => {
      const newPassword = 'BrandNewPassword@456';
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Cookie', [authCookie])
        .send({
          currentPassword: testUser.password,
          newPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify can login with brand new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: newPassword });
      expect(loginRes.status).toBe(200);
    });
  });
});

