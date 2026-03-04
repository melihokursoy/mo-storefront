# Implementation Plan: Auth and User API Subgraphs

## Context

The mo-storefront monorepo has an existing Apollo Federation v2 architecture with 3 subgraphs (product, cart, order) + gateway. This plan adds two new subgraphs: **api-auth** for authentication and **api-user** for user profile management, following the exact same patterns established by the existing services.

**Architecture after completion**:

```
┌─────────────────────┐
│  Next.js Storefront │
└──────────┬──────────┘
           │
      ┌────▼────────┐
      │ Apollo      │  Port 3300
      │ Gateway     │
      └────┬────────┘
           │
    ┌──────┼──────┬────────┬────────┬────────┐
    │      │      │        │        │        │
┌───▼──┐ ┌─▼──┐ ┌─▼──┐ ┌──▼──┐ ┌──▼──┐
│Prod  │ │Cart│ │Order│ │Auth │ │User │
│Sub   │ │Sub │ │Sub  │ │Sub  │ │Sub  │
└──────┘ └────┘ └─────┘ └─────┘ └─────┘
(3301) (3302) (3303)  (3304)  (3305)
```

## Current State

- 4 running services: api-gateway (3300), api-product (3301), api-cart (3302), api-order (3303)
- 3 PostgreSQL databases: product_db (5432), cart_db (5433), order_db (5434)
- JWT authentication via inline test tokens (no auth service)
- `customerId` is a hardcoded string, not a federated User entity
- All subgraphs follow identical file structure and patterns

## Port & Database Mapping

| Service      | App Port | DB Port  | Database    | ENV Variable          | Debug Port |
| ------------ | -------- | -------- | ----------- | --------------------- | ---------- |
| api-product  | 3301     | 5432     | product_db  | DATABASE_URL_PRODUCT  | 9500       |
| api-cart     | 3302     | 5433     | cart_db     | DATABASE_URL_CART     | 9501       |
| api-order    | 3303     | 5434     | order_db    | DATABASE_URL_ORDER    | 9502       |
| api-gateway  | 3300     | —        | —           | —                     | 9503       |
| **api-auth** | **3304** | **5435** | **auth_db** | **DATABASE_URL_AUTH** | **9504**   |
| **api-user** | **3305** | **5436** | **user_db** | **DATABASE_URL_USER** | **9505**   |

## Design Decision: Auth → User Communication

On registration, api-auth creates credentials in auth_db, then makes an **HTTP call to api-user's GraphQL endpoint** (a `createUser` mutation) to create the user profile in user_db. This maintains proper service boundaries — auth never writes directly to user_db.

**Implication**: api-user must be running before auth's register mutation works. For unit tests, the HTTP call is mocked. For e2e and local dev, api-user starts before api-auth (handled by Nx serve dependency chain).

## Implementation Steps

### Phase 1: Infrastructure

#### Checkpoint 1: Install dependencies and generate apps

Install new dependencies:

```sh
npm install bcrypt cookie-parser
npm install -D @types/bcrypt @types/cookie-parser
```

Generate both NestJS apps:

```sh
npx nx generate @nx/nest:app --name=api-auth --directory=apps/api-auth
npx nx generate @nx/nest:app --name=api-user --directory=apps/api-user
```

Set up each service with (copy patterns from api-product):

- `webpack.config.js` — update paths
- `tsconfig.json` / `tsconfig.app.json` — includes graphql-complexity reference
- `.env` — `DATABASE_URL_AUTH=...port 5435` / `DATABASE_URL_USER=...port 5436`, debug ports 9504/9505
- `docker-compose.yml` — auth_db (port 5435) / user_db (port 5436)
- `project.json` — targets: db:generate, db:migrate, db:seed, db:setup, serve (with db:setup dependency)

**Verify**: Both apps build with `npx nx build api-auth` and `npx nx build api-user`

---

#### Checkpoint 2: Prisma setup for both services

Create Prisma schemas following existing pattern (generator output to `src/generated/prisma`).

**api-auth Prisma schema** (`apps/api-auth/prisma/schema.prisma`):

- `Credential` model: id, email (unique), passwordHash, createdAt, updatedAt
- `RefreshToken` model: id, credentialId (FK), token (unique), expiresAt, revokedAt (nullable), createdAt

