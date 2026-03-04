# NestJS Testing Patterns

## Pattern: Unit Tests with Mocked Dependencies

NestJS services and resolvers are tested with `@nestjs/testing` by mocking database and external dependencies.

### Why This Matters

- **Fast execution** — No database access, no network calls
- **Deterministic** — Mock data always returns same results
- **Isolated** — Test failures indicate code issues, not environment issues
- **Clear verification** — Jest spy methods verify correct calls

### ✅ Service Unit Test Pattern

```typescript
// apps/api-product/src/app/product.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { PrismaService } from './prisma.service';

describe('ProductService', () => {
  let service: ProductService;
  let prismaService: PrismaService;

  // Mock PrismaService
  const mockPrismaService = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    // Create testing module with mocked PrismaService
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return products with pagination', async () => {
      const mockProducts = [
        {
          id: '1',
          name: 'Product 1',
          description: 'Desc 1',
          price: 100,
          category: 'Electronics',
          sku: 'SKU-001',
          rating: 4.5,
          inStock: true,
          tags: [],
          imageUrl: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.findAll({
        limit: 10,
        offset: 0,
      });

      // Verify Prisma was called correctly
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
      });

      // Verify results have ISO date strings
      expect(result).toHaveLength(1);
      expect(result[0].createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(result[0].updatedAt).toBe('2024-01-02T00:00:00.000Z');
    });

    it('should filter by category (case-insensitive)', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.findAll({
        limit: 10,
        offset: 0,
        category: 'electronics',
      });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          category: { equals: 'electronics', mode: 'insensitive' },
        },
        skip: 0,
        take: 10,
      });
    });

    it('should filter by price range', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.findAll({
        limit: 10,
        offset: 0,
        minPrice: 50,
        maxPrice: 150,
      });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          price: { gte: 50, lte: 150 },
        },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('findById', () => {
    it('should return a product by id with ISO dates', async () => {
      const mockProduct = {
        id: '1',
        name: 'Product 1',
        description: 'Desc 1',
        price: 100,
        category: 'Electronics',
        sku: 'SKU-001',
        rating: 4.5,
        inStock: true,
        tags: [],
        imageUrl: 'http://example.com/image.jpg',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findById('1');

      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });

      expect(result?.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(result?.updatedAt).toBe('2024-01-02T00:00:00.000Z');
    });

    it('should return null when product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });
});
```

### Key Patterns

- **`@nestjs/testing`** — Use `Test.createTestingModule()` for DI
- **Mock object** — Create object with jest.fn() for each method
- **`useValue`** — Inject mock instead of real dependency
- **`jest.clearAllMocks()`** — Reset before each test
- **Verify calls** — `toHaveBeenCalledWith()` checks correct Prisma calls
- **Date transformation** — Verify dates are ISO strings in results

---

## Pattern: Resolver Unit Tests

Test resolvers by mocking services and verifying they delegate correctly.

### ✅ Resolver Unit Test Pattern

```typescript
// apps/api-product/src/app/product.resolver.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ProductResolver } from './product.resolver';
import { ProductService } from './product.service';

describe('ProductResolver', () => {
  let resolver: ProductResolver;
  let productService: ProductService;

  const mockProductService = {
    findAll: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductResolver,
        { provide: ProductService, useValue: mockProductService },
      ],
    }).compile();

    resolver = module.get<ProductResolver>(ProductResolver);
    productService = module.get<ProductService>(ProductService);
    jest.clearAllMocks();
  });

  describe('products', () => {
    it('should use default args (limit=10, offset=0)', async () => {
      mockProductService.findAll.mockResolvedValue([]);

      await resolver.products(10, 0);

      expect(mockProductService.findAll).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
      });
    });

    it('should pass all filters to service', async () => {
      mockProductService.findAll.mockResolvedValue([]);

      await resolver.products(20, 40, 'Electronics', 50, 500, 'laptop');

      expect(mockProductService.findAll).toHaveBeenCalledWith({
        limit: 20,
        offset: 40,
        category: 'Electronics',
        minPrice: 50,
        maxPrice: 500,
        search: 'laptop',
      });
    });
  });

  describe('product', () => {
    it('should delegate to findById', async () => {
      const mockProduct = {
        id: '1',
        name: 'Product 1',
        description: 'Desc 1',
        price: 100,
        category: 'Electronics',
        sku: 'SKU-001',
        rating: 4.5,
        inStock: true,
        tags: [],
        imageUrl: undefined,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockProductService.findById.mockResolvedValue(mockProduct);

      const result = await resolver.product('1');

      expect(mockProductService.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockProduct);
    });

    it('should return null if not found', async () => {
      mockProductService.findById.mockResolvedValue(null);

      const result = await resolver.product('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('resolveReference', () => {
    it('should call findById with reference id', async () => {
      const mockProduct = {
        id: '1',
        name: 'Product 1',
        // ... fields
      };

      mockProductService.findById.mockResolvedValue(mockProduct);

      const result = await resolver.resolveReference({ id: '1' });

      expect(mockProductService.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockProduct);
    });
  });
});
```

