# Claude Rules Index

This directory contains project-specific rules that guide Claude Code development decisions and prevent recurring mistakes.

**Review these rules at the start of each session** for topics relevant to your current task.

## Rules by Topic

### Core Development Patterns

- **[nx-workspace.md](nx-workspace.md)** - Nx command patterns, task discovery, and common gotchas
- **[testing.md](testing.md)** - Test-first development, unit vs E2E patterns, pre-commit validation
- **[git-workflow.md](git-workflow.md)** - Commit messages, branch naming, PR conventions
- **[checkpoint-workflow.md](checkpoint-workflow.md)** - Checkpoint completion, todos.md updates, review notes

### GraphQL API + NestJS (Battle-Proven Patterns)

- **[nestjs-graphql-patterns.md](nestjs-graphql-patterns.md)** - Module setup, JWT guards, resolvers, field resolvers (Apollo Federation v2)
- **[prisma-multi-db.md](prisma-multi-db.md)** - One database per service, PrismaService, migrations, seeding patterns
- **[graphql-federation-implementation.md](graphql-federation-implementation.md)** - `@key`, `@external`, `@requires` directives, entity references, cross-subgraph queries
- **[nestjs-testing-patterns.md](nestjs-testing-patterns.md)** - Mocking PrismaService, unit tests, E2E tests with helpers, cookie handling
- **[graphql-api.md](graphql-api.md)** - _(Reference)_ Entity references, DataLoader, JWT auth, port management

### Other

- **[typescript.md](typescript.md)** - Type safety, tsconfig overrides, path aliases

### Code Quality

- **[simplicity.md](simplicity.md)** - Minimize changes, avoid premature abstractions, "no laziness" principle

---

## How to Use Rules

**At session start:**

1. Identify the feature/topic you're working on
2. Scan relevant rule files (2-3 minute read)
3. Note key patterns and gotchas

**During implementation:**

- Reference rules when making design decisions
- Check rules before committing if you're unsure about a pattern

**After mistakes or corrections:**

- If user corrects you, update the relevant rule file
- Document the pattern so it's not repeated

---

## Rule File Template

When creating new rules, use this structure:

```markdown
# <Topic Name>

## Pattern / Rule

[Clear statement of the pattern or rule]

## Why This Matters

[Impact of following/breaking this rule on the project]

## ❌ What Not To Do

[Incorrect approach with example]

## ✅ What To Do Instead

[Correct approach with example]

## Common Pitfalls

- [Specific mistake to watch for]

## References

- Link to relevant CLAUDE.md sections
- Links to external resources
```

---

## Maintenance

- Rules are living documents — update as patterns change
- Remove rules that are no longer relevant
- Link new rules from this index
- Keep rules concise (aim for 1-2 page max)
