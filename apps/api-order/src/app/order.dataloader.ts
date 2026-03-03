import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { Order, OrderStatus } from './order.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class OrderDataLoader {
  private orderLoader: DataLoader<string, Order | null>;

  constructor(private prisma: PrismaService) {
    this.orderLoader = new DataLoader(async (orderIds: readonly string[]) => {
      const orders = await this.prisma.order.findMany({
        where: { id: { in: [...orderIds] } },
        include: { items: true },
      });

      const orderMap = new Map(orders.map((o) => [o.id, o]));

      return orderIds.map((id) => {
        const order = orderMap.get(id);
        if (!order) return null;

        return {
          id: order.id,
          userId: order.userId,
          cart: order.cartId
            ? { id: order.cartId, userId: order.cartUserId || order.userId }
            : undefined,
          items: order.items.map((item) => ({
            id: item.id,
            product: {
              id: item.productId,
              name: item.productName,
              price: item.productPrice,
            },
            quantity: item.quantity,
            price: item.productPrice,
            subtotal: item.quantity * item.productPrice,
          })),
          status: order.status as OrderStatus,
          totalPrice: order.totalPrice,
          itemCount: order.itemCount,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
        };
      });
    });
  }

  async loadOrder(orderId: string): Promise<Order | null> {
    return this.orderLoader.load(orderId);
  }

  async loadOrders(orderIds: string[]): Promise<(Order | null)[]> {
    return Promise.all(orderIds.map((id) => this.loadOrder(id)));
  }

  clearCache(): void {
    this.orderLoader.clearAll();
  }
}
