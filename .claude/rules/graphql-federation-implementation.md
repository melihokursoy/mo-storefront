# GraphQL Federation Implementation Patterns

## Pattern: Entity Definition with @key Directive

Every entity that can be referenced from other subgraphs **must** have `@key(fields: "id")` directive.

### Why This Matters

- `@key` tells Apollo which subgraph owns the entity
- Without `@key`, gateway can't resolve cross-subgraph references
- Makes entity referenceable (cart can resolve product, order can resolve user)
- Foundation for federation composition

### ✅ Entity Definition with Federation

```typescript
// apps/api-product/src/app/product.entity.ts
import { ObjectType, Field, ID, Directive, Int, Float } from '@nestjs/graphql';

@ObjectType()
@Directive('@key(fields: "id")') // ✅ Required for federation
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
  createdAt!: string; // ✅ Always ISO string, not Date

  @Field()
  updatedAt!: string;
}
```

**Generated GraphQL Schema**:

```graphql
type Product @key(fields: "id") {
  id: ID!
  name: String!
  description: String!
  price: Float!
  category: String!
  createdAt: String!
  updatedAt: String!
}
```

---

## Pattern: @ResolveReference (Required for Federation)

When an entity is referenced from another subgraph, the owning subgraph must implement `@ResolveReference()`.

### Why This Matters

- Gateway needs a way to fetch full entity when referenced
- Without it, gateway returns "Can't find entity" errors
- Implements the federation contract for entity resolution

### ✅ ResolveReference Pattern

```typescript
// apps/api-product/src/app/product.resolver.ts
@Resolver(() => Product)
export class ProductResolver {
  constructor(private productService: ProductService) {}

  @Query(() => Product, { nullable: true })
  async product(@Args('id') id: string): Promise<Product | null> {
    return this.productService.findById(id);
  }

  // ✅ Required: Resolve entity when referenced from other subgraphs
  @ResolveReference()
  async resolveReference(reference: { id: string }): Promise<Product | null> {
    // Gateway calls this with just the @key field (id)
    // Return full entity
    return this.productService.findById(reference.id);
  }
}
```

**How it works**:

1. Order subgraph queries: "Resolve product with id=123"
2. Gateway calls product subgraph: `resolveReference({ id: '123' })`
3. Product resolver returns full `Product` object
4. Gateway attaches it to order response

---

## Pattern: Entity References from Other Subgraphs (@external, @requires)

When referencing an entity from another subgraph, use `@external` and `@requires` directives.

### Why This Matters

- `@external` tells gateway: "This field is defined elsewhere"
- `@requires` tells gateway: "Need these fields to resolve this field"
- Prevents duplication of entity definitions
- Enables cross-subgraph queries

### ❌ What NOT to Do (Entity Duplication)

```typescript
// ❌ Don't define Product in order subgraph
// apps/api-order/src/app/product.entity.ts (WRONG)
@ObjectType()
@Directive('@key(fields: "id")')
export class Product {
  // Duplicates api-product definition!
  // Now two subgraphs claim to own Product
}

// ❌ This breaks federation
```

### ✅ What TO Do (Reference Product from Another Subgraph)

```typescript
// apps/api-order/src/app/product.entity.ts
import { ObjectType, Field, ID, Directive } from '@nestjs/graphql';

// Reference Product from api-product subgraph
@ObjectType()
@Directive('@key(fields: "id")')
@Directive('@external') // ✅ This field is defined elsewhere (api-product)
export class Product {
  @Field(() => ID)
  @Directive('@external')
  id!: string;

  @Field({ nullable: true })
  @Directive('@external')
  name?: string;

  @Field({ nullable: true })
  @Directive('@external')
  price?: number;
}

// Now define Order which references Product
@ObjectType()
@Directive('@key(fields: "id")')
export class Order {
  @Field(() => ID)
  id!: string;

  @Field()
  customerId!: string;

  @Field(() => ID)
  @Directive('@requires(fields: "productId")') // ✅ Need productId to resolve product
  productId!: string;

  @Field(() => Product)
  @Directive('@requires(fields: "productId")')
  product?: Product; // Resolved from api-product via federation

  @Field()
  quantity!: number;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;
}
```

