---
description: Setup and development guide for GraphQL API features
argument-hint: Feature name or subgraph (api-product, api-cart, api-order, api-gateway)
allowed-tools: Read, Write, Glob, Bash
---

# GraphQL API Developer Command

You are helping a developer work on the Federated GraphQL API. This command provides guidance, checklists, and quick reference for Apollo Federation v2 development with NestJS subgraphs.

**Context**: This project uses Apollo Federation v2 with independent NestJS subgraphs (api-product, api-cart, api-order) and an Apollo Gateway (api-gateway).

User input: $ARGUMENTS

---

## Pre-Flight Checklist

Before starting GraphQL API work, ensure you have:

- [ ] Read `.claude/rules/graphql-api.md` — Critical patterns for federation
- [ ] Identified which subgraph(s) you're working in
- [ ] Understood the entity ownership model (which service owns which entity)
- [ ] Verified port assignments (gateway: 3300, product: 3301, cart: 3302, order: 3303)

---

## Quick Reference: Common Tasks

### Task: Add a New Entity to a Subgraph

**Example**: Add `Product` entity to `api-product`

```bash
# 1. Create the entity
apps/api-product/src/app/product.entity.ts

# 2. Add @Directive('@key(fields: "id")')
# 3. Create resolver
apps/api-product/src/app/product.resolver.ts

# 4. Export from schema
apps/api-product/src/main.ts

# 5. Register in module
apps/api-product/src/app/app.module.ts

# 6. Test the subgraph
PORT=3301 npx nx serve api-product
```

### Task: Reference Entity From Another Subgraph

**Example**: Order subgraph needs to reference Product from product subgraph

```typescript
// In api-order/src/app/order.entity.ts

@ObjectType()
@Directive('@key(fields: "id")')
export class Order {
  @Field()
  id: string;

  @Field()
  @Directive('@requires(fields: "productId")')
  productId: string;

  // Reference the Product entity
  @Field(() => Product)
  @Directive('@external')
  product?: Product;
}

// In resolver:
@ResolveField(() => Product)
async product(@Parent() order: Order) {
  // Return stub — gateway resolves full entity
  return { id: order.productId };
}
```

**Critical**: See `.claude/rules/graphql-api.md` → "Entity References with @requires and @external"

### Task: Prevent N+1 Queries with DataLoader

**Example**: Batch-load products for multiple orders

```typescript
// Avoid this (N+1 problem):
@ResolveField(() => [Product])
async products(@Parent() cart: Cart) {
  return this.productService.getByIds(cart.productIds); // Separate query per cart!
}

// Do this instead (use DataLoader):
@ResolveField(() => [Product])
async products(@Parent() cart: Cart) {
  return this.productLoader.loadMany(cart.productIds);
}
```

**Critical**: See `.claude/rules/graphql-api.md` → "DataLoader for Batch Loading"

### Task: Add JWT Authentication to a Subgraph

**Pattern**: Each subgraph validates JWT independently

```typescript
// 1. Configure JWT in main.ts
const jwtOptions = {
  secret: process.env.JWT_SECRET,
  expiresIn: '7d',
};

// 2. Protect resolvers with @UseGuards(JwtAuthGuard)
@Query(() => [Order])
@UseGuards(JwtAuthGuard)
orders(@CurrentUser() user: JwtPayload) {
  return this.orderService.getOrdersByCustomerId(user.customerId);
}
```

**Critical**: See `.claude/rules/graphql-api.md` → "JWT Authentication Across Subgraphs"

### Task: Run All Subgraphs for Testing

