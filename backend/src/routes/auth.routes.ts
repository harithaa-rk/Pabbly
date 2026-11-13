import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth, validateBody } from '../middleware/auth.middleware.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimit.middleware.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Public auth endpoints with brute force protection
router.post('/register', authLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  '/reset-password',
  passwordResetLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword
);
router.get('/verify-email', authController.verifyEmail);

// Google OAuth endpoints
router.get('/google', authController.googleAuthRedirect);
router.get('/google/callback', authController.googleAuthCallback);

// Protected auth endpoints
router.get('/me', requireAuth, authController.getMe);
router.post(
  '/change-password',
  requireAuth,
  validateBody(changePasswordSchema),
  authController.changePassword
);

export default router;

