import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from './prisma.service';

describe('CartService', () => {
  let service: CartService;

  const mockPrismaService = {
    cart: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    cartItem: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    jest.clearAllMocks();
  });

  describe('getCart', () => {
    it('should return cart by userId with graphql transformation', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            productName: 'Product 1',
            productPrice: 100,
            quantity: 2,
          },
        ],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);

      const result = await service.getCart('user-1');

      expect(mockPrismaService.cart.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { items: true },
      });

      expect(result).toEqual({
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'item-1',
            product: { id: 'product-1', name: 'Product 1', price: 100 },
            quantity: 2,
            subtotal: 200,
          },
        ],
        totalPrice: 200,
        itemCount: 2,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      });
    });

    it('should return null if cart not found', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(null);

      const result = await service.getCart('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getOrCreateCart', () => {
    it('should return existing cart', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);

      const result = await service.getOrCreateCart('user-1');

      expect(result.id).toBe('cart-1');
      expect(result.userId).toBe('user-1');
    });

    it('should create new cart if not found', async () => {
      const newCart = {
        id: 'cart-2',
        userId: 'user-2',
        items: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrismaService.cart.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.cart.create.mockResolvedValue(newCart);

      const result = await service.getOrCreateCart('user-2');

      expect(mockPrismaService.cart.create).toHaveBeenCalledWith({
        data: { userId: 'user-2' },
        include: { items: true },
      });

      expect(result.id).toBe('cart-2');
    });
  });

  describe('addToCart', () => {
    it('should create new item if not in cart', async () => {
      const existingCart = {
        id: 'cart-1',
        userId: 'user-1',
      };

      const updatedCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            productName: 'Product 1',
            productPrice: 100,
            quantity: 1,
          },
        ],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrismaService.cart.findUnique.mockResolvedValueOnce(existingCart);
      mockPrismaService.cartItem.findUnique.mockResolvedValue(null);
      mockPrismaService.cartItem.create.mockResolvedValue(null);
      mockPrismaService.cart.update.mockResolvedValue(null);
      mockPrismaService.cart.findUnique.mockResolvedValueOnce(updatedCart);

      const result = await service.addToCart(
        'user-1',
        'product-1',
        1,
        100,
        'Product 1'
      );

      expect(mockPrismaService.cartItem.create).toHaveBeenCalledWith({
        data: {
          cartId: 'cart-1',
          productId: 'product-1',
          productName: 'Product 1',
          productPrice: 100,
          quantity: 1,
        },
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(1);
    });

    it('should increment quantity if item already in cart', async () => {
      const existingCart = {
        id: 'cart-1',
        userId: 'user-1',
      };

      const existingItem = {
        id: 'item-1',
        cartId: 'cart-1',
        productId: 'product-1',
        quantity: 1,
      };

      const updatedCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            productName: 'Product 1',
            productPrice: 100,
            quantity: 3,
          },
        ],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrismaService.cart.findUnique.mockResolvedValueOnce(existingCart);
      mockPrismaService.cartItem.findUnique.mockResolvedValue(existingItem);
      mockPrismaService.cartItem.update.mockResolvedValue(null);
      mockPrismaService.cart.update.mockResolvedValue(null);
      mockPrismaService.cart.findUnique.mockResolvedValueOnce(updatedCart);

      await service.addToCart('user-1', 'product-1', 2, 100, 'Product 1');

      expect(mockPrismaService.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { quantity: 3 },
      });
    });
  });

  describe('removeFromCart', () => {
    it('should delete cart item and return updated cart', async () => {
      const existingCart = {
        id: 'cart-1',
        userId: 'user-1',
      };

      const updatedCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockPrismaService.cart.findUnique
        .mockResolvedValueOnce(existingCart)
        .mockResolvedValueOnce(updatedCart);

      const result = await service.removeFromCart('user-1', 'item-1');

      expect(mockPrismaService.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { id: 'item-1', cartId: 'cart-1' },
      });

      expect(result.items).toHaveLength(0);
    });
  });

  describe('updateCartItem', () => {
    it('should update quantity when qty > 0', async () => {
      const existingCart = {
        id: 'cart-1',
        userId: 'user-1',
      };

      const updatedCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            productName: 'Product 1',
            productPrice: 100,
            quantity: 5,
          },
        ],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockPrismaService.cart.findUnique
        .mockResolvedValueOnce(existingCart)
        .mockResolvedValueOnce(updatedCart);

      const result = await service.updateCartItem('user-1', 'item-1', 5);

      expect(mockPrismaService.cartItem.updateMany).toHaveBeenCalledWith({
        where: { id: 'item-1', cartId: 'cart-1' },
        data: { quantity: 5 },
      });

      expect(result.items[0].quantity).toBe(5);
    });

    it('should delete item when qty <= 0', async () => {
      const existingCart = {
        id: 'cart-1',
        userId: 'user-1',
      };

      const updatedCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockPrismaService.cart.findUnique
        .mockResolvedValueOnce(existingCart)
        .mockResolvedValueOnce(updatedCart);

      const result = await service.updateCartItem('user-1', 'item-1', 0);

      expect(mockPrismaService.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { id: 'item-1', cartId: 'cart-1' },
      });

      expect(result.items).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('should delete all items in cart', async () => {
      const existingCart = {
        id: 'cart-1',
        userId: 'user-1',
      };

      const updatedCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockPrismaService.cart.findUnique
        .mockResolvedValueOnce(existingCart)
        .mockResolvedValueOnce(updatedCart);

      const result = await service.clearCart('user-1');

      expect(mockPrismaService.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-1' },
      });

      expect(result.items).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should return cart by id with graphql transformation', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            productName: 'Product 1',
            productPrice: 100,
            quantity: 1,
          },
        ],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);

      const result = await service.findById('cart-1');

      expect(result).toBeDefined();
      expect(result?.totalPrice).toBe(100);
      expect(result?.itemCount).toBe(1);
    });

    it('should return null if cart not found', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });
});
