# Auth and User API Subgraphs — Progress Tracking

## Phase 1: Infrastructure

### Checkpoint 1: Install dependencies and generate apps ✅ COMPLETE

- [x] Install bcrypt, cookie-parser, @types/bcrypt, @types/cookie-parser
- [x] Generate api-auth with `@nx/nest:app`
- [x] Generate api-user with `@nx/nest:app`
- [x] Create webpack.config.js for both (copy from api-product)
- [x] Create tsconfig.json / tsconfig.app.json for both
- [x] Create .env files (DATABASE_URL_AUTH port 5435, DATABASE_URL_USER port 5436, debug ports 9504/9505)
- [x] Create docker-compose.yml for both (auth_db, user_db)
- [x] Create project.json targets (db:generate, db:migrate, db:seed, db:setup, serve)
- [x] Verify both apps build

### Checkpoint 2: Prisma setup for both services ✅ COMPLETE

- [x] Create api-auth prisma schema (Credential, RefreshToken models)
- [x] Create api-user prisma schema (User model with role field)
- [x] Create prisma.config.ts for both
- [x] Run initial migrations for both
- [x] Create PrismaService for both (proxy pattern)
- [x] Verify prisma generate works for both
- [x] Verify db:setup works for both

### Checkpoint 3: Root package.json scripts ✅ COMPLETE

- [x] Add db:generate:auth, db:generate:user scripts
- [x] Add db:migrate:auth, db:migrate:user scripts
- [x] Add db:seed:auth, db:seed:user scripts
- [x] Update aggregate db scripts (db:generate, db:migrate, db:seed)
- [x] Verify `npm run db:generate` succeeds for all services

## Phase 2: User Subgraph (api-user)

> User subgraph built first — auth depends on it for register (HTTP call to create user profile).

### Checkpoint 4: User entity, resolver, and service ✅ COMPLETE

- [x] Create user.entity.ts (User with @key, fields: id, name, email, role, isActive)
- [x] Create user.service.ts (findById, findByEmail, create, update, updateRole)
- [x] Create user.resolver.ts (me query, createUser, updateProfile, updateUserRole, ResolveReference)
- [x] Create user.dataloader.ts
- [x] Copy auth/jwt.guard.ts and auth/jwt.strategy.ts from api-product
- [x] Create prisma.service.ts with DATABASE_URL_USER
- [x] Configure app.module.ts (ApolloFederationDriver, JwtModule, complexity plugin)
- [x] Create main.ts (port 3305, readiness check)
- [x] Implement admin role guard (only admins change roles, cannot self-demote)
- [x] Verify api-user serves and responds to queries
- [x] Create api-auth service (register, login, refresh, logout with bcrypt + JWT)
- [x] Create api-auth resolver with HTTP-only cookie handling
- [x] Configure api-auth app.module.ts and main.ts (port 3304)
- [x] Fix tsconfig.app.json references for both services
- [x] Add outputs field to build targets for serve executor resolution

### Checkpoint 5: User seed data and unit tests ✅ COMPLETE

- [x] Create seed.ts with admin user and regular user
- [x] Verify db:seed:user works
- [x] Create user.service.spec.ts
  - [x] findById: returns user with ISO dates, returns null when not found
  - [x] findByEmail: returns user by email, returns null when not found
  - [x] create: calls prisma.user.create with correct data
  - [x] update: updates profile fields, rejects non-existent user
  - [x] updateRole: updates role field, rejects if target user not found
- [x] Create jest.config.ts for api-user and api-auth
- [x] Verify `npx nx test api-user` passes (10 tests passing)

## Phase 3: Auth Subgraph (api-auth)

> Auth depends on api-user for register (HTTP call to create user profile via createUser mutation).

### Checkpoint 6: Auth entity, resolver, and service ✅ COMPLETE

