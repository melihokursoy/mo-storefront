# Implementation Plan: Federated GraphQL API with NestJS & Apollo Federation

## Context

The mo-storefront monorepo needs a scalable, federated GraphQL API architecture with multiple independent subgraphs coordinated by an Apollo Gateway. This enables teams to own separate domains (Product, Cart, Order) while maintaining a unified GraphQL API for the Next.js storefront.

**Architecture**: Apollo Federation v2 with subgraphs + Gateway

## Current State

- Nx workspace v22.5.1 with `@nx/next` plugin configured
- Next.js storefront app at `apps/storefront`
- No backend services yet
- PostgreSQL not configured for services

## Tech Stack

- **Framework**: NestJS (via `@nx/nest` plugin)
- **GraphQL Federation**: Apollo Federation v2 (Gateway + Subgraphs)
- **Database**: PostgreSQL with Prisma ORM (one DB per subgraph)
- **Authentication**: JWT in Authorization headers
- **Node Version**: v22 (matches CI)

## Architecture Overview

```
┌─────────────────────┐
│  Next.js Storefront │
│  (apps/storefront)  │
└──────────┬──────────┘
           │
      ┌────▼────┐
      │ Gateway │  (Port 3300)
      │ (Apps)  │
      └────┬────┘
           │
    ┌──────┼──────┬────────┐
    │      │      │        │
┌───▼──┐ ┌─▼──┐ ┌─▼──┐ ┌──▼───┐
│ Prod │ │Cart│ │Ord │ │Auth? │
│ Sub  │ │Sub │ │Sub │ │(Opt) │
└──────┘ └────┘ └────┘ └──────┘
(3301)  (3302) (3303) (3004)
```

**Each subgraph**:
- Independent NestJS service
- Own PostgreSQL database
- Runs on unique port
- Publishes schema to Gateway

## Implementation Steps

### Phase 1: Core Infrastructure

#### 1. Install @nx/nest Plugin

```sh
npx nx add @nx/nest
```

**✅ Checkpoint 1: Nx/Nest Plugin Installed**

Verify:
```sh
npm list @nx/nest
npx nx list @nx/nest
```

---

#### 2. Generate Apollo Gateway

```sh
npx nx generate @nx/nest:app --name=api-gateway --directory=apps/api-gateway --frontendProject=storefront
```

**Purpose**: Route all GraphQL requests to appropriate subgraphs

**✅ Checkpoint 2: Apollo Gateway Generated**

Verify:
```sh
ls -la apps/api-gateway/
```

---

#### 3. Generate Subgraph Services

Generate three independent NestJS services:

**Product Subgraph**:
```sh
npx nx generate @nx/nest:app --name=api-product --directory=apps/api-product
```

**Cart Subgraph**:
```sh
npx nx generate @nx/nest:app --name=api-cart --directory=apps/api-cart
```

**Order Subgraph**:
```sh
npx nx generate @nx/nest:app --name=api-order --directory=apps/api-order
```

**✅ Checkpoint 3: All Subgraphs Generated**

Verify:
```sh
ls -la apps/api-*/
```

---

#### 4. Install Apollo Federation Dependencies

Install federation packages across workspace:

```sh
npm install --save @apollo/gateway @apollo/subgraph @nestjs/graphql @nestjs/apollo graphql apollo-server
npm install --save-dev @types/graphql
```

**✅ Checkpoint 4: Federation Dependencies Installed**

Verify:
```sh
npm list @apollo/gateway @apollo/subgraph @nestjs/graphql
```

---

### Phase 2: Gateway Setup

#### 5. Configure Apollo Gateway Module

**File**: `apps/api-gateway/src/app.module.ts`

Setup `ApolloGatewayDriver`:
- List all subgraph URLs (local dev ports)
- Enable introspection
- Configure authentication context
- Setup CORS for storefront

**Configuration**:
```typescript
subgraphs: [
  { name: 'product', url: 'http://localhost:3301/graphql' },
  { name: 'cart', url: 'http://localhost:3302/graphql' },
  { name: 'order', url: 'http://localhost:3303/graphql' }
]
```

**✅ Checkpoint 5: Apollo Gateway Configured**

Verify:
```sh
npx nx serve api-gateway
# Open http://localhost:3300/graphql (Apollo Sandbox)
# Should show "Unable to reach subgraphs" (they're not running yet)
```

---

### Phase 3: Product Subgraph

#### 6. Setup Product Subgraph Dependencies

**File**: `apps/api-product/package.json`

Add federation-specific dependencies:
```sh
npm install @apollo/subgraph
```

---

#### 7. Configure Product GraphQL Module

**File**: `apps/api-product/src/app.module.ts`

Configure `ApolloFederationDriver`:
- Enable federation mode
- Set autoSchemaFile for code-first
- Port: 3301

