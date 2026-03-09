# Prisma Multi-Database Pattern (One DB per Service)

## Pattern: Independent Database per NestJS Service

Each service owns a dedicated PostgreSQL database (true microservice independence). Each service has its own Prisma schema, migrations, and seed data.

### Why This Matters

- **True service independence** — Database schema changes don't affect other services
- **Independent scaling** — Each service can optimize its database independently
- **Clear data ownership** — Services don't share tables or schemas
- **Easy deployment** — Services can be deployed independently
- **Debugging clarity** — Bugs are isolated to specific database layer

### Database Mapping

| Service     | Port | Database Name | DATABASE_URL Env Var | Prisma Output        |
| ----------- | ---- | ------------- | -------------------- | -------------------- |
| api-product | 5432 | product_db    | DATABASE_URL_PRODUCT | src/generated/prisma |
| api-cart    | 5433 | cart_db       | DATABASE_URL_CART    | src/generated/prisma |
| api-order   | 5434 | order_db      | DATABASE_URL_ORDER   | src/generated/prisma |
| api-auth    | 5435 | auth_db       | DATABASE_URL_AUTH    | src/generated/prisma |
| api-user    | 5436 | user_db       | DATABASE_URL_USER    | src/generated/prisma |

---

## Pattern: PrismaService (Database Connection)

Each service implements PrismaService with lifecycle management and PrismaPg adapter.

### ✅ PrismaService Implementation

```typescript
// apps/api-*/src/app/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private prisma: PrismaClient;
  private pool: Pool;

  constructor() {
    // Connection string from environment variable
    // Defaults provided for local development
    const connectionString =
      process.env.DATABASE_URL_PRODUCT || // ← Service-specific env var
      'postgresql://postgres:postgres@localhost:5432/product_db'; // Default for dev

    // PrismaPg adapter for native PostgreSQL support
    this.pool = new Pool({ connectionString });
    const adapter = new PrismaPg(this.pool);

    this.prisma = new PrismaClient({ adapter });
  }

  // ✅ Lifecycle hooks
  async onModuleInit() {
    // Pool connection is established, ready to use
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
    await this.pool.end(); // Close connection pool
  }

  // ✅ Proxy table access (allows dependency injection as PrismaService)
  get product() {
    return this.prisma.product;
  }

  get cart() {
    return this.prisma.cart;
  }

  // ✅ Proxy utilities for transactions
  get $transaction() {
    return this.prisma.$transaction.bind(this.prisma);
  }
}
```

### Registering PrismaService

```typescript
// apps/api-*/src/app/app.module.ts
@Module({
  providers: [
    PrismaService, // ✅ Single instance shared across module
    ProductResolver,
    ProductService,
    // ... other providers
  ],
})
export class AppModule {}
```

### Using PrismaService in Services

```typescript
// apps/api-*/src/app/product.service.ts
@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async findAll(options: FindAllOptions): Promise<Product[]> {
    // Use injected PrismaService to query product table
    return this.prisma.product.findMany({
      where: {
        /* filters */
      },
      skip: options.offset,
      take: options.limit,
    });
  }

  async findById(id: string): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: { id },
    });
  }
}
```

---

## Pattern: Prisma Schema Structure

Each service has its own `prisma/schema.prisma` file tailored to its domain.

### ✅ Schema Example (api-product)

```prisma
// apps/api-product/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"  // ← Service-specific output directory
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL_PRODUCT")  // ← Service-specific env var
}

model Product {
  id          String   @id @default(uuid())
  name        String
  description String
  price       Float
  category    String
  sku         String   @unique
  rating      Float    @default(0)
  inStock     Boolean  @default(true)
  tags        String[] @default([])
  imageUrl    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Key Patterns

- **UUID primary keys**: `@id @default(uuid())` for distributed systems
- **Timestamps**: `@default(now())` and `@updatedAt` for tracking
- **PostgreSQL arrays**: `String[] @default([])` for flexibility
- **Unique constraints**: `@unique` on business identifiers (sku, email)
- **Optional fields**: `String?` for nullable columns
- **Prisma client output**: Always output to `../src/generated/prisma`

### ❌ What NOT to Do

```prisma
# ❌ Wrong database URL — points to shared database
url = env("DATABASE_URL")  # ← Shared across services!

# ❌ Wrong output path — conflicts with other services
output = "../../../node_modules/.prisma/client"

# ❌ Using serial IDs — doesn't scale in distributed systems
id Int @id @default(autoincrement())
```

---

## Pattern: .env File per Service

Each service has its own `.env` file with service-specific environment variables.

### ✅ Environment File Example

```bash
# apps/api-product/.env
DATABASE_URL_PRODUCT=postgresql://postgres:postgres@localhost:5432/product_db
JWT_SECRET=dev-secret-key
NODE_ENV=development
PORT=3301
DEBUG_PORT=9500

# Optional: Logging
LOG_LEVEL=debug
```

### Database URL Format

```
postgresql://username:password@host:port/database_name
```

- **username**: `postgres` (default for local)
- **password**: `postgres` (default for local)
- **host**: `localhost` (local) or `db` (Docker)
- **port**: Service-specific (5432, 5433, 5434, etc.)
- **database_name**: Service-specific (product_db, cart_db, etc.)

### Key Pattern: Service-Specific Env Vars

Each service has **its own DATABASE_URL variant**:

```bash
# api-product/.env
DATABASE_URL_PRODUCT=postgresql://...

# api-cart/.env
DATABASE_URL_CART=postgresql://...

