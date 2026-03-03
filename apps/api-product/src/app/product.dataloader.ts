import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { Product } from './product.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class ProductDataLoader {
  private productLoader: DataLoader<string, Product | null>;

  constructor(private prisma: PrismaService) {
    this.productLoader = new DataLoader(
      async (productIds: readonly string[]) => {
        const products = await this.prisma.product.findMany({
          where: { id: { in: [...productIds] } },
        });

        const productMap = new Map(products.map((p) => [p.id, p]));

        return productIds.map((id) => {
          const p = productMap.get(id);
          if (!p) return null;
          return {
            ...p,
            imageUrl: p.imageUrl ?? undefined,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
          };
        });
      }
    );
  }

  async loadProduct(productId: string): Promise<Product | null> {
    return this.productLoader.load(productId);
  }

  async loadProducts(productIds: string[]): Promise<(Product | null)[]> {
    return Promise.all(productIds.map((id) => this.loadProduct(id)));
  }

  clearCache(): void {
    this.productLoader.clearAll();
  }
}