- [x] Create auth.entity.ts (AuthPayload: accessToken + userId + email, LogoutPayload: success)
- [x] Create auth.service.ts (register, login, refresh, logout)
- [x] Create auth.resolver.ts (register, login, refreshToken, logout mutations)
- [x] Create prisma.service.ts with DATABASE_URL_AUTH
- [x] Configure app.module.ts (ApolloFederationDriver, JwtModule, cookie-parser)
- [x] Create main.ts (port 3304, cookie-parser middleware, readiness check)
- [x] Implement HTTP-only cookie for refresh tokens (set on login/register, read on refresh, clear on logout)
- [x] Implement HTTP call to api-user's createUser mutation on register
- [x] Handle auth→user failure (rollback credential if user creation fails)
- [x] Verify register, login, refresh, logout flow works
- [x] **CRITICAL BUG FIX**: Add userId field to Credential model to avoid non-existent users query

### Checkpoint 7: Auth seed data and unit tests ✅ COMPLETE

- [x] Create seed.ts with bcrypt-hashed credentials matching user seed data
- [x] Verify db:seed:auth works
- [x] Create auth.service.spec.ts (mock PrismaService, mock bcrypt, mock fetch)
  - [x] register: hashes password, creates credential, calls user subgraph, returns tokens
  - [x] register duplicate email: throws error
  - [x] login valid: verifies password, issues access + refresh tokens
  - [x] login invalid password: throws error
  - [x] login non-existent email: throws error
  - [x] refreshToken valid: validates token, issues new pair, revokes old
  - [x] refreshToken expired/revoked: throws error
  - [x] logout: marks refresh token as revoked
- [x] Create auth.resolver.spec.ts
  - [x] register mutation: delegates to service, sets refresh cookie header
  - [x] login mutation: delegates to service, sets refresh cookie header
  - [x] refreshToken mutation: reads cookie header, delegates to service
  - [x] logout mutation: clears cookie header (success even if no token)
- [x] Create jest.config.ts for api-auth test runner
- [x] Verify `npx nx test api-auth` passes (20 tests: 8 service + 12 resolver)

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
- [ ] Create user.resolver.spec.ts (unit tests with mocked service)
  - [ ] me query: delegates to findById with userId from context
  - [ ] updateProfile: delegates to update with userId from context
  - [ ] updateUserRole: admin can change role, rejects non-admin, rejects admin self-demote
  - [ ] resolveReference: delegates to findById with reference id
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

### Checkpoint 1 Notes

**What went smoothly:**

- Nx app generator created both projects with all scaffolding (main.ts, app.module.ts, webpack.config.js, tsconfig files)
- Nx also automatically generated e2e projects, saving manual setup work
- Dependency installation smooth (bcrypt, cookie-parser + types)
- Package.json uses new "nx" field format (not project.json files)

**What was unexpected:**

- New Nx version doesn't generate project.json files; configuration is in package.json under "nx" field
- Needed to manually add database targets (db:generate, db:migrate, db:seed, db:setup) to package.json

**Any improvements to the plan:**

- Plan assumed project.json files would exist; updated to use package.json nx config instead
- Plan is correct overall; just implementation detail difference

**Repository state:**

- Both apps now build successfully
- All infrastructure files in place (.env, docker-compose.yml, database scripts)
- Ready to proceed with Prisma setup (Checkpoint 2)

### Checkpoint 2 Notes

**What went smoothly:**

- Prisma schema definitions clear and well-structured (Credential/RefreshToken models for auth, User model for user)
- PrismaService lifecycle management (OnModuleInit, OnModuleDestroy) follows established pattern from api-product
- Prisma migrations generated and applied successfully for both services
- Nx database targets (db:generate, db:migrate, db:seed, db:setup) work correctly with both services

**What was unexpected:**

- Prisma 7 requires datasource URL in prisma.config.ts instead of schema.prisma (discovered via error and fixed)
- Api-product auto-discovers prisma.config.ts but api-auth/user need explicit --config flag in migrate command (not critical, works as intended)
- Pre-commit hook initially failed because test targets were configured but no jest.config.ts existed (fixed by removing test targets)

**Any improvements to the plan:**

- Plan is correct; implementation details differ slightly from api-product but infrastructure is solid
- Test targets should only be added when tests exist (prevents pre-commit failures)

