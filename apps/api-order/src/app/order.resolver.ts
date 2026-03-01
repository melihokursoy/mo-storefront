import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveReference,
  Context,
} from '@nestjs/graphql';
import { Order, OrderStatus, OrderItem } from './order.entity';
import { OrderService } from './order.service';

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
  async orders(
    @Context() context: ContextWithUserId
  ): Promise<Order[]> {
    // Mock: use userId from context (would come from JWT token in production)
    const userId = context.userId || 'user-1';
    return this.orderService.getUserOrders(userId);
  }

  @Mutation(() => Order)
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
  async updateOrderStatus(
    @Args('orderId') orderId: string,
    @Args('status') status: OrderStatus
  ): Promise<Order | null> {
    return this.orderService.updateOrderStatus(orderId, status);
  }

  @Mutation(() => Order, { nullable: true })
  async cancelOrder(@Args('orderId') orderId: string): Promise<Order | null> {
    return this.orderService.cancelOrder(orderId);
  }

  @ResolveReference()
  resolveReference(reference: { id: string }): Promise<Order | null> {
    return this.orderService.findById(reference.id);
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
