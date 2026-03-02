import { PrismaClient, OrderStatus } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/order_db';

async function main() {
  console.log('Seeding order database...');

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const existing = await prisma.order.findFirst({
      where: { id: 'order-1' },
    });

    if (!existing) {
      await prisma.order.create({
        data: {
          id: 'order-1',
          userId: 'user-1',
          cartId: 'cart-user-1',
          cartUserId: 'user-1',
          status: OrderStatus.DELIVERED,
          totalPrice: 229.97,
          itemCount: 3,
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
    }

    console.log('Order seed complete: 1 delivered order created.');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
