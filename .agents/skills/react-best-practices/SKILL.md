---
name: react-best-practices
description: Use when writing, reviewing, or optimizing React components, hooks, browser interactions, bundle size, or measured frontend performance in SpecResearch Loop's planned Next.js web app. Confirm installed versions and framework boundaries first.
---

# React best practices

## Establish the runtime baseline

1. Confirm the installed React and Next.js versions and whether React Compiler is enabled.
2. Do not assume versions or compiler settings until application manifests exist.
3. Prefer clear components and correct data flow. Let the compiler handle ordinary memoization.
4. Add `memo`, `useMemo`, or `useCallback` only for a measured problem, an identity contract with an external API, or a compiler escape hatch documented by React.

## Review in impact order

1. Remove avoidable async waterfalls and start independent work together.
2. Reduce client boundaries and serialized props before micro-optimizing renders.
3. Keep bundles analyzable with direct imports and conditional loading for heavy client code.
4. Fix Rules of Hooks violations, unnecessary effects, derived state stored in effects, and unstable subscriptions.
5. Profile before applying manual render optimizations.

## Load focused references

Read only the reference files needed for the issue:

- `references/async-*.md` for waterfalls and Suspense.
- `references/bundle-*.md` for imports and client bundle size.
- `references/server-*.md` for server rendering and serialization.
- `references/client-*.md` for browser data and event behavior.
- `references/rerender-*.md` for state, effects, and measured re-render issues.
- `references/rendering-*.md` for DOM and visual rendering cost.
- `references/js-*.md` for hot JavaScript paths.
- `references/advanced-*.md` for specialized hook patterns.

## Preserve framework boundaries

- SpecResearch Loop plans a Next.js frontend. Confirm the implemented router and rendering boundary before applying framework-specific guidance.
- Use `composition-patterns` when the root issue is the component contract, boolean prop growth, context ownership, or state placement.
- Treat server-rendering guidance as conditional on the Next.js router and rendering model actually implemented.

## Verify

Run only lint/build commands that exist in the implemented web package. Use profiling or a reproducible measurement when claiming a performance improvement.
