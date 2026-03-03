import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private prisma: PrismaClient;

  constructor() {
    const connectionString =
      process.env.DATABASE_URL_CART ||
      'postgresql://postgres:postgres@localhost:5433/cart_db';
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    this.prisma = new PrismaClient({ adapter });
  }

  async onModuleInit() {
    // Pool connection is established
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  // Proxy property access to the underlying Prisma client
  get cart() {
    return this.prisma.cart;
  }

  get cartItem() {
    return this.prisma.cartItem;
  }

  get $transaction() {
    return this.prisma.$transaction.bind(this.prisma);
  }

  get $disconnect() {
    return this.prisma.$disconnect.bind(this.prisma);
  }

  get $connect() {
    return this.prisma.$connect.bind(this.prisma);
  }
}
