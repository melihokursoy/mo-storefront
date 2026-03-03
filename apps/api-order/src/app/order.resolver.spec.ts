import { Test, TestingModule } from '@nestjs/testing';
import { OrderResolver, OrderItemInput } from './order.resolver';
import { OrderService } from './order.service';
import { OrderStatus } from './order.entity';
import { JwtAuthGuard } from './auth/jwt.guard';
import { JwtService } from '@nestjs/jwt';

describe('OrderResolver', () => {
  let resolver: OrderResolver;

  const mockOrderService = {
    getOrder: jest.fn(),
    getUserOrders: jest.fn(),
    createOrder: jest.fn(),
    updateOrderStatus: jest.fn(),
    cancelOrder: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderResolver,
        { provide: OrderService, useValue: mockOrderService },
        {
          provide: JwtService,
          useValue: { verify: jest.fn() },
        },
        JwtAuthGuard,
      ],
    }).compile();

    resolver = module.get<OrderResolver>(OrderResolver);
    jest.clearAllMocks();
  });

  describe('order', () => {
    it('should return order by id', async () => {
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        cart: { id: 'cart-1', userId: 'user-1' },
        items: [],
        status: OrderStatus.PENDING,
        totalPrice: 300,
        itemCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockOrderService.getOrder.mockResolvedValue(mockOrder);

      const result = await resolver.order('order-1');

      expect(mockOrderService.getOrder).toHaveBeenCalledWith('order-1');
      expect(result).toEqual(mockOrder);
    });

    it('should return null if order not found', async () => {
      mockOrderService.getOrder.mockResolvedValue(null);

      const result = await resolver.order('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('orders', () => {
    it('should use context.userId if available', async () => {
      const mockOrders = [];
      mockOrderService.getUserOrders.mockResolvedValue(mockOrders);

      const context = { userId: 'user-123' };
      const result = await resolver.orders(context);

      expect(mockOrderService.getUserOrders).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockOrders);
    });

    it('should fall back to user-1 if context.userId not set', async () => {
      mockOrderService.getUserOrders.mockResolvedValue([]);

      const context = {};
      const result = await resolver.orders(context);

      expect(mockOrderService.getUserOrders).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('createOrder', () => {
    it('should map OrderItemInput to OrderItem and create order', async () => {
      const itemsInput: OrderItemInput[] = [
        {
          productId: 'product-1',
          productName: 'Product 1',
          price: 100,
          quantity: 2,
        },
        {
          productId: 'product-2',
          productName: 'Product 2',
          price: 50,
          quantity: 1,
        },
      ];

      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        cart: { id: 'cart-1', userId: 'user-1' },
        items: [],
        status: OrderStatus.PENDING,
        totalPrice: 250,
        itemCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockOrderService.createOrder.mockResolvedValue(mockOrder);

      const context = { userId: 'user-1' };
      const result = await resolver.createOrder('cart-1', itemsInput, context);

      expect(mockOrderService.createOrder).toHaveBeenCalledWith(
        'user-1',
        'cart-1',
        [
          {
            id: 'cart-1-item-product-1',
            product: { id: 'product-1', name: 'Product 1', price: 100 },
            quantity: 2,
            price: 100,
            subtotal: 200,
          },
          {
            id: 'cart-1-item-product-2',
            product: { id: 'product-2', name: 'Product 2', price: 50 },
            quantity: 1,
            price: 50,
            subtotal: 50,
          },
        ]
      );

      expect(result).toEqual(mockOrder);
    });

    it('should use default userId if not in context', async () => {
      const itemsInput: OrderItemInput[] = [
        {
          productId: 'product-1',
          productName: 'Product 1',
          price: 100,
          quantity: 1,
        },
      ];

      mockOrderService.createOrder.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        cart: undefined,
        items: [],
        status: OrderStatus.PENDING,
        totalPrice: 100,
        itemCount: 1,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const context = {};
      await resolver.createOrder('cart-1', itemsInput, context);

      expect(mockOrderService.createOrder).toHaveBeenCalledWith(
        'user-1',
        'cart-1',
        expect.any(Array)
      );
    });
  });

  describe('updateOrderStatus', () => {
    it('should delegate to service with orderId and status', async () => {
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        cart: { id: 'cart-1', userId: 'user-1' },
        items: [],
        status: OrderStatus.SHIPPED,
        totalPrice: 300,
        itemCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockOrderService.updateOrderStatus.mockResolvedValue(mockOrder);

      const result = await resolver.updateOrderStatus(
        'order-1',
        OrderStatus.SHIPPED
      );

      expect(mockOrderService.updateOrderStatus).toHaveBeenCalledWith(
        'order-1',
        OrderStatus.SHIPPED
      );

      expect(result?.status).toBe(OrderStatus.SHIPPED);
    });

    it('should return null if order not found', async () => {
      mockOrderService.updateOrderStatus.mockResolvedValue(null);

      const result = await resolver.updateOrderStatus(
        'nonexistent',
        OrderStatus.SHIPPED
      );

      expect(result).toBeNull();
    });
  });

  describe('cancelOrder', () => {
    it('should delegate to service with orderId', async () => {
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        cart: { id: 'cart-1', userId: 'user-1' },
        items: [],
        status: OrderStatus.CANCELLED,
        totalPrice: 300,
        itemCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockOrderService.cancelOrder.mockResolvedValue(mockOrder);

      const result = await resolver.cancelOrder('order-1');

      expect(mockOrderService.cancelOrder).toHaveBeenCalledWith('order-1');
      expect(result?.status).toBe(OrderStatus.CANCELLED);
    });

    it('should return null if order not found', async () => {
      mockOrderService.cancelOrder.mockResolvedValue(null);

      const result = await resolver.cancelOrder('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('resolveReference', () => {
    it('should call findById with reference id', async () => {
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        cart: { id: 'cart-1', userId: 'user-1' },
        items: [],
        status: OrderStatus.PENDING,
        totalPrice: 300,
        itemCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockOrderService.findById.mockResolvedValue(mockOrder);

      const result = await resolver.resolveReference({ id: 'order-1' });

      expect(mockOrderService.findById).toHaveBeenCalledWith('order-1');
      expect(result).toEqual(mockOrder);
    });

    it('should return null if order not found', async () => {
      mockOrderService.findById.mockResolvedValue(null);

      const result = await resolver.resolveReference({ id: 'nonexistent' });

      expect(result).toBeNull();
    });
  });
});
