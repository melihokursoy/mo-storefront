import { Injectable } from '@nestjs/common';
import { Order, OrderStatus, OrderItem } from './order.entity';
import { PrismaService } from './prisma.service';
import { OrderStatus as PrismaOrderStatus } from '../generated/prisma';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  private toGraphQL(order: any): Order {
    return {
      id: order.id,
      userId: order.userId,
      cart: order.cartId
        ? { id: order.cartId, userId: order.cartUserId || order.userId }
        : undefined,
      items: (order.items || []).map((item: any) => ({
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
  }

  async createOrder(
    userId: string,
    cartId: string,
    items: OrderItem[]
  ): Promise<Order> {
    const totalPrice = items.reduce((sum, item) => sum + item.subtotal, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    const order = await this.prisma.order.create({
      data: {
        userId,
        cartId,
        cartUserId: userId,
        status: PrismaOrderStatus.PENDING,
        totalPrice,
        itemCount,
        items: {
          create: items.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            productPrice: item.product.price || item.price,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    return this.toGraphQL(order);
  }

  async getOrder(orderId: string): Promise<Order | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return null;
    return this.toGraphQL(order);
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.toGraphQL(o));
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus
  ): Promise<Order | null> {
    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!existing) return null;

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: status as PrismaOrderStatus },
      include: { items: true },
    });

    return this.toGraphQL(order);
  }

  async findById(orderId: string): Promise<Order | null> {
    return this.getOrder(orderId);
  }

  async cancelOrder(orderId: string): Promise<Order | null> {
    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!existing || existing.status === PrismaOrderStatus.DELIVERED) {
      return existing ? this.toGraphQL(existing) : null;
    }

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: PrismaOrderStatus.CANCELLED },
      include: { items: true },
    });

    return this.toGraphQL(order);
  }
}
