---
title: Keep Simple Derived Values Inline
impact: LOW-MEDIUM
impactDescription: avoids unnecessary manual memoization
tags: rerender, useMemo, react-compiler, derived-state
---

## Keep simple derived values inline

Compute cheap primitive values during render. React Compiler already handles ordinary memoization, and a manual `useMemo` adds dependency bookkeeping and obscures intent.

```tsx
function Header({ user, notifications }: Props) {
  const isLoading = user.isLoading || notifications.isLoading

  if (isLoading) return <Skeleton />
  return <Navigation />
}
```

Use `useMemo` only when an actual identity contract or measured expensive calculation requires it.
