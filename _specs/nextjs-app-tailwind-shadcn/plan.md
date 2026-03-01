# Implementation Plan: Next.js App with Tailwind CSS and Shadcn UI

## 🔄 Todo Tracking Workflow

**IMPORTANT**: After completing each named checkpoint section:

1. Update `_specs/nextjs-app-tailwind-shadcn/todos.md` to mark items `[x]` as complete
2. Add observations to the "Review Notes" section
3. Include `todos.md` in the commit along with implementation changes
4. This ensures progress is always tracked and visible

---

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
npx nx add @nx/next
```

**✅ Checkpoint 1: Workspace Configuration**

Verify:

```sh
git diff package.json          # Check workspaces array updated
npm list @nx/next              # Confirm @nx/next installed
```

**📝 Update Todos:**

```sh
# Edit _specs/nextjs-app-tailwind-shadcn/todos.md and mark complete:
# - [x] Update `package.json` - add `apps/*` to workspaces array
# - [x] Install `@nx/next` plugin
```

Commit (include todos.md):

```sh
git add package.json package-lock.json _specs/nextjs-app-tailwind-shadcn/todos.md
git commit -m "✨ feat: configure nx workspace and install @nx/next plugin

Mark todos.md checkpoint 1 items as complete."
```

---

### 3. Generate the Next.js App

Check available flags first, then run:

```sh
npx nx generate @nx/next:app --name=storefront --directory=apps/storefront --no-src --style=css
```

- `--no-src` (or `--no-srcDir`) — flat layout, no `src/` folder
- `--style=css` — Tailwind replaces default styles

**Note:** The generator will automatically create initial configuration files. Verify what was generated and only manually add/override what's needed in subsequent steps.

**✅ Checkpoint 2: Next.js App Generation**

Verify app structure:

```sh
ls -la apps/storefront/                    # App structure created
cat apps/storefront/next.config.js         # Config file exists
test ! -d apps/storefront/src && echo "✓ No src folder" || echo "✗ src folder exists"
```

Test app in dev mode:

```sh
npx nx serve storefront                    # Start dev server on http://localhost:3000
# Verify page loads in browser or with curl
curl -s http://localhost:3000 | head -20  # Check HTML response
# Stop server (Ctrl+C)
```

Test build:

```sh
npx nx build storefront                    # Build for production
test -d apps/storefront/.next && echo "✓ Build succeeded" || echo "✗ Build failed"
```

Test E2E (with dev server running in background):

```sh
npx nx serve storefront &                  # Start dev server in background
sleep 3                                     # Wait for server to start
npx nx e2e storefront-e2e                  # Run Playwright e2e tests
kill %1                                     # Stop background server
```

**📝 Update Todos:**

```sh
# Edit _specs/nextjs-app-tailwind-shadcn/todos.md and mark complete:
# Checkpoint 2 completed items:
# - [x] Generate Next.js app
# - [x] Verify flat directory structure
# - [x] Run build - succeeds
# - [x] Run e2e tests - pass
#
# Update "Review Notes" section with observations:
# - What went smoothly? (e.g., generators auto-configured everything)
# - What was unexpected? (e.g., E2E app generated automatically)
# - Improvements? (e.g., preferred command patterns identified)
```

Commit (include todos.md with review notes):

```sh
git add apps/storefront/ apps/storefront-e2e/ package.json nx.json tsconfig.json .gitignore .vscode/ _specs/nextjs-app-tailwind-shadcn/todos.md
git commit -m "✨ feat: generate next.js app with flat directory structure and e2e tests

Mark checkpoint 2 todos complete. Add review notes documenting:
- What went smoothly
- What was unexpected
- Plan improvements identified"
```

---

### 4. Configure Tailwind CSS

The `@nx/next` generator with `--style=css` may have already installed Tailwind and created configuration. Verify and complete the following:

**Check what exists:**

```sh
ls apps/storefront/tailwind.config.js apps/storefront/postcss.config.js 2>/dev/null && echo "✓ Config files exist"
```

**If missing, install dependencies:**

```sh
npm install --save-dev tailwindcss postcss autoprefixer
```

**If needed, create `apps/storefront/tailwind.config.js`:**

```js
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

**If needed, create `apps/storefront/postcss.config.js`:**

```js
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

**Ensure `apps/storefront/app/globals.css` has Tailwind directives at the top:**

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
npx nx typecheck storefront           # TypeScript compiles
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
npx nx build storefront                # Build succeeds with Shadcn
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
4. TypeScript compiles: `npx nx typecheck storefront`
5. Build succeeds: `npx nx build storefront`

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
npx nx add @nx/playwright
```

### 10. Generate Playwright E2E App

```sh
npx nx generate @nx/playwright:configuration --project=storefront --directory=apps/storefront-e2e --baseUrl=http://localhost:3000
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
npx nx e2e storefront-e2e              # Run e2e tests (with dev server running)
```

Commit:

```sh
git add apps/storefront-e2e/
git commit -m "✅ test: add playwright e2e tests with comprehensive scenarios"
```

---

## Critical Files

| File                                             | Action                           |
| ------------------------------------------------ | -------------------------------- |
| `package.json`                                   | Add `apps/*` to workspaces       |
| `apps/storefront/tsconfig.json`                  | Override module/moduleResolution |
| `apps/storefront/tailwind.config.js`             | Create with content paths        |
| `apps/storefront/postcss.config.js`              | Create for Tailwind processing   |
| `apps/storefront/app/globals.css`                | Add `@tailwind` directives       |
| `apps/storefront/components.json`                | Created by Shadcn init           |
| `apps/storefront/lib/utils.ts`                   | Created by Shadcn init           |
| `apps/storefront/components/ui/button.tsx`       | Created by `shadcn add button`   |
| `apps/storefront/app/page.tsx`                   | Updated to use Button component  |
| `tests/nextjs-app-tailwind-shadcn/setup.test.ts` | New unit test file               |
| `apps/storefront-e2e/playwright.config.ts`       | Generated Playwright config      |
| `apps/storefront-e2e/e2e/app.spec.ts`            | E2E test specs                   |

## Verification

```sh
# Unit tests
npx nx typecheck storefront   # TypeScript passes
npx nx build storefront       # Build succeeds
npx nx serve storefront       # Dev server starts (in background for e2e)
node --experimental-strip-types --test tests/nextjs-app-tailwind-shadcn/setup.test.ts

# E2E tests
npx nx e2e storefront-e2e     # Run Playwright e2e tests
npx nx e2e storefront-e2e --ui # Run with Playwright UI
```
