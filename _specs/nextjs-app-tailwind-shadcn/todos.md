# Implementation Todos: Next.js App with Tailwind, Shadcn UI, and Playwright E2E

## Setup & Configuration
- [x] Update `package.json` - add `apps/*` to workspaces array
- [x] Install `@nx/next` plugin
- [ ] Install `@nx/playwright` plugin
- [ ] Install Tailwind CSS dependencies (`tailwindcss`, `postcss`, `autoprefixer`)

## Next.js App Generation
- [x] Generate Next.js app: `npx nx generate @nx/next:app --name=storefront --directory=apps/storefront --no-src --style=css`
- [x] Verify flat directory structure (no `src/` folder)
- [x] Update `apps/storefront/tsconfig.json` with correct module/moduleResolution overrides

## Tailwind CSS Configuration
- [ ] Create `apps/storefront/tailwind.config.js`
- [ ] Create `apps/storefront/postcss.config.js`
- [ ] Update `apps/storefront/app/globals.css` with `@tailwind` directives
- [ ] Verify Tailwind is processing styles correctly

## Shadcn UI Setup
- [ ] Initialize Shadcn: `cd apps/storefront && npx shadcn@latest init`
- [ ] Confirm Shadcn created `components.json` and `lib/utils.ts`
- [ ] Add Button component: `npx shadcn@latest add button --cwd=apps/storefront`
- [ ] Update `apps/storefront/app/page.tsx` to import and render Button component

## Unit Tests
- [ ] Create `tests/nextjs-app-tailwind-shadcn/setup.test.ts`
- [ ] Write tests for file existence (app/page.tsx, config files, components)
- [ ] Write tests for Tailwind directives in globals.css
- [ ] Write tests for Shadcn components existence
- [ ] Run unit tests and verify they pass

## Playwright E2E Setup
- [x] Generate Playwright e2e app: `npx nx generate @nx/playwright:configuration --project=storefront --directory=apps/storefront-e2e --baseUrl=http://localhost:3000`
- [x] Verify `apps/storefront-e2e/` directory structure
- [x] Verify `playwright.config.ts` has correct baseUrl

## E2E Test Specs
- [x] Create `apps/storefront-e2e/e2e/app.spec.ts` (auto-generated example.spec.ts)
- [x] Write test: page loads successfully (example.spec.ts)
- [ ] Write test: Button component renders
- [ ] Write test: Button is interactive
- [ ] Write test: Tailwind styles are applied
- [ ] Write test: Shadcn UI components render properly
- [x] Run e2e tests: `npx nx e2e storefront-e2e` (3/3 passed)

## Verification & Testing
- [x] Run `npm exec nx typecheck storefront` - TypeScript compiles
- [x] Run `npm exec nx build storefront` - Build succeeds
- [x] Run `npm exec nx dev storefront` - Dev server starts
- [ ] Run unit tests - all pass
- [x] Run e2e tests - all pass (3/3 tests passed)
- [ ] Manual browser check: verify Button renders with Shadcn/Tailwind styling

## Documentation & Cleanup
- [ ] Verify all files are properly created
- [ ] Check git status - all changes accounted for
- [ ] Create commit with spec and implementation
- [ ] Push to GitHub

---

## Review Notes

_Observations from implementation:_

- [x] What went smoothly?
  - ✓ Nx generators work seamlessly - `@nx/next` and `@nx/playwright` auto-configured everything
  - ✓ Generator automatically created E2E app (ahead of plan)
  - ✓ Build and dev server work without additional configuration
  - ✓ E2E tests passing out of the box (3/3 with different browsers)

- [x] What was unexpected?
  - ✓ Generator includes PostCSS and Tailwind CSS setup automatically (not fully detailed in plan)
  - ✓ Playwright E2E generated along with the Next.js app
  - ✓ Dev server task is `dev` not `serve` (corrected in checkpoint)
  - ✓ Build output uses Turbopack for faster compilation

- [x] Any improvements to the plan?
  - ✓ Update command examples to use `npx nx` instead of `npm exec nx` (cleaner)
  - ✓ Verify what generators create automatically before manual config
  - ✓ Add extended checkpoint 2 verification (dev, build, e2e) - critical for catching issues early

- [x] Performance considerations?
  - ✓ Next.js 16 with Turbopack - significantly faster compilation
  - ✓ E2E tests run in parallel across 3 browsers (15.5s total)
