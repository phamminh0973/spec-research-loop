---
name: composition-patterns
description: Use when designing or refactoring React component APIs, state ownership, compound components, explicit variants, context contracts, state lifting, or composition boundaries.
---

# React composition patterns

## Diagnose the contract

1. Identify the behavior variants, shared state, and consumers before changing JSX.
2. Separate visual variation from behavioral variation.
3. Locate state at the nearest owner that coordinates every consumer without leaking implementation details.
4. Preserve accessible semantics and existing call sites unless the task explicitly permits an API migration.

## Choose the smallest pattern

- Replace boolean mode combinations with explicit variant components or named slots.
- Use `children` for ordinary composition instead of adding `renderX` props.
- Use compound components when several parts share one semantic parent and coordinated state.
- Define a narrow context value with state, actions, and metadata. Keep the provider responsible for its implementation.
- Lift state to a provider or common parent when siblings must coordinate.
- Keep a simple prop API when no shared ownership or flexible layout is required.

## Load focused references

- Read `references/architecture-avoid-boolean-props.md` and `references/patterns-explicit-variants.md` for prop growth.
- Read `references/architecture-compound-components.md` for compound APIs.
- Read `references/state-context-interface.md`, `references/state-decouple-implementation.md`, and `references/state-lift-state.md` for ownership.
- Read `references/patterns-children-over-render-props.md` for slot composition.
- Read `references/react19-no-forwardref.md` for React 19 ref and context options.

## Check the result

- Make invalid prop combinations difficult or impossible to express.
- Keep public component names and ownership visible from the call site.
- Avoid a context provider that changes value shape for every variant.
- Use `react-best-practices` separately if the task also requires measured rendering optimization.
- Run `pnpm lint` and `pnpm build` after code changes.
