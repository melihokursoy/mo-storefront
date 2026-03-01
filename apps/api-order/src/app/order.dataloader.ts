import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { Order } from './order.entity';
import { OrderService } from './order.service';

@Injectable()
export class OrderDataLoader {
  private orderLoader: DataLoader<string, Order | null>;

  constructor(private orderService: OrderService) {
    // Create a DataLoader that batches order lookups
    this.orderLoader = new DataLoader(async (orderIds: readonly string[]) => {
      const orders = await Promise.all(
        orderIds.map((id) => this.orderService.findById(id))
      );
      return orders;
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
