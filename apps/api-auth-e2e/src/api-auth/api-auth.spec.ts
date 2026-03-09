describe('Auth Mutations', () => {
  // Generate unique email suffix for this test run
  const emailSuffix = `_${Date.now()}`;

  // Tests 1-2: Register
  describe('Register', () => {
    it('should register user with valid credentials', async () => {
      const email = `newuser${emailSuffix}@test.com`;
      const result = await (global as any).gql(`
        mutation {
          register(email: "${email}", password: "Password123", name: "New User") {
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

    it('should return error when registering duplicate email', async () => {
      const email = `dup${emailSuffix}@test.com`;
      await (global as any).gql(`
        mutation {
          register(email: "${email}", password: "Pwd123", name: "User") {
            userId
          }
        }
      `);

      const result = await (global as any).gql(`
        mutation {
          register(email: "${email}", password: "Pwd123", name: "User2") {
            userId
          }
        }
      `);

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain('already registered');
    });
  });

  // Tests 3-5: Login
  describe('Login', () => {
    const loginEmail = `login${emailSuffix}@test.com`;

    beforeAll(async () => {
      await (global as any).gql(`
        mutation {
          register(email: "${loginEmail}", password: "Pwd123", name: "Login") {
            userId
          }
        }
      `);
    });

    it('should login with valid credentials', async () => {
      const result = await (global as any).gql(`
        mutation {
          login(email: "${loginEmail}", password: "Pwd123") {
            accessToken
            userId
            email
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.login?.accessToken).toBeDefined();
      expect(result.data?.login?.email).toBe(loginEmail);
    });

    it('should return error for non-existent email', async () => {
      const result = await (global as any).gql(`
        mutation {
          login(email: "notfound${emailSuffix}@test.com", password: "Pwd123") {
            userId
          }
        }
      `);

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain('Invalid');
    });

    it('should return error for wrong password', async () => {
      const result = await (global as any).gql(`
        mutation {
          login(email: "${loginEmail}", password: "WrongPwd") {
            userId
          }
        }
      `);

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain('Invalid');
    });
  });

  // Tests 6-7: Refresh & Token Revocation
  describe('Token Refresh with Cookies', () => {
    const refreshEmail = `refresh${emailSuffix}@test.com`;

    beforeAll(async () => {
      await (global as any).gql(`
        mutation {
          register(email: "${refreshEmail}", password: "Pwd123", name: "Refresh") {
            userId
          }
        }
      `);
    });

    it('should refresh token using cookie', async () => {
      const jar = new (global as any).CookieJar();

      const loginResult = await (global as any).gqlWithCookies(
        jar,
        `
          mutation {
            login(email: "${refreshEmail}", password: "Pwd123") {
              accessToken
              userId
            }
          }
        `
      );

      expect(loginResult.errors).toBeUndefined();
      expect(loginResult.data?.login?.accessToken).toBeDefined();

      // Add delay to ensure JWT timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const refreshResult = await (global as any).gqlWithCookies(
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

    it('should return error for invalid refresh token', async () => {
      const result = await (global as any).gql(`
        mutation {
          refreshToken {
            accessToken
            userId
          }
        }
      `);

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain('Refresh token');
    });
  });

  // Test 8: Logout
  describe('Logout', () => {
    it('should invalidate refresh token on logout', async () => {
      const jar = new (global as any).CookieJar();
      const logoutEmail = `logout${emailSuffix}@test.com`;

      const registerResult = await (global as any).gqlWithCookies(
        jar,
        `
          mutation {
            register(email: "${logoutEmail}", password: "Pwd123", name: "Logout") {
              userId
            }
          }
        `
      );

      expect(registerResult.errors).toBeUndefined();

      const logoutResult = await (global as any).gqlWithCookies(
        jar,
        `
          mutation {
            logout {
              success
            }
          }
        `
      );

      expect(logoutResult.errors).toBeUndefined();
      expect(logoutResult.data?.logout?.success).toBe(true);

      const refreshResult = await (global as any).gqlWithCookies(
        jar,
        `
          mutation {
            refreshToken {
              accessToken
            }
          }
        `
      );

      expect(refreshResult.errors).toBeDefined();
      expect(refreshResult.errors?.[0]?.message).toContain('revoked');
    });
  });
});
