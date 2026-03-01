import { ObjectType, Field, ID, Float, Directive } from '@nestjs/graphql';

// External reference to Product from Product subgraph
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
export class CartItem {
  @Field(() => ID)
  id!: string;

  @Field(() => ExternalProduct)
  product!: ExternalProduct;

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
