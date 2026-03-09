import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from './prisma.service';

describe('UserService', () => {
  let service: UserService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);

    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user with ISO dates when found', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'user@test.com',
        role: 'user',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('user-1');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });

      expect(result).toEqual({
        ...mockUser,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      });
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user by email with ISO dates', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'user@test.com',
        role: 'user',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('user@test.com');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@test.com' },
      });

      expect(result?.email).toBe('user@test.com');
      expect(result?.createdAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should return null when email not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('unknown@test.com');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create user with correct data', async () => {
      const mockUser = {
        id: 'user-2',
        name: 'New User',
        email: 'newuser@test.com',
        role: 'user',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.create(
        'New User',
        'newuser@test.com',
        'user'
      );

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          name: 'New User',
          email: 'newuser@test.com',
          role: 'user',
        },
      });

      expect(result?.name).toBe('New User');
    });
  });

  describe('update', () => {
    it('should update user profile fields', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Updated Name',
        email: 'user@test.com',
        role: 'user',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-03'),
      };

      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.update('user-1', { name: 'Updated Name' });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'Updated Name' },
      });

      expect(result?.name).toBe('Updated Name');
    });

    it('should reject when user not found', async () => {
      mockPrismaService.user.update.mockRejectedValue(
        new Error('User not found')
      );

      await expect(
        service.update('nonexistent', { name: 'New' })
      ).rejects.toThrow();
    });
  });

  describe('updateRole', () => {
    it('should update role when admin changes other user', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'user@test.com',
        role: 'admin',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-03'),
      };

      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.updateRole(
        'user-1',
        'admin',
        'admin-1',
        'admin'
      );

      expect(result?.role).toBe('admin');
    });

    it('should reject non-admin trying to change role', async () => {
      await expect(
        service.updateRole('user-2', 'admin', 'user-1', 'user')
      ).rejects.toThrow('Only admins can change user roles');
    });

    it('should reject admin self-demote', async () => {
      await expect(
        service.updateRole('admin-1', 'user', 'admin-1', 'admin')
      ).rejects.toThrow('Admins cannot self-demote');
    });
  });
});
