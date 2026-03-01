import { ObjectType, Field, ID, Float, Directive } from '@nestjs/graphql';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

// External references to Product and Cart from their subgraphs
@ObjectType()
@Directive('@external')
export class ExternalProduct {
  @Field(() => ID)
  id!: string;

  @Field()
  @Directive('@external')
  name!: string;

  @Field(() => Float)
  @Directive('@external')
  price!: number;
}

@ObjectType()
@Directive('@external')
export class ExternalCart {
  @Field(() => ID)
  id!: string;

  @Field()
  @Directive('@external')
  userId!: string;
}

@ObjectType()
export class OrderItem {
  @Field(() => ID)
  id!: string;

  @Field(() => ExternalProduct)
  product!: ExternalProduct;

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

  @Field(() => ExternalCart, { nullable: true })
  cart?: ExternalCart;

  @Field(() => [OrderItem])
  items!: OrderItem[];

  @Field()
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