**api-user Prisma schema** (`apps/api-user/prisma/schema.prisma`):

- `User` model: id, name, email (unique), role (default "user"), isActive (default true), createdAt, updatedAt

Create `prisma/prisma.config.ts` for each (copy from api-product).

Create initial migration:

```sh
cd apps/api-auth && npx prisma migrate dev --name init --schema=prisma/schema.prisma
cd apps/api-user && npx prisma migrate dev --name init --schema=prisma/schema.prisma
```

Create `PrismaService` for each service following existing proxy pattern.

**Verify**: `npx prisma generate` works for both, migrations apply cleanly

---

#### Checkpoint 3: Root package.json scripts

Add npm scripts to root `package.json`:

- `db:generate:auth`, `db:generate:user`
- `db:migrate:auth`, `db:migrate:user`
- `db:seed:auth`, `db:seed:user`
- Update `db:generate`, `db:migrate`, `db:seed` aggregates to include auth + user

**Verify**: `npm run db:generate` succeeds for all 5 services

---

### Phase 2: User Subgraph (api-user)

> User subgraph is built first because auth depends on it for the register flow (HTTP call to create user profile).

#### Checkpoint 4: User entity, resolver, and service

**Files to create** (in `apps/api-user/src/app/`):

- `user.entity.ts` — User type with `@key(fields: "id")`, fields: id, name, email, role, isActive, createdAt, updatedAt
- `user.service.ts` — CRUD via PrismaService: findById, findByEmail, create, update, updateRole
- `user.resolver.ts` — Queries: `me` (authenticated). Mutations: `createUser` (internal, used by auth service), `updateProfile`, `updateUserRole` (admin-only). `@ResolveReference` for federation.
- `user.dataloader.ts` — DataLoader for batch user lookups
- `auth/jwt.guard.ts` — Copy from api-product (same pattern)
- `auth/jwt.strategy.ts` — Copy from api-product
- `prisma.service.ts` — Following existing proxy pattern with `DATABASE_URL_USER`

**app.module.ts**: Configure GraphQLModule with ApolloFederationDriver, JwtModule, complexity plugin (same as other subgraphs)

**main.ts**: Bootstrap on port 3305 with readiness check (copy from api-product)

**Role management rules**:

- `updateUserRole` mutation requires admin role (checked via JWT claims)
- Admin cannot change their own role (guard checks `context.userId !== targetUserId`)
- Non-admins receive authorization error

**`createUser` mutation**: Called by api-auth during registration. Could be protected with an internal service token or left public since it only creates basic profiles.

**Verify**: `npx nx serve api-user` starts, `{ __typename }` query works, `me` query returns user with valid JWT

---

#### Checkpoint 5: User seed data and unit tests

**Seed data** (`apps/api-user/prisma/seed.ts`):

- Admin user (id: "user-admin-1", name: "Admin User", email: "admin@test.com", role: "admin")
- Regular user (id: "user-1", name: "Test User", email: "user@test.com", role: "user")

**Unit tests** — following existing NestJS testing pattern (mock PrismaService, use `@nestjs/testing`):

`user.service.spec.ts`:

- findById: returns user with ISO date strings, returns null when not found
- findByEmail: returns user by email, returns null when not found
- create: calls prisma.user.create with correct data
- update: updates profile fields, rejects non-existent user
- updateRole: updates role field, rejects if target user not found

`user.resolver.spec.ts`:

- me query: delegates to findById with userId from context
- updateProfile: delegates to update with userId from context
- updateUserRole: admin can change role, rejects non-admin, rejects admin self-demote
- resolveReference: delegates to findById with reference id

**Verify**: `npm run db:seed:user` works, `npx nx test api-user` passes

---

### Phase 3: Auth Subgraph (api-auth)

> Auth depends on api-user being available for the register flow (HTTP call to create user profile).

#### Checkpoint 6: Auth entity, resolver, and service

**Files to create** (in `apps/api-auth/src/app/`):