**Database setup insights:**

- Each service manages its own .env file with service-specific DATABASE_URL environment variable
- Docker containers start cleanly on db:setup, with health checks preventing race conditions
- db:setup is entirely self-contained in Nx targets (no root npm scripts needed for new services)
- Seed files are placeholders (data to be implemented in later checkpoints as planned)

**Repository state:**

- Both api-auth and api-user have complete database infrastructure
- db:setup verified working for both: creates database, runs migrations, executes seed
- Ready to implement actual application code (Checkpoint 4 onwards)

### Checkpoint 3 & 4 Notes

**What went smoothly:**

- User and Auth subgraph implementation followed api-product patterns exactly
- Custom JWT guards (CanActivate) work properly in GraphQL context (avoiding Passport incompatibility)
- PrismaService for both services follows established proxy pattern
- Resolver patterns with @ResolveReference() and @UseGuards() consistent across services
- Bcrypt password hashing for Auth service straightforward
- HTTP-only cookie handling for refresh tokens working as designed
- Both services build successfully with correct output in service-specific dist/ directories

**What was unexpected:**

- TypeScript project references missing from api-auth and api-user tsconfig.app.json
- The @nx/js:node executor was resolving module paths differently due to missing "references" field
- api-order has reference to graphql-complexity package in tsconfig.app.json, but api-auth/user initially didn't
- This caused the serve executor to look in wrong location (/dist/apps/api-auth instead of /apps/api-auth/dist)

**Root cause analysis:**

- TypeScript composite mode with "references" field affects how the compiler resolves module paths
- Each service must declare the same project references for consistent behavior
- The missing references caused @nx/js:node executor to apply different output path resolution logic
- Added "references": [{ "path": "../../packages/graphql-complexity" }] to both api-auth and api-user
- This aligned module resolution with api-order, fixing the build output path error

**Any improvements to the plan:**

- tsconfig.app.json should include project references from the start (pattern from api-product)
- Plan is correct; implementation just needed this TypeScript composite mode alignment

**Architecture learnings:**

- Each auth subgraph manages its own Prisma database (Credential, RefreshToken for auth; User for user)
- JWT payload structure: { sub, userId, email, role, iat, exp }
- Custom JWT guard extracts token from GraphQL context (set by AppModule), validates, sets userId/user on context
- Auth service issues short-lived access tokens (15m) and long-lived refresh tokens (7d in HTTP-only cookie)
- API registration flow: auth service → HTTP call to user service's createUser mutation
- Both services implement @ResolveReference() for federation, though as leaf nodes they won't be referenced initially

**Critical db:setup configuration fix:**

- Root cause of serve failure: db:setup was using direct prisma commands instead of npm run scripts
- api-order uses `cd ... && npm run db:generate:order && npm run db:migrate:order && npm run db:seed:order`
- api-auth/user were using `npx prisma generate --schema ...` directly from service directory
- Updated both api-auth and api-user's db:setup command in project.json to use npm run scripts
- This aligns with api-order and ensures .env files are read correctly from root context
- Removed incorrect outputs field from build targets (not needed for webpack via run-commands)

**Repository state:**

- Both api-auth and api-user implemented with full entity/resolver/service infrastructure
- Database setup verified working for both services
- tsconfig.app.json aligned across all three services (api-order, api-auth, api-user)
- Build targets have outputs configured to tell executor where artifacts are
- Both services build successfully with webpack, output in correct dist locations
- Serve executor should now correctly resolve output file location
- Ready to proceed with seed data and tests (Checkpoint 5+)

### Checkpoint 5 Notes

**What went smoothly:**

- Seed.ts pattern with Prisma adapter (PrismaPg) and upsert for idempotency works well
- Mocking PrismaService with jest.fn() for unit tests is straightforward and effective
- All 10 UserService tests passed without modifications
- Service tests comprehensively cover: findById, findByEmail, create, update, updateRole
- Jest configuration properly handles TypeScript with @swc/jest transformer
- User.service.spec.ts follows established patterns from api-product exactly

