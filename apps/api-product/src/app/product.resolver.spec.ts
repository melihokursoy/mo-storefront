import { Test, TestingModule } from '@nestjs/testing';
import { ProductResolver } from './product.resolver';
import { ProductService } from './product.service';

describe('ProductResolver', () => {
  let resolver: ProductResolver;
  let productService: ProductService;

  const mockProductService = {
    findAll: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductResolver,
        { provide: ProductService, useValue: mockProductService },
      ],
    }).compile();

    resolver = module.get<ProductResolver>(ProductResolver);
    productService = module.get<ProductService>(ProductService);
    jest.clearAllMocks();
  });

  describe('products', () => {
    it('should use default args (limit=10, offset=0)', async () => {
      const mockProducts = [];
      mockProductService.findAll.mockResolvedValue(mockProducts);

      await resolver.products(10, 0);

      expect(mockProductService.findAll).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
      });
    });

    it('should pass all filters to service', async () => {
      mockProductService.findAll.mockResolvedValue([]);

      await resolver.products(20, 40, 'Electronics', 50, 500, 'laptop');

      expect(mockProductService.findAll).toHaveBeenCalledWith({
        limit: 20,
        offset: 40,
        category: 'Electronics',
        minPrice: 50,
        maxPrice: 500,
        search: 'laptop',
      });
    });

    it('should pass optional filters when provided', async () => {
      mockProductService.findAll.mockResolvedValue([]);

      await resolver.products(10, 0, 'Electronics');

      expect(mockProductService.findAll).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
        category: 'Electronics',
      });
    });
  });

  describe('product', () => {
    it('should delegate to findById', async () => {
      const mockProduct = {
        id: '1',
        name: 'Product 1',
        description: 'Desc 1',
        category: 'Electronics',
        price: 100,
        imageUrl: undefined,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockProductService.findById.mockResolvedValue(mockProduct);

      const result = await resolver.product('1');

      expect(mockProductService.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockProduct);
    });

    it('should return null if not found', async () => {
      mockProductService.findById.mockResolvedValue(null);

      const result = await resolver.product('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('resolveReference', () => {
    it('should call findById with reference id', async () => {
      const mockProduct = {
        id: '1',
        name: 'Product 1',
        description: 'Desc 1',
        category: 'Electronics',
        price: 100,
        imageUrl: undefined,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockProductService.findById.mockResolvedValue(mockProduct);

      const result = await resolver.resolveReference({ id: '1' });

      expect(mockProductService.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockProduct);
    });

    it('should return null if reference not found', async () => {
      mockProductService.findById.mockResolvedValue(null);

      const result = await resolver.resolveReference({ id: 'nonexistent' });

      expect(result).toBeNull();
    });
  });
});
