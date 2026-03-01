# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Codebase Overview

**mo-storefront** is an Nx monorepo for building a modern storefront application with:

- **Frontend**: Next.js 16 application with Tailwind CSS v4 and Shadcn UI components (`apps/storefront`)
- **E2E Tests**: Playwright test suite (`apps/storefront-e2e`)
- **Backend (Planned)**: Federated GraphQL API with NestJS subgraphs (`apps/api-*`)
- **Package Manager**: npm
- **Node Version**: v22

## Key Commands

### Development

```bash
# Start Next.js storefront dev server
npx nx serve storefront

# Build storefront for production
npx nx build storefront

# Run TypeScript type checking
npx nx typecheck storefront

# Format code (auto-fix)
npx nx format:write

# Check code formatting
npx nx format:check --base="remotes/origin/main"

# Run E2E tests with Playwright
npx nx e2e storefront-e2e

# Run unit tests
node --experimental-strip-types --test tests/**/*.test.ts
```

### Multiple Projects

```bash
# Run build across all projects
npx nx run-many -t build

# Run tests across all projects
npx nx run-many -t typecheck test

# Run affected projects (only changed since main)
npx nx affected -t build test

# View project graph
npx nx graph --watch
```

### Pre-commit Hooks

The repo uses Husky with pre-commit hooks that automatically:

- Format code with `format:write`
- Run linting
- Run tests
- Run TypeScript checking

**No manual staging needed** — the hook prevents commits with failing checks.

## Project Structure

```
mo-storefront/
├── apps/
│   ├── storefront/           # Next.js application (Tailwind + Shadcn UI)
│   │   ├── app/             # App router, pages, layouts
│   │   ├── components/      # Shadcn UI + custom components
│   │   ├── lib/             # Utilities, cn() helper
│   │   ├── global.css       # Tailwind directives (@tailwind base, components, utilities)
│   │   ├── tsconfig.json    # TS config (module: esnext, moduleResolution: bundler)
│   │   └── tailwind.config.js
│   ├── storefront-e2e/      # Playwright tests
│   │   ├── src/             # Test specs
│   │   └── playwright.config.ts
│   └── api-*/              # (Future) NestJS subgraphs (api-gateway, api-product, api-cart, api-order)
├── packages/                 # (Empty) For shared libraries
├── tests/                    # Root-level integration/unit tests
│   └── nextjs-app-tailwind-shadcn/  # Storefront app tests
│   └── graphql-api/         # (Future) GraphQL API tests
├── _specs/                   # Feature specifications and plans
│   ├── nextjs-app-tailwind-shadcn/  # ✅ Completed (Next.js + Tailwind + Shadcn)
│   │   ├── spec.md          # Feature specification
│   │   ├── plan.md          # 7-checkpoint implementation plan
│   │   └── todos.md         # Progress tracking
│   └── graphql-api/         # (In Progress) Apollo Federation v2 GraphQL API
│       ├── spec.md          # Service specification
│       ├── plan.md          # 16-checkpoint implementation plan
│       └── todos.md         # Progress tracking
├── .husky/                   # Git hooks configuration
│   └── pre-commit           # Runs format:write, lint, test, typecheck
├── .github/workflows/       # CI/CD
│   └── ci.yml              # GitHub Actions workflow
└── nx.json                   # Nx configuration

```

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed plan in related `_specs/<feature_slug>/plan.md` upfront to reduce ambiguity

### 2. Feature Specification Workflow

**For new features, always:**

1. **Create spec**: Use `/spec "feature description"` to:

   - Generate `_specs/<feature_slug>/spec.md` with requirements
   - Create a new feature branch

2. **Create plan**: Use `/plan` to:

   - Generate `_specs/<feature_slug>/plan.md` with numbered checkpoints
   - Generate `_specs/<feature_slug>/todos.md` for progress tracking

3. **Implement by checkpoint**:

   - Work through plan sequentially
   - After each checkpoint: mark todos complete, add notes, commit
   - Update todos.md review section with observations

4. **Verify before "done"**:
   - Run tests, build, typecheck
   - Demonstrate that changes work as expected
   - Ask: "Would a staff engineer approve this?"

### 3. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 4. Task Management Pattern

**After EVERY checkpoint or section completion:**

- Update `_specs/<feature_slug>/todos.md` with `[x]` marks
- Add brief notes on what was accomplished
- Include unexpected findings or learnings
- **Always commit todos.md updates together with implementation changes**
- Update "Review Notes" section in todos.md with observations

### 5. Self-Improvement Loop

- After ANY correction from the user: update `.claude/rules/<TOPIC>.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

## Git Workflow

### Commit Messages

Use the `/commit` skill to generate commit messages. Format:

```
<emoji> <type>: <concise_description>

Optional body explaining why this change was made.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

**Emoji conventions:**

