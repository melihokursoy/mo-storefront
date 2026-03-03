# TypeScript Patterns

## Pattern: Use Path Aliases (@/) for Clean Imports

Instead of relative imports with `../../../`, use configured path aliases.

### Why This Matters

- Paths are easier to read and understand
- Refactoring file locations doesn't break imports
- No "../../../../../../" hell
- Aligns with Next.js conventions

### ❌ What Not To Do

```typescript
// ❌ Deep relative imports
import { cn } from '../../../../lib/utils';
import { Button } from '../../../../components/ui/button';
import { useCart } from '../../../../hooks/useCart';

// Hard to read, breaks if you move files around
```

### ✅ What To Do Instead

```typescript
// ✅ Use path aliases (configured in tsconfig)
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';

// Clean, maintainable, refactor-safe
```

## Pattern: Respect tsconfig Overrides

Different projects have different TypeScript configurations. Respect them.

### Why This Matters

- Root tsconfig uses `module: "nodenext"` (Node.js)
- Storefront tsconfig uses `module: "esnext"` (Next.js bundler)
- Misaligned configs cause type errors and subtle bugs
- Each project has specific needs

### Configuration Summary

| Project          | Module     | ModuleResolution | JSX         | Notes                    |
| ---------------- | ---------- | ---------------- | ----------- | ------------------------ |
| **Root**         | `nodenext` | `nodenext`       | `react-jsx` | Default for Node.js code |
| **Storefront**   | `esnext`   | `bundler`        | `preserve`  | Next.js specific         |
| **API Services** | `nodenext` | `nodenext`       | `react-jsx` | NestJS/Node.js           |

### ❌ What Not To Do

```typescript
// ❌ Don't change tsconfig unless necessary
// Storefront tsconfig.json
{
  "compilerOptions": {
    "module": "commonjs",  // ❌ Wrong for Next.js
    "jsx": "react"         // ❌ Should be "preserve"
  }
}

// ❌ Don't assume config from one project works in another
// Code written for storefront won't compile in API services
```

### ✅ What To Do Instead

```typescript
// ✅ Verify tsconfig matches the project
// apps/storefront/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "esnext",           // ✅ For Next.js bundler
    "moduleResolution": "bundler", // ✅ For bundler resolution
    "jsx": "preserve"              // ✅ Let Next.js handle JSX
  }
}

// Before making changes, check:
// 1. What project am I working in?
// 2. Does this tsconfig match the project type?
// 3. Are there any overrides in this tsconfig.json?
```

## Pattern: Include New Files in tsconfig

When adding new files to `components/` or `lib/`, ensure they're in the `include` array.

### Why This Matters

- TypeScript won't type-check files not in `include`
- Imports of new files may fail
- Type errors won't be caught until runtime
- Silent failures are worse than loud errors

### ❌ What Not To Do

```typescript
// ❌ Add component but don't update tsconfig
// apps/storefront/components/CustomButton.tsx (new file)
export function CustomButton() {
  /* ... */
}

// ❌ Then import it — may work, may not
import { CustomButton } from '@/components/CustomButton';
// Type errors won't be caught
```

### ✅ What To Do Instead

```json
// ✅ Update tsconfig.json to include new directories
{
  "compilerOptions": {
    /* ... */
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    "components/**/*", // ✅ Explicitly include components
    "lib/**/*", // ✅ Explicitly include lib
    "app/**/*"
  ]
}
```

## Pattern: Type Safety at Boundaries

Use TypeScript to enforce type safety at external data boundaries (API responses, form inputs).

### Why This Matters

- External data is untrusted — it can be malformed
- TypeScript can't guarantee runtime safety
- Schema validation (Zod, io-ts) prevents bugs
- Fails fast with clear error messages

### ❌ What Not To Do

```typescript
// ❌ Trust API response without validation
const response = await fetch('/api/products');
const products = await response.json(); // Any type!

// Use products directly — may crash at runtime
products.forEach((p) => {
  console.log(p.name.toUpperCase()); // What if p.name is undefined?
});
```

### ✅ What To Do Instead

```typescript
// ✅ Validate API responses with schema
import { z } from 'zod';

const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().positive(),
});

const ProductsSchema = z.array(ProductSchema);

const response = await fetch('/api/products');
const data = await response.json();

// Validate and get typed data
const products = ProductsSchema.parse(data);

// Now TypeScript knows products is typed correctly
products.forEach((p) => {
  console.log(p.name.toUpperCase()); // Safe — name is string
});
```

## Pattern: Don't Add Types That Aren't Used

Keep types minimal and focused on actual usage.

### Why This Matters

- Unused types add cognitive load
- Make it hard to understand what types are actually needed
- Maintenance burden increases
- Easier to keep types in sync with actual usage

### ❌ What Not To Do

```typescript
// ❌ Over-typed interface with unused fields
interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  inStock: boolean;
  sku: string;
  weight: number;
  dimensions: { length: number; width: number; height: number };
  warehouse: string;
  supplier: string;
  // ... 10 more fields
}

// But component only uses:
export function ProductCard({ product }: { product: Product }) {
  return (
    <div>
      <h3>{product.name}</h3>
      <p>${product.price}</p>
    </div>
  );
}
```

### ✅ What To Do Instead

```typescript
// ✅ Type only what's used
interface ProductCard {
  name: string;
  price: number;
}

export function ProductCard({ product }: { product: ProductCard }) {
  return (
    <div>
      <h3>{product.name}</h3>
      <p>${product.price}</p>
    </div>
  );
}

// Full Product type defined separately for API responses
// Easier to see what the component actually needs
```

### Common Pitfalls

1. **Breaking tsconfig changes in one project** - Always check which project you're in
2. **Forgetting JSX preservation in Next.js** - `jsx: "preserve"` is required for Next.js
3. **Using relative imports in new files** - Always use path aliases
4. **Not validating API responses** - Always add schema validation at boundaries
5. **Overly broad types** - Keep types focused on actual usage

### References

- Root tsconfig.json — Defines base configuration
- CLAUDE.md → "TypeScript Configuration"
- Zod validation library: https://zod.dev
