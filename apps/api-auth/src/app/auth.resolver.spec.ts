import { Test, TestingModule } from '@nestjs/testing';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';

describe('AuthResolver', () => {
  let resolver: AuthResolver;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthResolver,
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    resolver = module.get<AuthResolver>(AuthResolver);

    jest.clearAllMocks();
  });

  describe('register mutation', () => {
    it('should delegate to service and set refresh cookie header', async () => {
      const email = 'new@test.com';
      const password = 'password123';
      const name = 'New User';

      const mockResult = {
        accessToken: 'access-token',
        userId: 'user-new',
        email,
        refreshToken: 'refresh-token-123',
        expiresIn: 3600,
      };

      mockAuthService.register.mockResolvedValueOnce(mockResult);

      const mockContext = {
        res: {
          setHeader: jest.fn(),
        },
      };

      const result = await resolver.register(
        email,
        password,
        name,
        mockContext as any
      );

      // Verify service was called with correct args
      expect(mockAuthService.register).toHaveBeenCalledWith(
        email,
        password,
        name
      );

      // Verify Set-Cookie header was set
      expect(mockContext.res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        expect.stringContaining('refreshToken=refresh-token-123')
      );

      // Verify return value (excludes refreshToken)
      expect(result).toEqual({
        accessToken: 'access-token',
        userId: 'user-new',
        email,
      });
    });
  });

  describe('login mutation', () => {
    it('should delegate to service and set refresh cookie header', async () => {
      const email = 'user@test.com';
      const password = 'user-password';

      const mockResult = {
        accessToken: 'access-token-456',
        userId: 'user-1',
        email,
        refreshToken: 'refresh-token-456',
        expiresIn: 3600,
      };

      mockAuthService.login.mockResolvedValueOnce(mockResult);

      const mockContext = {
        res: {
          setHeader: jest.fn(),
        },
      };

      const result = await resolver.login(email, password, mockContext as any);

      // Verify service was called
      expect(mockAuthService.login).toHaveBeenCalledWith(email, password);

      // Verify Set-Cookie header was set
      expect(mockContext.res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        expect.stringContaining('refreshToken=refresh-token-456')
      );

      // Verify return value (excludes refreshToken)
      expect(result).toEqual({
        accessToken: 'access-token-456',
        userId: 'user-1',
        email,
      });
    });
  });

  describe('refreshToken mutation', () => {
    it('should read cookie header, delegate to service, and set new cookie', async () => {
      const refreshToken = 'refresh-token-valid';

      const mockResult = {
        accessToken: 'new-access-token',
        userId: 'user-1',
        email: 'user@test.com',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      };

      mockAuthService.refresh.mockResolvedValueOnce(mockResult);

      const mockContext = {
        req: {
          headers: {
            cookie: `refreshToken=${refreshToken}; Path=/`,
          },
        },
        res: {
          setHeader: jest.fn(),
        },
      };

      const result = await resolver.refreshToken(undefined, mockContext as any);

      // Verify service was called with token from cookie
      expect(mockAuthService.refresh).toHaveBeenCalledWith(refreshToken);

      // Verify new refresh token cookie was set
      expect(mockContext.res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        expect.stringContaining('refreshToken=new-refresh-token')
      );

      // Verify return value
      expect(result).toEqual({
        accessToken: 'new-access-token',
        userId: 'user-1',
        email: 'user@test.com',
      });
    });

    it('should throw error if refreshToken not found in cookie or args', async () => {
      const mockContext = {
        req: {
          headers: {},
        },
      };

      await expect(
        resolver.refreshToken(undefined, mockContext as any)
      ).rejects.toThrow('Refresh token not found');
    });

    it('should use refreshToken argument if provided', async () => {
      const refreshToken = 'token-from-arg';

      const mockResult = {
        accessToken: 'new-access-token',
        userId: 'user-1',
        email: 'user@test.com',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      };

      mockAuthService.refresh.mockResolvedValueOnce(mockResult);

      const mockContext = {
        res: {
          setHeader: jest.fn(),
        },
      };

      const result = await resolver.refreshToken(
        refreshToken,
        mockContext as any
      );

      // Verify service was called with token from argument
      expect(mockAuthService.refresh).toHaveBeenCalledWith(refreshToken);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        userId: 'user-1',
        email: 'user@test.com',
      });
    });
  });

  describe('logout mutation', () => {
    it('should logout with token from cookie and clear cookie header', async () => {
      const refreshToken = 'token-to-logout';

      mockAuthService.logout.mockResolvedValueOnce(undefined);

      const mockContext = {
        req: {
          headers: {
            cookie: `refreshToken=${refreshToken}; Path=/`,
          },
        },
        res: {
          setHeader: jest.fn(),
        },
      };

      const result = await resolver.logout(undefined, mockContext as any);

      // Verify service was called
      expect(mockAuthService.logout).toHaveBeenCalledWith(refreshToken);

      // Verify refresh token cookie was cleared (Max-Age=0)
      expect(mockContext.res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        expect.stringContaining('Max-Age=0')
      );

      // Verify return value
      expect(result).toEqual({ success: true });
    });

    it('should return success even if refreshToken not found', async () => {
      const mockContext = {
        req: {
          headers: {},
        },
        res: {
          setHeader: jest.fn(),
        },
      };

      const result = await resolver.logout(undefined, mockContext as any);

      // Should not call logout service if no token
      expect(mockAuthService.logout).not.toHaveBeenCalled();

      // But should still clear cookie header
      expect(mockContext.res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        expect.stringContaining('Max-Age=0')
      );

      // And return success
      expect(result).toEqual({ success: true });
    });

    it('should use refreshToken argument if provided', async () => {
      const refreshToken = 'token-from-arg';

      mockAuthService.logout.mockResolvedValueOnce(undefined);

      const mockContext = {
        res: {
          setHeader: jest.fn(),
        },
      };

      const result = await resolver.logout(refreshToken, mockContext as any);

      // Verify service was called with token from argument
      expect(mockAuthService.logout).toHaveBeenCalledWith(refreshToken);

      expect(result).toEqual({ success: true });
    });
  });
});
