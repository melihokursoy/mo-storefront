import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private prisma: PrismaClient;

  constructor() {
    const connectionString =
      process.env.DATABASE_URL_USER ||
      'postgresql://postgres:postgres@localhost:5436/user_db';
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
  get user() {
    return this.prisma.user;
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
