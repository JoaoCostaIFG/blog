# Agent Development Guide

This guide provides coding agents with essential information for working in this
Next.js blog codebase.

## Build/Lint/Test Commands

**Package Manager:** Use `bun` exclusively (not npm, yarn, or pnpm).

### Development

```bash
bun install               # Install dependencies
bun dev                   # Start dev server with Turbopack on localhost:3000
```

### Production

```bash
bun run build             # Build for production (creates .next directory)
bun run start             # Start production server
```

### Linting

```bash
bun run lint              # Run ESLint
```

**Note:** This project currently has no test suite. Do not attempt to run tests.

## Project Structure

- `src/app/` - Next.js 16 App Router pages and layouts
- `src/components/` - Reusable React components
- `src/lib/` - Utility functions and server-side logic
- `src/app/ui/` - UI components (navbar, footer, icons)
- `posts/` - Markdown blog posts with frontmatter
- `public/` - Static assets
- `public/_resources/` - Blog post images

## Code Style Guidelines

### General Principles

- **TypeScript strict mode** is enabled - maintain type safety
- Use **Next.js 16 App Router** conventions (not Pages Router)
- Follow **existing patterns** in the codebase before introducing new ones
- Keep components **small and focused** on single responsibilities

### Imports

**Import order:**

1. External packages (React, Next.js, third-party)
2. Internal aliases (`@/...`)
3. Relative imports

**Aliases:** Use `@/` for all src imports (configured in tsconfig.json):

```typescript
import { getPostById } from '@/lib/posts'
import Navbar from '@/app/ui/navbar'
```

**Named vs Default:** Follow existing conventions:

- Components: default exports
- Utilities/functions: named exports
- Types/interfaces: named exports

### Formatting

**Prettier configuration** (`.prettierrc`):

- Line width: 80 characters
- Prose wrap: always

**Style patterns:**

- Use **single quotes** for strings (except JSX attributes)
- Use **const** for all variables unless reassignment is needed
- No semicolons required (but be consistent with existing files)
- Use arrow functions for components when appropriate

### TypeScript

**Type definitions:**

- Use **interfaces** for object shapes and component props
- Use **type** for unions, intersections, and complex types
- Explicitly type function parameters and return types for utilities
- Allow implicit typing for component props when destructured

**Type safety:**

- Avoid `any` - disabled in ESLint config for flexibility, but prefer `unknown`
- Use type guards and null checks for runtime safety
- Validate external data (e.g., frontmatter parsing in `posts.ts`)

**Example from codebase:**

```typescript
interface PostData extends BaseFrontMatter {
  id: string
  content: string
  intro: string
}

export function getPostById(id: string): PostData | null {
  // Type-safe implementation with validation
}
```

### React/Next.js Conventions

**Server vs Client components:**

- Default to Server Components
- Use `'use client'` directive ONLY when needed:
  - State management (`useState`, `useContext`)
  - Event handlers
  - Browser APIs
  - Hooks (`usePathname`, `useSearchParams`)

**Component patterns:**

```typescript
// Server Component (default)
export default async function Page() {
  const data = await fetchData()
  return <div>{data}</div>
}

// Client Component (when needed)
'use client'

import { useState } from 'react'

export default function Interactive() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

**Props destructuring:** Prefer inline destructuring:

```typescript
export default function Component({ title, href }: { title: string; href: string }) {
  // Implementation
}
```

### Styling

**Tailwind CSS 4.x** - Use utility classes:

- Apply classes directly in JSX with `className`
- Use `clsx` for conditional classes
- Custom utilities defined in `globals.css`: `anchor`, `btn`, `muted`,
  `container`
- Color scheme: zinc/gray backgrounds, teal accents, dark theme

**Example:**

```typescript
import clsx from 'clsx'

<Link
  className={clsx('block px-2 py-2 rounded-md text-sm', {
    'bg-gray-900 text-white': selected,
    'text-gray-300 hover:bg-gray-700 hover:text-white': !selected,
  })}
  href={href}
>
  {title}
</Link>
```

### Naming Conventions

- **Files:** `kebab-case.tsx` for components, `kebab-case.ts` for utilities
- **Components:** `PascalCase` (e.g., `NavbarLink`, `GiscusComments`)
- **Functions:** `camelCase` (e.g., `getSortedPostsData`, `readingTime`)
- **Constants:** `UPPER_SNAKE_CASE` for true constants
- **Interfaces/Types:** `PascalCase` (e.g., `PostData`, `BaseFrontMatter`)

### Error Handling

- Use `console.warn` for non-critical issues (missing optional data)
- Use `console.error` for errors that prevent normal operation
- Return `null` or empty arrays for failed data fetching
- Use `notFound()` from `next/navigation` for 404 pages
- Wrap filesystem operations in try-catch with descriptive errors

**Example from `posts.ts`:**

```typescript
try {
  fileContents = fs.readFileSync(fullPath, 'utf8')
} catch (error) {
  console.error(
    `[getPostById] Error reading file ${fullPath}: ${(error as Error).message}`
  )
  return null
}
```

### Comments

- Use JSDoc for public APIs and complex functions
- Inline comments for non-obvious logic
- Avoid obvious comments that restate code
- Prefix log messages with function name for debugging (e.g.,
  `[getPostById]`)

## Domain-Specific Patterns

**Blog posts:** Markdown files in `posts/` with frontmatter (title, date).
Parsed by `gray-matter`, validated for required fields.

**Metadata:** Generate dynamic metadata using `generateMetadata` in page
components.

**Static generation:** Use `generateStaticParams` for dynamic routes.

## Common Pitfalls

- Don't use `'use client'` unnecessarily - it disables server-side optimizations
- Don't import Node.js modules (fs, path) in client components
- Don't forget to handle async params in Next.js 16: `await params`
- Don't modify the git config or use force push without explicit user request
