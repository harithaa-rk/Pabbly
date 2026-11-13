import dotenv from 'dotenv';
import path from 'path';

// Load .env from current directory or backend directory with override
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

export interface Config {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  frontendUrl: string;
  backendUrl: string;
  cookieDomain?: string;
  smtp: {
    host: string;
    port: number;
    user?: string;
    password?: string;
    from: string;
  };
  google: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
}

export const env: Config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl:
    process.env.DATABASE_URL ||
    'mongodb+srv://2312064_db_user:ApvWnguVmk16SCqg@pabbly-connect.7igvncl.mongodb.net/kaira_connect?retryWrites=true&w=majority',
  jwtSecret: process.env.JWT_SECRET || 'kaira-connect-super-secure-jwt-secret-key-production-ready-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || 'Kaira Connect <no-reply@kairaconnect.com>',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
  },
};
