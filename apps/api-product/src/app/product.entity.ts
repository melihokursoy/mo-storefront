import { ObjectType, Field, ID, Float, Directive } from '@nestjs/graphql';

@ObjectType()
@Directive('@key(fields: "id")')
export class Product {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  description!: string;

  @Field(() => Float)
  price!: number;

  @Field()
  category!: string;

  @Field()
  sku!: string;

  @Field(() => Float)
  rating!: number;

  @Field()
  inStock!: boolean;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field(() => String, { nullable: true })
  imageUrl?: string;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;
}
