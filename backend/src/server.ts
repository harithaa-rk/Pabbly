import 'dotenv/config';
import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';

async function bootstrap() {
  try {
    // Connect to MongoDB Atlas via Prisma Client
    await connectDatabase();

    const server = app.listen(env.port, () => {
      console.log(`🚀 Kaira Connect Backend API running on port ${env.port} [${env.nodeEnv}]`);
      console.log(`🔗 API Base URL: ${env.backendUrl}/api`);
      console.log(`🌐 Allowed Frontend: ${env.frontendUrl}`);
      console.log(`🍃 Database: Connected to MongoDB Atlas`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\n[${signal}] Gracefully shutting down...`);
      server.close(async () => {
        await disconnectDatabase();
        console.log('Database disconnected. Process exited.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Fatal initialization error:', error);
    process.exit(1);
  }
}

bootstrap();
