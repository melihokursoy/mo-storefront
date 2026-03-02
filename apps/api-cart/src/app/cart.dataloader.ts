import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { Cart } from './cart.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class CartDataLoader {
  private cartLoader: DataLoader<string, Cart | null>;

  constructor(private prisma: PrismaService) {
    this.cartLoader = new DataLoader(async (cartIds: readonly string[]) => {
      const carts = await this.prisma.cart.findMany({
        where: { id: { in: [...cartIds] } },
        include: { items: true },
      });

      const cartMap = new Map(carts.map((c) => [c.id, c]));

      return cartIds.map((id) => {
        const cart = cartMap.get(id);
        if (!cart) return null;

        const items = cart.items.map((item) => ({
          id: item.id,
          product: {
            id: item.productId,
            name: item.productName,
            price: item.productPrice,
          },
          quantity: item.quantity,
          subtotal: item.quantity * item.productPrice,
        }));

        return {
          id: cart.id,
          userId: cart.userId,
          items,
          totalPrice: items.reduce((sum, i) => sum + i.subtotal, 0),
          itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
          createdAt: cart.createdAt.toISOString(),
          updatedAt: cart.updatedAt.toISOString(),
        };
      });
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
