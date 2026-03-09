import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveReference,
  Context,
  InputType,
  Field,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User } from './user.entity';
import { UserService } from './user.service';
import { JwtAuthGuard } from './auth/jwt.guard';

interface ContextWithUser {
  userId?: string;
  user?: { sub: string; userId: string; role?: string };
}

@InputType()
export class UpdateProfileInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  email?: string;
}

@Resolver(() => User)
export class UserResolver {
  constructor(private userService: UserService) {}

  @Query(() => User, { nullable: true })
  @UseGuards(JwtAuthGuard)
  async me(@Context() context: ContextWithUser): Promise<User | null> {
    const userId = context.userId || context.user?.userId;
    if (!userId) return null;
    return this.userService.findById(userId);
  }

  @Mutation(() => User)
  async createUser(
    @Args('name') name: string,
    @Args('email') email: string,
    @Args('role', { nullable: true }) role?: string
  ): Promise<User> {
    return this.userService.create(name, email, role);
  }

  @Mutation(() => User)
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Args('input') input: UpdateProfileInput,
    @Context() context: ContextWithUser
  ): Promise<User> {
    const userId = context.userId || context.user?.userId;
    if (!userId) throw new Error('Unauthorized');

    return this.userService.update(userId, {
      name: input.name,
      email: input.email,
    });
  }

  @Mutation(() => User)
  @UseGuards(JwtAuthGuard)
  async updateUserRole(
    @Args('userId') userId: string,
    @Args('newRole') newRole: string,
    @Context() context: ContextWithUser
  ): Promise<User> {
    const requestingUserId = context.userId || context.user?.userId;
    const requestingUserRole = context.user?.role || 'user';

    if (!requestingUserId) throw new Error('Unauthorized');

    return this.userService.updateRole(
      userId,
      newRole,
      requestingUserId,
      requestingUserRole
    );
  }

  @ResolveReference()
  async resolveReference(reference: { id: string }): Promise<User | null> {
    return this.userService.findById(reference.id);
  }
}
