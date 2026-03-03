/* eslint-disable */
import * as jwt from 'jsonwebtoken';

const SUBGRAPH_URL = 'http://localhost:3303/graphql';
const JWT_SECRET =
  process.env.JWT_SECRET ?? 'test-secret-key-change-in-production';

type GqlResponse = {
  data?: Record<string, unknown>;
  errors?: Array<{ message: string }>;
};

async function gql(
  query: string,
  variables?: Record<string, unknown>,
  token?: string
): Promise<GqlResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(SUBGRAPH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  return res.json() as Promise<GqlResponse>;
}

function makeToken(userId = 'user-1'): string {
  return jwt.sign({ sub: userId, userId }, JWT_SECRET, { expiresIn: '1h' });
}

module.exports = async function () {
  (global as any).gql = gql;
  (global as any).makeToken = makeToken;
};
