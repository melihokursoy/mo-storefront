# Implementation Plan: Next.js App with Tailwind CSS and Shadcn UI

## Context

The monorepo (`mo-storefront`) is a brand-new Nx workspace (v22.5.1) with no apps yet. This plan covers generating a Next.js app (`apps/storefront`) configured with Tailwind CSS and Shadcn UI, using a flat directory layout (no `src/` folder). The workspace currently only has `@nx/js` installed; `@nx/next`, Tailwind, and Shadcn must all be added. Tests go in a root-level `./tests/` folder using Node's built-in test runner.

## Current State

- Package manager: **npm**
- Nx version: **22.5.1**
- No `apps/` directory exists yet
- `package.json` workspaces: `["packages/*"]` only
- `@nx/next`, Tailwind, Shadcn: **not installed**
- `tsconfig.base.json` uses `module: "nodenext"` (must be overridden for Next.js)

---

## Steps

### 1. Update Root Workspace Config

**File:** `package.json`

Add `"apps/*"` to the workspaces array:
```json
"workspaces": ["packages/*", "apps/*"]
```

### 2. Install @nx/next Plugin

```sh
npm install --save-dev @nx/next
```

**✅ Checkpoint 1: Workspace Configuration**

Verify:
```sh
git diff package.json          # Check workspaces array updated
npm list @nx/next              # Confirm @nx/next installed
```

Commit:
```sh
git add package.json package-lock.json
git commit -m "✨ feat: configure nx workspace and install @nx/next plugin"
```

---

### 3. Generate the Next.js App

Check available flags first, then run:
```sh
npm exec nx generate @nx/next:app -- --name=storefront --directory=apps/storefront --no-src --style=css
```

- `--no-src` (or `--no-srcDir`) — flat layout, no `src/` folder
- `--style=css` — Tailwind replaces default styles

**✅ Checkpoint 2: Next.js App Generation**

Verify:
```sh
ls -la apps/storefront/                    # App structure created
cat apps/storefront/next.config.js         # Config file exists
test ! -d apps/storefront/src && echo "✓ No src folder" || echo "✗ src folder exists"
```

Commit:
```sh
git add apps/storefront/
git commit -m "✨ feat: generate next.js app with flat directory structure"
```

---

### 4. Configure Tailwind CSS

Install dependencies:
```sh
npm install --save-dev tailwindcss postcss autoprefixer
```

Create `apps/storefront/tailwind.config.js`:
```js
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

Create `apps/storefront/postcss.config.js`:
```js
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

Update `apps/storefront/app/globals.css` to add Tailwind directives at the top:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**✅ Checkpoint 3: Tailwind CSS Configuration**

Verify:
```sh
test -f apps/storefront/tailwind.config.js && echo "✓ tailwind.config.js exists"
test -f apps/storefront/postcss.config.js && echo "✓ postcss.config.js exists"
grep -q "@tailwind" apps/storefront/app/globals.css && echo "✓ @tailwind directives present"
npm list tailwindcss postcss autoprefixer  # Confirm dependencies installed
```

Commit:
```sh
git add apps/storefront/tailwind.config.js apps/storefront/postcss.config.js apps/storefront/app/globals.css package-lock.json
git commit -m "🎨 style: configure tailwind css with post-processing"
```

---

### 5. Fix TypeScript Config for Next.js

**File:** `apps/storefront/tsconfig.json`

