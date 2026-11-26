import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { connectionController } from '../controllers/connection.controller.js';
import { gmailConnectionController } from '../controllers/gmailConnection.controller.js';

const router = Router();

// ==========================================
// SMTP Connection Endpoints
// ==========================================
// Test credentials without requiring saved state (can be called by authenticated users)
router.post('/smtp/test', requireAuth, connectionController.testSmtpCredentials);

// List all user's connections
router.get('/smtp', requireAuth, connectionController.getSmtpConnections);

// Create or update connection
router.post('/smtp', requireAuth, connectionController.saveSmtpConnection);

// Test an existing saved connection
router.post('/smtp/:id/test', requireAuth, connectionController.testSavedSmtpConnection);

// Delete connection
router.delete('/smtp/:id', requireAuth, connectionController.deleteSmtpConnection);

// ==========================================
// Gmail API OAuth Connection Endpoints
// ==========================================
// Initiate Gmail OAuth authorization
router.get('/gmail/connect', requireAuth, gmailConnectionController.connect);

// Google OAuth callback receiver
router.get('/gmail/callback', gmailConnectionController.callback);

// List user's active Gmail connections
router.get('/gmail', requireAuth, gmailConnectionController.listConnections);

// Test connection
router.post('/gmail/test', requireAuth, gmailConnectionController.testConnection);
router.post('/gmail/:id/test', requireAuth, gmailConnectionController.testConnection);

// Disconnect / Delete Gmail connection
router.delete('/gmail/:id', requireAuth, gmailConnectionController.deleteConnection);

export default router;
