import { Injectable } from '@nestjs/common';
import { Cart } from './cart.entity';
import { randomUUID } from 'crypto';

// Mock cart database
interface CartDB {
  [key: string]: Cart;
}

@Injectable()
export class CartService {
  private carts: CartDB = {
    'cart-user-1': {
      id: 'cart-user-1',
      userId: 'user-1',
      items: [
        {
          id: 'item-1',
          product: { id: '1', name: 'Wireless Headphones', price: 129.99 },
          quantity: 1,
          subtotal: 129.99,
        },
        {
          id: 'item-2',
          product: { id: '3', name: 'Laptop Stand', price: 49.99 },
          quantity: 2,
          subtotal: 99.98,
        },
      ],
      totalPrice: 229.97,
      itemCount: 3,
      createdAt: '2024-01-10T00:00:00Z',
      updatedAt: '2024-01-10T00:00:00Z',
    },
  };

  async getCart(userId: string): Promise<Cart | null> {
    const cartId = `cart-${userId}`;
    return this.carts[cartId] || null;
  }

  async getOrCreateCart(userId: string): Promise<Cart> {
    const cartId = `cart-${userId}`;
    if (!this.carts[cartId]) {
      this.carts[cartId] = {
        id: cartId,
        userId,
        items: [],
        totalPrice: 0,
        itemCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return this.carts[cartId];
  }

  async addToCart(
    userId: string,
    productId: string,
    quantity: number,
    productPrice: number,
    productName: string
  ): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);

    // Check if product already in cart
    const existingItem = cart.items.find(
      (item) => item.product.id === productId
    );

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.subtotal = existingItem.quantity * productPrice;
    } else {
      cart.items.push({
        id: randomUUID(),
        product: { id: productId, name: productName, price: productPrice },
        quantity,
        subtotal: quantity * productPrice,
      });
    }

    this.recalculate(cart);
    return cart;
  }

  async removeFromCart(userId: string, cartItemId: string): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    cart.items = cart.items.filter((item) => item.id !== cartItemId);
    this.recalculate(cart);
    return cart;
  }

  async updateCartItem(
    userId: string,
    cartItemId: string,
    quantity: number
  ): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    const item = cart.items.find((i) => i.id === cartItemId);

    if (item) {
      if (quantity <= 0) {
        cart.items = cart.items.filter((i) => i.id !== cartItemId);
      } else {
        item.quantity = quantity;
        item.subtotal = quantity * item.product.price;
      }
    }

    this.recalculate(cart);
    return cart;
  }

  async clearCart(userId: string): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    cart.items = [];
    this.recalculate(cart);
    return cart;
  }

  private recalculate(cart: Cart): void {
    cart.totalPrice = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
    cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.updatedAt = new Date().toISOString();
  }

  async findById(cartId: string): Promise<Cart | null> {
    return this.carts[cartId] || null;
  }
}
