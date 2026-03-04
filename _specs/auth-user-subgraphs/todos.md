# Auth and User API Subgraphs — Progress Tracking

## Phase 1: Infrastructure

### Checkpoint 1: Install dependencies and generate apps

- [ ] Install bcrypt, cookie-parser, @types/bcrypt, @types/cookie-parser
- [ ] Generate api-auth with `@nx/nest:app`
- [ ] Generate api-user with `@nx/nest:app`
- [ ] Create webpack.config.js for both (copy from api-product)
- [ ] Create tsconfig.json / tsconfig.app.json for both
- [ ] Create .env files (DATABASE_URL_AUTH port 5435, DATABASE_URL_USER port 5436, debug ports 9504/9505)
- [ ] Create docker-compose.yml for both (auth_db, user_db)
- [ ] Create project.json targets (db:generate, db:migrate, db:seed, db:setup, serve)
- [ ] Verify both apps build

### Checkpoint 2: Prisma setup for both services

- [ ] Create api-auth prisma schema (Credential, RefreshToken models)
- [ ] Create api-user prisma schema (User model with role field)
- [ ] Create prisma.config.ts for both
- [ ] Run initial migrations for both
- [ ] Create PrismaService for both (proxy pattern)
- [ ] Verify prisma generate works for both

### Checkpoint 3: Root package.json scripts

- [ ] Add db:generate:auth, db:generate:user scripts
- [ ] Add db:migrate:auth, db:migrate:user scripts
- [ ] Add db:seed:auth, db:seed:user scripts
- [ ] Update aggregate db scripts (db:generate, db:migrate, db:seed)
- [ ] Verify `npm run db:generate` succeeds for all services

## Phase 2: User Subgraph (api-user)

> User subgraph built first — auth depends on it for register (HTTP call to create user profile).

### Checkpoint 4: User entity, resolver, and service

- [ ] Create user.entity.ts (User with @key, fields: id, name, email, role, isActive)
- [ ] Create user.service.ts (findById, findByEmail, create, update, updateRole)
- [ ] Create user.resolver.ts (me query, createUser, updateProfile, updateUserRole, ResolveReference)
- [ ] Create user.dataloader.ts
- [ ] Copy auth/jwt.guard.ts and auth/jwt.strategy.ts from api-product
- [ ] Create prisma.service.ts with DATABASE_URL_USER
- [ ] Configure app.module.ts (ApolloFederationDriver, JwtModule, complexity plugin)
- [ ] Create main.ts (port 3305, readiness check)
- [ ] Implement admin role guard (only admins change roles, cannot self-demote)
- [ ] Verify api-user serves and responds to queries

### Checkpoint 5: User seed data and unit tests

- [ ] Create seed.ts with admin user and regular user
- [ ] Verify db:seed:user works
- [ ] Create user.service.spec.ts
  - [ ] findById: returns user with ISO dates, returns null when not found
  - [ ] findByEmail: returns user by email, returns null when not found
  - [ ] create: calls prisma.user.create with correct data
  - [ ] update: updates profile fields, rejects non-existent user
  - [ ] updateRole: updates role field, rejects if target user not found
- [ ] Create user.resolver.spec.ts
  - [ ] me query: delegates to findById with userId from context
  - [ ] updateProfile: delegates to update with userId from context
  - [ ] updateUserRole: admin can change role, rejects non-admin, rejects admin self-demote
  - [ ] resolveReference: delegates to findById with reference id
- [ ] Verify `npx nx test api-user` passes

## Phase 3: Auth Subgraph (api-auth)

> Auth depends on api-user for register (HTTP call to create user profile via createUser mutation).

### Checkpoint 6: Auth entity, resolver, and service

- [ ] Create auth.entity.ts (AuthPayload: accessToken + userId + email, LogoutPayload: success)
- [ ] Create auth.service.ts (register, login, refresh, logout)
- [ ] Create auth.resolver.ts (register, login, refreshToken, logout mutations)
- [ ] Create prisma.service.ts with DATABASE_URL_AUTH
- [ ] Configure app.module.ts (ApolloFederationDriver, JwtModule, cookie-parser)
- [ ] Create main.ts (port 3304, cookie-parser middleware, readiness check)
- [ ] Implement HTTP-only cookie for refresh tokens (set on login/register, read on refresh, clear on logout)
- [ ] Implement HTTP call to api-user's createUser mutation on register
- [ ] Handle auth→user failure (rollback credential if user creation fails)
- [ ] Verify register, login, refresh, logout flow works

### Checkpoint 7: Auth seed data and unit tests

- [ ] Create seed.ts with bcrypt-hashed credentials matching user seed data
- [ ] Verify db:seed:auth works
- [ ] Create auth.service.spec.ts (mock PrismaService, mock bcrypt, mock fetch)
  - [ ] register: hashes password, creates credential, calls user subgraph, returns tokens
  - [ ] register duplicate email: throws error
  - [ ] login valid: verifies password, issues access + refresh tokens
  - [ ] login invalid password: throws error
  - [ ] login non-existent email: throws error
  - [ ] refreshToken valid: validates token, issues new pair, revokes old
  - [ ] refreshToken expired/revoked: throws error
  - [ ] logout: marks refresh token as revoked
