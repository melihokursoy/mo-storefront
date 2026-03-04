import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class AuthPayload {
  @Field()
  accessToken!: string;

  @Field(() => ID)
  userId!: string;

  @Field()
  email!: string;
}

@ObjectType()
export class LogoutPayload {
  @Field()
  success!: boolean;
}
