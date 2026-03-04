import { ObjectType, Field, ID, Directive } from '@nestjs/graphql';

@ObjectType()
@Directive('@key(fields: "id")')
@Directive('@external')
export class User {
  @Field(() => ID)
  @Directive('@external')
  id!: string;
}
