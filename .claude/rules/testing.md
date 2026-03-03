# Testing Patterns

## Pattern: Test-First Development

When implementing features, **write tests first**, then implement the code.

### Why This Matters

- Tests define clear requirements before coding
- Reduces rework and scope creep
- Ensures features are actually testable
- Makes implementation focused and efficient

### ❌ What Not To Do

```
1. Write all the code
2. Hope tests pass
3. Debug failures and rewrite code
```

### ✅ What To Do Instead

```
1. Write tests that define expected behavior
2. Run tests (they fail — that's expected)
3. Implement code to pass tests
4. Refactor with confidence
```

### Testing by Type

**Unit Tests** (Node.js test runner):

- Location: `tests/` directory at root
- Command: `node --experimental-strip-types --test tests/**/*.test.ts`
- Use for: Business logic, utilities, pure functions
- Example: `tests/nextjs-app-tailwind-shadcn/setup.test.ts`

**E2E Tests** (Playwright for storefront, Jest for GraphQL API):

- Location: `apps/storefront-e2e/src/` or `apps/api-*-e2e/src/`
- Command: `npx nx e2e storefront-e2e` or `npx nx e2e api-gateway-e2e`
- Use for: User workflows, page interactions, full component rendering, federation integration
- Example: Navigation flow, form submission, styling verification, cross-subgraph queries

**Type Checking** (TypeScript):

- Command: `npx nx typecheck storefront`
- Use for: Catching type errors before runtime

### Pre-commit Validation

The Husky hook runs these automatically:

```bash
format:write     # Auto-format code
lint            # Linting (if configured)
test            # Run tests
typecheck       # TypeScript validation
```

**Important**: If any check fails, the commit is prevented. Fix the issue and try again.

### Common Pitfalls

1. **Skipping E2E tests** - They catch integration issues unit tests miss
2. **Testing implementation details instead of behavior** - Test what users see, not internal state
3. **Not running tests locally before pushing** - Let pre-commit catch issues early
4. **Ignoring type errors** - Types catch bugs before runtime

## E2E Testing Rules for GraphQL API

### Critical Rule: Each `*-e2e` tests ONLY its responsibility

| Service | Owns | Excludes |
|---------|------|----------|
| **api-product-e2e** | Product queries, filters | Cart, Orders, Gateway |
| **api-cart-e2e** | Cart operations + JWT auth | Product data, Order operations |
| **api-order-e2e** | Order operations + JWT auth | Product data, Cart state |
| **api-gateway-e2e** | Federation composition, cross-subgraph queries | Subgraph business logic |

### ❌ What NOT to test in each suite

```typescript
// BAD: api-product-e2e tests cart functionality
it('should add product to cart', async () => { ... });

// BAD: api-gateway-e2e duplicates product listing test
it('should list products', async () => { ... }); // Already in api-product-e2e
```

### ✅ What TO test in each suite

```typescript
// GOOD: api-product-e2e tests product queries
it('should list products with category filter', async () => {
  const result = await gql(`query { products(category: "Electronics") { id name } }`);
  expect(result.data.products.length).toBeGreaterThan(0);
});

// GOOD: api-gateway-e2e tests federation composition
it('should resolve product reference in order across subgraphs', async () => {
  const result = await gql(`query { orders { id product { name price } } }`);
  expect(result.data.orders[0].product.name).toBeDefined();
});
```

### Database Setup per Service

- **api-product-e2e**: Only product_db migration/seed
- **api-cart-e2e**: Only cart_db migration/seed
- **api-order-e2e**: Only order_db migration/seed
- **api-gateway-e2e**: All 3 databases (full federation setup)

### Seeded Test Data

- **Products**: 5 items (id 1-5) with categories and prices
- **Carts**: 1 cart per user (cart-user-1, user-1)
- **Orders**: 1 order per user (order-1, user-1, DELIVERED status)

### Why This Separation Matters

1. **Faster tests** - Each service only sets up its own database
2. **Clearer failures** - When a test fails, you know exactly which service has the issue
3. **Better isolation** - Changes to product schema don't require updating cart tests
4. **True e2e only in gateway** - Federation composition tested where it happens

### References

- CLAUDE.md → "Testing Strategy"
- Node.js test runner: https://nodejs.org/docs/latest/api/test.html
- Playwright docs: https://playwright.dev