# api-order/.env
DATABASE_URL_ORDER=postgresql://...
```

**Why**: PrismaService reads `process.env.DATABASE_URL_PRODUCT` to avoid conflicts.

---

## Pattern: Migrations Workflow

Migrations run **from each service's directory** to pick up local `.env` file.

### ✅ Generate Prisma Client

```bash
cd apps/api-product
npx prisma generate  # Reads DATABASE_URL_PRODUCT from .env
```

### ✅ Create Migration

```bash
cd apps/api-product
npx prisma migrate dev --name add_product_table
# Creates: apps/api-product/prisma/migrations/<timestamp>_add_product_table/
```

### ✅ Run Migration

```bash
cd apps/api-product
npx prisma migrate deploy  # Applies pending migrations
```

### ✅ Seed Database

```bash
cd apps/api-product
npx prisma db seed  # Runs prisma/seed.ts
```

### Why Directory Matters

Prisma CLI reads `.env` file from **current working directory**. If you run migrations from root, `.env` in apps/api-product won't be found.

```bash
# ❌ Wrong — reads root .env (doesn't exist)
npx prisma migrate deploy --schema=apps/api-product/prisma/schema.prisma

# ✅ Correct — reads apps/api-product/.env
cd apps/api-product && npx prisma migrate deploy
```

---

## Pattern: Seed Script (Idempotent)

Use `.upsert()` instead of `.create()` for idempotent seeding (safe to run multiple times).

### ✅ Seed Script Example

```typescript
// apps/api-product/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL_PRODUCT ||
  'postgresql://postgres:postgres@localhost:5432/product_db';

async function main() {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // ✅ Use upsert for idempotency (safe to run multiple times)
    await prisma.product.upsert({
      where: { sku: 'PROD-001' },
      update: {}, // Do nothing if already exists
      create: {
        id: '1',
        sku: 'PROD-001',
        name: 'Wireless Headphones',
        description: 'Noise-canceling Bluetooth headphones',
        price: 79.99,
        category: 'Electronics',
        inStock: true,
        rating: 4.5,
      },
    });

    await prisma.product.upsert({
      where: { sku: 'PROD-002' },
      update: {},
      create: {
        id: '2',
        sku: 'PROD-002',
        name: 'USB-C Charger',
        description: '65W fast charger',
        price: 49.99,
        category: 'Accessories',
        inStock: true,
        rating: 4.8,
      },
    });

    console.log('✅ Seed complete: 2 products created/verified');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    // ✅ Always cleanup connections
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
```

### Seed Script in package.json

```json
{
  "scripts": {
    "db:seed": "node --require ts-node/register --experimental-strip-types prisma/seed.ts"
  }
}
```

### Key Patterns

- **`upsert()` pattern**: `where: { uniqueField }, update: {}, create: { ... }`
- **Always disconnect**: `prisma.$disconnect()` in finally block
- **Always close pool**: `pool.end()` in finally block
- **Error handling**: Re-throw errors after cleanup
- **Logging**: Use `console.log` for visibility in CI

---

## Pattern: Docker Compose for Local Development

Each service's `docker-compose.yml` defines its PostgreSQL container.

### ✅ Docker Compose Example

```yaml
# apps/api-product/docker-compose.yml
version: '3.8'

services:
  product_db:
    image: postgres:15-alpine
    container_name: product_db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: product_db
    ports:
      - '5432:5432' # ← Service-specific port
    volumes:
      - product_db_volume:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  product_db_volume:
```

### Start All Services

```bash
# From root
docker compose -f apps/api-product/docker-compose.yml up -d
docker compose -f apps/api-cart/docker-compose.yml up -d
docker compose -f apps/api-order/docker-compose.yml up -d
```

---

## Pattern: CI Database Setup

In CI (GitHub Actions), use Docker services to start PostgreSQL databases.

### ✅ CI Configuration (.github/workflows/ci.yml)

```yaml
services:
  product_db:
    image: postgres:15-alpine
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: product_db
    options: >-
      --health-cmd pg_isready
      --health-interval 5s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432

  cart_db:
    # Similar setup for port 5433

  order_db:
    # Similar setup for port 5434

steps:
  - name: Generate Prisma clients
    run: |
      cd apps/api-product && npx prisma generate
      cd apps/api-cart && npx prisma generate
      cd apps/api-order && npx prisma generate

  - name: Run migrations
    run: |
      cd apps/api-product && npx prisma migrate deploy
      cd apps/api-cart && npx prisma migrate deploy
      cd apps/api-order && npx prisma migrate deploy

  - name: Seed databases
    run: |
      cd apps/api-product && npm run db:seed
      cd apps/api-cart && npm run db:seed
      cd apps/api-order && npm run db:seed
```

---

## Common Pitfalls

1. **Shared DATABASE_URL** — Each service should have its own `DATABASE_URL_SERVICE` env var
2. **Running migrations from root** — Must run from service directory to pick up `.env` file
3. **Using `.create()` instead of `.upsert()` in seeds** — Second seed run fails if records exist
4. **Not cleaning up connections** — `prisma.$disconnect()` and `pool.end()` required in seeds
5. **Wrong Prisma output path** — Always output to `../src/generated/prisma` within each service
6. **Forgetting `OnModuleDestroy`** — Pool won't close, causing hanging connections
7. **Hardcoding connection strings** — Always read from `process.env.DATABASE_URL_SERVICE`
8. **Using serial IDs** — Use UUIDs (`@default(uuid())`) for distributed systems

---

## References

- CLAUDE.md → "Upcoming: Federated GraphQL API"
- `.claude/rules/testing.md` — E2E database setup patterns
- Prisma docs: https://www.prisma.io/docs
- PostgreSQL docs: https://www.postgresql.org/docs
- PrismaClient options: https://www.prisma.io/docs/reference/api-reference/prisma-client-reference