- `auth.entity.ts` — GraphQL types: `AuthPayload` (accessToken: String, userId: String, email: String), `LogoutPayload` (success: Boolean)
- `auth.service.ts` — register, login, refresh, logout
- `auth.resolver.ts` — Mutations: `register`, `login`, `refreshToken`, `logout`
- `prisma.service.ts` — Following existing proxy pattern with `DATABASE_URL_AUTH`

**No JWT guard on auth resolver** — register and login are public. Refresh uses HTTP-only cookie. Logout requires valid access token.

**Token handling**:

- Access token: returned in response body as `accessToken` field
- Refresh token: set as HTTP-only secure cookie via `res.cookie()` from GraphQL context
- On refresh: read from `req.cookies`, validate against DB, issue new pair
- On logout: clear cookie + mark token as revoked in database

**Inter-service communication** (auth → user):

- On register: auth service makes HTTP POST to `http://localhost:3305/graphql` with `createUser` mutation
- Uses `fetch()` — no additional HTTP client library needed
- Auth service must handle failure (user creation fails → rollback credential creation)

**app.module.ts**: Configure with ApolloFederationDriver, JwtModule, cookie-parser. Import bcrypt in auth.service.ts directly.

**main.ts**: Bootstrap on port 3304, enable `cookie-parser` middleware via `app.use(cookieParser())`, readiness check.

**Verify**: `npx nx serve api-auth` starts, register creates credential + user, login returns access token + sets refresh cookie

---

#### Checkpoint 7: Auth seed data and unit tests

**Seed data** (`apps/api-auth/prisma/seed.ts`):

- Admin: id "user-admin-1", email "admin@test.com", password "admin123" (bcrypt hashed)
- User: id "user-1", email "user@test.com", password "user123" (bcrypt hashed)

**Important**: Auth credential IDs must match User IDs so JWT claims reference the same entity.

**Unit tests** (mock PrismaService, mock bcrypt, mock fetch for user subgraph call):

`auth.service.spec.ts`:

- register: hashes password, creates credential, calls user subgraph via HTTP, returns tokens
- register duplicate email: throws error for existing email
- login valid: verifies password with bcrypt, issues access + refresh tokens
- login invalid password: throws error
- login non-existent email: throws error
- refreshToken valid: validates token from DB, issues new pair, revokes old
- refreshToken expired/revoked: throws error
- logout: marks refresh token as revoked in DB

`auth.resolver.spec.ts`:

- register mutation: delegates to service, sets refresh cookie on response
- login mutation: delegates to service, sets refresh cookie on response
- refreshToken mutation: reads cookie from request, delegates to service
- logout mutation: requires valid access token, clears cookie

**Verify**: `npm run db:seed:auth` works, `npx nx test api-auth` passes

---

### Phase 4: Gateway Integration

#### Checkpoint 8: Register new subgraphs in gateway

Update `apps/api-gateway/src/app/app.module.ts`:

- Add to IntrospectAndCompose subgraphs array:
  ```
  { name: 'auth', url: 'http://localhost:3304/graphql' }
  { name: 'user', url: 'http://localhost:3305/graphql' }
  ```

Update `apps/api-gateway/src/main.ts`:

- Add auth (3304) and user (3305) to `waitForSubgraphs()` health checks

Update `apps/api-gateway/project.json`:

- Add api-auth and api-user to serve dependencies and implicitDependencies
- **Dependency order**: api-user starts before api-auth (auth depends on user for register)

**Cookie forwarding**: Update `AuthenticatedDataSource.willSendRequest` to also forward `cookie` header to subgraphs (needed for refresh token flow through gateway).

**Verify**: Gateway starts with all 5 subgraphs, schema introspection shows auth mutations and user queries

---

### Phase 5: Federation — User Entity References

#### Checkpoint 9: Update Cart and Order to reference User entity

**api-cart changes**:

- Add `User` stub entity with `@key(fields: "id")` and `@external` directive
- Cart entity: add `user` field that resolves to User entity reference (return `{ __typename: 'User', id: cart.userId }`)
- Keep `userId` field for backward compatibility

**api-order changes**:

- Add `User` stub entity with `@key(fields: "id")` and `@external` directive
- Order entity: add `user` field that resolves to User entity reference (return `{ __typename: 'User', id: order.userId }`)
- Keep `userId` field for backward compatibility

