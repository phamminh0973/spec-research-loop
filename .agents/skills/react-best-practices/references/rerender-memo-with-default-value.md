---
title: Keep Default Values Stable When Identity Matters
impact: LOW
impactDescription: preserves explicit identity contracts without blanket memoization
tags: rerender, identity, defaults, react-compiler
---

## Keep default values stable when identity matters

React Compiler removes the need to hoist every object or callback by default. Hoist a non-primitive default only when a consumer observes its identity, such as an imperative subscription or a deliberately memoized third-party component.

```tsx
const NOOP = () => {}

function UserAvatar({ onClick = NOOP }: { onClick?: () => void }) {
  return <button onClick={onClick}>Open profile</button>
}
```

Do not create module constants as a ritual. First confirm that stable identity is part of the contract or fixes a measured problem.