```bash
# Terminal 1: Gateway (3300)
PORT=3300 npx nx serve api-gateway

# Terminal 2: Product (3301)
PORT=3301 npx nx serve api-product

# Terminal 3: Cart (3302)
PORT=3302 npx nx serve api-cart

# Terminal 4: Order (3303)
PORT=3303 npx nx serve api-order

# Test gateway endpoint:
curl -s -X POST http://localhost:3300/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

### Task: Write E2E Tests for Federated Queries

**Pattern**: Test entity references and federation across subgraphs

```typescript
// apps/api-gateway-e2e/src/federation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Apollo Federation Integration', () => {
  const gatewayURL = 'http://localhost:3300/graphql';

  async function query(gql: string, variables?: Record<string, any>) {
    const response = await fetch(gatewayURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.JWT_TOKEN}`,
      },
      body: JSON.stringify({ query: gql, variables }),
    });
    return response.json();
  }

  test('should resolve product entity from product subgraph', async () => {
    const result = await query(`
      query {
        products {
          id
          name
          price
        }
      }
    `);

    expect(result.data.products).toBeDefined();
    expect(result.data.products.length).toBeGreaterThan(0);
    expect(result.data.products[0]).toHaveProperty('id');
    expect(result.data.products[0]).toHaveProperty('price');
  });

  test('should resolve nested product in cart via federation', async () => {
    const result = await query(`
      query {
        carts {
          id
          items {
            productId
            quantity
            product {
              id
              name
              price
            }
          }
        }
      }
    `);

    expect(result.data.carts).toBeDefined();
    expect(result.data.carts[0].items[0].product).toHaveProperty('id');
    expect(result.data.carts[0].items[0].product).toHaveProperty('price');
  });

  test('should batch-load products efficiently (DataLoader)', async () => {
    // This query should make ONE batched product query, not N queries
    const result = await query(`
      query {
        carts {
          id
          items {
            product { id name }
          }
        }
      }
    `);

    // Verify no N+1 errors in logs
    expect(result.errors).toBeUndefined();
  });

  test('should resolve order with product and cart references', async () => {
    const result = await query(`
      query {
        orders {
          id
          customerId
          cart {
            id
            items {
              productId
              product { id name price }
            }
          }
        }
      }
    `);

    expect(result.data.orders).toBeDefined();
    expect(result.data.orders[0].cart).toBeDefined();
    expect(result.data.orders[0].cart.items[0].product).toBeDefined();
  });

  test('should require JWT authentication', async () => {
    // Query without token
    const response = await fetch(gatewayURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: '{ orders { id } }',
      }),
    });

    const result = await response.json();
    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toContain('Unauthorized');
  });

  test('should handle mutation across subgraphs', async () => {
    const result = await query(
      `
      mutation AddToCart($cartId: String!, $productId: String!, $qty: Int!) {
        addToCart(cartId: $cartId, productId: $productId, quantity: $qty) {
          id
          items {
            product { id name }
            quantity
          }
        }
      }
    `,
      {
        cartId: 'cart-1',
        productId: 'prod-1',
        qty: 2,
      }
    );

    expect(result.data.addToCart).toBeDefined();
    expect(result.data.addToCart.items).toBeDefined();
  });
});
```

### Task: Test Schema Composition

**Pattern**: Verify federation directives and schema merging

```typescript
// apps/api-gateway-e2e/src/schema-composition.spec.ts
test('should compose schemas from all subgraphs', async () => {
  const response = await fetch('http://localhost:3300/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query {
          __schema {
            types {
              name
            }
          }
        }
      `,
    }),
  });

  const result = await response.json();
  const typeNames = result.data.__schema.types.map((t) => t.name);

  // Verify entities exist in composed schema
  expect(typeNames).toContain('Product');
  expect(typeNames).toContain('Cart');
  expect(typeNames).toContain('Order');
  expect(typeNames).toContain('Query');
});

