/* eslint-disable */
import * as jwt from 'jsonwebtoken';
import { CookieJar } from 'tough-cookie';

const AUTH_URL = 'http://localhost:3304/graphql';
const JWT_SECRET =
  process.env.JWT_SECRET ?? 'test-secret-key-change-in-production';

interface GqlResponse {
  data?: Record<string, unknown>;
  errors?: Array<{ message: string }>;
}

/**
 * Basic GraphQL query/mutation helper (no cookies)
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

  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  return (await res.json()) as GqlResponse;
}

/**
 * GraphQL helper with cookie jar for managing refresh tokens
 * Automatically stores/sends Set-Cookie headers
 */
async function gqlWithCookies(
  jar: CookieJar,
  query: string,
  variables?: Record<string, unknown>,
  token?: string
): Promise<GqlResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Attach cookies from jar
  const cookies = await jar.getCookies(AUTH_URL);
  if (cookies.length > 0) {
    headers['Cookie'] = cookies.map((c) => `${c.key}=${c.value}`).join('; ');
  }

  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  // Store Set-Cookie header in jar
  const setCookieHeaders = res.headers.get('set-cookie');
  if (setCookieHeaders) {
    // fetch returns comma-separated cookies in single header string
    const cookieStrings = setCookieHeaders.split(',').map((s) => s.trim());
    for (const cookieString of cookieStrings) {
      try {
        await jar.setCookie(cookieString, AUTH_URL);
      } catch (error) {
        // Log but don't fail on invalid cookies
      }
    }
  }

  return (await res.json()) as GqlResponse;
}

/**
 * Generate JWT token for authenticated tests
 */
function makeToken(userId = 'user-1', email = 'user@test.com'): string {
  return jwt.sign(
    {
      sub: userId,
      userId,
      email,
      role: 'user',
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

module.exports = async function () {
  // Expose GraphQL helpers as globals so all spec files can use them
  (global as any).gql = gql;
  (global as any).gqlWithCookies = gqlWithCookies;
  (global as any).makeToken = makeToken;
  (global as any).CookieJar = CookieJar;
};
