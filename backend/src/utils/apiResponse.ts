import { Response } from 'express';

export class AppError extends Error {
  public statusCode: number;
  public errors?: any[];
  public isOperational: boolean;

  constructor(message: string, statusCode = 500, errors?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function sendSuccess<T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200,
  extra?: Record<string, any>
): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    ...(data !== undefined ? { data } : {}),
    ...(extra || {}),
  });
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  errors?: any[]
): Response {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: errors || [],
  });
}

