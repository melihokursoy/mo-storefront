/* eslint-disable */
import { waitForPortOpen } from '@nx/node/utils';

var __TEARDOWN_MESSAGE__: string;

module.exports = async function () {
  console.log('\nVerifying auth subgraph e2e environment...\n');

  const host = process.env.HOST ?? 'localhost';
  const authPort = 3304;
  const userPort = 3305;
  const maxRetries = 60;
  const retryDelayMs = 1000;

  // Step 1: Wait for api-auth port to open
  console.log(`  Waiting for auth subgraph on :${authPort}...`);
  await waitForPortOpen(authPort, { host });

  // Step 2: Wait for api-user port to open
  console.log(`  Waiting for user subgraph on :${userPort}...`);
  await waitForPortOpen(userPort, { host });

  // Step 3: Verify GraphQL on auth subgraph
  console.log('  Verifying auth subgraph is ready for queries...');
  let authReady = false;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`http://${host}:${authPort}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ __typename }' }),
      });
      const data = (await res.json()) as { data?: { __typename?: string } };
      if (data.data?.__typename === 'Mutation') {
        console.log('  ✓ Auth subgraph is ready');
        authReady = true;
        break;
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error(
          `Auth subgraph failed to initialize after ${
            (maxRetries * retryDelayMs) / 1000
          }s`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  if (!authReady) {
    throw new Error('Auth subgraph failed to initialize');
  }

  // Step 4: Verify GraphQL on user subgraph
  console.log('  Verifying user subgraph is ready for queries...');
  let userReady = false;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`http://${host}:${userPort}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ __typename }' }),
      });
      const data = (await res.json()) as { data?: { __typename?: string } };
      if (data.data?.__typename === 'Query') {
        console.log('  ✓ User subgraph is ready\n');
        userReady = true;
        break;
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error(
          `User subgraph failed to initialize after ${
            (maxRetries * retryDelayMs) / 1000
          }s`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  if (!userReady) {
    throw new Error('User subgraph failed to initialize');
  }

  console.log('✓ Auth subgraph e2e setup complete\n');

  globalThis.__TEARDOWN_MESSAGE__ = '\n✓ Auth subgraph e2e tests complete.\n';
};
