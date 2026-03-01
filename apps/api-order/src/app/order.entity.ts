import {
  ObjectType,
  Field,
  ID,
  Float,
  Directive,
  registerEnumType,
} from '@nestjs/graphql';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

registerEnumType(OrderStatus, {
  name: 'OrderStatus',
});

// References to Product and Cart from their subgraphs (nested in OrderItem)
@ObjectType()
export class OrderProduct {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field(() => Float)
  price!: number;
}

@ObjectType()
export class OrderCart {
  @Field(() => ID)
  id!: string;

  @Field()
  userId!: string;
}

@ObjectType()
export class OrderItem {
  @Field(() => ID)
  id!: string;

  @Field(() => OrderProduct)
  product!: OrderProduct;

  @Field()
  quantity!: number;

  @Field(() => Float)
  price!: number;

  @Field(() => Float)
  subtotal!: number;
}

@ObjectType()
@Directive('@key(fields: "id")')
export class Order {
  @Field(() => ID)
  id!: string;

  @Field()
  userId!: string;

  @Field(() => OrderCart, { nullable: true })
  cart?: OrderCart;

  @Field(() => [OrderItem])
  items!: OrderItem[];

  @Field(() => OrderStatus)
  status!: OrderStatus;

  @Field(() => Float)
  totalPrice!: number;

  @Field()
  itemCount!: number;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;
}
