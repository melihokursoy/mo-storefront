import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL_PRODUCT ||
  'postgresql://postgres:postgres@localhost:5432/product_db';

async function main() {
  console.log('Seeding product database...');

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.product.upsert({
      where: { sku: 'WH-001' },
      update: {},
      create: {
        id: '1',
        name: 'Wireless Headphones',
        description: 'High-quality wireless headphones with noise cancellation',
        price: 129.99,
        category: 'Electronics',
        sku: 'WH-001',
        rating: 4.5,
        inStock: true,
        tags: ['audio', 'wireless', 'headphones'],
        imageUrl: 'https://example.com/headphones.jpg',
      },
    });

    await prisma.product.upsert({
      where: { sku: 'USB-C-001' },
      update: {},
      create: {
        id: '2',
        name: 'USB-C Cable',
        description: 'Durable USB-C to USB-C charging cable',
        price: 19.99,
        category: 'Accessories',
        sku: 'USB-C-001',
        rating: 4.8,
        inStock: true,
        tags: ['cable', 'usb-c', 'charging'],
        imageUrl: 'https://example.com/cable.jpg',
      },
    });

    await prisma.product.upsert({
      where: { sku: 'LS-001' },
      update: {},
      create: {
        id: '3',
        name: 'Laptop Stand',
        description: 'Ergonomic aluminum laptop stand for desk setup',
        price: 49.99,
        category: 'Office',
        sku: 'LS-001',
        rating: 4.7,
        inStock: true,
        tags: ['stand', 'ergonomic', 'office'],
        imageUrl: 'https://example.com/stand.jpg',
      },
    });

    await prisma.product.upsert({
      where: { sku: 'KB-001' },
      update: {},
      create: {
        id: '4',
        name: 'Mechanical Keyboard',
        description: 'RGB mechanical keyboard for gaming and productivity',
        price: 149.99,
        category: 'Electronics',
        sku: 'KB-001',
        rating: 4.6,
        inStock: false,
        tags: ['keyboard', 'mechanical', 'gaming'],
        imageUrl: 'https://example.com/keyboard.jpg',
      },
    });

    await prisma.product.upsert({
      where: { sku: 'MS-001' },
      update: {},
      create: {
        id: '5',
        name: 'Wireless Mouse',
        description: 'Precision wireless mouse with adjustable DPI',
        price: 59.99,
        category: 'Electronics',
        sku: 'MS-001',
        rating: 4.4,
        inStock: true,
        tags: ['mouse', 'wireless', 'gaming'],
        imageUrl: 'https://example.com/mouse.jpg',
      },
    });

    console.log('Product seed complete: 5 products created.');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
