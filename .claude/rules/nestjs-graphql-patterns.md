# NestJS GraphQL Patterns (Apollo Federation v2)

## Pattern: GraphQL Module Setup with JWT

Every NestJS service needs Apollo Federation driver + JWT authentication configured in `app.module.ts`.

### Why This Matters

- Consistent JWT validation across all subgraphs
- Authorization context flows from HTTP headers to resolvers
- Services can enforce authentication independently
- Token claims available to resolvers for authorization decisions

### ✅ Module Configuration

```typescript
// apps/api-*/src/app/app.module.ts
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2, // Apollo Federation v2
        path: join(process.cwd(), 'src/schema.gql'),
      },
      context: ({ req, res }: { req: any; res: any }) => {
        // Extract JWT token from Authorization header
        const token = req.headers.authorization?.replace('Bearer ', '');
        return { req, res, token }; // Available to all resolvers via @Context()
      },
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: '15m' }, // Access token: 15 min
    }),
    PrismaModule,
    // ... feature modules
  ],
  providers: [
    // ... services and resolvers
  ],
})
export class AppModule {}
```

### Key Decisions

- **Token location**: Authorization header (`Bearer <token>`)
- **Context object**: `{ req, res, token, userId?, user? }` set by guards
- **Expiry**: Access tokens 15 minutes, refresh tokens 7 days (HTTP-only cookie)

---

## Pattern: JWT Authentication Guard

Use custom `CanActivate` implementation (not Passport) for GraphQL resolvers. Passport's `req.logIn()` pattern doesn't work with GraphQL context.

### ❌ What NOT to Do

```typescript
// ❌ Don't use Passport for GraphQL
import { AuthGuard } from '@nestjs/passport';

@Resolver()
export class OrderResolver {
  @Query()
  @UseGuards(AuthGuard('jwt')) // ❌ Expects Express req.logIn() — won't work with GraphQL
  orders(@Req() req: any) {
    // req.user is undefined in GraphQL context
  }
}
```

### ✅ What To Do Instead

```typescript
// apps/api-*/src/app/auth/jwt.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    // Get GraphQL context (3rd argument in resolver)
    const gqlContext = context.getArgByIndex(2);

    if (!gqlContext.token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      // Verify and decode token
      const decoded = this.jwtService.verify(gqlContext.token);

      // Set on context for resolver access
      gqlContext.userId = decoded.userId || decoded.sub;
      gqlContext.user = decoded;  // Full JWT payload

      return true;
    } catch (error) {
      throw new UnauthorizedException(`Invalid token: ${error.message}`);
    }
  }
}

// Custom decorator for type-safe context access
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

@createParamDecorator((data: unknown, context: ExecutionContext) => {
  const gqlContext = context.getArgByIndex(2);
  return gqlContext.userId;
})
export class CurrentUser() {}

@createParamDecorator((data: unknown, context: ExecutionContext) => {
  const gqlContext = context.getArgByIndex(2);
  return gqlContext.user;
})
export class CurrentUserPayload() {}
```

### JWT Payload Structure

```typescript
interface JwtPayload {
  sub: string; // Standard JWT subject (user ID)
  userId: string; // Explicit user ID claim
  email?: string;
  role?: string; // 'user', 'admin'
  iat?: number; // Issued at (Unix timestamp)
  exp?: number; // Expiration (Unix timestamp)
}
```

### Using the Guard in Resolvers

```typescript
@Resolver(() => Order)
export class OrderResolver {
  @Query(() => [Order])
  @UseGuards(JwtAuthGuard) // ✅ Validates token, sets context.userId
  orders(@CurrentUser() userId: string) {
    return this.orderService.getOrdersByUserId(userId);
  }

  @Mutation(() => Order)
  @UseGuards(JwtAuthGuard)
  createOrder(
    @CurrentUserPayload() user: JwtPayload,
    @Args('input') input: CreateOrderInput
  ) {
    if (user.role !== 'user') throw new Error('Unauthorized');
    return this.orderService.create(user.userId, input);
  }
}
```

