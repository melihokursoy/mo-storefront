# Implementation Todos: Federated GraphQL API with NestJS & Apollo Federation

## Phase 1: Core Infrastructure

### Checkpoint 1: Nx/Nest Plugin Installed ✅ COMPLETE

- [x] Install @nx/nest plugin (@nx/nest@22.5.3)
- [x] Verify plugin installation (18 generators available)

### Checkpoint 2: Apollo Gateway Generated ✅ COMPLETE

- [x] Generate NestJS app at apps/api-gateway
- [x] Verify gateway app structure

### Checkpoint 3: All Subgraphs Generated ✅ COMPLETE

- [x] Generate Product subgraph at apps/api-product
- [x] Generate Cart subgraph at apps/api-cart
- [x] Generate Order subgraph at apps/api-order
- [x] Verify all subgraph structures

### Checkpoint 4: Federation Dependencies Installed

- [ ] Install @apollo/gateway, @apollo/subgraph, @nestjs/graphql, apollo-server
- [ ] Verify all dependencies installed across workspace

## Phase 2: Gateway Setup

### Checkpoint 5: Apollo Gateway Configured

- [ ] Configure ApolloGatewayDriver in api-gateway app.module.ts
- [ ] List all subgraph URLs (localhost:3001, 3002, 3003)
- [ ] Enable introspection for development
- [ ] Configure CORS for storefront
- [ ] Test gateway startup

## Phase 3: Product Subgraph

### Checkpoint 6: Product Subgraph Configured

- [ ] Configure ApolloFederationDriver in api-product app.module.ts
- [ ] Set port to 3001
- [ ] Enable autoSchemaFile for code-first federation
- [ ] Verify subgraph startup

### Checkpoint 7: Product Entity & Resolvers

- [ ] Create Product @ObjectType with @Directive('@key(fields: "id")')
- [ ] Implement \_\_resolveReference for Product entity
- [ ] Create ProductResolver with:
  - [ ] products(filter, limit, offset) query
  - [ ] product(id) query
  - [ ] Support filtering by category, price range, search
- [ ] Test product queries in Apollo Sandbox

## Phase 4: Cart Subgraph

### Checkpoint 8: Cart Subgraph with Product References

- [ ] Configure ApolloFederationDriver in api-cart app.module.ts
- [ ] Set port to 3002
- [ ] Create Cart @ObjectType with @Directive('@key(fields: "id")')
- [ ] Create CartItem @ObjectType with Product reference
- [ ] Extend Product entity from Product subgraph
- [ ] Implement \_\_resolveReference for Cart entity
- [ ] Create CartResolver with:
  - [ ] cart query (authenticated)
  - [ ] addToCart(productId, quantity) mutation
  - [ ] removeFromCart(cartItemId) mutation
  - [ ] updateCartItem(cartItemId, quantity) mutation
- [ ] Test cart queries/mutations with product references

## Phase 5: Order Subgraph

### Checkpoint 9: Order Subgraph with References

- [ ] Configure ApolloFederationDriver in api-order app.module.ts
- [ ] Set port to 3003
- [ ] Create Order @ObjectType with @Directive('@key(fields: "id")')
- [ ] Create OrderItem @ObjectType with Product reference
- [ ] Extend Product entity from Product subgraph
- [ ] Extend Cart entity from Cart subgraph
- [ ] Implement \_\_resolveReference for Order entity
- [ ] Create OrderResolver with:
  - [ ] createOrder(cartId) mutation
  - [ ] orders query (authenticated)
  - [ ] order(id) query
- [ ] Test order creation and queries with nested references
- [ ] Verify unified schema accessible through gateway

## Phase 6: Authentication & Cross-Subgraph Communication

### Checkpoint 10: JWT Authentication Configured

- [ ] Install @nestjs/jwt, @nestjs/passport, passport, passport-jwt in each subgraph
- [ ] Create JwtStrategy in each subgraph
- [ ] Create AuthGuard in each subgraph
- [ ] Configure Gateway to pass Authorization header to subgraphs
- [ ] Test protected mutations fail without token

### Checkpoint 11: Entity References Configured

- [ ] Implement \_\_resolveReference in Product subgraph
- [ ] Implement \_\_resolveReference in Cart subgraph
- [ ] Implement \_\_resolveReference in Order subgraph
- [ ] Test nested entity resolution across subgraphs
- [ ] Verify no reference resolution errors in gateway

## Phase 7: Performance & Monitoring

### Checkpoint 12: DataLoader Integrated

