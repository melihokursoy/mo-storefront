import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { Cart } from './cart.entity';
import { CartService } from './cart.service';

@Injectable()
export class CartDataLoader {
  private cartLoader: DataLoader<string, Cart | null>;

  constructor(private cartService: CartService) {
    // Create a DataLoader that batches cart lookups
    this.cartLoader = new DataLoader(async (cartIds: readonly string[]) => {
      const carts = await Promise.all(
        cartIds.map((id) => this.cartService.findById(id))
      );
      return carts;
    });
  }

  async loadCart(cartId: string): Promise<Cart | null> {
    return this.cartLoader.load(cartId);
  }

  async loadCarts(cartIds: string[]): Promise<(Cart | null)[]> {
    return Promise.all(cartIds.map((id) => this.loadCart(id)));
  }

  clearCache(): void {
    this.cartLoader.clearAll();
  }
}
