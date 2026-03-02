import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5433/cart_db';

async function main() {
  console.log('Seeding cart database...');

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.cart.upsert({
      where: { userId: 'user-1' },
      update: {},
      create: {
        id: 'cart-user-1',
        userId: 'user-1',
        items: {
          create: [
            {
              id: 'item-1',
              productId: '1',
              productName: 'Wireless Headphones',
              productPrice: 129.99,
              quantity: 1,
            },
            {
              id: 'item-2',
              productId: '3',
              productName: 'Laptop Stand',
              productPrice: 49.99,
              quantity: 2,
            },
          ],
        },
      },
    });

    console.log('Cart seed complete: 1 cart with 2 items created.');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
