import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { PrismaService } from './prisma.service';

describe('ProductService', () => {
  let service: ProductService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    prismaService = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all products without filters', async () => {
      const mockProducts = [
        {
          id: '1',
          name: 'Product 1',
          description: 'Desc 1',
          category: 'Electronics',
          price: 100,
          imageUrl: 'http://example.com/image.jpg',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.findAll({
        limit: 10,
        offset: 0,
      });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Product 1');
      expect(result[0].createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(result[0].updatedAt).toBe('2024-01-02T00:00:00.000Z');
    });

    it('should filter by category (case-insensitive)', async () => {
      const mockProducts = [
        {
          id: '1',
          name: 'Product 1',
          description: 'Desc 1',
          category: 'Electronics',
          price: 100,
          imageUrl: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.findAll({
        limit: 10,
        offset: 0,
        category: 'electronics',
      });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          category: { equals: 'electronics', mode: 'insensitive' },
        },
        skip: 0,
        take: 10,
      });

      expect(result[0].imageUrl).toBeUndefined();
    });

    it('should filter by price range', async () => {
      const mockProducts = [];
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      await service.findAll({
        limit: 10,
        offset: 0,
        minPrice: 50,
        maxPrice: 150,
      });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          price: { gte: 50, lte: 150 },
        },
        skip: 0,
        take: 10,
      });
    });

    it('should filter by minPrice only', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.findAll({
        limit: 10,
        offset: 0,
        minPrice: 100,
      });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          price: { gte: 100 },
        },
        skip: 0,
        take: 10,
      });
    });

    it('should filter by maxPrice only', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.findAll({
        limit: 10,
        offset: 0,
        maxPrice: 200,
      });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          price: { lte: 200 },
        },
        skip: 0,
        take: 10,
      });
    });

    it('should search by name, description, or category (OR)', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.findAll({
        limit: 10,
        offset: 0,
        search: 'laptop',
      });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'laptop', mode: 'insensitive' } },
            { description: { contains: 'laptop', mode: 'insensitive' } },
            { category: { contains: 'laptop', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 10,
      });
    });

    it('should apply pagination with offset and limit', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.findAll({
        limit: 20,
        offset: 40,
      });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 40,
        take: 20,
      });
    });
  });

  describe('findById', () => {
    it('should return a product by id with ISO dates', async () => {
      const mockProduct = {
        id: '1',
        name: 'Product 1',
        description: 'Desc 1',
        category: 'Electronics',
        price: 100,
        imageUrl: 'http://example.com/image.jpg',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findById('1');

      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });

      expect(result).toEqual({
        ...mockProduct,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      });
    });

    it('should set imageUrl to undefined when null', async () => {
      const mockProduct = {
        id: '1',
        name: 'Product 1',
        description: 'Desc 1',
        category: 'Electronics',
        price: 100,
        imageUrl: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findById('1');

      expect(result?.imageUrl).toBeUndefined();
    });

    it('should return null when product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });
});