**Generated GraphQL**:

```graphql
type Order @key(fields: "id") {
  id: ID!
  customerId: String!
  productId: ID! @requires(fields: "productId")
  product: Product @requires(fields: "productId")
  quantity: Int!
  createdAt: String!
  updatedAt: String!
}

type Product @key(fields: "id") @external {
  id: ID! @external
  name: String @external
  price: Float @external
}
```

---

## Pattern: Resolve Field References

Use field resolvers to populate referenced entities. Often combined with DataLoader to prevent N+1 queries.

### ✅ Field Resolver with DataLoader

```typescript
// apps/api-order/src/app/order.resolver.ts
import DataLoader from 'dataloader';

@Injectable()
export class ProductDataLoader {
  private loader: DataLoader<string, Product | null>;

  constructor(private productService: ProductService) {
    this.loader = new DataLoader(async (productIds) => {
      const products = await this.productService.getByIds(productIds);
      const productMap = new Map(products.map((p) => [p.id, p]));

      // Return in same order as input ← CRITICAL for DataLoader
      return productIds.map((id) => productMap.get(id) || null);
    });
  }

  async loadProduct(productId: string): Promise<Product | null> {
    return this.loader.load(productId);
  }
}

@Resolver(() => Order)
export class OrderResolver {
  constructor(
    private orderService: OrderService,
    private productLoader: ProductDataLoader
  ) {}

  @ResolveField(() => Product, { nullable: true })
  async product(@Parent() order: Order): Promise<Product | null> {
    // DataLoader batches multiple loadProduct calls into single DB query
    return this.productLoader.loadProduct(order.productId);
  }
}
```

### Without DataLoader (N+1 Problem)

```typescript
// ❌ N+1 Query Problem
@ResolveField(() => Product, { nullable: true })
async product(@Parent() order: Order): Promise<Product | null> {
  // This runs ONCE PER ORDER in the list
  // 1 order query + N product queries = N+1 problem!
  return this.productService.getById(order.productId);
}
```

### With DataLoader (Batched)

```typescript
// ✅ Single batched query
@ResolveField(() => Product, { nullable: true })
async product(@Parent() order: Order): Promise<Product | null> {
  // DataLoader batches all calls within this tick
  // 1 order query + 1 batched product query
  return this.productLoader.loadProduct(order.productId);
}
```

---

## Pattern: Cross-Subgraph Query (Full Example)

A single query that fetches data from multiple subgraphs (handled by gateway).

### Example Query

```graphql
query {
  orders {
    id
    customerId
    quantity
    product {
      # Resolved by api-order
      id
      name
      price # Fetched from api-product via federation
      category
    }
    createdAt
  }
}
```

### Execution Flow

1. **Gateway** receives query
2. **api-order subgraph** executes: `{ orders { id customerId quantity productId createdAt } }`
3. **api-order resolver** returns orders (without product details)
4. **Gateway** detects `product` field is from different subgraph
5. **api-product subgraph** executes: `{ _entities(representations: [{ __typename: "Product", id: "..." }]) { id name price category } }`
6. **api-product resolver** implements `@ResolveReference` to fetch products
7. **Gateway** combines results and returns full response

### Key Patterns

- Gateway is **transparent** — queries feel like single endpoint
- Subgraph only knows its own entities
- Federation directives enable cross-subgraph references
- DataLoader prevents N+1 in resolved fields

---

## Pattern: Gateway Composition

The Apollo Gateway discovers and composes subgraphs.

### ✅ Gateway Configuration

```typescript
// apps/api-gateway/src/app/app.module.ts
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { IntrospectAndCompose } from '@apollo/gateway';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      gateway: {
        supergraphSdl: new IntrospectAndCompose({
          subgraphs: [
            { name: 'products', url: 'http://localhost:3301/graphql' },
            { name: 'carts', url: 'http://localhost:3302/graphql' },
            { name: 'orders', url: 'http://localhost:3303/graphql' },
            { name: 'auth', url: 'http://localhost:3304/graphql' },
            { name: 'users', url: 'http://localhost:3305/graphql' },
          ],
        }),
      },
      context: ({ req, res }: { req: any; res: any }) => ({
        req,
        res,
        token: req.headers.authorization?.replace('Bearer ', ''),
      }),
    }),
  ],
})
export class AppModule {}
```

