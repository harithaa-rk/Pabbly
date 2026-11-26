import { describe, it, expect, jest } from '@jest/globals';
import { Prisma } from '@prisma/client';
import { requireAuth } from '../src/middleware/auth.middleware.js';
import { errorHandler } from '../src/middleware/error.middleware.js';
import { AppError } from '../src/utils/apiResponse.js';
import * as taskController from '../src/controllers/task.controller.js';

describe('Auth 401 & Database-Offline 503 Acceptance Tests', () => {
  describe('1. Unauthenticated API Gating (401 Handling)', () => {
    it('requireAuth should call next with AppError 401 when no token is present', async () => {
      const req: any = { cookies: {}, headers: {} };
      const res: any = {};
      const next = jest.fn();

      await requireAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0] as any;
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(401);
      expect(err.message).toMatch(/Authentication required/i);
    });

    it('requireAuth should call next with AppError 401 when token is invalid or expired', async () => {
      const req: any = {
        cookies: { kaira_token: 'invalid.jwt.token' },
        headers: {},
      };
      const res: any = {};
      const next = jest.fn();

      await requireAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0] as any;
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(401);
      expect(err.message).toMatch(/Invalid or expired/i);
    });

    it('errorHandler should format 401 AppError with HTTP 401 status code', () => {
      const authError = new AppError('Authentication required. Please log in.', 401);
      const req: any = {};
      const res: any = {
        statusCode: 0,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json: jest.fn(),
      };
      const next = jest.fn();

      errorHandler(authError, req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required. Please log in.',
        errors: [],
      });
    });
  });

  describe('2. Database Offline 503 Handling', () => {
    it('errorHandler should catch PrismaClientInitializationError and return structured 503 DATABASE_UNAVAILABLE', () => {
      const offlineError = new Prisma.PrismaClientInitializationError(
        'Error in connector: Error creating a database connection. (Kind: An error occurred during DNS resolution: no record found for Query { name: Name("_mongodb._tcp.cluster.mongodb.net."), query_type: SRV, query_class: IN })',
        '5.11.0'
      );
      const req: any = {};
      const res: any = {
        statusCode: 0,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json: jest.fn(),
      };
      const next = jest.fn();

      errorHandler(offlineError, req, res, next);

      expect(res.statusCode).toBe(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'DATABASE_UNAVAILABLE',
          message: expect.stringMatching(/Database connection unavailable/i),
        })
      );
    });

    it('errorHandler should catch connection timeout and return 503', () => {
      const timeoutError = new Error('Server selection timeout after 30000 ms');
      const req: any = {};
      const res: any = {
        statusCode: 0,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json: jest.fn(),
      };
      const next = jest.fn();

      errorHandler(timeoutError, req, res, next);

      expect(res.statusCode).toBe(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'DATABASE_UNAVAILABLE',
        })
      );
    });
  });
});