**Key Settings**:
```typescript
driver: ApolloFederationDriver,
autoSchemaFile: 'product-schema.gql',
buildSchemaOptions: {
  orphanedTypes: [Product]
}
```

**✅ Checkpoint 6: Product Subgraph Configured**

Verify:
```sh
npx nx serve api-product
# http://localhost:3301/graphql should be accessible
```

---

#### 8. Define Product Entity & Resolvers

**Files**:
- `apps/api-product/src/product.entity.ts`
- `apps/api-product/src/product.resolver.ts`

**Entity**: Product with @Directive for federation:
```typescript
@ObjectType()
@Directive('@key(fields: "id")')
export class Product {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => Float)
  price: number;
  // ... more fields
}
```

**Resolvers**:
- `products(filter, limit, offset)` → [Product]
- `product(id)` → Product
- `__resolveReference` for entity reference resolution

**✅ Checkpoint 7: Product Entity & Resolvers**

Verify:
```sh
npx nx serve api-product
# Query in Apollo Sandbox:
query {
  products(limit: 10) {
    id
    name
    price
  }
}
```

---

### Phase 4: Cart Subgraph

#### 9. Configure Cart Subgraph

**File**: `apps/api-cart/src/app.module.ts`

Configure `ApolloFederationDriver`:
- Port: 3302

---

#### 10. Define Cart Entity with Product Reference

**File**: `apps/api-cart/src/cart.entity.ts`

```typescript
@ObjectType()
@Directive('@key(fields: "id")')
export class Cart {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field(() => [CartItem])
  items: CartItem[];

  @Field(() => Float)
  totalPrice: number;
}

@ObjectType()
export class CartItem {
  @Field(() => ID)
  id: string;

  @Field(() => Product)
  product: Product;  // Reference to Product subgraph entity

  @Field()
  quantity: number;
}

@ObjectType()
@Extends()  // Reference external Product entity
@Directive('@external')
export class Product {
  @Field(() => ID)
  @Directive('@external')
  id: string;

  @Field()
  @Directive('@external')
  price: number;
}
```

**Resolvers**:
- `cart` → Cart (authenticated)
- `addToCart(productId, quantity)` → Cart
- `removeFromCart(cartItemId)` → Cart
- `__resolveReference` for Cart references

**✅ Checkpoint 8: Cart Subgraph with Product References**

Verify:
```sh
npx nx serve api-product & npx nx serve api-cart
# Test cart queries in Apollo Sandbox
```

---

### Phase 5: Order Subgraph

#### 11. Configure Order Subgraph

**File**: `apps/api-order/src/app.module.ts`

Configure `ApolloFederationDriver`:
- Port: 3303

---

#### 12. Define Order Entity with Cart & Product References

**File**: `apps/api-order/src/order.entity.ts`

```typescript
@ObjectType()
@Directive('@key(fields: "id")')
export class Order {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field(() => [OrderItem])
  items: OrderItem[];

  @Field()
  status: OrderStatus;

  @Field(() => Float)
  totalPrice: number;
}

@ObjectType()
export class OrderItem {
  @Field(() => ID)
  id: string;

  @Field(() => Product)
  product: Product;  // Reference to Product subgraph

  @Field()
  quantity: number;

  @Field(() => Float)
  price: number;
}

// External references
@ObjectType()
@Extends()
@Directive('@external')
export class Product {
  @Field(() => ID)
  @Directive('@external')
  id: string;
}

@ObjectType()
@Extends()
@Directive('@external')
export class Cart {
  @Field(() => ID)
  @Directive('@external')
  id: string;
}
```

**Resolvers**:
- `createOrder(cartId)` → Order
- `orders` → [Order] (authenticated)
- `order(id)` → Order
- `__resolveReference` for Order references

**✅ Checkpoint 9: Order Subgraph with References**

Verify:
```sh
# Start all subgraphs
npx nx serve api-product &
npx nx serve api-cart &
npx nx serve api-order &
npx nx serve api-gateway

# http://localhost:3300/graphql should show unified schema
# All Product, Cart, Order types accessible
```

---

### Phase 6: Authentication & Cross-Subgraph Communication

#### 13. Setup JWT Authentication Across Subgraphs

Install in each subgraph:
```sh
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
```

**For Gateway**:
- Extract JWT from Authorization header
- Pass token to each subgraph via context headers

**For Subgraphs**:
- Validate JWT independently
- Extract userId from token
- Protect mutations

**✅ Checkpoint 10: JWT Authentication Configured**

Verify:
```sh
# All subgraphs validate tokens independently
# Gateway passes token context to subgraphs
```

---

#### 14. Implement Entity References & Federation Directives

Each subgraph must implement `__resolveReference` for entities it extends:

