import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/apiResponse.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Operational AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || [],
    });
    return;
  }

  // Malformed JSON / Body-Parser Syntax Error
  if ('status' in err && (err as any).status === 400 && 'body' in err) {
    res.status(400).json({
      success: false,
      message: 'Malformed JSON payload: Invalid JSON syntax',
      errors: [{ message: err.message }],
    });
    return;
  }

  // Oversized Payload (Entity Too Large)
  if ((err as any).status === 413 || (err as any).type === 'entity.too.large') {
    res.status(413).json({
      success: false,
      message: 'Payload too large: Payload exceeds maximum limit (10MB)',
      errors: [{ message: 'Payload size limit exceeded' }],
    });
    return;
  }

  // Zod Validation Error
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
    return;
  }

  // Prisma Unique Constraint Error
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[]) || ['Field'];
      res.status(409).json({
        success: false,
        message: `A record with this ${target.join(', ')} already exists`,
        errors: [{ field: target.join(', '), message: 'Value already in use' }],
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'Record not found',
        errors: [],
      });
      return;
    }
  }

  // Prisma Initialization, Connection & DNS Errors (e.g. MongoDB Atlas offline)
  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError ||
    err.name === 'PrismaClientInitializationError' ||
    err.message?.includes('PrismaClientInitializationError') ||
    err.message?.includes('DNS resolution') ||
    err.message?.includes('Error creating a database connection') ||
    err.message?.includes('Server selection timeout') ||
    err.message?.includes('fatal alert: InternalError') ||
    err.message?.includes('No available servers') ||
    err.message?.includes('DATABASE_OFFLINE')
  ) {
    res.status(503).json({
      success: false,
      code: 'DATABASE_UNAVAILABLE',
      message:
        'Database connection unavailable: MongoDB Atlas is currently offline or unreachable. Persistent operations are temporarily paused in decoupled development mode.',
      errors: [{ message: err.message || 'Database connection error' }],
    });
    return;
  }

  // Generic/Unknown Errors
  console.error('[Unhandled Error]:', err);
  const isDev = env.nodeEnv === 'development';
  res.status(500).json({
    success: false,
    message: isDev ? err.message : 'Internal server error',
    errors: isDev && err.stack ? [{ stack: err.stack }] : [],
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
    errors: [],
  });
}
