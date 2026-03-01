# Implementation Todos: Next.js App with Tailwind, Shadcn UI, and Playwright E2E

## Setup & Configuration
- [ ] Update `package.json` - add `apps/*` to workspaces array
- [ ] Install `@nx/next` plugin
- [ ] Install `@nx/playwright` plugin
- [ ] Install Tailwind CSS dependencies (`tailwindcss`, `postcss`, `autoprefixer`)

## Next.js App Generation
- [ ] Generate Next.js app: `npm exec nx generate @nx/next:app -- --name=storefront --directory=apps/storefront --no-src --style=css`
- [ ] Verify flat directory structure (no `src/` folder)
- [ ] Update `apps/storefront/tsconfig.json` with correct module/moduleResolution overrides

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
- [ ] Generate Playwright e2e app: `npm exec nx generate @nx/playwright:configuration -- --project=storefront --directory=apps/storefront-e2e --baseUrl=http://localhost:3000`
- [ ] Verify `apps/storefront-e2e/` directory structure
- [ ] Verify `playwright.config.ts` has correct baseUrl

## E2E Test Specs
- [ ] Create `apps/storefront-e2e/e2e/app.spec.ts`
- [ ] Write test: page loads successfully
- [ ] Write test: Button component renders
- [ ] Write test: Button is interactive
- [ ] Write test: Tailwind styles are applied
- [ ] Write test: Shadcn UI components render properly
- [ ] Run e2e tests: `npm exec nx e2e storefront-e2e`

## Verification & Testing
- [ ] Run `npm exec nx typecheck storefront` - TypeScript compiles
- [ ] Run `npm exec nx build storefront` - Build succeeds
- [ ] Run `npm exec nx serve storefront` - Dev server starts
- [ ] Run unit tests - all pass
- [ ] Run e2e tests - all pass
- [ ] Manual browser check: verify Button renders with Shadcn/Tailwind styling

## Documentation & Cleanup
- [ ] Verify all files are properly created
- [ ] Check git status - all changes accounted for
- [ ] Create commit with spec and implementation
- [ ] Push to GitHub

---

## Review Notes

_Add review observations here after implementation:_

- [ ] What went smoothly?
- [ ] What was unexpected?
- [ ] Any improvements to the plan?
- [ ] Performance considerations?