**Verify**: Gateway query `{ cart { user { name email } } }` resolves user from user subgraph, same for orders

---

### Phase 6: E2E Tests

#### Checkpoint 10: api-auth-e2e project and tests

Create `apps/api-auth-e2e/` manually (copy structure from api-product-e2e):

**Project scaffolding**:

- `package.json` — name: `@org/api-auth-e2e`, implicitDependencies: `["api-auth"]`, e2e dependsOn `api-auth:build` + `api-auth:serve`
- `project.json` — e2e executor `@nx/jest:jest`, dependsOn `api-auth:serve`
- `jest.config.cts` — CommonJS format, displayName `api-auth-e2e`
- `.spec.swcrc` — copy from api-product-e2e
- `tsconfig.json` — extends `../../tsconfig.base.json`, outDir `out-tsc/api-auth-e2e`

**Support files**:

- `global-setup.ts` — wait for api-auth on port 3304 (also needs api-user on 3305 since register calls user subgraph), verify `{ __typename }`
- `global-teardown.ts` — log completion
- `test-setup.ts` — `gql()` at `http://localhost:3304/graphql`, `makeToken()`, `gqlWithCookies()` helper that captures `set-cookie` headers

**Test spec** (`api-auth.spec.ts`):

- Register: creates new user, returns accessToken + userId
- Register duplicate: returns error for existing email
- Login valid: returns accessToken
- Login wrong password: returns error
- Login non-existent email: returns error
- Token refresh: login first to get cookie, then refresh → new accessToken
- Token refresh invalid cookie: returns error
- Logout: invalidates refresh token, subsequent refresh fails

**Verify**: `npx nx e2e api-auth-e2e` passes

---

#### Checkpoint 11: api-user-e2e project and tests

Create `apps/api-user-e2e/` following identical scaffolding pattern.

**Support files**:

- `global-setup.ts` — wait for api-user on port 3305
- `test-setup.ts` — `gql()` at `http://localhost:3305/graphql`, `makeToken(userId, role)` with role claim in JWT

**Test spec** (`api-user.spec.ts`):

- me query: returns profile when authenticated (user-1)
- me query: rejects unauthenticated
- updateProfile: updates name with valid token
- updateProfile: rejects unauthenticated
- updateUserRole: admin can change user role
- updateUserRole: non-admin rejected
- updateUserRole: admin cannot self-demote
- resolveReference: resolves user by id (federation)

**Verify**: `npx nx e2e api-user-e2e` passes

---

#### Checkpoint 12: Update gateway e2e tests

Update existing `apps/api-gateway-e2e/`:

**Modified files**:

- `global-setup.ts` — add auth (3304) and user (3305) to SERVICES array
- `test-setup.ts` — update `makeToken()` to accept `role` parameter

**New spec** (`auth-federation.spec.ts`):

- Register user via gateway
- Login and query me profile in single flow
- Refresh token via gateway (cookie forwarding)
- Resolve user in cart query (cross-subgraph)
- Resolve user in orders query (cross-subgraph)
- Reject unauthenticated me query via gateway
- Forward admin role for role management via gateway

**Existing specs**: No changes needed — they continue to pass as-is.

**Verify**: `npx nx e2e api-gateway-e2e` passes (all specs)

---

### Phase 7: CI & Final Validation

#### Checkpoint 13: CI pipeline updates and full validation

Update `.github/workflows/ci.yml`:

- Add `DATABASE_URL_AUTH` and `DATABASE_URL_USER` env vars (ports 5435, 5436)
- Add docker services for auth_db and user_db
- Add `npm run db:generate:auth && npm run db:generate:user` to generate step

Run full validation:

```sh
npx nx run-many -t lint test typecheck build
npx nx e2e api-auth-e2e
npx nx e2e api-user-e2e
npx nx e2e api-gateway-e2e
```

**Verify**: All checks green, no regressions in existing services

---

## Files Created/Modified Summary

### New files (api-auth)

