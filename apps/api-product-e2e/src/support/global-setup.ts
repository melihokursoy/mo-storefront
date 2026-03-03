import { waitForPortOpen } from '@nx/node/utils';

/* eslint-disable */
var __TEARDOWN_MESSAGE__: string;

module.exports = async function () {
  console.log('\nVerifying product subgraph e2e environment...\n');

  const host = process.env.HOST ?? 'localhost';
  const port = 3301;
  const maxRetries = 60;
  const retryDelayMs = 1000;

  console.log(`  Waiting for product subgraph on :${port}...`);
  await waitForPortOpen(port, { host });

  // Wait for GraphQL to be ready
  console.log('  Verifying subgraph is ready for queries...');
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`http://${host}:${port}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ __typename }' }),
      });
      const data = (await res.json()) as { data?: { __typename?: string } };
      if (data.data?.__typename === 'Query') {
        console.log('  ✓ Product subgraph is ready\n');
        break;
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error(
          `Subgraph failed to initialize after ${
            (maxRetries * retryDelayMs) / 1000
          }s`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  console.log('✓ Product subgraph e2e setup complete\n');

  // Hint: Use `globalThis` to pass variables to global teardown.
  globalThis.__TEARDOWN_MESSAGE__ =
    '\n✓ Product subgraph e2e tests complete.\n';
};
