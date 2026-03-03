describe('Product Queries', () => {
  it('should list products', async () => {
    const result = await (global as any).gql(`
      query {
        products(limit: 5) {
          id
          name
          price
          category
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    expect(Array.isArray(result.data?.products)).toBe(true);
    expect((result.data?.products as Array<any>).length).toBeGreaterThan(0);
  });

  it('should get product by id', async () => {
    const result = await (global as any).gql(`
      query {
        product(id: "1") {
          id
          name
          price
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    expect(result.data?.product?.id).toBe('1');
    expect(result.data?.product?.name).toBe('Wireless Headphones');
    expect(result.data?.product?.price).toBe(129.99);
  });

  it('should filter products by category', async () => {
    const result = await (global as any).gql(`
      query {
        products(limit: 10, category: "Electronics") {
          id
          name
          category
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    expect(Array.isArray(result.data?.products)).toBe(true);

    if (result.data?.products && result.data?.products.length > 0) {
      (result.data?.products as Array<any>).forEach((product) => {
        expect(product.category).toBe('Electronics');
      });
    }
  });

  it('should return error for invalid product id', async () => {
    const result = await (global as any).gql(`
      query {
        product(id: "invalid-id") {
          id
          name
        }
      }
    `);

    expect(result.data?.product).toBeNull();
  });
});
