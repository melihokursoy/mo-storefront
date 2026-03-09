describe('User Profile Queries and Mutations', () => {
  // Generate unique email suffix for this test run
  const emailSuffix = `_${Date.now()}`;

  describe('me Query (JWT protected)', () => {
    it('should return current user profile with valid token', async () => {
      const token = (global as any).makeToken(
        'user-1',
        'user@test.com',
        'user'
      );

      const result = await (global as any).gql(
        `
        query {
          me {
            id
            name
            email
            role
          }
        }
      `,
        {},
        token
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.me?.id).toBe('user-1');
      expect(result.data?.me?.email).toBe('user@test.com');
      expect(result.data?.me?.role).toBeDefined();
    });

    it('should return error without token', async () => {
      const result = await (global as any).gql(`
        query {
          me {
            id
            name
          }
        }
      `);

      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('createUser Mutation (public)', () => {
    it('should create new user with unique email', async () => {
      const email = `newuser${emailSuffix}@test.com`;

      const result = await (global as any).gql(`
        mutation {
          createUser(name: "New User", email: "${email}") {
            id
            name
            email
            role
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.createUser?.id).toBeDefined();
      expect(result.data?.createUser?.email).toBe(email);
      expect(result.data?.createUser?.name).toBe('New User');
      expect(result.data?.createUser?.role).toBe('user');
    });
  });

  describe('updateProfile Mutation (JWT protected)', () => {
    it('should update own profile name', async () => {
      const token = (global as any).makeToken(
        'user-1',
        'user@test.com',
        'user'
      );

      const result = await (global as any).gql(
        `
        mutation {
          updateProfile(input: {
            name: "Updated Name"
          }) {
            id
            name
            email
            role
          }
        }
      `,
        {},
        token
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.updateProfile?.name).toBe('Updated Name');
      expect(result.data?.updateProfile?.id).toBe('user-1');
    });

    it('should return error without token', async () => {
      const result = await (global as any).gql(`
        mutation {
          updateProfile(input: {
            name: "New Name"
          }) {
            id
            name
          }
        }
      `);

      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('updateUserRole Mutation (admin only)', () => {
    it('should allow admin to change user role', async () => {
      const adminToken = (global as any).makeToken(
        'user-admin',
        'admin@test.com',
        'admin'
      );

      const result = await (global as any).gql(
        `
        mutation {
          updateUserRole(userId: "user-1", newRole: "admin") {
            id
            name
            email
            role
          }
        }
      `,
        {},
        adminToken
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.updateUserRole?.role).toBe('admin');
      expect(result.data?.updateUserRole?.id).toBe('user-1');
    });

    it('should reject non-admin role change', async () => {
      const userToken = (global as any).makeToken(
        'user-2',
        'user2@test.com',
        'user'
      );

      const result = await (global as any).gql(
        `
        mutation {
          updateUserRole(userId: "user-1", newRole: "admin") {
            id
            role
          }
        }
      `,
        {},
        userToken
      );

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain('admins');
    });

    it('should reject admin self-demote', async () => {
      const adminToken = (global as any).makeToken(
        'user-admin',
        'admin@test.com',
        'admin'
      );

      const result = await (global as any).gql(
        `
        mutation {
          updateUserRole(userId: "user-admin", newRole: "user") {
            id
            role
          }
        }
      `,
        {},
        adminToken
      );

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain('cannot');
    });
  });

  describe('resolveReference (Federation)', () => {
    it('should resolve user by id via _entities query', async () => {
      const result = await (global as any).gql(`
        query {
          _entities(representations: [{__typename: "User", id: "user-1"}]) {
            ... on User {
              id
              name
              email
              role
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?._entities).toBeDefined();
      expect(Array.isArray(result.data?._entities)).toBe(true);
      expect(result.data?._entities?.[0]?.id).toBe('user-1');
    });
  });
});
