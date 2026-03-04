import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const connectionString =
  process.env.DATABASE_URL_AUTH ||
  'postgresql://postgres:postgres@localhost:5435/auth_db';

async function main() {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // Hash passwords
    const adminPasswordHash = await bcrypt.hash('admin-password', 10);
    const userPasswordHash = await bcrypt.hash('user-password', 10);

    // Admin credential (matches user-admin from api-user)
    await prisma.credential.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: {
        email: 'admin@test.com',
        passwordHash: adminPasswordHash,
        userId: 'user-admin',
      },
    });

    // Regular user credential (matches user-1 from api-user)
    await prisma.credential.upsert({
      where: { email: 'user@test.com' },
      update: {},
      create: {
        email: 'user@test.com',
        passwordHash: userPasswordHash,
        userId: 'user-1',
      },
    });

    console.log(
      '✅ Seed complete: admin and regular user credentials created/verified'
    );
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