Override `module`/`moduleResolution` (base uses `nodenext` which conflicts with Next.js):
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "paths": { "@/*": ["./*"] }
  }
}
```

**✅ Checkpoint 4: TypeScript Configuration**

Verify:
```sh
grep -q '"module": "esnext"' apps/storefront/tsconfig.json && echo "✓ module set to esnext"
grep -q '"moduleResolution": "bundler"' apps/storefront/tsconfig.json && echo "✓ moduleResolution set to bundler"
npm exec nx typecheck storefront           # TypeScript compiles
```

Commit:
```sh
git add apps/storefront/tsconfig.json
git commit -m "🔧 chore: fix typescript config for next.js compatibility"
```

---

### 6. Initialize Shadcn UI

```sh
cd apps/storefront && npx shadcn@latest init
```

Choices:
- Style: New York
- Base color: Neutral
- CSS variables: yes

This creates `components.json`, updates `tailwind.config.js`, creates `lib/utils.ts`.

Add the Button component:
```sh
npx shadcn@latest add button --cwd=apps/storefront
```

### 7. Update app/page.tsx

Import and render `<Button>` from `@/components/ui/button` to confirm end-to-end integration.

**✅ Checkpoint 5: Shadcn UI Integration**

Verify:
```sh
test -f apps/storefront/components.json && echo "✓ components.json created"
test -f apps/storefront/lib/utils.ts && echo "✓ lib/utils.ts created"
test -f apps/storefront/components/ui/button.tsx && echo "✓ Button component added"
grep -q "from.*@/components/ui/button" apps/storefront/app/page.tsx && echo "✓ Button imported in page.tsx"
npm exec nx build storefront                # Build succeeds with Shadcn
```

Commit:
```sh
git add apps/storefront/components.json apps/storefront/lib/utils.ts apps/storefront/components/ui/button.tsx apps/storefront/app/page.tsx
git commit -m "✨ feat: initialize shadcn ui and integrate button component"
```

---

### 8. Write Unit Tests

**File:** `tests/nextjs-app-tailwind-shadcn/setup.test.ts`

Use Node's built-in `node:test` runner (no new framework needed). Test cases:

1. App directory and key files exist (`app/page.tsx`, `next.config.js`, `tailwind.config.js`)
2. `globals.css` contains `@tailwind` directives
3. `components.json` and `components/ui/button.tsx` exist
4. TypeScript compiles: `npm exec nx typecheck storefront`
5. Build succeeds: `npm exec nx build storefront`

Run with:
```sh
node --experimental-strip-types --test tests/nextjs-app-tailwind-shadcn/setup.test.ts
```

**✅ Checkpoint 6: Unit Tests**

Verify:
```sh
test -f tests/nextjs-app-tailwind-shadcn/setup.test.ts && echo "✓ Test file created"
node --experimental-strip-types --test tests/nextjs-app-tailwind-shadcn/setup.test.ts
```

Commit:
```sh
git add tests/nextjs-app-tailwind-shadcn/setup.test.ts
git commit -m "✅ test: add unit tests for app setup and configuration"
```

---

### 9. Install @nx/playwright Plugin

```sh
npm install --save-dev @nx/playwright
```

### 10. Generate Playwright E2E App

```sh
npm exec nx generate @nx/playwright:configuration -- --project=storefront --directory=apps/storefront-e2e --baseUrl=http://localhost:3000
```

This generates:
- `apps/storefront-e2e/` directory with Playwright configuration
- `playwright.config.ts` with baseUrl pointing to dev server
- `e2e/` folder for test specs

### 11. Create E2E Test Specs

**File:** `apps/storefront-e2e/e2e/app.spec.ts`

Test scenarios:
1. Homepage loads successfully (status 200, page has content)
2. Button component renders and is interactive
3. Tailwind styles are applied (check computed styles)
4. Navigation/routing works (if applicable)
5. Shadcn UI components render properly

Example structure:
```typescript
import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  expect(page).toHaveTitle(/Home/);
});

test('button component is interactive', async ({ page }) => {
  await page.goto('/');
  const button = page.getByRole('button');
  await expect(button).toBeVisible();
  await button.click();
  // assert behavior
});
```

### 12. Update E2E Configuration

**File:** `apps/storefront-e2e/playwright.config.ts`

Ensure it points to `baseUrl: 'http://localhost:3000'` for dev server. The generator should handle this, but verify.

**✅ Checkpoint 7: Playwright E2E Testing**

Verify:
```sh
test -d apps/storefront-e2e && echo "✓ E2E app directory created"
test -f apps/storefront-e2e/playwright.config.ts && echo "✓ Playwright config exists"
test -f apps/storefront-e2e/e2e/app.spec.ts && echo "✓ E2E test specs created"
grep -q "baseUrl" apps/storefront-e2e/playwright.config.ts && echo "✓ baseUrl configured"
npm exec nx e2e storefront-e2e              # Run e2e tests (with dev server running)
```

Commit:
```sh
git add apps/storefront-e2e/
git commit -m "✅ test: add playwright e2e tests with comprehensive scenarios"
```

---

## Critical Files

| File | Action |
|---|---|
| `package.json` | Add `apps/*` to workspaces |
| `apps/storefront/tsconfig.json` | Override module/moduleResolution |
| `apps/storefront/tailwind.config.js` | Create with content paths |
| `apps/storefront/postcss.config.js` | Create for Tailwind processing |
| `apps/storefront/app/globals.css` | Add `@tailwind` directives |
| `apps/storefront/components.json` | Created by Shadcn init |
| `apps/storefront/lib/utils.ts` | Created by Shadcn init |
| `apps/storefront/components/ui/button.tsx` | Created by `shadcn add button` |
| `apps/storefront/app/page.tsx` | Updated to use Button component |
| `tests/nextjs-app-tailwind-shadcn/setup.test.ts` | New unit test file |
| `apps/storefront-e2e/playwright.config.ts` | Generated Playwright config |
| `apps/storefront-e2e/e2e/app.spec.ts` | E2E test specs |

## Verification

```sh
# Unit tests
npm exec nx typecheck storefront   # TypeScript passes
npm exec nx build storefront       # Build succeeds
npm exec nx serve storefront       # Dev server starts (in background for e2e)
node --experimental-strip-types --test tests/nextjs-app-tailwind-shadcn/setup.test.ts

# E2E tests
npm exec nx e2e storefront-e2e     # Run Playwright e2e tests
npm exec nx e2e storefront-e2e --ui # Run with Playwright UI
```
