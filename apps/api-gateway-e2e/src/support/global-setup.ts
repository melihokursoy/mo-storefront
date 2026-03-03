import { waitForPortOpen } from '@nx/node/utils';
import { execSync } from 'child_process';

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
  console.log('\nSetting up federation e2e tests...\n');

  // Step 1: Set up databases (docker containers, migrations, seed data)
  try {
    // In CI, databases are already running as service containers; skip db:up
    if (!process.env.CI && !process.env.GITHUB_ACTIONS) {
      console.log('  Starting database containers...');
      execSync('npm run db:up', { stdio: 'inherit', cwd: process.cwd() });
      console.log('  ✓ Database containers started\n');
    } else {
      console.log('  Skipping db:up (CI environment detected, services already running)\n');
    }

    console.log('  Generating Prisma clients...');
    execSync('npm run db:generate', { stdio: 'inherit', cwd: process.cwd() });
    console.log('  ✓ Prisma clients generated\n');

    console.log('  Running migrations...');
    for (const svc of API_SERVICES) {
      const svcDir = `${process.cwd()}/apps/api-${svc.name}`;
      execSync('npx prisma migrate dev', {
        stdio: 'inherit',
        cwd: svcDir,
      });
    }
    console.log('  ✓ Migrations completed\n');

    console.log('  Seeding data...');
    execSync('npm run db:seed', { stdio: 'inherit', cwd: process.cwd() });
    console.log('  ✓ Database seeded\n');
  } catch (error) {
    console.error('  ✗ Database setup failed:', error);
    throw error;
  }

  // Step 2: Wait for all 4 federation services to be ready
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
