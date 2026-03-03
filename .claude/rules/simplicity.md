# Simplicity & Minimal Impact

## Pattern: Make Every Change as Simple as Possible

**Minimize code touched. Avoid introducing bugs. Senior developer standard.**

### Why This Matters

- Smaller changes are easier to review and understand
- Less code = fewer bugs
- Simpler PRs get approved faster
- Easier to revert if something goes wrong
- Maintenance burden is lower

### ❌ What Not To Do

```typescript
// ❌ Over-engineering a simple feature
// User asked: "Add a loading state to the button"

// Instead of:
interface ButtonState {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  exponentialBackoff: boolean;
  // ... 5 more properties
}

// Add a generic loading state manager service:
class StateManager<T> {
  /* ... */
}
// Add error boundary HOC
// Add retry logic with exponential backoff
// Add state machine for lifecycle management
```

### ✅ What To Do Instead

```typescript
// ✅ Simplest solution that works
const [isLoading, setIsLoading] = useState(false);

return (
  <button
    onClick={() => {
      setIsLoading(true);
      fetch('/api/submit').finally(() => setIsLoading(false));
    }}
    disabled={isLoading}
  >
    {isLoading ? 'Loading...' : 'Submit'}
  </button>
);
```

## Pattern: No Premature Abstractions

Don't create helpers, utilities, or abstractions for one-time operations.

### Why This Matters

- Premature abstractions add complexity
- "DRY" (Don't Repeat Yourself) is not a law — it's a guideline
- Three similar lines of code is better than an abstraction
- Wait until you actually see the pattern repeated

### ❌ What Not To Do

```typescript
// ❌ Abstracting a single usage
// Used in ONE place:

// Create a helper for formatting a single field
const formatCartTotal = (total: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(total);
};

// export it
// document it
// maintain it
```

### ✅ What To Do Instead

```typescript
// ✅ Inline it where it's used
<span>
  {new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cartTotal)}
</span>

// Once you use this pattern in 3+ places, THEN abstract it
```

## Pattern: Don't Add Unused Features

Implement only what was asked. Don't speculate about future needs.

### Why This Matters

- You don't know how features will be used in the future
- Unused code is technical debt
- Every feature adds maintenance burden
- "YAGNI" — You Aren't Gonna Need It

### ❌ What Not To Do

```typescript
// User asked: "Add a product search field"
// Instead of implementing just search:

interface SearchConfig {
  debounceMs: number;
  maxResults: number;
  highlightMatches: boolean;
  cacheResults: boolean;
  includeOutOfStock: boolean;
  sortBy: 'relevance' | 'price' | 'rating';
  filterByCategory?: string;
  filterByPrice?: [number, number];
  // ... over-designed for future use
}
```

### ✅ What To Do Instead

```typescript
// ✅ Implement exactly what's asked
const [search, setSearch] = useState('');
const results = products.filter((p) =>
  p.name.toLowerCase().includes(search.toLowerCase())
);

return (
  <>
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search products..."
    />
    {/* Display results */}
  </>
);

// Add more features only when user actually requests them
```

## Pattern: Minimize Scope During Bug Fixes

When fixing a bug, fix **only the bug**. Don't refactor surrounding code.

### Why This Matters

- Bug fix PR should be focused and reviewable
- Refactoring is a separate concern
- Mixing bug fix + refactor makes it hard to identify what caused issues
- Easier to revert if needed

### ❌ What Not To Do

```typescript
// Bug: Cart total calculation is wrong
// User asks to fix it

// Instead of fixing just the bug:
// - Refactor the entire Cart component
// - Extract payment logic into a service
// - Restructure database queries
// - Update types and interfaces
// - Clean up "messy" surrounding code
```

### ✅ What To Do Instead

```typescript
// ✅ Fix only the specific bug
// Before:
const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

// After:
const total = items.reduce(
  (sum, item) => sum + item.price * item.quantity, // Fixed: qty → quantity
  0
);

// Then in a SEPARATE PR:
// "refactor: extract cart calculations into service"
```

## Pattern: Trust Internal Code and Framework Guarantees

Don't add defensive error handling for things that "shouldn't happen".

### Why This Matters

- Errors in external inputs (user input, API responses) are real
- Errors in internal code indicate bugs — fix the root cause
- Defensive code obscures the actual flow
- Framework guarantees (TypeScript types, React props) should be trusted

### ❌ What Not To Do

```typescript
// ❌ Defensive checks for internal code
function calculateTotal(items: CartItem[]): number {
  if (!items) return 0;
  if (!Array.isArray(items)) return 0;
  if (items.length === 0) return 0;

  return items.reduce((sum, item) => {
    if (!item) return sum;
    if (!item.price) return sum;
    if (typeof item.price !== 'number') return sum;

    return sum + item.price;
  }, 0);
}
```

### ✅ What To Do Instead

```typescript
// ✅ Trust TypeScript and props validation
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// CartItem is typed — we know items is an array
// We know item.price is a number (TypeScript)
// If it fails, that's a BUG — find and fix the bug
```

### Exception: Validate at System Boundaries

Validate **only** external data (user input, API responses, files):

```typescript
// ✅ Validate at system boundary
const cartFromAPI = await fetch('/api/cart').then((r) => r.json());

if (!cartFromAPI || !Array.isArray(cartFromAPI.items)) {
  throw new Error('Invalid cart response from API');
}

// Trust internal code from here on
return calculateTotal(cartFromAPI.items);
```

### Common Pitfalls

1. **Over-commenting obvious code** - Comments should explain "why", not "what"
2. **Adding error handling that's never triggered** - Only handle real error cases
3. **Refactoring while fixing bugs** - Separate concerns into different commits
4. **Designing for hypothetical features** - Wait for actual requirements
5. **Making unnecessary type changes** - Keep types stable unless truly needed

### References

- CLAUDE.md → "Core Principles"
- "No Laziness": Find root causes, don't apply band-aids
