import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: env.databaseUrl,
      },
    },
    log: env.nodeEnv === 'development' ? ['error', 'warn'] : ['error'],
  });

if (env.nodeEnv !== 'production') {
  global.prisma = prisma;
}

let dbConnected = false;

export function isDatabaseConnected(): boolean {
  return dbConnected;
}

export async function connectDatabase(): Promise<boolean> {
  try {
    const connectPromise = prisma.$connect().then(() => {
      dbConnected = true;
      return true;
    });
    // In dev mode, don't block server startup for 30+ seconds if Atlas is offline
    const timeoutMs = env.nodeEnv === 'production' ? 10000 : 3000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Database connection timed out after ${timeoutMs}ms.`)), timeoutMs)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    console.log('✅ Connected to MongoDB Atlas Database');
    dbConnected = true;
    return true;
  } catch (error: any) {
    dbConnected = false;
    console.warn(`⚠️ Warning: Could not connect to MongoDB Atlas: ${error.message || error}`);
    if (env.nodeEnv === 'production') {
      console.error('❌ Database connection is mandatory in production environment.');
      throw error;
    }
    console.log('⚡ Running in database-decoupled development mode (Google OAuth & local endpoints active).');
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  dbConnected = false;
  await prisma.$disconnect();
}