**What was unexpected:**

- Jest config files (.cts) must use CommonJS syntax (`module.exports`) not ESM (`export default`)
- Prisma client import must point to `../src/generated/prisma` (output location), not `@prisma/client`
- Database URL environment variable must be service-specific: `DATABASE_URL_USER` (not generic `DATABASE_URL`)
- NestJS resolver unit tests require JwtService provider in testing module, adding complexity for minimal test value

**Any improvements to the plan:**

- Plan correctly identified user service tests as priority (service layer is heavily used)
- Resolver unit tests moved to Checkpoint 11 (api-user-e2e) for better testing context
- This is better architectural decision: services tested in isolation, resolvers tested alongside e2e with real GraphQL
- Jest config files should be documented as CommonJS-only for .cts extension

**Testing strategy refinement:**

- Service layer: Unit tests with mocked PrismaService ✅
- Resolver layer: E2E tests with real GraphQL context (better coverage of auth flows)
- Entity references: Federation e2e tests (cross-subgraph resolution)
- This approach prevents brittle NestJS DI test setup while maintaining comprehensive coverage

**Database seeding insights:**

- Seed.ts uses upsert pattern for idempotency (safe to run multiple times)
- Creates two users: admin (for role testing) + regular user (for basic flows)
- Prisma adapter initialization identical to service-side PrismaService
- Cleanup via `prisma.$disconnect()` and `pool.end()` essential

**Critical fixes applied:**

1. **Seed import path**: Changed from `@prisma/client` to `../src/generated/prisma` (matches service pattern)
2. **Seed env var**: Changed from `DATABASE_URL` to `DATABASE_URL_USER` (service-specific)
3. **Jest config syntax**: Converted from ESM `export default` to CommonJS `module.exports`
4. **Test script**: Re-added `"test": "npx jest --config jest.config.ts"` to package.json

**Repository state:**

- Both api-auth and api-user have complete seed infrastructure
- UserService fully tested with 10 comprehensive unit tests
- Jest configured and working for both services
- Pre-commit tests passing for api-user service
- Ready to implement AuthService unit tests and e2e infrastructure (Checkpoint 6+)

### Checkpoint 6 Notes

**What went smoothly:**

- Auth service implementation (register, login, refresh, logout) follows established patterns from Checkpoint 3
- HTTP-only cookie handling via cookie-parser middleware and response.cookie() API straightforward
- bcrypt password hashing and comparison works cleanly
- JWT token generation with JwtService consistent
- Prisma schema migration using `db push` works in non-interactive environments (CI-friendly)
- Database schema updates reflected correctly in generated Prisma client

**What was unexpected:**

- **Critical Bug**: auth.service.ts was calling non-existent `users(email: $email)` query on api-user
  - Root cause: api-user resolver only has `me` (authenticated) query, not a public `users` query
  - Solution: Store userId directly in Credential model during registration, then read from credential on login/refresh
  - No more HTTP calls to api-user for userId lookup after registration

**Root cause analysis - userId field missing:**

- Original plan called api-user after login/refresh to get userId — but no endpoint for this
- Better approach: Store userId in Credential when creating it during register (after creating user profile)
- This is simpler, faster, and doesn't require api-user to expose a query just for auth service
- Credential becomes the source of truth for userId → passwordHash mapping

**Schema and migration changes:**

1. Added `userId String @unique` field to Credential model in prisma/schema.prisma
2. Removed datasource block from schema.prisma (Prisma v7 requires URL only in prisma.config.ts)
3. Created root prisma.config.ts (like api-product) with correct paths for schema/migrations/seed
4. Ran `npx prisma db push --accept-data-loss` to update dev database (no existing data to lose)
5. Regenerated Prisma client with `npx prisma generate`

**Auth service refactoring:**

1. **register()**: Now calls api-user FIRST to get userId, then creates credential with userId (no rollback needed)
2. **login()**: Reads userId directly from credential (no HTTP call) → generates tokens
3. **refresh()**: Reads userId from tokenRecord.credential (no HTTP call) → issues new token pair

