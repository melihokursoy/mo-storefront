import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from './prisma.service';
import * as bcrypt from 'bcrypt'; // eslint-disable-line @typescript-eslint/no-unused-vars

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock fetch
global.fetch = jest.fn();

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    credential: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('register', () => {
    it('should hash password, create credential with userId, call api-user, and return tokens', async () => {
      const email = 'new@test.com';
      const password = 'password123';
      const name = 'New User';

      // Mock api-user response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          data: { createUser: { id: 'user-new' } },
        }),
      });

      // Mock bcrypt
      mockedBcrypt.hash.mockResolvedValueOnce('hashed-password' as never);

      // Mock Prisma
      mockPrismaService.credential.create.mockResolvedValueOnce({
        id: 'cred-1',
        email,
        passwordHash: 'hashed-password',
        userId: 'user-new',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrismaService.refreshToken.create.mockResolvedValueOnce({
        id: 'token-1',
        token: 'refresh-token-123',
        credentialId: 'cred-1',
        expiresAt: new Date(),
        revokedAt: null,
        createdAt: new Date(),
      });

      // Mock JWT
      mockJwtService.sign.mockReturnValueOnce('access-token-123');

      const result = await service.register(email, password, name);

      // Verify api-user was called first
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3305/graphql',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('createUser'),
        }
      );

      // Verify password was hashed
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 10);

      // Verify credential was created with userId
      expect(mockPrismaService.credential.create).toHaveBeenCalledWith({
        data: { email, passwordHash: 'hashed-password', userId: 'user-new' },
      });

      // Verify return value
      expect(result.accessToken).toBe('access-token-123');
      expect(result.userId).toBe('user-new');
      expect(result.email).toBe(email);
      expect(result.refreshToken).toMatch(/^[a-f0-9]{64}$/); // Hex string from crypto.randomBytes(32)
      expect(result.expiresIn).toBe(3600);
    });

    it('should throw error for duplicate email', async () => {
      const email = 'duplicate@test.com';
      const password = 'password123';
      const name = 'User';

      // Mock finding existing credential
      mockPrismaService.credential.findUnique.mockResolvedValueOnce({
        id: 'cred-existing',
        email,
        passwordHash: 'hash',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.register(email, password, name)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw error if api-user createUser fails', async () => {
      const email = 'new@test.com';
      const password = 'password123';
      const name = 'New User';

      // Mock api-user error response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          errors: [{ message: 'Email already exists' }],
        }),
      });

      mockedBcrypt.hash.mockResolvedValueOnce('hashed-password' as never);

      await expect(service.register(email, password, name)).rejects.toThrow(
        BadRequestException
      );

      // Verify credential was NOT created
      expect(mockPrismaService.credential.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should verify password, read userId from credential, and return tokens', async () => {
      const email = 'user@test.com';
      const password = 'user-password';

      // Mock finding credential
      mockPrismaService.credential.findUnique.mockResolvedValueOnce({
        id: 'cred-1',
        email,
        passwordHash: 'hashed-password',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock password verification
      mockedBcrypt.compare.mockResolvedValueOnce(true as never);

      // Mock JWT
      mockJwtService.sign.mockReturnValueOnce('access-token-456');

      // Mock refresh token creation
      mockPrismaService.refreshToken.create.mockResolvedValueOnce({
        id: 'token-2',
        token: 'refresh-token-456',
        credentialId: 'cred-1',
        expiresAt: new Date(),
        revokedAt: null,
        createdAt: new Date(),
      });

      const result = await service.login(email, password);

      // Verify no HTTP call to api-user
      expect(global.fetch).not.toHaveBeenCalled();

      // Verify password was compared
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        password,
        'hashed-password'
      );

      // Verify userId was read from credential
      expect(result.userId).toBe('user-1');
      expect(result.accessToken).toBe('access-token-456');
      expect(result.email).toBe(email);
    });

    it('should throw error for non-existent email', async () => {
      const email = 'nonexistent@test.com';
      const password = 'password';

      mockPrismaService.credential.findUnique.mockResolvedValueOnce(null);

      await expect(service.login(email, password)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw error for invalid password', async () => {
      const email = 'user@test.com';
      const password = 'wrong-password';

      mockPrismaService.credential.findUnique.mockResolvedValueOnce({
        id: 'cred-1',
        email,
        passwordHash: 'hashed-password',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockedBcrypt.compare.mockResolvedValueOnce(false as never);

      await expect(service.login(email, password)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('refresh', () => {
    it('should validate token, read userId from credential, issue new tokens, and revoke old', async () => {
      const refreshToken = 'refresh-token-valid';
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Mock finding refresh token
      mockPrismaService.refreshToken.findUnique.mockResolvedValueOnce({
        id: 'token-1',
        credentialId: 'cred-1',
        token: refreshToken,
        expiresAt: futureDate,
        revokedAt: null,
        createdAt: now,
        credential: {
          id: 'cred-1',
          email: 'user@test.com',
          passwordHash: 'hash',
          userId: 'user-1',
          createdAt: now,
          updatedAt: now,
        },
      });

      // Mock JWT
      mockJwtService.sign.mockReturnValueOnce('new-access-token');

      // Mock updating old token
      mockPrismaService.refreshToken.update.mockResolvedValueOnce({
        id: 'token-1',
        credentialId: 'cred-1',
        token: refreshToken,
        expiresAt: futureDate,
        revokedAt: expect.any(Date),
        createdAt: now,
      });

      // Mock creating new token
      mockPrismaService.refreshToken.create.mockResolvedValueOnce({
        id: 'token-2',
        credentialId: 'cred-1',
        token: 'new-refresh-token',
        expiresAt: expect.any(Date),
        revokedAt: null,
        createdAt: now,
      });

      const result = await service.refresh(refreshToken);

      // Verify no HTTP call to api-user
      expect(global.fetch).not.toHaveBeenCalled();

      // Verify userId was read from credential
      expect(result.userId).toBe('user-1');
      expect(result.accessToken).toBe('new-access-token');
      expect(result.email).toBe('user@test.com');

      // Verify old token was revoked
      expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: { revokedAt: expect.any(Date) },
      });

      // Verify new token was created
      expect(mockPrismaService.refreshToken.create).toHaveBeenCalled();
    });

    it('should throw error for invalid refresh token', async () => {
      const refreshToken = 'invalid-token';

      mockPrismaService.refreshToken.findUnique.mockResolvedValueOnce(null);

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw error for revoked refresh token', async () => {
      const refreshToken = 'revoked-token';
      const now = new Date();

      mockPrismaService.refreshToken.findUnique.mockResolvedValueOnce({
        id: 'token-1',
        token: refreshToken,
        credentialId: 'cred-1',
        expiresAt: new Date(),
        revokedAt: now, // Token is revoked
        createdAt: now,
        credential: {
          id: 'cred-1',
          email: 'user@test.com',
          passwordHash: 'hash',
          userId: 'user-1',
          createdAt: now,
          updatedAt: now,
        },
      });

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw error for expired refresh token', async () => {
      const refreshToken = 'expired-token';
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      mockPrismaService.refreshToken.findUnique.mockResolvedValueOnce({
        id: 'token-1',
        token: refreshToken,
        credentialId: 'cred-1',
        expiresAt: pastDate, // Token is expired
        revokedAt: null,
        createdAt: now,
        credential: {
          id: 'cred-1',
          email: 'user@test.com',
          passwordHash: 'hash',
          userId: 'user-1',
          createdAt: now,
          updatedAt: now,
        },
      });

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('logout', () => {
    it('should mark refresh token as revoked', async () => {
      const refreshToken = 'token-to-revoke';
      const now = new Date();

      mockPrismaService.refreshToken.findUnique.mockResolvedValueOnce({
        id: 'token-1',
        token: refreshToken,
        credentialId: 'cred-1',
        expiresAt: new Date(),
        revokedAt: null,
        createdAt: now,
      });

      mockPrismaService.refreshToken.update.mockResolvedValueOnce({
        id: 'token-1',
        token: refreshToken,
        credentialId: 'cred-1',
        expiresAt: new Date(),
        revokedAt: expect.any(Date),
        createdAt: now,
      });

      await service.logout(refreshToken);

      expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should not throw error if token not found', async () => {
      const refreshToken = 'nonexistent-token';

      mockPrismaService.refreshToken.findUnique.mockResolvedValueOnce(null);

      // Should not throw
      await expect(service.logout(refreshToken)).resolves.not.toThrow();

      // Update should not be called
      expect(mockPrismaService.refreshToken.update).not.toHaveBeenCalled();
    });
  });
});
