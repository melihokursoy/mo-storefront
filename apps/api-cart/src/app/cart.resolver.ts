import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveReference,
  Context,
} from '@nestjs/graphql';
import { Cart } from './cart.entity';
import { CartService } from './cart.service';

interface ContextWithUserId {
  userId?: string;
}

@Resolver(() => Cart)
export class CartResolver {
  constructor(private cartService: CartService) {}

  @Query(() => Cart, { nullable: true })
  async cart(@Context() context: ContextWithUserId): Promise<Cart | null> {
    // Mock: use userId from context (would come from JWT token in production)
    const userId = context.userId || 'user-1';
    return this.cartService.getCart(userId);
  }

  @Mutation(() => Cart)
  async addToCart(
    @Args('productId') productId: string,
    @Args('quantity') quantity: number,
    @Args('productPrice') productPrice: number,
    @Args('productName') productName: string,
    @Context() context: ContextWithUserId
  ): Promise<Cart> {
    const userId = context.userId || 'user-1';
    return this.cartService.addToCart(
      userId,
      productId,
      quantity,
      productPrice,
      productName
    );
  }

  @Mutation(() => Cart)
  async removeFromCart(
    @Args('cartItemId') cartItemId: string,
    @Context() context: ContextWithUserId
  ): Promise<Cart> {
    const userId = context.userId || 'user-1';
    return this.cartService.removeFromCart(userId, cartItemId);
  }

  @Mutation(() => Cart)
  async updateCartItem(
    @Args('cartItemId') cartItemId: string,
    @Args('quantity') quantity: number,
    @Context() context: ContextWithUserId
  ): Promise<Cart> {
    const userId = context.userId || 'user-1';
    return this.cartService.updateCartItem(userId, cartItemId, quantity);
  }

  @Mutation(() => Cart)
  async clearCart(@Context() context: ContextWithUserId): Promise<Cart> {
    const userId = context.userId || 'user-1';
    return this.cartService.clearCart(userId);
  }

  @ResolveReference()
  resolveReference(reference: { id: string }): Promise<Cart | null> {
    return this.cartService.findById(reference.id);
  }
}
