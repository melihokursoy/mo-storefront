import { Injectable } from '@nestjs/common';
import { Cart } from './cart.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  private toGraphQL(cart: any): Cart {
    const items = (cart.items || []).map((item: any) => ({
      id: item.id,
      product: {
        id: item.productId,
        name: item.productName,
        price: item.productPrice,
      },
      quantity: item.quantity,
      subtotal: item.quantity * item.productPrice,
    }));

    const totalPrice = items.reduce(
      (sum: number, item: any) => sum + item.subtotal,
      0
    );
    const itemCount = items.reduce(
      (sum: number, item: any) => sum + item.quantity,
      0
    );

    return {
      id: cart.id,
      userId: cart.userId,
      items,
      totalPrice,
      itemCount,
      createdAt: cart.createdAt.toISOString(),
      updatedAt: cart.updatedAt.toISOString(),
    };
  }

  async getCart(userId: string): Promise<Cart | null> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });
    if (!cart) return null;
    return this.toGraphQL(cart);
  }

  async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: { items: true },
      });
    }

    return this.toGraphQL(cart);
  }

  async addToCart(
    userId: string,
    productId: string,
    quantity: number,
    productPrice: number,
    productName: string
  ): Promise<Cart> {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }

    const existingItem = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          productName,
          productPrice,
          quantity,
        },
      });
    }

    // Touch updatedAt
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { updatedAt: new Date() },
    });

    const updated = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: true },
    });

    return this.toGraphQL(updated);
  }

  async removeFromCart(userId: string, cartItemId: string): Promise<Cart> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (cart) {
      await this.prisma.cartItem.deleteMany({
        where: { id: cartItemId, cartId: cart.id },
      });

      await this.prisma.cart.update({
        where: { id: cart.id },
        data: { updatedAt: new Date() },
      });
    }

    const updated = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    return this.toGraphQL(
      updated || {
        id: '',
        userId,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );
  }

  async updateCartItem(
    userId: string,
    cartItemId: string,
    quantity: number
  ): Promise<Cart> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (cart) {
      if (quantity <= 0) {
        await this.prisma.cartItem.deleteMany({
          where: { id: cartItemId, cartId: cart.id },
        });
      } else {
        await this.prisma.cartItem.updateMany({
          where: { id: cartItemId, cartId: cart.id },
          data: { quantity },
        });
      }

      await this.prisma.cart.update({
        where: { id: cart.id },
        data: { updatedAt: new Date() },
      });
    }

    const updated = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    return this.toGraphQL(
      updated || {
        id: '',
        userId,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );
  }

  async clearCart(userId: string): Promise<Cart> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (cart) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      await this.prisma.cart.update({
        where: { id: cart.id },
        data: { updatedAt: new Date() },
      });
    }

    const updated = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    return this.toGraphQL(
      updated || {
        id: '',
        userId,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );
  }

  async findById(cartId: string): Promise<Cart | null> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });
    if (!cart) return null;
    return this.toGraphQL(cart);
  }
}
