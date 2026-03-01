import { Injectable } from '@nestjs/common';
import { Order, OrderStatus, OrderItem } from './order.entity';

interface OrderDB {
  [key: string]: Order;
}

@Injectable()
export class OrderService {
  private orders: OrderDB = {
    'order-1': {
      id: 'order-1',
      userId: 'user-1',
      cart: { id: 'cart-user-1', userId: 'user-1' },
      items: [
        {
          id: 'item-1',
          product: { id: '1', name: 'Wireless Headphones', price: 129.99 },
          quantity: 1,
          price: 129.99,
          subtotal: 129.99,
        },
        {
          id: 'item-2',
          product: { id: '3', name: 'Laptop Stand', price: 49.99 },
          quantity: 2,
          price: 49.99,
          subtotal: 99.98,
        },
      ],
      status: OrderStatus.DELIVERED,
      totalPrice: 229.97,
      itemCount: 3,
      createdAt: '2024-01-05T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
    },
  };

  private orderSequence = 2;

  async createOrder(
    userId: string,
    cartId: string,
    items: OrderItem[]
  ): Promise<Order> {
    const orderId = `order-${this.orderSequence++}`;
    const now = new Date().toISOString();

    const order: Order = {
      id: orderId,
      userId,
      cart: { id: cartId, userId },
      items,
      status: OrderStatus.PENDING,
      totalPrice: items.reduce((sum, item) => sum + item.subtotal, 0),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      createdAt: now,
      updatedAt: now,
    };

    this.orders[orderId] = order;
    return order;
  }

  async getOrder(orderId: string): Promise<Order | null> {
    return this.orders[orderId] || null;
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return Object.values(this.orders).filter(
      (order) => order.userId === userId
    );
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus
  ): Promise<Order | null> {
    const order = this.orders[orderId];
    if (order) {
      order.status = status;
      order.updatedAt = new Date().toISOString();
    }
    return order || null;
  }

  async findById(orderId: string): Promise<Order | null> {
    return this.orders[orderId] || null;
  }

  async cancelOrder(orderId: string): Promise<Order | null> {
    const order = this.orders[orderId];
    if (order && order.status !== OrderStatus.DELIVERED) {
      order.status = OrderStatus.CANCELLED;
      order.updatedAt = new Date().toISOString();
    }
    return order || null;
  }
}
