import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL_USER ||
  'postgresql://postgres:postgres@localhost:5436/user_db';

async function main() {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // Admin user
    await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: {
        id: 'user-admin',
        name: 'Admin User',
        email: 'admin@test.com',
        role: 'admin',
        isActive: true,
      },
    });

    // Regular user
    await prisma.user.upsert({
      where: { email: 'user@test.com' },
      update: {},
      create: {
        id: 'user-1',
        name: 'Test User',
        email: 'user@test.com',
        role: 'user',
        isActive: true,
      },
    });

    console.log('✅ Seed complete: admin and regular user created/verified');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
