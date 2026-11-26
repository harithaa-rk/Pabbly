import { Request, Response, NextFunction } from 'express';
import { smtpConnectionService } from '../services/smtpConnection.service.js';
import { sendSuccess, AppError } from '../utils/apiResponse.js';
import { AuthRequest } from '../types/index.js';

/**
 * List user's SMTP connections (passwords masked as ********)
 */
export async function getSmtpConnections(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id || 'usr_guest';

    const connections = smtpConnectionService.getUserConnections(userId);
    sendSuccess(res, 'SMTP connections retrieved', { connections }, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Save new or update existing SMTP connection
 */
export async function saveSmtpConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id || 'usr_guest';

    const { id, name, host, port, secure, username, password, senderEmail, senderName } = req.body || {};

    const saved = await smtpConnectionService.saveConnection(userId, {
      id,
      name,
      host,
      port: Number(port),
      secure: Boolean(secure),
      username,
      password,
      senderEmail,
      senderName,
    });

    sendSuccess(res, 'SMTP connection saved securely', { connection: saved }, 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Test SMTP connection credentials before saving (free, 0 tasks)
 */
export async function testSmtpCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, host, port, secure, username, password, senderEmail } = req.body || {};

    const testConfig: any = {
      id: 'test_temp',
      userId: 'test_user',
      name: name || 'Test SMTP Mailer',
      host,
      port: Number(port),
      secure: Boolean(secure),
      username,
      password,
      senderEmail,
    };

    const result = await smtpConnectionService.testConnection(testConfig);
    sendSuccess(res, result.message, { result }, result.success ? 200 : 400);
  } catch (error) {
    next(error);
  }
}

/**
 * Test an existing saved SMTP connection
 */
export async function testSavedSmtpConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id || 'usr_guest';
    const { id } = req.params;

    const connection = smtpConnectionService.getConnectionInternal(id, userId);
    if (!connection) {
      throw new AppError('SMTP connection not found', 404);
    }

    const result = await smtpConnectionService.testConnection(connection);
    sendSuccess(res, result.message, { result }, result.success ? 200 : 400);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete an SMTP connection with ownership check
 */
export async function deleteSmtpConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id || 'usr_guest';
    const { id } = req.params;

    const deleted = smtpConnectionService.deleteConnection(id, userId);
    if (!deleted) {
      throw new AppError('SMTP connection not found or already deleted', 404);
    }

    sendSuccess(res, 'SMTP connection deleted', { id }, 200);
  } catch (error) {
    next(error);
  }
}

export const connectionController = {
  getSmtpConnections,
  saveSmtpConnection,
  testSmtpCredentials,
  testSavedSmtpConnection,
  deleteSmtpConnection,
};
