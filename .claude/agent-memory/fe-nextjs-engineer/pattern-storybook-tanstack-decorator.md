---
name: pattern-storybook-tanstack-decorator
description: Stories for a screen that uses TanStack Query internally need a per-story QueryClientProvider decorator (no global one in .storybook)
metadata:
  type: feedback
---

When a presentation screen calls `useQuery`/`useMutation` directly (not via a
thin container), its `.stories.tsx` MUST wrap the story in a fresh
`QueryClientProvider` decorator — there is NO global QueryClient in
`.storybook/preview.ts`. Pair it inside `NextIntlClientProvider`.

```tsx
decorators: [(Story) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="min-h-screen bg-[color:var(--edu-bg)]"><Story /></div>
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}],
```

**Why:** without it the query throws "No QueryClient set". `retry:false` keeps
error/loading play-fns deterministic.
**How to apply:** any Features/* story whose component owns its query hooks.
Drawer/Sheet/AlertDialog content renders in a portal → query it with
`within(document.body)`, not `within(canvasElement)`.

Related: [[gotcha-filter-pills-a11y]] (radio/group rejected → aria-pressed
buttons in fieldset/legend; same approach used for audience/grade chips here).
Radius tokens: there is NO `rounded-card`/`rounded-button` Tailwind class —
canonical is `rounded-[var(--edu-radius-card)]` / `rounded-[var(--edu-radius-btn)]`
(shadow-card / shadow-card-hover DO exist as @theme tokens).
