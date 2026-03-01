import { test } from 'node:test';
import * as assert from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const appDir = join(process.cwd(), 'apps/storefront');

test('Next.js app directory exists', () => {
  assert.ok(existsSync(appDir), 'apps/storefront directory should exist');
});

test('app/page.tsx exists', () => {
  const pagePath = join(appDir, 'app/page.tsx');
  assert.ok(existsSync(pagePath), 'app/page.tsx should exist');
});

test('next.config.js exists', () => {
  const nextConfigPath = join(appDir, 'next.config.js');
  assert.ok(existsSync(nextConfigPath), 'next.config.js should exist');
});

test('tailwind.config.js exists', () => {
  const tailwindConfigPath = join(appDir, 'tailwind.config.js');
  assert.ok(existsSync(tailwindConfigPath), 'tailwind.config.js should exist');
});

test('global.css contains @tailwind directives', () => {
  const globalCssPath = join(appDir, 'app/global.css');
  assert.ok(existsSync(globalCssPath), 'app/global.css should exist');

  const content = readFileSync(globalCssPath, 'utf-8');
  assert.ok(
    content.includes('@tailwind'),
    'global.css should contain @tailwind directives'
  );
});

test('components.json exists (Shadcn config)', () => {
  const componentsJsonPath = join(appDir, 'components.json');
  assert.ok(
    existsSync(componentsJsonPath),
    'components.json should exist (Shadcn config)'
  );
});

test('lib/utils.ts exists (Shadcn utilities)', () => {
  const utilsPath = join(appDir, 'lib/utils.ts');
  assert.ok(
    existsSync(utilsPath),
    'lib/utils.ts should exist (Shadcn utilities)'
  );
});

test('Button component exists', () => {
  const buttonPath = join(appDir, 'components/ui/button.tsx');
  assert.ok(
    existsSync(buttonPath),
    'components/ui/button.tsx should exist'
  );
});

test('TypeScript compiles successfully', () => {
  try {
    execSync('npx tsc --noEmit', {
      cwd: appDir,
      stdio: 'pipe',
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    assert.fail(`TypeScript compilation failed: ${err.message}`);
  }
});

test('Build succeeds', () => {
  try {
    execSync('npx nx build storefront', {
      cwd: process.cwd(),
      stdio: 'pipe',
    });
    const buildOutputPath = join(appDir, '.next');
    assert.ok(
      existsSync(buildOutputPath),
      'Build output directory (.next) should exist'
    );
  } catch (error: unknown) {
    const err = error as { message?: string };
    assert.fail(`Build failed: ${err.message}`);
  }
});
