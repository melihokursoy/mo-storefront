import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveReference,
  ResolveField,
  Context,
  Parent,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Order, OrderStatus, OrderItem } from './order.entity';
import { User } from './user.entity';
import { OrderService } from './order.service';
import { JwtAuthGuard } from './auth/jwt.guard';

interface ContextWithUserId {
  userId?: string;
}

@Resolver(() => Order)
export class OrderResolver {
  constructor(private orderService: OrderService) {}

  @Query(() => Order, { nullable: true })
  async order(@Args('id') id: string): Promise<Order | null> {
    return this.orderService.getOrder(id);
  }

  @Query(() => [Order])
  async orders(@Context() context: ContextWithUserId): Promise<Order[]> {
    // Mock: use userId from context (would come from JWT token in production)
    const userId = context.userId || 'user-1';
    return this.orderService.getUserOrders(userId);
  }

  @Mutation(() => Order)
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @Args('cartId') cartId: string,
    @Args('items', { type: () => [OrderItemInput] })
    itemsInput: OrderItemInput[],
    @Context() context: ContextWithUserId
  ): Promise<Order> {
    const userId = context.userId || 'user-1';
    const items: OrderItem[] = itemsInput.map((item) => ({
      id: `${cartId}-item-${item.productId}`,
      product: {
        id: item.productId,
        name: item.productName,
        price: item.price,
      },
      quantity: item.quantity,
      price: item.price,
      subtotal: item.price * item.quantity,
    }));

    return this.orderService.createOrder(userId, cartId, items);
  }

  @Mutation(() => Order, { nullable: true })
  @UseGuards(JwtAuthGuard)
  async updateOrderStatus(
    @Args('orderId') orderId: string,
    @Args('status', { type: () => OrderStatus }) status: OrderStatus
  ): Promise<Order | null> {
    return this.orderService.updateOrderStatus(orderId, status);
  }

  @Mutation(() => Order, { nullable: true })
  @UseGuards(JwtAuthGuard)
  async cancelOrder(@Args('orderId') orderId: string): Promise<Order | null> {
    return this.orderService.cancelOrder(orderId);
  }

  @ResolveReference()
  resolveReference(reference: { id: string }): Promise<Order | null> {
    return this.orderService.findById(reference.id);
  }

  @ResolveField(() => User)
  user(@Parent() order: Order): { __typename: string; id: string } {
    return { __typename: 'User', id: order.userId };
  }
}

// Input type for order creation
import { InputType, Field, Int, Float } from '@nestjs/graphql';

@InputType()
export class OrderItemInput {
  @Field()
  productId!: string;

  @Field()
  productName!: string;

  @Field(() => Float)
  price!: number;

  @Field(() => Int)
  quantity!: number;
}