- ✨ `feat:` - New feature or functionality
- 🐛 `fix:` - Bug fix
- 🔧 `chore:` - Tooling, configuration, dependencies
- 🔨 `refactor:` - Code restructuring
- 🎨 `style:` - Formatting, styling
- ✅ `test:` - Tests and test improvements
- ⚡ `perf:` - Performance improvements
- 📝 `docs:` - Documentation

### Branch Naming

Feature branches use pattern: `feature/<feature-slug>`

- Example: `feature/graphql-api`, `feature/nextjs-app-tailwind-shadcn`

## Nx Workspace Guidelines

### When to Use Nx Commands

- **Always** use `npx nx` (or `npm exec nx`) instead of underlying tools
- Prefix with workspace's package manager: `npm exec nx build` or `npx nx build`
- For task discovery: use `nx-workspace` skill first

### Project Targets

**Storefront app** (`apps/storefront`):

- `build` - Production build (Next.js)
- `serve` / `dev` - Dev server (http://localhost:3000)
- `typecheck` - TypeScript validation

**Storefront E2E** (`apps/storefront-e2e`):

- `e2e` - Run Playwright tests

### Advanced Patterns

```bash
# Run only affected projects since main
npx nx affected -t build test

# Run multiple targets across projects
npx nx run-many -t typecheck build test

# Watch mode for development
npx nx watch -- npx nx build

# Show dependency graph
npx nx graph
```

## Testing Strategy

### Unit Tests

- Located in `tests/` directory at root level
- Use Node.js built-in `node:test` runner
- Run: `node --experimental-strip-types --test tests/**/*.test.ts`
- Examples: `tests/nextjs-app-tailwind-shadcn/setup.test.ts`

### E2E Tests

- Located in `apps/storefront-e2e/src/`
- Use Playwright test framework
- Run: `npx nx e2e storefront-e2e`
- Tests validate: page loads, components render, styling applied, interactions work

### Pre-commit Validation

The Husky pre-commit hook runs:

1. `format:write` - Auto-formats code
2. `lint` - Linting checks (if configured)
3. `test` - Test execution
4. `typecheck` - TypeScript validation

**Failed checks prevent commit** — fix issues and try again.

## TypeScript Configuration

### Root tsconfig

- `module: "nodenext"` - Node.js module system
- `jsx: "react-jsx"` - JSX support
- `@/*` paths configured for project-specific aliases

### App-Specific Overrides

**Storefront** (`apps/storefront/tsconfig.json`):

- `module: "esnext"` - Bundler-compatible
- `moduleResolution: "bundler"`
- `jsx: "preserve"` - For Next.js JSX handling
- `@/*` path alias points to app root

### Important

- When adding files to `components/` or `lib/`, ensure they're included in `tsconfig.json` `include` array
- Use path aliases (`@/`) for clean imports across the app

## Tailwind CSS v4

**Configuration**: `apps/storefront/tailwind.config.js`

- Uses `@tailwindcss/postcss` (v4 syntax)
- CSS variables for theming
- Integrates with Shadcn UI components

**Global styles**: `apps/storefront/app/global.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Shadcn UI Components

**Location**: `apps/storefront/components/ui/`

- Pre-built accessible components
- Styled with Tailwind CSS
- Use `cn()` utility (from `lib/utils.ts`) for class merging

**Adding components**:

```bash
cd apps/storefront
npx shadcn@latest add <component-name>
```

**Configuration**: `apps/storefront/components.json`

## Upcoming: Federated GraphQL API

**Architecture**: Apollo Federation v2 with independent NestJS subgraphs

**Services**:

- `apps/api-gateway` (Port 3300) - Apollo Gateway, main entry point
- `apps/api-product` (Port 3301) - Product catalog queries
- `apps/api-cart` (Port 3302) - Cart management
- `apps/api-order` (Port 3303) - Order processing

**Features**:

- Each subgraph has independent PostgreSQL database
- JWT authentication across all services
- DataLoader for N+1 query prevention
- Entity references across subgraphs via federation directives

**Implementation**: Follow checkpoint plan in `_specs/graphql-api/plan.md`

## GitHub Actions CI

**Workflow**: `.github/workflows/ci.yml`

Runs on push to main and pull requests:

1. `npm ci` - Clean install dependencies
2. `npx nx format:check` - Verify code formatting
3. `npx nx run-many -t lint test typecheck build e2e` - Comprehensive checks
4. Playwright browser installation for e2e tests

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Minimize code touched.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes only touch what's necessary. Avoid introducing bugs.
- **Prefer npx nx**: Always use Nx for running tasks, not underlying tools directly.
- **Test Everything**: Unit tests, e2e tests, type checking, formatting — all must pass.

## Useful References

- **Nx Docs**: https://nx.dev
- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com
- **Shadcn UI**: https://ui.shadcn.com
- **Playwright**: https://playwright.dev
- **TypeScript**: https://www.typescriptlang.org/docs
