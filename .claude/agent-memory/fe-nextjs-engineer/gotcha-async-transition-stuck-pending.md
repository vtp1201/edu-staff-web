---
name: gotcha-async-transition-stuck-pending
description: useTransition async action leaves isPending stuck-true after a post-await setState → button freezes; use plain boolean + try/finally for redirect-or-error server-action buttons
metadata:
  type: feedback
---

`startTransition(async () => { const r = await action(); if (r.errorKey) setError(...); })`
can leave `isPending` **stuck `true`** after the error branch — verified in the
Storybook chromium (Playwright) runner on US-E21.2: the Join button stayed
`aria-busy`/`disabled` on "Đang tham gia…" permanently after a resolved-error
action, so the user could never retry. The never-resolving (loading) case
worked; the resolve-then-setState case did not settle.

**Why:** React 19 async transitions don't reliably reset `isPending` when a
state setter runs *after* the `await` inside the async callback (that setter is
outside the transition scope). `email-verify-banner` uses the same pattern but
hides the bug — it keeps a constant button label and only asserts
`toBeInTheDocument`, never `toBeEnabled`, so a stuck-disabled button passes.

**How to apply:** For a server-action button whose success path **redirects**
(component unmounts) and whose only in-place outcome is an error, prefer a plain
`const [isPending, setIsPending] = useState(false)` with
`try { ... } finally { setIsPending(false) }`. `finally` deterministically
re-enables on error; on the happy path the redirect unmounts before it matters.
Guard the async handler in `onClick` with `() => { void handler(...) }` (Biome
floating-promise). Reserve async `useTransition` for cases where you actually
render the intermediate transition and never assert re-enable.

Related: `pattern-shell-context-and-cooldown` (framework-free timer), the repo
has NO `@testing-library/react` in node env — Storybook interaction stories are
the component-behavior proof layer.