- [ ] Create auth.resolver.spec.ts
  - [ ] register mutation: delegates to service, sets refresh cookie
  - [ ] login mutation: delegates to service, sets refresh cookie
  - [ ] refreshToken mutation: reads cookie, delegates to service
  - [ ] logout mutation: requires valid token, clears cookie
- [ ] Verify `npx nx test api-auth` passes

## Phase 4: Gateway Integration

### Checkpoint 8: Register new subgraphs in gateway

- [ ] Add auth + user to IntrospectAndCompose subgraphs in app.module.ts
- [ ] Add auth + user to waitForSubgraphs() in main.ts
- [ ] Update project.json: add api-auth, api-user dependencies (api-user before api-auth)
- [ ] Forward cookie header in AuthenticatedDataSource
- [ ] Verify gateway starts with all 5 subgraphs

## Phase 5: Federation — User Entity References

### Checkpoint 9: Update Cart and Order to reference User entity

- [ ] api-cart: add User stub entity with @key and @external
- [ ] api-cart: add user field to Cart entity, resolve via federation
- [ ] api-order: add User stub entity with @key and @external
- [ ] api-order: add user field to Order entity, resolve via federation
- [ ] Verify cart query with nested user resolves through gateway
- [ ] Verify order query with nested user resolves through gateway

## Phase 6: E2E Tests

### Checkpoint 10: api-auth-e2e project and tests

- [ ] Create api-auth-e2e project scaffolding
  - [ ] package.json (name: @org/api-auth-e2e, implicitDependencies: api-auth)
  - [ ] project.json (e2e executor, dependsOn: api-auth:serve)
  - [ ] jest.config.cts (CommonJS, displayName: api-auth-e2e)
  - [ ] .spec.swcrc (copy from api-product-e2e)
  - [ ] tsconfig.json (outDir: out-tsc/api-auth-e2e)
- [ ] Create support files
  - [ ] global-setup.ts (wait for port 3304 + 3305, verify \_\_typename query)
  - [ ] global-teardown.ts (log completion)
  - [ ] test-setup.ts (gql() at localhost:3304, makeToken(), gqlWithCookies())
- [ ] Create api-auth.spec.ts with tests:
  - [ ] Register: creates user, returns accessToken + userId
  - [ ] Register duplicate: returns error for existing email
  - [ ] Login valid: returns accessToken
  - [ ] Login wrong password: returns error
  - [ ] Login non-existent email: returns error
  - [ ] Token refresh: login first, then refresh with cookie → new accessToken
  - [ ] Token refresh invalid cookie: returns error
  - [ ] Logout: invalidates refresh token, subsequent refresh fails
- [ ] Verify `npx nx e2e api-auth-e2e` passes

### Checkpoint 11: api-user-e2e project and tests

- [ ] Create api-user-e2e project scaffolding
  - [ ] package.json, project.json, jest.config.cts, .spec.swcrc, tsconfig.json
- [ ] Create support files
  - [ ] global-setup.ts (wait for port 3305)
  - [ ] global-teardown.ts
  - [ ] test-setup.ts (gql() at localhost:3305, makeToken(userId, role))
- [ ] Create api-user.spec.ts with tests:
  - [ ] me query: returns profile when authenticated (user-1)
  - [ ] me query: rejects unauthenticated request
  - [ ] updateProfile: updates name with valid token
  - [ ] updateProfile: rejects unauthenticated
  - [ ] updateUserRole: admin can change user role
  - [ ] updateUserRole: non-admin rejected
  - [ ] updateUserRole: admin cannot self-demote
  - [ ] resolveReference: resolves user by id (federation)
- [ ] Verify `npx nx e2e api-user-e2e` passes

### Checkpoint 12: Update gateway e2e tests

- [ ] Update global-setup.ts: add auth (3304) and user (3305) to SERVICES array
- [ ] Update test-setup.ts: makeToken() accepts role param
- [ ] Create auth-federation.spec.ts with tests:
  - [ ] Register user via gateway
  - [ ] Login and query me profile in single flow
  - [ ] Refresh token via gateway (cookie forwarding)
  - [ ] Resolve user in cart query (cross-subgraph)
  - [ ] Resolve user in orders query (cross-subgraph)
  - [ ] Reject unauthenticated me query via gateway
  - [ ] Forward admin role for role management via gateway
- [ ] Verify existing federation-integration.spec.ts still passes
- [ ] Verify `npx nx e2e api-gateway-e2e` passes (all specs)

## Phase 7: CI & Final Validation

### Checkpoint 13: CI pipeline updates and full validation

- [ ] Update ci.yml: add DATABASE_URL_AUTH and DATABASE_URL_USER env vars
- [ ] Update ci.yml: add docker services for auth_db (port 5435) and user_db (port 5436)
- [ ] Update ci.yml: add prisma generate for auth + user
- [ ] Run full `npx nx run-many -t lint test typecheck build`
- [ ] Run all e2e suites
- [ ] Verify no regressions in existing services
- [ ] All checks green

---

## Review Notes

_Observations from implementation:_

- [ ] What went smoothly?
- [ ] What was unexpected?
- [ ] Any improvements to the plan?
- [ ] Federation-specific challenges?
- [ ] Performance improvements?
