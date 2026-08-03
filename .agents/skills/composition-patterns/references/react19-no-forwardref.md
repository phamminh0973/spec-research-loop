---
title: React 19 Ref and Context APIs
impact: MEDIUM
impactDescription: keeps composition APIs aligned with React 19
tags: react19, refs, context, use
---

## Use React 19 ref and context APIs deliberately

Accept `ref` as a normal prop in new React 19 components instead of wrapping them in `forwardRef`:

```tsx
type ComposerInputProps = React.ComponentPropsWithRef<"input">

function ComposerInput({ ref, ...props }: ComposerInputProps) {
  return <input ref={ref} {...props} />
}
```

Keep existing `forwardRef` components stable unless a migration provides value.

Use `useContext(Context)` for straightforward unconditional context reads. React 19 also permits `use(Context)`, which is useful when the read must occur conditionally after an early return:

```tsx
function Panel({ enabled }: { enabled: boolean }) {
  if (!enabled) return null
  const value = use(PanelContext)
  return <PanelContent value={value} />
}
```

Do not claim that `use()` universally replaces `useContext()`. Choose the API whose control-flow behavior the component actually needs.
