import { waitForPortOpen } from '@nx/node/utils';
import { execSync } from 'child_process';

/* eslint-disable */
var __TEARDOWN_MESSAGE__: string;

module.exports = async function () {
  console.log('\nSetting up cart subgraph e2e tests...\n');

  try {
    console.log('  Starting database container...');
    execSync('npm run db:up', { stdio: 'inherit', cwd: process.cwd() });
    console.log('  ✓ Database container started\n');

    console.log('  Generating Prisma client...');
    execSync('npm run db:generate:cart', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log('  ✓ Prisma client generated\n');

    console.log('  Running migration...');
    const svcDir = `${process.cwd()}/apps/api-cart`;
    execSync('npx prisma migrate dev', {
      stdio: 'inherit',
      cwd: svcDir,
    });
    console.log('  ✓ Migration completed\n');

    console.log('  Seeding data...');
    execSync('npm run db:seed:cart', { stdio: 'inherit', cwd: process.cwd() });
    console.log('  ✓ Database seeded\n');
  } catch (error) {
    console.error('  ✗ Database setup failed:', error);
    throw error;
  }

  const host = process.env.HOST ?? 'localhost';
  const port = 3302;
  const maxRetries = 60;
  const retryDelayMs = 1000;

  console.log(`  Waiting for cart subgraph on :${port}...`);
  await waitForPortOpen(port, { host });

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
        console.log('  ✓ Cart subgraph is ready\n');
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

  console.log('✓ Cart subgraph e2e setup complete\n');

  globalThis.__TEARDOWN_MESSAGE__ = '\n✓ Cart subgraph e2e tests complete.\n';
};
