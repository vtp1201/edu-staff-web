---
name: pattern-promote-shared-identity-header
description: E20.4 — promoting a 3rd-use inline pattern to components/shared (variance as props, not forks) + next-intl Link href/locale in Storybook + reuse-an-existing-use-case screens
metadata:
  type: project
---

Confirmed on US-E20.4 (`/parent/children` index) — reusable next time a story says
"flag the promotion as a follow-up".

**Promote, don't defer (decision 0026).** When the planner flags "this would be the
3rd inline copy", extracting it in the SAME story is cheap and safe IF the two
existing copies' *differences* become props, not forks:
`tone` / `size` / `initials` on `components/shared/child-identity-header/` kept
`parent-dashboard.tsx` (lg + purple + single initial + subtitle) and
`child-consent-card.tsx` (md + primary + double initials + tinted container +
trailing badge) pixel-identical. **Why:** the alternative ("build the 3rd inline,
file a follow-up") is exactly how the 3 stat-card variants drifted.
**How to apply:** keep the pure bits (`childInitials`, `toneClass`) exported so
node-env Vitest can cover both modes (no @testing-library/react here), and add ONE
story per pre-existing call-site shape so a future refactor can't silently regress
a screen you don't own.

**Screen over an already-real use-case = zero new domain/infra/DI.** Reusing
`makeGetLinkedStudentsWithConsentsUseCase()` and dropping the unneeded payload
half in the *screen's* mapper (with a key-set assertion that nothing leaks) beat
adding a "narrower" use-case — the repo calls are identical either way. The new
route still gets its OWN thin `actions.ts` (never cross-route-import a sibling
route's action: its VM is shaped for that screen).

**next-intl `Link` works in the Storybook runner** and renders the locale prefix:
`href` asserts as `/vi/t/{tenant}/parent/children/{id}/academic-record`, i.e.
`tenantUrl()` output is locale-RELATIVE and the Link adds `/vi`. So assert the
prefixed href in play fns. (Several features use plain `next/link` with
`tenantUrl` — that skips the prefix and relies on middleware; prefer next-intl's.)

**Promotion regressions hide in the PRIMITIVE's defaults.** The old inline copy
passed NO font-size class, so shadcn `AvatarFallback`'s own `text-sm` applied;
the shared component hard-coded `text-xs` "for all sizes" and silently shrank
that screen. **Why:** when you promote, the baseline isn't "what the JSX says",
it's "what the primitive resolves to". **How to apply:** for every style the
promoted component now sets unconditionally, diff it against
`components/ui/<name>` defaults; make it a `Record<size, class>` map and lock it
with a per-call-site story assertion (`toHaveClass` + `not.toHaveClass`) —
verify it's genuinely red by flipping the map value once. A doc comment is not
a test.

**Brand fill token ≠ AA text token.** `text-primary` (#4570EA, 4.41:1) and
`text-edu-purple` (#7B5EA7, 4.32:1) both FAIL 1.4.3 for small bold text (bold
12–14px gets no 3:1 large-text exemption). Existing AA pairs, no ADR needed:
`text-edu-primary-accessible` (#4468E0, 4.88:1), `text-edu-purple-text`
(#5B3D8A, 6.9:1) — tints unchanged. Add a NEGATIVE test (`not.toMatch`) so the
failing token can't come back; mind the regex `\b` trap —
`/\btext-edu-purple\b/` also matches `text-edu-purple-text`, use `(?!-text)`.

**Non-retryable failure ⇒ typed error across the Query boundary.** `throw new
Error(errorKey)` forces the screen to branch on `error.message`. Export a tiny
`class XxxQueryError extends Error { constructor(readonly errorKey) }` +
`resolveErrorKey(unknown)` + `isRetryableErrorKey()` from the PURE vm module —
node-testable, and the screen passes `showRetry={canRetry}` to `ListError` with
its own forbidden copy. Watch for an existing error story built on the
`forbidden` fixture: it must switch to the retryable key, or the retry story
breaks.

Baselines after the review-fix pass: **453 files / 3263 vitest**, **156 files /
1172 Storybook interaction** (both fully green).
