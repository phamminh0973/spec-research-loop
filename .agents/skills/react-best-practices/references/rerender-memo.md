---
title: Use Manual Memoization Only With Evidence
impact: MEDIUM
impactDescription: avoids redundant manual caching under React Compiler
tags: rerender, memo, useMemo, react-compiler, profiling
---

## Use manual memoization only with evidence

React Compiler automatically memoizes ordinary component rendering in this repository. Start with direct code:

```tsx
function UserAvatar({ user }: { user: User }) {
  const id = computeAvatarId(user)
  return <Avatar id={id} />
}
```

Add `memo`, `useMemo`, or `useCallback` only when profiling shows a meaningful cost, an external API requires stable identity, or the compiler cannot optimize the code. Record the reason near any non-obvious manual memoization.

Prefer structural early returns when they avoid work regardless of memoization:

```tsx
function Profile({ user, loading }: Props) {
  if (loading) return <Skeleton />
  return <UserAvatar user={user} />
}
```

Do not introduce a memoized wrapper solely because a component re-renders. Verify that the render is expensive and avoid optimizing a stale or incorrect data flow.