- `apps/api-auth/src/main.ts`
- `apps/api-auth/src/app/app.module.ts`
- `apps/api-auth/src/app/app.controller.ts`
- `apps/api-auth/src/app/app.service.ts`
- `apps/api-auth/src/app/auth.entity.ts`
- `apps/api-auth/src/app/auth.resolver.ts`
- `apps/api-auth/src/app/auth.service.ts`
- `apps/api-auth/src/app/auth.service.spec.ts`
- `apps/api-auth/src/app/auth.resolver.spec.ts`
- `apps/api-auth/src/app/prisma.service.ts`
- `apps/api-auth/prisma/schema.prisma`
- `apps/api-auth/prisma/prisma.config.ts`
- `apps/api-auth/prisma/seed.ts`
- `apps/api-auth/docker-compose.yml`
- `apps/api-auth/.env`
- `apps/api-auth/project.json`
- `apps/api-auth/tsconfig.json`
- `apps/api-auth/tsconfig.app.json`
- `apps/api-auth/webpack.config.js`

### New files (api-user)

- `apps/api-user/src/main.ts`
- `apps/api-user/src/app/app.module.ts`
- `apps/api-user/src/app/app.controller.ts`
- `apps/api-user/src/app/app.service.ts`
- `apps/api-user/src/app/user.entity.ts`
- `apps/api-user/src/app/user.resolver.ts`
- `apps/api-user/src/app/user.service.ts`
- `apps/api-user/src/app/user.service.spec.ts`
- `apps/api-user/src/app/user.resolver.spec.ts`
- `apps/api-user/src/app/user.dataloader.ts`
- `apps/api-user/src/app/auth/jwt.guard.ts`
- `apps/api-user/src/app/auth/jwt.strategy.ts`
- `apps/api-user/src/app/prisma.service.ts`
- `apps/api-user/prisma/schema.prisma`
- `apps/api-user/prisma/prisma.config.ts`
- `apps/api-user/prisma/seed.ts`
- `apps/api-user/docker-compose.yml`
- `apps/api-user/.env`
- `apps/api-user/project.json`
- `apps/api-user/tsconfig.json`
- `apps/api-user/tsconfig.app.json`
- `apps/api-user/webpack.config.js`

### New files (api-auth-e2e)

- `apps/api-auth-e2e/package.json`
- `apps/api-auth-e2e/project.json`
- `apps/api-auth-e2e/jest.config.cts`
- `apps/api-auth-e2e/.spec.swcrc`
- `apps/api-auth-e2e/tsconfig.json`
- `apps/api-auth-e2e/src/support/global-setup.ts`
- `apps/api-auth-e2e/src/support/global-teardown.ts`
- `apps/api-auth-e2e/src/support/test-setup.ts`
- `apps/api-auth-e2e/src/api-auth/api-auth.spec.ts`

### New files (api-user-e2e)

- `apps/api-user-e2e/package.json`
- `apps/api-user-e2e/project.json`
- `apps/api-user-e2e/jest.config.cts`
- `apps/api-user-e2e/.spec.swcrc`
- `apps/api-user-e2e/tsconfig.json`
- `apps/api-user-e2e/src/support/global-setup.ts`
- `apps/api-user-e2e/src/support/global-teardown.ts`
- `apps/api-user-e2e/src/support/test-setup.ts`
- `apps/api-user-e2e/src/api-user/api-user.spec.ts`

### New files (gateway e2e addition)

- `apps/api-gateway-e2e/src/api-gateway/auth-federation.spec.ts`

### Modified files

- `apps/api-gateway/src/app/app.module.ts` — add auth + user subgraphs, forward cookies
- `apps/api-gateway/src/main.ts` — add auth + user to health checks
- `apps/api-gateway/project.json` — add api-auth, api-user dependencies
- `apps/api-cart/src/app/cart.entity.ts` — add User entity reference
- `apps/api-cart/src/app/cart.resolver.ts` — resolve user field
- `apps/api-order/src/app/order.entity.ts` — add User entity reference
- `apps/api-order/src/app/order.resolver.ts` — resolve user field
- `apps/api-gateway-e2e/src/support/global-setup.ts` — add auth + user ports
- `apps/api-gateway-e2e/src/support/test-setup.ts` — makeToken with role param
- `package.json` — add db scripts for auth + user, add bcrypt + cookie-parser deps
- `.github/workflows/ci.yml` — add auth_db + user_db, generate/migrate steps
