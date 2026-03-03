# Checkpoint Workflow Rule

## Critical: Update todos.md BEFORE committing

After EVERY checkpoint completion, you MUST update `_specs/<feature>/todos.md` BEFORE creating the commit.

### Mandatory Steps (in order):

1. **Complete implementation work** - Write code, fix tests, resolve errors
2. **Run all tests** - Verify tests pass: `npx nx run-many -t test typecheck`
3. **Update todos.md** - Mark checkpoint `[x]`, add Review Notes with learnings
4. **Stage todos.md** - `git add _specs/<feature>/todos.md`
5. **Stage other changes** - `git add` the implementation files
6. **Commit** - Only after todos is updated and staged

### Why this matters:

- `todos.md` is the single source of truth for checkpoint status in git
- Review Notes capture learnings for future checkpoints
- Committing without todos means the repository doesn't reflect actual completion
- This file is checked into git so all team members follow the same workflow

### Mistake to avoid:

❌ **Bad workflow**:

```
Fix pre-commit errors
→ Tests pass
→ Commit immediately
```

✅ **Correct workflow**:

```
Fix pre-commit errors
→ Tests pass
→ Update todos.md
→ Stage todos.md
→ Commit
```

### What to update in todos.md:

For each completed checkpoint:

1. **Header**: Change `### Checkpoint X: ...` to `### Checkpoint X: ... ✅ COMPLETE`

2. **Checklist**: Mark all items with `[x]`

3. **Review Notes**: Fill in observations:

   - What went smoothly?
   - What was unexpected?
   - Any improvements to the plan?
   - Domain-specific challenges?
   - Performance improvements?

4. **Checkpoint Notes**: Add detailed section with:
   - Problem analysis (what was broken)
   - Solutions implemented (how you fixed it)
   - Test results (all tests passing)
   - Key architectural learnings

### Example Review Notes format:

```markdown
## Review Notes

_Observations from implementation:_

- [x] What went smoothly?

  - Custom JWT guards worked well once we switched from Passport
  - Global setup orchestration handles all services transparently

- [x] What was unexpected?

  - Passport incompatible with GraphQL context (needs Express req)
  - TypeScript unknown type from res.json() requires explicit casting

- [x] Any improvements to the plan?

  - Each e2e should test only its service, not entire stack
  - Custom guards better than Passport for GraphQL

- [x] Federation-specific challenges?

  - Authorization must flow through gateway to subgraphs explicitly

- [x] Performance improvements?
  - DataLoader prevents N+1 queries for entity references
```

### Git commit message format:

Include checkpoint number in commit:

```
✅ test: checkpoint 16 - proper e2e testing infrastructure

[Detailed explanation of what was done]

```

---

**This rule is non-negotiable for all future checkpoints.**