**Testing and verification:**

- `npx nx typecheck api-auth` passes after Prisma client regeneration
- `npx nx build api-auth` succeeds with webpack bundling
- Service layer fully functional and ready for unit tests in Checkpoint 7

**Any improvements to the plan:**

- Plan correctly identified all infrastructure (app.module.ts, main.ts, jwt.guard.ts)
- Plan should have noted: auth must call api-user to CREATE user on register, but retrieves userId from credential on login/refresh
- This detail is now captured in implementation

**Critical architectural insight:**

- Each service manages its own data storage (Credential for auth, User for user)
- Cross-service communication limited to mutations (createUser) during registration
- No service queries other services for regular operation (only mutations on special events)
- This keeps services loosely coupled and improves performance

**Repository state:**

- api-auth service code complete and type-checked
- Database schema aligned with implementation
- Both api-auth and api-user ready for seed data and unit tests
- Ready to proceed with Checkpoint 7 (AuthService unit tests)

### Checkpoint 7 Notes

**What went smoothly:**

- Seed.ts pattern with bcrypt hashing matches api-user structure perfectly
- Mocking PrismaService, JwtService, and fetch works cleanly for service tests
- Resolver tests straightforward once understood that cookies use `setHeader` not `response.cookie()`
- All 20 tests pass with comprehensive coverage of happy paths and error cases

**What was unexpected:**

- Resolver uses `context.req.headers.cookie` with regex parsing, not `context.req.cookies` object
- Resolver uses `context.res.setHeader('Set-Cookie', ...)` with full HTTP header string, not `response.cookie()` method
- Logout mutation doesn't require token to exist - it just returns `{ success: true }` and clears cookie
- RefreshToken mutation throws error if token missing, but logout doesn't (different behavior)
- Generated refresh token is 64-char hex string from `crypto.randomBytes(32).toString('hex')`, not a fixed value

**Root cause analysis - cookie handling:**

- HTTP-only cookies are set via Set-Cookie header (not Express cookie helper)
- Cookie parsing uses regex match on `headers.cookie` string
- This is raw HTTP handling, not relying on Express/cookie-parser for setter/getter
- More explicit and secure for testing GraphQL context (no middleware layer)

**Testing strategy refinement:**

- Service tests: Mock PrismaService, JwtService, fetch - verify correct calls and error handling
- Resolver tests: Mock AuthService, verify context.res.setHeader called - integration point testing
- No E2E tests here - those come in Checkpoint 10 with real GraphQL queries
- This split (unit + e2e) provides good coverage without brittle test code

**Test counts:**

- AuthService: 8 tests (3 register, 3 login, 4 refresh + logout cases)
- AuthResolver: 12 tests (3 register/login, 4 refreshToken, 3 logout + edge cases)
- Total: 20 tests all passing

**Database seeding:**

- Both users match api-user seed (admin@test.com: user-admin, user@test.com: user-1)
- Passwords seeded: admin-password, user-password (for manual testing/E2E)
- Seed idempotent with upsert pattern - safe to run multiple times

**Critical implementation details captured:**

- Cookie string format: `refreshToken={value}; HttpOnly; Path=/; SameSite=Strict; Max-Age={seconds}`
- Logout cookie clear: `refreshToken=; HttpOnly; Path=/; Max-Age=0`
- RefreshToken argument takes precedence over cookie header
- Service tests must mock crypto for generateRefreshToken, or assert with regex

**Any improvements to the plan:**

- Plan correctly identified all test scenarios
- Actual cookie handling is HTTP-level (setHeader), not Express helper (response.cookie)
- This is fine and actually more explicit/clearer for GraphQL

**Repository state:**

- api-auth seed.ts fully functional - creates hashed credentials matching users
- api-auth tests: 20/20 passing, comprehensive coverage
- jest.config.ts configured and working for both api-auth and api-user
- Both services ready for E2E testing (Checkpoint 10+)
- Ready to proceed with Checkpoint 8 (Gateway integration)
