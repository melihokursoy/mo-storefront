import { Test, TestingModule } from '@nestjs/testing';
import { CartResolver } from './cart.resolver';
import { CartService } from './cart.service';
import { JwtAuthGuard } from './auth/jwt.guard';

describe('CartResolver', () => {
  let resolver: CartResolver;

  const mockCartService = {
    getCart: jest.fn(),
    addToCart: jest.fn(),
    removeFromCart: jest.fn(),
    updateCartItem: jest.fn(),
    clearCart: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartResolver,
        { provide: CartService, useValue: mockCartService },
        {
          provide: JwtAuthGuard,
          useValue: { canActivate: jest.fn(() => true) },
        },
      ],
    }).compile();

    resolver = module.get<CartResolver>(CartResolver);
    jest.clearAllMocks();
  });

  describe('cart', () => {
    it('should use context.userId if available', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-123',
        items: [],
        totalPrice: 0,
        itemCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockCartService.getCart.mockResolvedValue(mockCart);

      const context = { userId: 'user-123' };
      const result = await resolver.cart(context);

      expect(mockCartService.getCart).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockCart);
    });

    it('should fall back to user-1 if context.userId not set', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [],
        totalPrice: 0,
        itemCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockCartService.getCart.mockResolvedValue(mockCart);

      const context = {};
      const result = await resolver.cart(context);

      expect(mockCartService.getCart).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockCart);
    });
  });

  describe('addToCart', () => {
    it('should pass all parameters to service', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [],
        totalPrice: 100,
        itemCount: 1,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockCartService.addToCart.mockResolvedValue(mockCart);

      const context = { userId: 'user-1' };
      const result = await resolver.addToCart(
        'product-1',
        2,
        50,
        'Product 1',
        context
      );

      expect(mockCartService.addToCart).toHaveBeenCalledWith(
        'user-1',
        'product-1',
        2,
        50,
        'Product 1'
      );

      expect(result).toEqual(mockCart);
    });

    it('should use default userId if not in context', async () => {
      mockCartService.addToCart.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [],
        totalPrice: 0,
        itemCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      });

      const context = {};
      await resolver.addToCart('product-1', 1, 100, 'Product 1', context);

      expect(mockCartService.addToCart).toHaveBeenCalledWith(
        'user-1',
        'product-1',
        1,
        100,
        'Product 1'
      );
    });
  });

  describe('removeFromCart', () => {
    it('should pass cartItemId and userId to service', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [],
        totalPrice: 0,
        itemCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockCartService.removeFromCart.mockResolvedValue(mockCart);

      const context = { userId: 'user-1' };
      const result = await resolver.removeFromCart('item-1', context);

      expect(mockCartService.removeFromCart).toHaveBeenCalledWith(
        'user-1',
        'item-1'
      );
      expect(result).toEqual(mockCart);
    });
  });

  describe('updateCartItem', () => {
    it('should pass cartItemId, quantity, and userId to service', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'item-1',
            product: { id: 'product-1', name: 'Product 1', price: 100 },
            quantity: 5,
            subtotal: 500,
          },
        ],
        totalPrice: 500,
        itemCount: 5,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockCartService.updateCartItem.mockResolvedValue(mockCart);

      const context = { userId: 'user-1' };
      const result = await resolver.updateCartItem('item-1', 5, context);

      expect(mockCartService.updateCartItem).toHaveBeenCalledWith(
        'user-1',
        'item-1',
        5
      );

      expect(result).toEqual(mockCart);
    });
  });

  describe('clearCart', () => {
    it('should pass userId to service', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [],
        totalPrice: 0,
        itemCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockCartService.clearCart.mockResolvedValue(mockCart);

      const context = { userId: 'user-1' };
      const result = await resolver.clearCart(context);

      expect(mockCartService.clearCart).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockCart);
    });
  });

  describe('resolveReference', () => {
    it('should call findById with reference id', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [],
        totalPrice: 0,
        itemCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockCartService.findById.mockResolvedValue(mockCart);

      const result = await resolver.resolveReference({ id: 'cart-1' });

      expect(mockCartService.findById).toHaveBeenCalledWith('cart-1');
      expect(result).toEqual(mockCart);
    });

    it('should return null if cart not found', async () => {
      mockCartService.findById.mockResolvedValue(null);

      const result = await resolver.resolveReference({ id: 'nonexistent' });

      expect(result).toBeNull();
    });
  });
});
