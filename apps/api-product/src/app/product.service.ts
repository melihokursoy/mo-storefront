import { Injectable } from '@nestjs/common';
import { Product } from './product.entity';
import { PrismaService } from './prisma.service';

interface FindAllOptions {
  limit: number;
  offset: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async findAll(options: FindAllOptions): Promise<Product[]> {
    const where: any = {};

    if (options.category) {
      where.category = { equals: options.category, mode: 'insensitive' };
    }

    if (options.minPrice !== undefined || options.maxPrice !== undefined) {
      where.price = {};
      if (options.minPrice !== undefined) {
        where.price.gte = options.minPrice;
      }
      if (options.maxPrice !== undefined) {
        where.price.lte = options.maxPrice;
      }
    }

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
        { category: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      skip: options.offset,
      take: options.limit,
    });

    return products.map((p) => ({
      ...p,
      imageUrl: p.imageUrl ?? undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  async findById(id: string): Promise<Product | null> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) return null;

    return {
      ...product,
      imageUrl: product.imageUrl ?? undefined,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }
}
