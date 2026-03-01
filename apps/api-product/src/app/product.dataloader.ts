import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { Product } from './product.entity';
import { ProductService } from './product.service';

@Injectable()
export class ProductDataLoader {
  private productLoader: DataLoader<string, Product | null>;

  constructor(private productService: ProductService) {
    // Create a DataLoader that batches product lookups
    this.productLoader = new DataLoader(
      async (productIds: readonly string[]) => {
        const products = await Promise.all(
          productIds.map((id) => this.productService.findById(id))
        );
        return products;
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