**Example (Cart resolving Product reference)**:
```typescript
@ResolveReference()
resolveProductReference(reference: Pick<Product, 'id'>) {
  // Return product from database by id
  return this.productService.findById(reference.id);
}
```

**✅ Checkpoint 11: Entity References Configured**

Verify:
```sh
# Query nested entities across subgraphs
query {
  orders {
    id
    items {
      product {
        name
        price
      }
    }
  }
}
```

---

### Phase 7: Performance & Monitoring

#### 15. Implement Entity Batching & DataLoader

Prevent N+1 queries across subgraph boundaries:
- DataLoader in Product subgraph for batch product fetching
- DataLoader in Cart subgraph for batch product references
- DataLoader in Order subgraph for batch product/cart references

**✅ Checkpoint 12: DataLoader Integrated**

Verify:
```sh
# Query orders with nested products (no N+1 queries)
```

---

#### 16. Add Query Complexity Analysis

Prevent malicious deep federation queries:
- Gateway enforces complexity limits
- Each subgraph also validates

**✅ Checkpoint 13: Query Complexity Validation**

Verify:
```sh
# Deep nested queries fail gracefully
```

---

### Phase 8: Databases

#### 17. Setup Prisma for Each Subgraph

Initialize Prisma in each subgraph:
```sh
# For each subgraph
npx prisma init
# Configure unique DATABASE_URL in .env.local
```

**Database per subgraph**:
- Product DB: products, product_categories
- Cart DB: carts, cart_items
- Order DB: orders, order_items

**Migration**:
```sh
npx prisma migrate dev --name init  # In each subgraph directory
```

**✅ Checkpoint 14: Databases Initialized**

Verify:
```sh
npx prisma studio  # In each subgraph
```

---

### Phase 9: Testing

#### 18. Write Subgraph Unit Tests

**For each subgraph**:
- Entity resolution tests
- Mutation tests
- Reference resolution tests

```sh
npx nx test api-product
npx nx test api-cart
npx nx test api-order
```

**✅ Checkpoint 15: Subgraph Tests Pass**

Verify:
```sh
# All subgraph tests pass
```

---

#### 19. Write Gateway Integration Tests

**File**: `tests/graphql-api/federation-e2e.test.ts`

Test scenarios:
1. Query products through gateway
2. Add to cart (cart subgraph fetches product via reference)
3. Create order (order subgraph fetches product + cart via references)
4. Nested query resolves across all subgraphs

```sh
# Start all services
npx nx serve api-product &
npx nx serve api-cart &
npx nx serve api-order &
npx nx serve api-gateway &

# Run tests
node --experimental-strip-types --test tests/graphql-api/federation-e2e.test.ts
```

**✅ Checkpoint 16: Integration Tests Pass**

Verify:
```sh
# Complete federation flow works end-to-end
```

---

## Verification

### Final Checks

```sh
# Terminal 1: Start all services
npx nx serve api-product &
npx nx serve api-cart &
npx nx serve api-order &
npx nx serve api-gateway

# Terminal 2: Run tests
npx nx test api-product
npx nx test api-cart
npx nx test api-order
node --experimental-strip-types --test tests/graphql-api/federation-e2e.test.ts

# Open http://localhost:3300/graphql
# Verify unified schema in Apollo Sandbox
# Test queries and mutations
```

### Performance Baseline

Target:
- Query response time: < 200ms (typical product query)
- Cross-subgraph query: < 500ms (order with nested products)
- No N+1 queries (verify with DataLoader)

---

## Critical Files

| File | Purpose |
|------|---------|
| `apps/api-gateway/src/app.module.ts` | Apollo Gateway configuration |
| `apps/api-product/src/app.module.ts` | Product subgraph federation setup |
| `apps/api-product/src/product.resolver.ts` | Product queries and references |
| `apps/api-cart/src/app.module.ts` | Cart subgraph federation setup |
| `apps/api-cart/src/cart.resolver.ts` | Cart mutations and product references |
| `apps/api-order/src/app.module.ts` | Order subgraph federation setup |
| `apps/api-order/src/order.resolver.ts` | Order mutations and references |
| `prisma/schema.prisma` | Database schemas (one per subgraph) |
| `tests/graphql-api/federation-e2e.test.ts` | End-to-end federation tests |

---

## Summary

Build a production-ready federated GraphQL API with Apollo Federation v2, featuring an Apollo Gateway coordinating three independent NestJS subgraphs (Product, Cart, Order), each with its own PostgreSQL database, across 16 checkpoints covering infrastructure, subgraph setup, federation directives, authentication, performance, and comprehensive testing.

**Key Benefits**:
- ✅ Scalable: Teams own separate subgraphs
- ✅ Independent: Each subgraph has own database and deployment
- ✅ Unified: Single GraphQL endpoint for clients
- ✅ Type-safe: Federation manages entity references
