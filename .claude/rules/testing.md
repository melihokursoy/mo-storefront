# Testing Patterns

## Pattern: Test-First Development

When implementing features, **write tests first**, then implement the code.

### Why This Matters

- Tests define clear requirements before coding
- Reduces rework and scope creep
- Ensures features are actually testable
- Makes implementation focused and efficient

### ❌ What Not To Do

```
1. Write all the code
2. Hope tests pass
3. Debug failures and rewrite code
```

### ✅ What To Do Instead

```
1. Write tests that define expected behavior
2. Run tests (they fail — that's expected)
3. Implement code to pass tests
4. Refactor with confidence
```

### Testing by Type

**Unit Tests** (Node.js test runner):

- Location: `tests/` directory at root
- Command: `node --experimental-strip-types --test tests/**/*.test.ts`
- Use for: Business logic, utilities, pure functions
- Example: `tests/nextjs-app-tailwind-shadcn/setup.test.ts`

**E2E Tests** (Playwright):

- Location: `apps/storefront-e2e/src/`
- Command: `npx nx e2e storefront-e2e`
- Use for: User workflows, page interactions, full component rendering
- Example: Navigation flow, form submission, styling verification

**Type Checking** (TypeScript):

- Command: `npx nx typecheck storefront`
- Use for: Catching type errors before runtime

### Pre-commit Validation

The Husky hook runs these automatically:

```bash
format:write     # Auto-format code
lint            # Linting (if configured)
test            # Run tests
typecheck       # TypeScript validation
```

**Important**: If any check fails, the commit is prevented. Fix the issue and try again.

### Common Pitfalls

1. **Skipping E2E tests** - They catch integration issues unit tests miss
2. **Testing implementation details instead of behavior** - Test what users see, not internal state
3. **Not running tests locally before pushing** - Let pre-commit catch issues early
4. **Ignoring type errors** - Types catch bugs before runtime

### References

- CLAUDE.md → "Testing Strategy"
- Node.js test runner: https://nodejs.org/docs/latest/api/test.html
- Playwright docs: https://playwright.dev
