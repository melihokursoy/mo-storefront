describe('Order Mutations & Queries', () => {
  const token = (global as any).makeToken('user-1');

  describe('Order Creation', () => {
    it('should create order with JWT authentication', async () => {
      const result = await (global as any).gql(
        `mutation {
          createOrder(
            cartId: "cart-user-1"
            items: [
              {
                productId: "1"
                productName: "Wireless Headphones"
                price: 129.99
                quantity: 1
              }
            ]
          ) {
            id
            status
            totalPrice
            itemCount
          }
        }`,
        {},
        token
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.createOrder?.id).toBeDefined();
      expect(result.data?.createOrder?.status).toBe('PENDING');
      expect(typeof result.data?.createOrder?.totalPrice).toBe('number');
    });

    it('should reject unauthenticated createOrder', async () => {
      const result = await (global as any).gql(`
        mutation {
          createOrder(
            cartId: "cart-user-1"
            items: [
              {
                productId: "1"
                productName: "Wireless Headphones"
                price: 129.99
                quantity: 1
              }
            ]
          ) {
            id
          }
        }
      `);

      expect(result.errors).toBeDefined();
      expect((result.errors as Array<any>).length).toBeGreaterThan(0);
    });
  });

  describe('Order Queries', () => {
    it('should list user orders', async () => {
      const result = await (global as any).gql(`
        query {
          orders {
            id
            status
            totalPrice
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(Array.isArray(result.data?.orders)).toBe(true);
    });

    it('should get order by id', async () => {
      const result = await (global as any).gql(`
        query {
          order(id: "order-1") {
            id
            status
            totalPrice
            itemCount
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      if (result.data?.order) {
        expect(result.data.order.id).toBe('order-1');
        expect(result.data.order.status).toBeDefined();
      }
    });
  });
});