### Key Patterns

- **Verify delegation** — Service method called with correct args
- **Test both success and null cases** — findById can return null
- **Federation testing** — Test `@ResolveReference()` explicitly
- **Don't test business logic** — Service tests handle that; resolver just orchestrates

---

## Pattern: Service Tests for Authentication Guards

Test that services properly validate and use JWT tokens.

### ✅ Service Test with JWT Context

```typescript
// apps/api-order/src/app/order.service.spec.ts
describe('OrderService', () => {
  let service: OrderService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    order: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    jest.clearAllMocks();
  });

  describe('getOrdersByUserId', () => {
    it('should return orders for authenticated user', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          customerId: 'user-123',
          productId: 'product-1',
          quantity: 2,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.getOrdersByUserId('user-123');

      // Verify service filters by user
      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith({
        where: { customerId: 'user-123' },
      });

      expect(result).toHaveLength(1);
      expect(result[0].customerId).toBe('user-123');
    });

    it('should return empty array if no orders exist', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getOrdersByUserId('user-unknown');

      expect(result).toEqual([]);
    });
  });
});
```

---

## Pattern: E2E Tests with Global Helpers

E2E tests use global `gql()` helper to execute GraphQL queries with optional JWT tokens.

### ✅ E2E Test Setup (global-setup.ts)

```typescript
// apps/api-product-e2e/src/support/global-setup.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function globalSetup() {
  // 1. Start PostgreSQL container
  try {
    await execAsync(
      'docker compose -f apps/api-product/docker-compose.yml up -d'
    );
  } catch (error) {
    console.error('Failed to start docker services:', error);
    throw error;
  }

  // 2. Generate Prisma client
  try {
    await execAsync('cd apps/api-product && npx prisma generate');
  } catch (error) {
    console.error('Failed to generate Prisma client:', error);
    throw error;
  }

  // 3. Run database migrations
  try {
    await execAsync('cd apps/api-product && npx prisma migrate deploy');
  } catch (error) {
    console.error('Failed to run migrations:', error);
    throw error;
  }

  // 4. Seed test data
  try {
    await execAsync('cd apps/api-product && npm run db:seed');
  } catch (error) {
    console.error('Failed to seed database:', error);
    throw error;
  }

  // 5. Wait for GraphQL to be ready
  const maxRetries = 30;
  const retryDelayMs = 100;
  let isReady = false;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://localhost:3301/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ __typename }' }),
      });

      const data = (await response.json()) as {
        data?: { __typename?: string };
      };
      if (data.data?.__typename === 'Query') {
        isReady = true;
        console.log('✅ Product Subgraph GraphQL is ready');
        break;
      }
    } catch (error) {
      // Retry
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }

  if (!isReady) {
    throw new Error('Product Subgraph failed to initialize');
  }
}
```

### ✅ E2E Test Helpers (test-setup.ts)

```typescript
// apps/api-product-e2e/src/support/test-setup.ts
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

interface GqlResponse {
  data?: Record<string, any>;
  errors?: Array<{ message: string }>;
}

async function gql(
  query: string,
  variables?: Record<string, unknown>,
  token?: string
): Promise<GqlResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('http://localhost:3301/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  return response.json() as Promise<GqlResponse>;
}

function makeToken(userId = 'user-1', role = 'user'): string {
  return jwt.sign(
    {
      sub: userId,
      userId,
      email: `${userId}@example.com`,
      role,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

module.exports = async function () {
  (global as any).gql = gql;
  (global as any).makeToken = makeToken;
};
```

### ✅ E2E Test Spec Example

