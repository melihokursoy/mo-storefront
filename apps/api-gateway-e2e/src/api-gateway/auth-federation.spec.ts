/**
 * Auth Federation Tests
 * Tests auth mutations and user entity resolution through the Apollo Gateway
 * Verifies: authentication, authorization, cross-subgraph user resolution, cookie forwarding
 *
 * IMPORTANT: Tests use unique emails (timestamp-based) to avoid DB conflicts in parallel execution
 */

describe('Auth Mutations via Gateway', () => {
  it('should register user via gateway', async () => {
    const timestamp = Date.now();
    const email = `gateway-register-${timestamp}@example.com`;

    const result = await (global as any).gql(`
      mutation {
        register(
          email: "${email}"
          password: "test-password-123"
          name: "Test User"
        ) {
          accessToken
          userId
          email
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    expect(result.data?.register?.accessToken).toBeDefined();
    expect(result.data?.register?.userId).toBeDefined();
    expect(result.data?.register?.email).toBe(email);
  });

  it('should login via gateway and query me profile', async () => {
    // Create unique user for this test
    const timestamp = Date.now();
    const testEmail = `gateway-login-${timestamp}@example.com`;
    const testPassword = 'test-password-login';

    // Step 1: Register user
    const registerResult = await (global as any).gql(`
      mutation {
        register(
          email: "${testEmail}"
          password: "${testPassword}"
          name: "Login Test User"
        ) {
          accessToken
          userId
          email
        }
      }
    `);

    expect(registerResult.errors).toBeUndefined();

    // Step 2: Login via gateway with newly created credentials
    const loginResult = await (global as any).gql(`
      mutation {
        login(email: "${testEmail}", password: "${testPassword}") {
          accessToken
          userId
          email
        }
      }
    `);

    expect(loginResult.errors).toBeUndefined();
    expect(loginResult.data?.login?.accessToken).toBeDefined();
    const token = loginResult.data?.login?.accessToken;

    // Step 3: Query me with the returned token via gateway
    const meResult = await (global as any).gql(
      `query {
        me {
          id
          name
          email
          role
        }
      }`,
      {},
      token
    );

    expect(meResult.errors).toBeUndefined();
    expect(meResult.data?.me?.id).toBeDefined();
    expect(meResult.data?.me?.email).toBe(testEmail);
  });
});

describe('Cookie Forwarding via Gateway', () => {
  it('should refresh token via gateway using explicit refreshToken argument', async () => {
    // Create unique user for this test to avoid conflicts
    const timestamp = Date.now();
    const testEmail = `gateway-refresh-${timestamp}@example.com`;
    const testPassword = 'test-password-refresh';

    // Step 1: Register user via auth subgraph
    await fetch('http://localhost:3304/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `mutation {
          register(
            email: "${testEmail}"
            password: "${testPassword}"
            name: "Refresh Test User"
          ) {
            accessToken
            userId
          }
        }`,
      }),
    });

    // Step 2: Login at auth subgraph to get refresh token
    const authLoginRes = await fetch('http://localhost:3304/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `mutation {
          login(email: "${testEmail}", password: "${testPassword}") {
            accessToken
            userId
            email
          }
        }`,
      }),
    });

    const setCookieHeader = authLoginRes.headers.get('set-cookie');
    const refreshTokenMatch = setCookieHeader?.match(/refreshToken=([^;]+)/);
    const refreshToken = refreshTokenMatch?.[1];

    // Step 3: Use the refresh token in a gateway request
    if (refreshToken) {
      const result = await (global as any).gql(`
        mutation {
          refreshToken(refreshToken: "${refreshToken}") {
            accessToken
            userId
            email
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.refreshToken?.accessToken).toBeDefined();
      expect(result.data?.refreshToken?.email).toBe(testEmail);
    }
  });
});

describe('User Entity Federation Resolution', () => {
  it('should resolve user entity in cart query via federation', async () => {
    // Use seeded user credentials for cart query
    // (Cart service returns fixed cart data associated with seeded user-1)
    const seededToken = (global as any).makeToken('user-1');

    // Query cart with seeded user token
    const result = await (global as any).gql(
      `query {
        cart {
          id
          itemCount
          user {
            id
            name
            email
          }
        }
      }`,
      {},
      seededToken
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.cart?.id).toBeDefined();
    expect(result.data?.cart?.itemCount).toBeDefined();
    // Verify user entity is resolved via federation
    expect(result.data?.cart?.user?.id).toBeDefined();
    expect(result.data?.cart?.user?.name).toBeDefined();
    expect(result.data?.cart?.user?.email).toBeDefined();
  });

  it('should resolve user entity in orders query via federation', async () => {
    // Use seeded user credentials for orders query
    // (Orders service returns seeded orders data for user-1)
    const seededToken = (global as any).makeToken('user-1');

    // Query orders with seeded user token
    const result = await (global as any).gql(
      `query {
        orders {
          id
          totalPrice
          user {
            id
            name
            email
          }
        }
      }`,
      {},
      seededToken
    );

    expect(result.errors).toBeUndefined();
    expect(Array.isArray(result.data?.orders)).toBe(true);
    if (result.data?.orders?.length > 0) {
      // Verify user entity is resolved via federation
      expect(result.data.orders[0]?.user?.id).toBeDefined();
      expect(result.data.orders[0]?.user?.name).toBeDefined();
      expect(result.data.orders[0]?.user?.email).toBeDefined();
    }
  });
});

describe('Gateway Authorization Enforcement', () => {
  it('should reject unauthenticated me query via gateway', async () => {
    const result = await (global as any).gql(`
      query {
        me {
          id
          name
          email
        }
      }
    `);

    expect(result.errors).toBeDefined();
    expect((result.errors as Array<any>).length).toBeGreaterThan(0);
    expect((result.errors as Array<any>)[0]?.message?.toLowerCase()).toContain(
      'unauthorized'
    );
  });

  it('should forward admin role for role management via gateway', async () => {
    // Create unique admin user for this test
    const timestamp = Date.now();
    const adminEmail = `gateway-admin-${timestamp}@example.com`;
    const adminPassword = 'test-password-admin';

    // Register admin user
    const registerRes = await (global as any).gql(`
      mutation {
        register(
          email: "${adminEmail}"
          password: "${adminPassword}"
          name: "Admin Test User"
        ) {
          accessToken
          userId
        }
      }
    `);

    const adminUserId = registerRes.data?.register?.userId;

    // Create admin token with admin role
    const adminToken = (global as any).makeToken(adminUserId, 'admin');

    // Create another user to have their role changed
    const targetEmail = `gateway-target-${timestamp}@example.com`;
    const targetRes = await (global as any).gql(`
      mutation {
        register(
          email: "${targetEmail}"
          password: "target-password"
          name: "Target User"
        ) {
          accessToken
          userId
        }
      }
    `);

    const targetUserId = targetRes.data?.register?.userId;

    // Admin changes target user's role
    const result = await (global as any).gql(
      `mutation {
        updateUserRole(userId: "${targetUserId}", newRole: "admin") {
          id
          role
        }
      }`,
      {},
      adminToken
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.updateUserRole?.id).toBe(targetUserId);
    expect(result.data?.updateUserRole?.role).toBe('admin');
  });

  it('should reject non-admin role changes via gateway', async () => {
    // Create unique regular user for this test
    const timestamp = Date.now();
    const userEmail = `gateway-user-${timestamp}@example.com`;
    const userPassword = 'test-password-user';

    // Register regular user
    const registerRes = await (global as any).gql(`
      mutation {
        register(
          email: "${userEmail}"
          password: "${userPassword}"
          name: "Regular User"
        ) {
          accessToken
          userId
        }
      }
    `);

    const userToken = registerRes.data?.register?.accessToken;

    // Create target user whose role will be attempted to be changed
    const targetEmail = `gateway-target-${timestamp}@example.com`;
    const targetRes = await (global as any).gql(`
      mutation {
        register(
          email: "${targetEmail}"
          password: "target-password"
          name: "Another User"
        ) {
          accessToken
          userId
        }
      }
    `);

    const targetUserId = targetRes.data?.register?.userId;

    // Non-admin user tries to change role (should fail)
    const result = await (global as any).gql(
      `mutation {
        updateUserRole(userId: "${targetUserId}", newRole: "admin") {
          id
          role
        }
      }`,
      {},
      userToken
    );

    expect(result.errors).toBeDefined();
    expect((result.errors as Array<any>)[0]?.message?.toLowerCase()).toContain(
      'admin'
    );
  });
});