- [ ] Install dataloader in each subgraph
- [ ] Implement DataLoader for Product batch loading
- [ ] Implement DataLoader for Cart references
- [ ] Implement DataLoader for Order references
- [ ] Verify no N+1 queries in federation queries

### Checkpoint 13: Query Complexity Validation

- [ ] Configure query complexity analysis in gateway
- [ ] Configure complexity checks in each subgraph
- [ ] Reject queries exceeding complexity threshold
- [ ] Test with deeply nested federation queries

## Phase 8: Databases

### Checkpoint 14: Databases Initialized

- [ ] Initialize Prisma in each subgraph (api-product, api-cart, api-order)
- [ ] Configure unique DATABASE_URL for each subgraph in .env.local
- [ ] Define schema for Product subgraph (products, categories)
- [ ] Define schema for Cart subgraph (carts, cart_items)
- [ ] Define schema for Order subgraph (orders, order_items)
- [ ] Run: npx prisma migrate dev --name init (in each subgraph)
- [ ] Verify databases created with prisma studio

## Phase 9: Testing

### Checkpoint 15: Subgraph Tests Pass

- [ ] Write unit tests for Product resolver (queries)
- [ ] Write unit tests for Cart resolver (mutations, references)
- [ ] Write unit tests for Order resolver (mutations, references)
- [ ] Write tests for \_\_resolveReference implementations
- [ ] Run: npx nx test api-product
- [ ] Run: npx nx test api-cart
- [ ] Run: npx nx test api-order
- [ ] All subgraph tests pass

### Checkpoint 16: Integration Tests Pass

- [ ] Write federation e2e test: browse products query
- [ ] Write federation e2e test: add to cart (cart → product reference)
- [ ] Write federation e2e test: create order (order → product + cart references)
- [ ] Write federation e2e test: nested query across all subgraphs
- [ ] Test authentication flows
- [ ] Test error handling and edge cases
- [ ] Run complete federation e2e test suite
- [ ] All integration tests pass

## Final Verification

- [ ] All subgraphs start without errors
- [ ] Gateway starts and loads all subgraph schemas
- [ ] Apollo Sandbox accessible at http://localhost:3000/graphql
- [ ] Unified schema shows all Product, Cart, Order types
- [ ] Queries work without token
- [ ] Mutations require Authorization header with valid JWT
- [ ] Nested entity references resolve correctly across subgraphs
- [ ] Performance baseline met (< 200ms single subgraph, < 500ms cross-subgraph)
- [ ] No N+1 queries with DataLoader
- [ ] All unit tests pass
- [ ] All integration tests pass

## Review Notes

_Observations from implementation:_

- [ ] What went smoothly?

  - ...

- [ ] What was unexpected?

  - ...

- [ ] Any improvements to the plan?

  - ...

- [ ] Federation-specific challenges?

  - ...

- [ ] Performance improvements from federation?
  - ...

---

## Checkpoint 1 Notes

- ✓ @nx/nest@22.5.3 installed successfully
- ✓ 18 generators available (application, library, resolver, controller, service, etc.)
- ✓ No issues during installation (ignore glob deprecation warnings - not blocking)
- ✓ Ready to proceed with Checkpoint 2: Apollo Gateway generation

## Checkpoint 2 Notes

- ✓ Generated NestJS app at apps/api-gateway using @nx/nest:app generator
- ✓ App structure created with: main.ts, app.module.ts, app.controller.ts, app.service.ts
- ✓ E2E test suite created at apps/api-gateway-e2e
- ✓ Package.json and nx.json configurations updated automatically
- ✓ VSCode launch configuration created (.vscode/launch.json)
- ✓ Gateway app is ready for Apollo Federation configuration
- ⚠️ Husky deprecation warning noted (v10.0.0 will change format) - not blocking
- ℹ️ Next step: Install federation dependencies (Checkpoint 3)

## Checkpoint 3 Notes

- ✓ Generated Product subgraph at apps/api-product
- ✓ Generated Cart subgraph at apps/api-cart
- ✓ Generated Order subgraph at apps/api-order
- ✓ Each subgraph has complete NestJS structure: main.ts, app.module.ts, app.service.ts, app.controller.ts
- ✓ E2E test suites created for all three subgraphs
- ✓ Added "jest" and "node" types to all e2e tsconfig.json files to fix TypeScript errors
- ✓ All subgraph structures verified successfully
- ✓ Ready to install federation dependencies (Checkpoint 4)