test('should expose all query fields from subgraphs', async () => {
  const response = await fetch('http://localhost:3300/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query {
          __type(name: "Query") {
            fields {
              name
              type { name }
            }
          }
        }
      `,
    }),
  });

  const result = await response.json();
  const fieldNames = result.data.__type.fields.map((f) => f.name);

  // Verify queries from all subgraphs
  expect(fieldNames).toContain('products'); // from api-product
  expect(fieldNames).toContain('carts'); // from api-cart
  expect(fieldNames).toContain('orders'); // from api-order
});
```

---

## Advanced Patterns

### Pattern: Entity Reference Resolver (Field Resolution)

When another subgraph needs to resolve a reference to your entity:

```typescript
// api-product/src/app/product.entity.ts (Owns Product)
@ObjectType()
@Directive('@key(fields: "id")')
export class Product {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  price: number;
}

// api-product/src/app/product.resolver.ts
@Resolver(() => Product)
export class ProductResolver {
  constructor(private productService: ProductService) {}

  // Gateway calls this to resolve the @key for referenced entities
  @ResolveReference()
  async resolveProductReference(reference: { id: string }) {
    return this.productService.getById(reference.id);
  }

  @Query(() => [Product])
  async products() {
    return this.productService.getAll();
  }
}
```

### Pattern: Mutations Across Subgraphs

**Example**: Order service creates order, which updates cart in cart service

```typescript
// api-order/src/app/order.resolver.ts
@Resolver(() => Order)
export class OrderResolver {
  constructor(
    private orderService: OrderService,
    private cartClient: GraphQLClient // HTTP client to cart service
  ) {}

  @Mutation(() => Order)
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @Args('cartId') cartId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<Order> {
    // 1. Create order in order service
    const order = await this.orderService.create({
      customerId: user.customerId,
      cartId,
    });

    // 2. Call cart service mutation to mark cart as checked out
    await this.cartClient.request(
      gql`
        mutation CheckoutCart($cartId: String!) {
          checkoutCart(cartId: $cartId) {
            id
          }
        }
      `,
      { cartId }
    );

    return order;
  }
}
```

### Pattern: Extend Entities from Other Subgraphs

Add fields to an entity from a different subgraph:

```typescript
// api-cart/src/app/cart-item.entity.ts (Cart owns CartItem)
@ObjectType()
export class CartItem {
  @Field()
  id: string;

  @Field()
  cartId: string;

  @Field()
  productId: string;

  @Field()
  quantity: number;
}

// api-product/src/app/product.entity.ts (Product owns Product)
@ObjectType()
@Directive('@key(fields: "id")')
export class Product {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  price: number;

  // Add cartItems field to Product (references from cart service)
  @Field(() => [CartItem], { nullable: true })
  @Directive('@external') // CartItem owned by cart service
  cartItems?: CartItem[];
}
```

### Pattern: Complex Entity References

Entity with multiple foreign keys:

```typescript
// api-order/src/app/order.entity.ts
@ObjectType()
@Directive('@key(fields: "id")')
export class Order {
  @Field()
  id: string;

  @Field()
  customerId: string;

  @Field()
  cartId: string;

  // Reference to Cart
  @Field(() => Cart)
  @Directive('@external')
  cart?: Cart;

  // Reference to Products (through CartItems)
  @Field(() => [Product])
  @Directive('@external')
  products?: Product[];
}

@Resolver(() => Order)
export class OrderResolver {
  constructor(
    private orderService: OrderService,
    private productLoader: DataLoader<string, Product>
  ) {}

  @ResolveField(() => Cart)
  async cart(@Parent() order: Order) {
    // Return stub — gateway resolves full cart
    return { id: order.cartId };
  }

  @ResolveField(() => [Product])
  async products(@Parent() order: Order) {
    // Batch-load all products for this order
    const cart = await this.orderService.getCartForOrder(order.id);
    const productIds = cart.items.map((item) => item.productId);
    return this.productLoader.loadMany(productIds);
  }
}
```

---

## Testing Patterns

### Unit Test: Resolver with DataLoader

```typescript
// api-cart/src/app/cart.resolver.spec.ts
import { Test } from '@nestjs/testing';
import { CartResolver } from './cart.resolver';
import { CartService } from './cart.service';
import DataLoader from 'dataloader';

describe('CartResolver', () => {
  let resolver: CartResolver;
  let service: CartService;
  let productLoader: DataLoader<string, Product>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CartResolver, CartService],
    }).compile();

    resolver = module.get(CartResolver);
    service = module.get(CartService);
    productLoader = new DataLoader(async (ids) => {
      const products = await service.getProductsByIds(ids);
      return ids.map((id) => products.find((p) => p.id === id));
    });
  });

  it('should resolve cart with batch-loaded products', async () => {
    const cart = { id: '1', productIds: ['p1', 'p2', 'p3'] };

    jest.spyOn(service, 'getProductsByIds').mockResolvedValue([
      { id: 'p1', name: 'Product 1', price: 10 },
      { id: 'p2', name: 'Product 2', price: 20 },
      { id: 'p3', name: 'Product 3', price: 30 },
    ]);

    const products = await resolver.products(cart);

    // Verify batch query called once, not 3 times
    expect(service.getProductsByIds).toHaveBeenCalledTimes(1);
    expect(service.getProductsByIds).toHaveBeenCalledWith(['p1', 'p2', 'p3']);
    expect(products).toHaveLength(3);
  });

  it('should resolve entity reference with @ResolveReference', async () => {
    jest
      .spyOn(service, 'getById')
      .mockResolvedValue({ id: '1', name: 'Cart 1' });

    const cart = await resolver.resolveCartReference({ id: '1' });

    expect(cart.id).toBe('1');
    expect(service.getById).toHaveBeenCalledWith('1');
  });

  it('should handle @requires field resolution', async () => {
    const cart = { id: 'c1', customerId: 'cust-1' };

    jest.spyOn(service, 'getCustomerName').mockResolvedValue('John Doe');

    const name = await resolver.customerName(cart);

    expect(name).toBe('John Doe');
  });
});
```

### Integration Test: Schema Composition

```typescript
// tests/graphql-api/schema-composition.test.ts
import { buildSubgraphSchema } from '@apollo/subgraph';

describe('GraphQL Schema Composition', () => {
  it('should have valid federation directives', async () => {
    const productSchema = buildSubgraphSchema([
      {
        typeDefs: gql`
          type Product @key(fields: "id") {
            id: ID!
            name: String!
            price: Float!
          }
        `,
      },
    ]);

    const types = productSchema.getTypeMap();
    expect(types['Product']).toBeDefined();
  });

  it('should support @requires directive', () => {
    const orderSchema = buildSubgraphSchema([
      {
        typeDefs: gql`
          extend type Order @key(fields: "id") {
            id: ID! @external
            customerId: String! @requires(fields: "id")
            customer: Customer
          }
        `,
      },
    ]);

    // Schema should be valid
    expect(orderSchema).toBeDefined();
  });

  it('should support @external directive for references', () => {
    const cartSchema = buildSubgraphSchema([
      {
        typeDefs: gql`
          type Product @external @key(fields: "id") {
            id: ID!
          }

          type Cart {
            id: ID!
            product: Product
          }
        `,
      },
    ]);

    expect(cartSchema).toBeDefined();
  });
});
```

---

## Common Errors & Solutions

| Error                 | Cause                              | Solution                                |
| --------------------- | ---------------------------------- | --------------------------------------- |
| `Can't find type`     | Entity not in `@key`               | Add `@Directive('@key(fields: "id")')`  |
| `Can't resolve field` | Missing `@external`                | Mark referenced entity with `@external` |
| `Query X not found`   | Subgraph not registered in gateway | Check gateway `supergraphUrl` config    |
| `N+1 query problem`   | No DataLoader                      | Use DataLoader for batch queries        |
| `Unauthorized`        | Missing JWT validation             | Add `@UseGuards(JwtAuthGuard)`          |
| `Port already in use` | Multiple services on same port     | Use `PORT=<port>` env var               |
| `Circular reference`  | Entities reference each other      | Use `@external` and stubs               |

---

## Gateway Configuration Reference

```typescript
// apps/api-gateway/src/main.ts
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      gateway: new ApolloGateway({
        supergraphSdl: new IntrospectAndCompose({
          subgraphs: [
            { name: 'product', url: 'http://localhost:3301/graphql' },
            { name: 'cart', url: 'http://localhost:3302/graphql' },
            { name: 'order', url: 'http://localhost:3303/graphql' },
          ],
          pollIntervalInMs: 10000, // Check for schema changes
        }),
      }),
    }),
  ],
})
export class AppModule {}
```

---

## Performance Optimization

### Cache Control Directives

```typescript
@ObjectType()
export class Product {
  @Field()
  @CacheControl({ maxAge: 3600 }) // Cache for 1 hour
  id: string;

  @Field()
  @CacheControl({ maxAge: 60 })
  price: number; // Cache price separately (changes more often)
}
```

### Request Batching

Clients should batch requests to gateway:

```typescript
// Client side: Use batch requests
const results = await Promise.all([
  client.query({ query: PRODUCTS_QUERY }),
  client.query({ query: CARTS_QUERY }),
  client.query({ query: ORDERS_QUERY }),
]);
```

---

## Schema Validation Checklist

Before deploying a subgraph:

- [ ] All entities have `@key(fields: "id")`
- [ ] All referenced entities have `@external`
- [ ] All field resolutions use DataLoader for batching
- [ ] All protected queries/mutations have `@UseGuards(JwtAuthGuard)`
- [ ] Resolver has `@ResolveReference()` method
- [ ] No N+1 queries in tests
- [ ] Schema composes correctly with gateway
- [ ] All types have proper descriptions/documentation
- [ ] Mutations return properly typed responses

---

## Key Principles

✅ **DO**:

- Use `@Directive('@key(fields: "id")')` for owned entities
- Use `@Directive('@external')` for referenced entities
- Use `@Directive('@requires(fields: "...")')` for field resolution
- Batch queries with DataLoader to prevent N+1 problems
- Validate JWT in every subgraph independently
- Return entity stubs from resolvers (gateway resolves full entity)
- Keep each subgraph's database independent

❌ **DON'T**:

- Duplicate entity definitions across subgraphs
- Query other subgraphs' entities without @external/@requires
- Forget to return results in DataLoader in same order as input
- Trust gateway authentication alone (validate in each service)
- Share databases between subgraphs
- Skip type checking or formatting (they're automatic via pre-commit)

---

## Debugging Tips

**Port already in use**:

```bash
lsof -i :3300  # Check what's on port 3300
pkill -f "api-gateway"  # Kill process using port
```

**Can't find entity in federated query**:

- Check that entity has `@Directive('@key(fields: "id")')`
- Check that resolver returns an object with at least `id` field
- Verify entity is exported from main.ts
- Check gateway has correct subgraph URL

**N+1 query problems**:

- Use DataLoader for any field that loads from database
- Batch-load by entity ID, not individual queries
- Return results in same order as input

**JWT authentication failing**:

- Verify JWT_SECRET is same across all services
- Check that guard is applied to resolver
- Confirm token is being passed in Authorization header

---

## Resources

- **CLAUDE.md** → "Upcoming: Federated GraphQL API" section
- **Rules**: Read `.claude/rules/graphql-api.md` (critical patterns)
- **Plan**: Check `_specs/graphql-api/plan.md` for checkpoints and progress
- **Apollo Federation**: https://www.apollographql.com/docs/federation
- **NestJS GraphQL**: https://docs.nestjs.com/graphql/quick-start

---

## E2E Test Setup

Create a comprehensive E2E test file for federation:

```bash
# Create test file
apps/api-gateway-e2e/src/federation-integration.spec.ts

# Or extend existing:
apps/api-gateway-e2e/src/api-gateway/federation-integration.spec.ts
```

**Test file structure:**

```typescript
import { test, expect, APIRequestContext } from '@playwright/test';

let apiRequest: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  apiRequest = await playwright.request.newContext();
});

test.afterAll(async () => {
  await apiRequest.dispose();
});

test.describe('Federation - Entity References', () => {
  // Tests from "E2E Testing" section above
});

test.describe('Federation - DataLoader Batching', () => {
  // Verify N+1 prevention
});

test.describe('Federation - Authentication', () => {
  // Verify JWT across subgraphs
});

test.describe('Federation - Error Handling', () => {
  // Verify error boundaries
});
```

**Run E2E tests:**

```bash
# All services must be running first
PORT=3301 npx nx serve api-product &
PORT=3302 npx nx serve api-cart &
PORT=3303 npx nx serve api-order &
PORT=3300 npx nx serve api-gateway &

# Then run tests
npx nx e2e api-gateway-e2e
```

---

## Federation Debugging Guide

### Debug Mode: Enable Subgraph Introspection

```typescript
// main.ts
ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [...],
    pollIntervalInMs: 10000,
  }),
  debug: true, // Enable debug logging
})
```

### Inspect Composed Schema

```bash
# Query the composed schema at gateway
curl -s -X POST http://localhost:3300/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ __schema { types { name } } }"
  }' | jq '.data.__schema.types | length'
```

### Test Individual Subgraph Schema

```bash
# Query product subgraph directly
curl -s -X POST http://localhost:3301/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ __type(name: \"Product\") { fields { name } } }"
  }' | jq
```

### Common Federation Issues

**Issue: "Cannot find type Order in any subgraph"**

- Solution: Ensure Order has `@Directive('@key(fields: "id")')`
- Verify it's exported from module
- Check it appears in introspection: `__type(name: "Order")`

**Issue: "Cannot query field 'product' on type 'CartItem'"**

- Solution: Add `@Directive('@external')` to product field
- Ensure resolver has `@ResolveField(() => Product)`
- Verify Product is a `@key` entity in product subgraph

**Issue: Schema composition fails at gateway startup**

- Solution: Check each subgraph responds on correct port
- Verify `supergraphUrl` in gateway config matches
- Run `npx nx serve api-gateway --verbose` for error details

---

## Quick Start Checklist

Starting a new federated GraphQL feature?

1. **Entity Ownership Decision**

   - [ ] Which subgraph owns this entity?
   - [ ] What's the `@key` field (usually `id`)?
   - [ ] Does it reference entities from other subgraphs?

2. **Entity Definition**

   - [ ] Create `.entity.ts` with `@ObjectType()`
   - [ ] Add `@Directive('@key(fields: "id")')`
   - [ ] Mark external fields with `@Directive('@external')`

3. **Resolver Setup**

   - [ ] Create `.resolver.ts` with `@Resolver()`
   - [ ] Add `@ResolveReference()` for entity stubs
   - [ ] Use DataLoader for batch queries
   - [ ] Add `@UseGuards(JwtAuthGuard)` for auth

4. **Module Registration**

   - [ ] Add resolver to `@Module()` providers
   - [ ] Add entity to TypeORM entities
   - [ ] Export schema in `main.ts`

5. **Testing**

   - [ ] Write unit test for resolver
   - [ ] Write E2E test for federated query
   - [ ] Verify schema composition at gateway
   - [ ] Test DataLoader batching

6. **Deployment Validation**
   - [ ] Run all subgraphs locally
   - [ ] Query via gateway (`localhost:3300`)
   - [ ] Verify no console errors
   - [ ] Run full E2E test suite

---

## Useful Commands

```bash
# Check if port is in use
lsof -i :3300

# Kill process on port
pkill -f "api-gateway"

# Run all services (quick start)
npm run serve:api-all  # If configured in package.json

# View API docs at gateway
open http://localhost:3300/graphql

# Test federation with introspection
npm run test:graphql:introspection

# Run only federation tests
npx nx e2e api-gateway-e2e --grep="Federation"
```

---

## Workflow

1. **Identify the task** — Which subgraph? Add entity? Reference entity? Auth?
2. **Scan rules** — Read relevant section from `.claude/rules/graphql-api.md`
3. **Check examples** — Look at similar patterns in existing subgraphs
4. **Implement** — Write tests first, then code
5. **Validate** — Run subgraph with `PORT=<port> npx nx serve <project>`
6. **Test** — Query via gateway or direct subgraph endpoint
7. **Commit** — Use `/commit` skill for message (checkpoint prefix: `✅ checkpoint X:`)

---

## Reference Materials

**In this project:**

- `.claude/rules/graphql-api.md` — Critical patterns (start here!)
- `_specs/graphql-api/plan.md` — Implementation checkpoints
- `_specs/graphql-api/todos.md` — Progress tracking

**External resources:**

- [Apollo Federation v2 Docs](https://www.apollographql.com/docs/federation/)
- [NestJS GraphQL Guide](https://docs.nestjs.com/graphql/quick-start)
- [Building Supergraphs](https://www.apollographql.com/docs/federation/building-supergraphs/)
- [DataLoader Pattern](https://github.com/graphql/dataloader)

---

## Next Steps

Ask what GraphQL feature you're building:

- "Add Product entity to product subgraph"
- "Make Order reference Product and Cart"
- "Write E2E tests for federated queries"
- "Debug N+1 query problem"
- "Set up JWT auth for api-order"

I'll provide specific code examples and link to relevant rules/patterns.
