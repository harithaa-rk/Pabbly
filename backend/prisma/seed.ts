import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const adminPasswordHash = await bcrypt.hash('AdminPassword@123', 12);
  const demoPasswordHash = await bcrypt.hash('Password@123', 12);

  // Seed Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kairaconnect.com' },
    update: {},
    create: {
      name: 'Kaira SuperAdmin',
      email: 'admin@kairaconnect.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isEmailVerified: true,
      isActive: true,
    },
  });

  // Seed standard Demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'user@example.com',
      passwordHash: demoPasswordHash,
      role: 'USER',
      isEmailVerified: true,
      isActive: true,
    },
  });

  console.log('✅ Seed successful:');
  console.log(`- Admin account: ${admin.email} (Role: ${admin.role})`);
  console.log(`- Demo account: ${demoUser.email} (Role: ${demoUser.role})`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

