import { ObjectType, Field, ID, Float, Directive } from '@nestjs/graphql';

// Reference to Product from Product subgraph (nested in CartItem)
@ObjectType()
export class CartProduct {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field(() => Float)
  price!: number;
}

@ObjectType()
export class CartItem {
  @Field(() => ID)
  id!: string;

  @Field(() => CartProduct)
  product!: CartProduct;

  @Field()
  quantity!: number;

  @Field(() => Float)
  subtotal!: number;
}

@ObjectType()
@Directive('@key(fields: "id")')
export class Cart {
  @Field(() => ID)
  id!: string;

  @Field()
  userId!: string;

  @Field(() => [CartItem])
  items!: CartItem[];

  @Field(() => Float)
  totalPrice!: number;

  @Field()
  itemCount!: number;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;
}
