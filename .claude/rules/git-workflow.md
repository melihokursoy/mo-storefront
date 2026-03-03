# Git Workflow Patterns

## Pattern: Clear Commit Messages with Emoji

Use the `/commit` skill to generate commit messages with clear type indicators.

### Why This Matters

- Commit history becomes a readable changelog
- Easy to scan what changed and why
- Supports automated release notes
- Team can quickly understand PR impact

### Commit Message Format

```
<emoji> <type>: <concise_description>

Optional body explaining why this change was made.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

### Emoji Conventions

Use **only these emojis**:

| Emoji | Type        | Usage                                |
| ----- | ----------- | ------------------------------------ |
| ✨    | `feat:`     | New feature or functionality         |
| 🐛    | `fix:`      | Bug fix                              |
| 🔧    | `chore:`    | Tooling, configuration, dependencies |
| 🔨    | `refactor:` | Code restructuring                   |
| 🎨    | `style:`    | Formatting, styling                  |
| ✅    | `test:`     | Tests and test improvements          |
| ⚡    | `perf:`     | Performance improvements             |
| 📝    | `docs:`     | Documentation                        |

### ❌ What Not To Do

```
# ❌ No description
git commit -m "changes"

# ❌ Vague message
git commit -m "fixed stuff"

# ❌ Wrong emoji
🎉 feat: added button component

# ❌ No co-author
✨ feat: implement authentication
```

### ✅ What To Do Instead

```bash
# ✅ Use the /commit skill
# This analyzes your staged changes and suggests a message
/commit

# Then review and confirm the message
```

**Example output:**

```
✨ feat: implement JWT authentication across all subgraphs

Added JWT token generation in auth service, integrated into
API gateway middleware, and configured across api-product,
api-cart, and api-order subgraphs.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

## Pattern: Feature Branch Naming

**Always use**: `feature/<feature-slug>`

### ❌ What Not To Do

```
main
develop
my-feature
feature_auth
auth-branch
```

### ✅ What To Do Instead

```bash
feature/graphql-api
feature/dark-mode-toggle
feature/product-filtering
feature/cart-persistence
```

**Rules for feature slug:**

- Lowercase only
- Kebab-case (hyphens, no underscores)
- Max 40 characters
- Collapse multiple hyphens into one
- Use the `/spec` skill to generate branch automatically

## Pattern: Checkpoint Commits During Implementation

After **each checkpoint** in your plan, commit progress:

1. Mark todos complete in `_specs/<feature_slug>/todos.md`
2. Add notes to "Review Notes" section
3. Use `/commit` to generate a checkpoint-style message

### Checkpoint Commit Example

```
✅ checkpoint 5: entity references configured in order subgraph

Verified cart and product entities are properly referenced
with @requires and @external directives. Tested federated
query resolution.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

### Common Pitfalls

1. **Mixing unrelated changes in one commit** - Each commit should have one clear purpose
2. **Forgetting co-author line** - Always include it for consistency
3. **Committing with failing tests** - Pre-commit hook prevents this, but don't bypass it
4. **Not using the `/commit` skill** - It analyzes your changes and ensures good messages

### References

- CLAUDE.md → "Git Workflow"
- Use `/commit` skill for message generation
