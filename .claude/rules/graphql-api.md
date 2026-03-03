# GraphQL API Patterns (Apollo Federation v2 + NestJS)

## Pattern: Entity References with @requires and @external

When an entity from one subgraph is referenced in another, use federation directives.

### Why This Matters

- Enables seamless querying across subgraphs
- Prevents N+1 queries through proper field resolution
- Apollo Gateway handles entity resolution transparently
- Proper federation prevents data duplication

### ❌ What Not To Do

```typescript
// ❌ Don't duplicate entity definitions across services
// api-product/src/graphql/product.entity.ts
@ObjectType()
export class Product {
  @Field()
  id: string;

  @Field()
  name: string;
}

// ❌ api-order/src/graphql/order.entity.ts (WRONG - duplicates Product)
@ObjectType()
export class Product {
  @Field()
  id: string;
  @Field()
  name: string;
}

// ❌ Don't query entities without proper reference setup
// This will cause "Can't resolve Product" errors
```

### ✅ What To Do Instead

```typescript
// ✅ api-product/src/graphql/product.entity.ts (Owns Product)
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

// ✅ api-order/src/graphql/order.entity.ts (References Product)
@ObjectType()
@Directive('@key(fields: "id")')
export class Order {
  @Field()
  id: string;

  @Field()
  customerId: string;

  // Reference Product from api-product subgraph
  @Field(() => Product)
  @Directive('@external')
  product?: Product;

  @Field()
  @Directive('@requires(fields: "productId")')
  productId: string;
}

// In resolver:
@ResolveField(() => Product)
async product(@Parent() order: Order) {
  // Return stub with only `id` — gateway will resolve full entity
  return { id: order.productId };
}
```

## Pattern: DataLoader for Batch Loading

Prevent N+1 queries using DataLoader.

### Why This Matters

- Without DataLoader: 1 cart query + N product queries (N+1 problem)
- With DataLoader: 1 cart query + 1 batched product query
- Significantly improves performance
- GraphQL federation expects this pattern

### ❌ What Not To Do

```typescript
// ❌ N+1 Query Problem
@ResolveField(() => [Product])
async products(@Parent() cart: Cart) {
  // This runs separate query for EACH product
  return this.productService.getByIds(cart.productIds);
}
```

### ✅ What To Do Instead

```typescript
// ✅ Use DataLoader for batching
import DataLoader from 'dataloader';

@Injectable()
export class CartResolver {
  constructor(private cartService: CartService) {}

  @ResolveField(() => [Product])
  async products(@Parent() cart: Cart) {
    // dataloader batches all requests in this tick
    return this.productLoader.loadMany(cart.productIds);
  }
}

// In module setup:
const productLoader = new DataLoader(async (productIds) => {
  const products = await productService.getByIds(productIds);
  // Return results in SAME ORDER as input
  return productIds.map((id) => products.find((p) => p.id === id));
});
```

## Pattern: JWT Authentication Across Subgraphs

Each service must validate JWT independently.

### Why This Matters

- Prevents unauthorized access to individual subgraphs
- Subgraphs can be called directly or through gateway
- Each service must not trust others' authorization

### ❌ What Not To Do

```typescript
// ❌ No authentication in subgraph
@Resolver()
export class OrderResolver {
  @Query(() => [Order])
  orders() {
    // Anyone can call this!
    return this.orderService.getAllOrders();
  }
}

// ❌ Trusting gateway's authentication
// (Gateway is compromised → entire system is compromised)
```

### ✅ What To Do Instead

```typescript
// ✅ Use JWT guard on every resolver
@Resolver()
export class OrderResolver {
  @Query(() => [Order])
  @UseGuards(JwtAuthGuard)
  orders(@CurrentUser() user: JwtPayload) {
    // Verify user has permission to query orders
    return this.orderService.getOrdersByCustomerId(user.customerId);
  }
}

// In main.ts:
const jwtOptions = {
  secret: process.env.JWT_SECRET,
  expiresIn: '7d',
};

app.use(passport.initialize());
passport.use('jwt', new JwtStrategy(jwtOptions, ...));
```

## Pattern: Port Management for Subgraphs

Each subgraph runs on a dedicated port.

| Service                        | Port |
| ------------------------------ | ---- |
| `api-gateway` (Apollo Gateway) | 3300 |
| `api-product`                  | 3301 |
| `api-cart`                     | 3302 |
| `api-order`                    | 3303 |

### ❌ What Not To Do

```bash
# ❌ Running multiple services on same port
npx nx serve api-product
npx nx serve api-cart  # Will fail — port already in use
```

### ✅ What To Do Instead

```bash
# ✅ Run each in separate terminal with explicit port
PORT=3301 npx nx serve api-product
PORT=3302 npx nx serve api-cart
PORT=3303 npx nx serve api-order

# Gateway discovers services via hardcoded URLs
# (See apps/api-gateway/src/main.ts)
```

## Pattern: Database per Subgraph

Each subgraph has **independent PostgreSQL database**.

### Why This Matters

- True service independence (can scale independently)
- Prevents tight coupling through shared database
- Each service owns its data schema
- Easier to debug and maintain

### ❌ What Not To Do

```
# ❌ All subgraphs sharing one database
DATABASE_URL=postgresql://localhost/storefront
# (All services use same connection pool — tight coupling)
```

### ✅ What To Do Instead

```bash
# Separate database per service
DATABASE_URL=postgresql://localhost/product_db    # api-product
DATABASE_URL=postgresql://localhost/cart_db       # api-cart
DATABASE_URL=postgresql://localhost/order_db      # api-order
```

### Common Pitfalls

1. **Forgetting @requires/@external directives** - Causes "Can't find field" errors
2. **Returning full entities from resolvers** - Only return requested fields + `id`
3. **Not batching with DataLoader** - N+1 queries kill performance
4. **Using shared JWT secret poorly** - Rotate secrets regularly
5. **Running services on wrong ports** - Check port conflicts before serving

### References

- CLAUDE.md → "Upcoming: Federated GraphQL API"
- Apollo Federation docs: https://www.apollographql.com/docs/federation
- NestJS GraphQL: https://docs.nestjs.com/graphql/quick-start