---

## Pattern: GraphQL Resolvers (Query, Mutation, Field)

### Query Resolver Pattern

```typescript
@Resolver(() => Product)
export class ProductResolver {
  constructor(private productService: ProductService) {}

  // List query with pagination and optional filters
  @Query(() => [Product])
  async products(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
    @Args('category', { nullable: true }) category?: string // Optional filter
  ): Promise<Product[]> {
    return this.productService.findAll({ limit, offset, category });
  }

  // Single item query
  @Query(() => Product, { nullable: true }) // null if not found
  async product(@Args('id') id: string): Promise<Product | null> {
    return this.productService.findById(id);
  }
}
```

### Mutation Resolver Pattern

```typescript
@Resolver(() => Order)
export class OrderResolver {
  @Mutation(() => Order)
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @CurrentUser() userId: string,
    @Args('input') input: CreateOrderInput
  ): Promise<Order> {
    return this.orderService.create(userId, input);
  }
}
```

### Federation: ResolveReference Pattern

**Required** for entities referenced from other subgraphs.

```typescript
@Resolver(() => Product)
export class ProductResolver {
  // ✅ Must implement this to support federation
  @ResolveReference()
  async resolveReference(reference: { id: string }): Promise<Product | null> {
    return this.productService.findById(reference.id);
  }
}
```

### Field Resolver Pattern (resolve nested relationships)

```typescript
@Resolver(() => Order)
export class OrderResolver {
  constructor(
    private orderService: OrderService,
    private productLoader: ProductDataLoader
  ) {}

  @ResolveField(() => Product)
  async product(@Parent() order: Order): Promise<Product | null> {
    // Use DataLoader to prevent N+1 queries
    return this.productLoader.loadProduct(order.productId);
  }
}
```

---

## Pattern: Arguments with Default Values

```typescript
@Query(() => [Product])
async products(
  @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
  @Args('category', { nullable: true }) category?: string,  // Optional
) {
  // Resolver implementation
}
```

**Generated GraphQL**:

```graphql
type Query {
  products(limit: Int = 10, offset: Int = 0, category: String): [Product!]!
}
```

---

## Pattern: Input Types for Mutations

```typescript
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateOrderInput {
  @Field()
  customerId: string;

  @Field()
  productId: string;

  @Field(() => Int)
  quantity: number;

  @Field({ nullable: true })
  notes?: string;
}

@Resolver(() => Order)
export class OrderResolver {
  @Mutation(() => Order)
  async createOrder(@Args('input') input: CreateOrderInput): Promise<Order> {
    return this.orderService.create(input);
  }
}
```

---

## Common Pitfalls

1. **Using Passport `AuthGuard` for GraphQL** — Express `req.logIn()` pattern doesn't work. Use custom `CanActivate` instead.
2. **Forgetting `@ResolveReference()`** — Other subgraphs can't reference your entities without it.
3. **Returning Date objects instead of ISO strings** — Always convert dates: `createdAt.toISOString()`
4. **Not providing default values for args** — GraphQL expects explicit defaults: `{ type: () => Int, defaultValue: 10 }`
5. **Setting `nullable: false` (default) on optional fields** — Use `{ nullable: true }` for optional args and fields
6. **Not extracting JWT token from Authorization header** — Token should be parsed in `app.module.ts` context and set on `gqlContext`
7. **Using `@Req()` directly in resolvers** — Use custom `@CurrentUser()` and `@CurrentUserPayload()` decorators instead

---

## References

- CLAUDE.md → "Upcoming: Federated GraphQL API"
- `.claude/rules/graphql-api.md` — Federation directives, entity references
- `.claude/rules/graphql-federation-implementation.md` — @key, @external, @requires patterns
- NestJS GraphQL docs: https://docs.nestjs.com/graphql/quick-start
- Apollo Federation docs: https://www.apollographql.com/docs/federation
