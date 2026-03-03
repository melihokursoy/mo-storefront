describe('Cart Mutations', () => {
  const token = (global as any).makeToken('user-1');

  describe('with JWT authentication', () => {
    it('should add item to cart', async () => {
      const result = await (global as any).gql(
        `mutation {
          addToCart(
            productId: "1"
            quantity: 1
            productPrice: 129.99
            productName: "Wireless Headphones"
          ) {
            id
            items {
              id
              quantity
            }
            totalPrice
            itemCount
          }
        }`,
        {},
        token
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.addToCart?.id).toBeDefined();
      expect(Array.isArray(result.data?.addToCart?.items)).toBe(true);
      expect(
        (result.data?.addToCart?.items as Array<any>).length
      ).toBeGreaterThan(0);
      expect(typeof result.data?.addToCart?.totalPrice).toBe('number');
    });

    it('should update cart item quantity', async () => {
      const result = await (global as any).gql(
        `mutation {
          updateCartItem(cartItemId: "cart-user-1-item-1", quantity: 5) {
            id
            items {
              quantity
            }
            totalPrice
          }
        }`,
        {},
        token
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.updateCartItem?.id).toBeDefined();
    });

    it('should clear cart', async () => {
      const result = await (global as any).gql(
        `mutation {
          clearCart {
            id
            itemCount
          }
        }`,
        {},
        token
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.clearCart?.itemCount).toBe(0);
    });
  });

  describe('without JWT authentication', () => {
    it('should reject unauthenticated addToCart', async () => {
      const result = await (global as any).gql(`
        mutation {
          addToCart(
            productId: "1"
            quantity: 1
            productPrice: 129.99
            productName: "Wireless Headphones"
          ) {
            id
          }
        }
      `);

      expect(result.errors).toBeDefined();
      expect((result.errors as Array<any>).length).toBeGreaterThan(0);
    });
  });
});
