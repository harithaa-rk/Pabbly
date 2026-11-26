import { Request, Response, NextFunction } from 'express';
import { gmailConnectionService } from '../services/gmailConnection.service.js';
import { sendSuccess, AppError } from '../utils/apiResponse.js';
import { env } from '../config/env.js';

export class GmailConnectionController {
  /**
   * GET /api/connections/gmail/connect
   * Generates authorization URL and returns it or redirects
   */
  public connect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.userId || 'dev_user_1';
      const { url, state } = gmailConnectionService.generateAuthUrl(userId);

      if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
        sendSuccess(res, 'Authorization URL generated', { url, state }, 200);
        return;
      }

      res.redirect(url);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/connections/gmail/callback
   * OAuth Callback receiver
   */
  public callback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;
      const error = req.query.error as string;

      if (error) {
        console.warn('[Gmail OAuth Consent Denied]:', error);
        res.redirect(`${env.frontendUrl}/workflows?error=${encodeURIComponent(error)}`);
        return;
      }

      if (!code || !state) {
        throw new AppError('Missing authorization code or state parameter.', 400);
      }

      const connection = await gmailConnectionService.handleCallback(code, state);

      // Redirect back to frontend with success indication
      res.redirect(`${env.frontendUrl}/workflows?connection=gmail_success&email=${encodeURIComponent(connection.email)}`);
    } catch (err: any) {
      console.error('[Gmail OAuth Callback Error]:', err.message);
      res.redirect(`${env.frontendUrl}/workflows?error=${encodeURIComponent(err.message || 'gmail_auth_failed')}`);
    }
  };

  /**
   * GET /api/connections/gmail
   * List user's active Gmail connections
   */
  public listConnections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.userId || 'dev_user_1';
      const connections = gmailConnectionService.getUserConnections(userId);
      sendSuccess(res, 'Gmail connections retrieved', { connections }, 200);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/connections/gmail/test (or POST /api/connections/gmail/:id/test)
   * Verify Gmail API connectivity
   */
  public testConnection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.userId || 'dev_user_1';
      const connectionId = req.params.id || req.body.connectionId;

      if (!connectionId) {
        throw new AppError('Missing connection ID to test.', 400);
      }

      const result = await gmailConnectionService.testConnection(connectionId, userId);
      sendSuccess(res, 'Gmail connection verified successfully', result, 200);
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /api/connections/gmail/:id
   * Disconnect and remove connection
   */
  public deleteConnection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.userId || 'dev_user_1';
      const connectionId = req.params.id;

      if (!connectionId) {
        throw new AppError('Missing connection ID.', 400);
      }

      const deleted = await gmailConnectionService.deleteConnection(connectionId, userId);
      if (!deleted) {
        throw new AppError('Connection not found or already deleted.', 404);
      }

      sendSuccess(res, 'Gmail connection disconnected successfully', undefined, 200);
    } catch (err) {
      next(err);
    }
  };
}

export const gmailConnectionController = new GmailConnectionController();
