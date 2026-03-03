import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaService } from './prisma.service';
import { OrderStatus } from './order.entity';

describe('OrderService', () => {
  let service: OrderService;

  const mockPrismaService = {
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should create order with computed totalPrice and itemCount', async () => {
      const items = [
        {
          id: 'item-1',
          product: { id: 'product-1', name: 'Product 1', price: 100 },
          quantity: 2,
          price: 100,
          subtotal: 200,
        },
        {
          id: 'item-2',
          product: { id: 'product-2', name: 'Product 2', price: 50 },
          quantity: 3,
          price: 50,
          subtotal: 150,
        },
      ];

      const createdOrder = {
        id: 'order-1',
        userId: 'user-1',
        cartId: 'cart-1',
        cartUserId: 'user-1',
        status: 'PENDING',
        totalPrice: 350,
        itemCount: 5,
        items: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrismaService.order.create.mockResolvedValue(createdOrder);

      const result = await service.createOrder('user-1', 'cart-1', items);

      expect(mockPrismaService.order.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          cartId: 'cart-1',
          cartUserId: 'user-1',
          status: 'PENDING',
          totalPrice: 350,
          itemCount: 5,
          items: {
            create: [
              {
                productId: 'product-1',
                productName: 'Product 1',
                productPrice: 100,
                quantity: 2,
              },
              {
                productId: 'product-2',
                productName: 'Product 2',
                productPrice: 50,
                quantity: 3,
              },
            ],
          },
        },
        include: { items: true },
      });

      expect(result).toBeDefined();
      expect(result.totalPrice).toBe(350);
      expect(result.itemCount).toBe(5);
    });
  });

  describe('getOrder', () => {
    it('should return order with graphql transformation', async () => {
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        cartId: 'cart-1',
        cartUserId: 'user-1',
        status: 'PENDING',
        totalPrice: 300,
        itemCount: 3,
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
        updatedAt: new Date('2024-01-01'),
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.getOrder('order-1');

      expect(mockPrismaService.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        include: { items: true },
      });

      expect(result).toBeDefined();
      expect(result?.totalPrice).toBe(300);
      expect(result?.status).toBe('PENDING');
    });

    it('should return null if order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      const result = await service.getOrder('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getUserOrders', () => {
    it('should return user orders sorted by createdAt descending', async () => {
      const mockOrders = [
        {
          id: 'order-2',
          userId: 'user-1',
          status: 'DELIVERED',
          totalPrice: 200,
          itemCount: 2,
          items: [],
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          id: 'order-1',
          userId: 'user-1',
          status: 'PENDING',
          totalPrice: 300,
          itemCount: 3,
          items: [],
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.getUserOrders('user-1');

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toHaveLength(2);
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status', async () => {
      const existingOrder = {
        id: 'order-1',
        userId: 'user-1',
        status: 'PENDING',
        totalPrice: 300,
        itemCount: 3,
        items: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const updatedOrder = {
        ...existingOrder,
        status: 'SHIPPED',
        updatedAt: new Date('2024-01-02'),
        items: [],
      };

      mockPrismaService.order.findUnique.mockResolvedValueOnce(existingOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      const result = await service.updateOrderStatus(
        'order-1',
        OrderStatus.SHIPPED
      );

      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'SHIPPED' },
        include: { items: true },
      });

      expect(result?.status).toBe('SHIPPED');
    });

    it('should return null if order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      const result = await service.updateOrderStatus(
        'nonexistent',
        OrderStatus.SHIPPED
      );

      expect(result).toBeNull();
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order if not delivered', async () => {
      const existingOrder = {
        id: 'order-1',
        userId: 'user-1',
        status: 'PENDING',
        totalPrice: 300,
        itemCount: 3,
        items: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const cancelledOrder = {
        ...existingOrder,
        status: 'CANCELLED',
        items: [],
      };

      mockPrismaService.order.findUnique.mockResolvedValueOnce(existingOrder);
      mockPrismaService.order.update.mockResolvedValue(cancelledOrder);

      const result = await service.cancelOrder('order-1');

      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'CANCELLED' },
        include: { items: true },
      });

      expect(result?.status).toBe('CANCELLED');
    });

    it('should not cancel delivered order', async () => {
      const deliveredOrder = {
        id: 'order-1',
        userId: 'user-1',
        status: 'DELIVERED',
        totalPrice: 300,
        itemCount: 3,
        items: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrismaService.order.findUnique.mockResolvedValue(deliveredOrder);

      const result = await service.cancelOrder('order-1');

      expect(mockPrismaService.order.update).not.toHaveBeenCalled();
      expect(result?.status).toBe('DELIVERED');
    });

    it('should return null if order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      const result = await service.cancelOrder('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should delegate to getOrder', async () => {
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        status: 'PENDING',
        totalPrice: 300,
        itemCount: 3,
        items: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.findById('order-1');

      expect(result).toBeDefined();
    });
  });
});
