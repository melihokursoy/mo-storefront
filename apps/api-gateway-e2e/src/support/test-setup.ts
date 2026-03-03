/* eslint-disable */
import * as jwt from 'jsonwebtoken';

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost:3300/graphql';
const JWT_SECRET =
  process.env.JWT_SECRET ?? 'test-secret-key-change-in-production';

type GqlResponse = {
  data?: Record<string, unknown>;
  errors?: Array<{ message: string }>;
};

/**
 * GraphQL query/mutation helper
 */
async function gql(
  query: string,
  variables?: Record<string, unknown>,
  token?: string
): Promise<GqlResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  return res.json() as Promise<GqlResponse>;
}

/**
 * Generate JWT token for authenticated tests
 */
function makeToken(userId = 'user-1'): string {
  return jwt.sign({ sub: userId, userId }, JWT_SECRET, { expiresIn: '1h' });
}

module.exports = async function () {
  // Expose GraphQL helpers as globals so all spec files can use them
  (global as any).gql = gql;
  (global as any).makeToken = makeToken;
};
