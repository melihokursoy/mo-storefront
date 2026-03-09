describe('Auth Mutations', () => {
  // Tests 1-2: Register
  describe('Register', () => {
    it('should register user with valid credentials', async () => {
      const result = await (global as any).gql(`
        mutation {
          register(email: "newuser@test.com", password: "Password123", name: "New User") {
            accessToken
            userId
            email
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.register?.accessToken).toBeDefined();
      expect(result.data?.register?.userId).toBeDefined();
      expect(result.data?.register?.email).toBe('newuser@test.com');
    });

    it('should return error when registering duplicate email', async () => {
      await (global as any).gql(`
        mutation {
          register(email: "dup@test.com", password: "Pwd123", name: "User") {
            userId
          }
        }
      `);

      const result = await (global as any).gql(`
        mutation {
          register(email: "dup@test.com", password: "Pwd123", name: "User2") {
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
    beforeAll(async () => {
      await (global as any).gql(`
        mutation {
          register(email: "login@test.com", password: "Pwd123", name: "Login") {
            userId
          }
        }
      `);
    });

    it('should login with valid credentials', async () => {
      const result = await (global as any).gql(`
        mutation {
          login(email: "login@test.com", password: "Pwd123") {
            accessToken
            userId
            email
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.login?.accessToken).toBeDefined();
      expect(result.data?.login?.email).toBe('login@test.com');
    });

    it('should return error for non-existent email', async () => {
      const result = await (global as any).gql(`
        mutation {
          login(email: "notfound@test.com", password: "Pwd123") {
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
          login(email: "login@test.com", password: "WrongPwd") {
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
    beforeAll(async () => {
      await (global as any).gql(`
        mutation {
          register(email: "refresh@test.com", password: "Pwd123", name: "Refresh") {
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
            login(email: "refresh@test.com", password: "Pwd123") {
              accessToken
              userId
            }
          }
        `
      );

      expect(loginResult.errors).toBeUndefined();
      const oldToken = loginResult.data?.login?.accessToken;

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
      expect(refreshResult.data?.refreshToken?.accessToken).not.toBe(oldToken);
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

      const registerResult = await (global as any).gqlWithCookies(
        jar,
        `
          mutation {
            register(email: "logout@test.com", password: "Pwd123", name: "Logout") {
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