```typescript
// apps/api-product-e2e/src/tests/products.spec.ts
describe('Product Queries', () => {
  it('should list all products', async () => {
    const gql = (global as any).gql;

    const result = await gql(`
      query {
        products(limit: 10, offset: 0) {
          id
          name
          price
          category
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    expect(Array.isArray(result.data?.products)).toBe(true);
    expect(result.data?.products.length).toBeGreaterThan(0);
  });

  it('should filter products by category', async () => {
    const gql = (global as any).gql;

    const result = await gql(`
      query {
        products(category: "Electronics") {
          id
          category
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const products = result.data?.products || [];
    expect(products.every((p: any) => p.category === 'Electronics')).toBe(true);
  });

  it('should get product by id', async () => {
    const gql = (global as any).gql;

    const result = await gql(`
      query {
        product(id: "1") {
          id
          name
          price
          createdAt
          updatedAt
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    expect(result.data?.product?.id).toBe('1');
    expect(result.data?.product?.createdAt).toMatch(/\d{4}-\d{2}-\d{2}T/); // ISO date
  });
});

describe('Protected Mutations', () => {
  it('should require authentication', async () => {
    const gql = (global as any).gql;

    const result = await gql(`
      mutation {
        createProduct(input: { name: "New Product" }) {
          id
          name
        }
      }
    `);

    // Should fail without token
    expect(result.errors).toBeDefined();
  });

  it('should allow authenticated request with token', async () => {
    const gql = (global as any).gql;
    const makeToken = (global as any).makeToken;

    const token = makeToken('user-123', 'admin');

    const result = await gql(
      `
        mutation {
          createProduct(input: { name: "New Product" }) {
            id
            name
          }
        }
      `,
      {},
      token
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.createProduct?.id).toBeDefined();
  });
});
```

### Key Patterns

- **Global setup** — Database, migrations, seed run once per test suite
- **Global helpers** — `gql()` and `makeToken()` available to all tests
- **Token in Authorization header** — GraphQL context extracts it
- **Check `result.errors` first** — Always verify errors before accessing data
- **Federation verification** — Test cross-subgraph queries in gateway e2e

---

## Pattern: Testing with HTTP-Only Cookies (Refresh Tokens)

For mutations that set HTTP-only cookies (like login), use `gqlWithCookies()` helper.

### ✅ Cookie-Aware GraphQL Helper

```typescript
// apps/api-auth-e2e/src/support/test-setup.ts
import { CookieJar } from 'tough-cookie';
import fetch from 'node-fetch';

async function gqlWithCookies(
  jar: CookieJar,
  query: string,
  variables?: Record<string, unknown>,
  token?: string
): Promise<GqlResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Attach cookies from jar
  const cookies = await jar.getCookies('http://localhost:3304');
  if (cookies.length > 0) {
    headers['Cookie'] = cookies.map((c) => `${c.key}=${c.value}`).join('; ');
  }

  const response = await fetch('http://localhost:3304/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  // Store Set-Cookie header in jar
  const setCookieHeaders = response.headers.raw()['set-cookie'] || [];
  for (const setCookieHeader of setCookieHeaders) {
    await jar.setCookie(setCookieHeader, 'http://localhost:3304');
  }

  return response.json() as Promise<GqlResponse>;
}

module.exports = async function () {
  (global as any).gql = gql;
  (global as any).gqlWithCookies = gqlWithCookies;
  (global as any).makeToken = makeToken;
  (global as any).CookieJar = CookieJar;
};
```

### E2E Test with Cookies

```typescript
describe('Auth with Refresh Cookies', () => {
  it('should login and refresh token using cookie', async () => {
    const gqlWithCookies = (global as any).gqlWithCookies;
    const CookieJar = (global as any).CookieJar;

    const jar = new CookieJar();

    // 1. Login
    const loginResult = await gqlWithCookies(
      jar,
      `
        mutation {
          login(email: "admin@test.com", password: "password") {
            accessToken
            userId
          }
        }
      `
    );

    expect(loginResult.errors).toBeUndefined();
    expect(loginResult.data?.login?.accessToken).toBeDefined();

    // Cookie jar now has refresh token

    // 2. Refresh using stored cookie
    const refreshResult = await gqlWithCookies(
      jar,
      `
        mutation {
          refreshToken {
            accessToken
            userId
          }
        }
      `
    );

    expect(refreshResult.errors).toBeUndefined();
    expect(refreshResult.data?.refreshToken?.accessToken).toBeDefined();
  });
});
```

---

## Common Pitfalls

1. **Not mocking PrismaService** — Real database accessed, tests become slow and fragile
2. **Forgetting `jest.clearAllMocks()`** — Mock state leaks between tests
3. **Testing implementation details** — Test behavior, not that mock was called with exact args
4. **Not verifying Prisma calls** — Don't verify internal implementation, only public behavior
5. **Not handling Date transformation** — Service returns ISO strings, test for that
6. **Running migrations from wrong directory** — Prisma reads .env from current directory
7. **Not waiting for GraphQL readiness** — Port open ≠ GraphQL ready (query `__typename`)
8. **Not setting Authorization header** — Token needs `Bearer ` prefix
9. **Checking `result.data` without checking `result.errors`** — Data is undefined if errors exist
10. **Testing federation in unit tests** — Federation only works in e2e with real subgraphs

---

## References

- CLAUDE.md → "Testing Strategy"
- `.claude/rules/testing.md` — Test-first patterns
- `.claude/rules/nestjs-graphql-patterns.md` — JWT guards in tests
- `@nestjs/testing` docs: https://docs.nestjs.com/fundamentals/testing
- Jest docs: https://jestjs.io/docs/getting-started
