import { waitForPortOpen } from '@nx/node/utils';

/* eslint-disable */
var __TEARDOWN_MESSAGE__: string;

const SERVICES = [
  { name: 'api-gateway', port: 3300 },
  { name: 'api-product', port: 3301 },
  { name: 'api-cart', port: 3302 },
  { name: 'api-order', port: 3303 },
];

const API_SERVICES = [
  { name: 'product', port: 3301 },
  { name: 'cart', port: 3302 },
  { name: 'order', port: 3303 },
];

module.exports = async function () {
  console.log('\nVerifying federation e2e environment...\n');

  // Wait for all 4 federation services to be ready
  const host = process.env.HOST ?? 'localhost';
  const maxRetries = 60;
  const retryDelayMs = 1000;

  for (const svc of SERVICES) {
    console.log(`  Waiting for ${svc.name} on :${svc.port}...`);
    await waitForPortOpen(svc.port, { host });
  }

  console.log('  ✓ All ports open\n');

  // Wait for gateway to be fully initialized and ready for queries
  console.log('  Verifying gateway is ready for queries...');
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`http://${host}:3300/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ __typename }' }),
      });
      const data = (await res.json()) as { data?: { __typename?: string } };
      if (data.data?.__typename === 'Query') {
        console.log('  ✓ Gateway is ready\n');
        break;
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error(
          `Gateway failed to initialize after ${
            (maxRetries * retryDelayMs) / 1000
          }s`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  console.log('✓ All federation services are ready\n');

  // Hint: Use `globalThis` to pass variables to global teardown.
  globalThis.__TEARDOWN_MESSAGE__ = '\n✓ Federation e2e tests complete.\n';
};
