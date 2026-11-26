import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

const rateLimitHandler = (_req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests, please try again later.',
    errors: [{ message: 'Rate limit exceeded' }],
  });
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

export const webhookIngestLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 webhook payloads per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many webhook requests from this IP. Rate limit is 120 requests per minute.',
      errors: [{ message: 'Webhook ingest rate limit exceeded (120 req/min)' }],
    });
  },
});
