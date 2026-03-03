# Nx Workspace Patterns

## Pattern: Always Use `npx nx` for Tasks

In this Nx monorepo, **always use `npx nx` (not underlying tools directly)**.

### Why This Matters

- Nx provides task caching and parallel execution
- Ensures consistent behavior across the workspace
- Nx can track dependencies between projects automatically
- Using raw tools bypasses workspace optimization

### ❌ What Not To Do

```bash
# ❌ Don't use Next.js directly
next build

# ❌ Don't use TypeScript directly
tsc --noEmit

# ❌ Don't use Playwright directly
playwright test

# ❌ Don't use npm/package manager to run scripts
npm run build
```

### ✅ What To Do Instead

```bash
# ✅ Use Nx commands
npx nx build storefront
npx nx typecheck storefront
npx nx e2e storefront-e2e
npx nx format:write
npx nx serve api-gateway
```

### Key Commands to Know

**Single project:**

```bash
npx nx <target> <project>
```

**Multiple projects:**

```bash
npx nx run-many -t build test      # Run across all projects
npx nx affected -t build test      # Only changed projects since main
```

**Discovery:**

- Use the `nx:nx-workspace` skill to explore available targets
- Use `npx nx graph --watch` to visualize dependencies

### Common Pitfalls

1. **Forgetting the project name** - `npx nx build` won't work; must specify `npx nx build storefront`
2. **Using `npm run`** - The scripts won't benefit from Nx caching
3. **Not using affected mode** - For CI/local validation, prefer `npx nx affected` over `npx nx run-many`

### References

- CLAUDE.md → "Nx Workspace Guidelines"
- Use `nx:nx-workspace` skill when uncertain about available targets
