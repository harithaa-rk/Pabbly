import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index.js';
import { userService } from '../services/user.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function getAllUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const result = await userService.getAllUsers(page, limit);
    sendSuccess(res, 'Users retrieved successfully', result);
  } catch (error) {
    next(error);
  }
}

export async function updateUserRole(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = req.user!.id;
    const targetUserId = req.params.id;
    const updated = await userService.updateUserRole(adminId, targetUserId, req.body);
    sendSuccess(res, 'User role updated successfully', undefined, 200, { user: updated });
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = req.user!.id;
    const targetUserId = req.params.id;
    const updated = await userService.updateUserStatus(adminId, targetUserId, req.body);
    sendSuccess(res, 'User status updated successfully', undefined, 200, { user: updated });
  } catch (error) {
    next(error);
  }
}

