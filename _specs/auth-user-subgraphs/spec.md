# Spec for Auth and User API Subgraphs

branch: feature/auth-user-subgraphs

## Summary

Add two new NestJS subgraphs to the existing Apollo Federation v2 architecture: an **Auth subgraph** (api-auth) for authentication operations (login, register, token refresh, credential management) and a **User subgraph** (api-user) for user profile management. These services replace the current inline JWT token generation used in tests with a proper authentication flow, and introduce user identity as a first-class federated entity that other subgraphs (cart, order) can reference.

## Functional Requirements

1. **Auth Subgraph (api-auth, Port 3304)**

   - Register new users with email and password (creates user in auth_db with hashed credentials, then creates profile in user subgraph)
   - Login with email/password returning JWT access token and refresh token via HTTP-only cookie
   - Refresh expired access tokens using refresh token from HTTP-only cookie
   - Logout / invalidate refresh tokens (clear cookie + revoke in database)
   - Own all credential data: email, hashed password, refresh tokens
   - Hash passwords securely (bcrypt, 10+ salt rounds)
   - Issue JWT tokens with user ID, email, and role claims
   - Access tokens: short-lived (15 min), returned in response body
   - Refresh tokens: long-lived (7 days), stored in database, sent as HTTP-only secure cookie

2. **User Subgraph (api-user, Port 3305)**

   - Define User as a federated entity with `@key(fields: "id")`
   - Query current user profile (authenticated)
   - Update own profile fields (name, display preferences)
   - Admin-only: change another user's role (e.g. promote to "admin" or demote to "user")
   - Admin self-protection: admins cannot remove their own admin role
   - Expose User entity for cross-subgraph references (cart, order can resolve user details)
   - User profile data only (no credentials, no passwords) — a simple `role` field for basic authorization (e.g. "user", "admin")

3. **Federation Integration**

   - Register both new subgraphs in the Apollo Gateway supergraph
   - Cart and Order subgraphs reference User entity via `@external` / `@requires` directives
   - Replace hardcoded `customerId` strings with proper User entity references
   - Gateway forwards Authorization header to all subgraphs (already implemented)

4. **Database Setup**

   - Auth subgraph: own PostgreSQL database (auth_db, port 5435) with credentials and refresh_tokens tables
   - User subgraph: own PostgreSQL database (user_db, port 5436) with users table (profile data + role)
   - Prisma ORM for both, following existing per-service database pattern
   - Docker Compose services for local development

5. **Security**
   - Refresh tokens stored in HTTP-only secure cookies (not exposed to JavaScript)
   - Rate limiting on login/register endpoints
   - Existing JWT guards across subgraphs continue to work with new token format

## Possible Edge Cases

- Duplicate email registration attempts
- Expired or revoked refresh tokens
- Concurrent token refresh requests (race condition)
- User deactivation while active sessions exist
- Token format migration from existing test tokens to new auth-issued tokens
- Cross-subgraph queries for deactivated users
- Admin attempting to remove their own admin role
- Password reset flow (out of scope for v1, but schema should not block it)

## Acceptance Criteria

- [ ] Auth subgraph starts and registers with Apollo Gateway
- [ ] User subgraph starts and registers with Apollo Gateway
- [ ] User can register, login, and receive JWT access token + refresh cookie via GraphQL mutations
- [ ] User can refresh an expired access token using HTTP-only cookie
- [ ] User can query their own profile when authenticated
- [ ] Cart and Order subgraphs resolve User entity references via federation
- [ ] Existing product, cart, and order tests continue to pass
- [ ] New e2e tests cover auth flow (register, login, token refresh, protected queries)
- [ ] All subgraph databases are independent (auth_db, user_db)
- [ ] Only admins can change user roles
- [ ] Admin cannot remove their own admin role
- [ ] CI pipeline updated to include new subgraphs (migrations, build, test)

## Testing Guidelines

Create test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- Auth mutations: register, login (valid/invalid credentials), token refresh via cookie, logout
- User queries: get current user (authenticated/unauthenticated), update profile
- Federation: resolve User entity from cart/order subgraphs
- Security: rejected requests with expired/invalid tokens, duplicate registration
- Role management: admin can change roles, non-admin rejected, admin cannot self-demote
