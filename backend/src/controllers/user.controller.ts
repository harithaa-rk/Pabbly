import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index.js';
import { userService } from '../services/user.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const profile = await userService.getProfile(userId);
    sendSuccess(res, 'Profile retrieved successfully', undefined, 200, { user: profile });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const updated = await userService.updateProfile(userId, req.body);
    sendSuccess(res, 'Profile updated successfully', undefined, 200, { user: updated });
  } catch (error) {
    next(error);
  }
}