### Key Points

- **IntrospectAndCompose**: Automatic schema composition by introspecting subgraphs
- **subgraphs array**: List of all subgraph URLs
- **context**: Flows through gateway to subgraphs
- **Authorization header forwarding**: See next pattern

---

## Pattern: Authorization Header Forwarding

Gateway must forward Authorization headers to subgraphs so they can validate JWT.

### Why This Matters

- Subgraphs validate JWT independently
- Without header forwarding, subgraphs receive `undefined` token
- Each subgraph protects itself

### ✅ Authorization Header Forwarding

```typescript
// apps/api-gateway/src/app/authenticated-datasource.ts
import { RemoteGraphQLDataSource } from '@apollo/gateway';

export class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  async willSendRequest({ request, context }: any) {
    if (context?.req?.headers?.authorization) {
      // Forward Authorization header to subgraph
      request.http.headers.set('authorization', context.req.headers.authorization);
    }

    if (context?.req?.headers?.cookie) {
      // Forward cookies (for refresh tokens in HTTP-only cookies)
      request.http.headers.set('cookie', context.req.headers.cookie);
    }
  }
}

// Use in gateway module
gateway: {
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'products', url: 'http://localhost:3301/graphql' },
      // ...
    ],
  }),
  buildService: ({ url }) => new AuthenticatedDataSource({ url }),
}
```

---

## Pattern: Testing Cross-Subgraph Queries

E2E tests should verify federation works by querying across subgraphs.

### ✅ Federation E2E Test Example

```typescript
// apps/api-gateway-e2e/src/tests/federation.spec.ts
describe('Federation Integration', () => {
  it('should resolve product reference in order query', async () => {
    const query = `
      query {
        orders {
          id
          product {
            id
            name
            price
          }
        }
      }
    `;

    const result = await gql(query);

    expect(result.errors).toBeUndefined();
    expect(result.data?.orders).toBeDefined();

    // Verify product details are resolved from product subgraph
    const order = result.data?.orders[0];
    expect(order?.product?.id).toBeDefined();
    expect(order?.product?.name).toBeDefined();
    expect(order?.product?.price).toBeDefined();
  });

  it('should forward auth token through federation', async () => {
    const token = makeToken('user-123');

    const query = `
      query {
        me {
          id
          name
          role
        }
      }
    `;

    const result = await gql(query, {}, token);

    expect(result.errors).toBeUndefined();
    expect(result.data?.me?.id).toBe('user-123');
  });
});
```

---

## Common Pitfalls

1. **Forgetting `@Directive('@key(fields: "id")')`** — Entity won't be referenceable from other subgraphs
2. **Not implementing `@ResolveReference()`** — Gateway returns "Can't resolve entity" errors
3. **Duplicating entity definitions** — Two subgraphs claiming to own same entity breaks composition
4. **Missing `@requires` directive** — Gateway doesn't know what fields needed for resolution
5. **Not using DataLoader** — N+1 queries in resolved fields
6. **Hardcoding subgraph URLs** — Use environment variables for flexibility
7. **Forgetting to forward Authorization header** — Subgraphs don't receive JWT token
8. **Testing in isolation** — Federation only works when all subgraphs are running
9. **Returning full entities from non-owning subgraph** — Only owning subgraph should return full entity details
10. **Dates as Date objects instead of ISO strings** — Gateway can't serialize Date objects to GraphQL schema

---

## References

- CLAUDE.md → "Upcoming: Federated GraphQL API"
- `.claude/rules/nestjs-graphql-patterns.md` — Resolver patterns
- `.claude/rules/graphql-api.md` — JWT authentication patterns
- Apollo Federation docs: https://www.apollographql.com/docs/federation
- Apollo Gateway docs: https://www.apollographql.com/docs/apollo-server/using-federation/apollo-gateway
