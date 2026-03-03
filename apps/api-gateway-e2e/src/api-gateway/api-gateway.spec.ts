/**
 * GraphQL Gateway Smoke Tests
 * Basic connectivity and schema validation
 */

describe('GraphQL Gateway', () => {
  it('should respond to introspection query', async () => {
    const result = await (global as any).gql('{ __typename }');

    expect(result.errors).toBeUndefined();
    expect(result.data?.__typename).toBe('Query');
  });

  it('should have Query root type', async () => {
    const query = `
      query {
        __type(name: "Query") {
          name
          kind
          fields {
            name
          }
        }
      }
    `;

    const result = await (global as any).gql(query);

    expect(result.errors).toBeUndefined();
    expect(result.data?.__type?.name).toBe('Query');
    expect(result.data?.__type?.kind).toBe('OBJECT');
    expect(result.data?.__type?.fields).toBeDefined();
    expect(Array.isArray(result.data?.__type?.fields)).toBe(true);
  });
});
