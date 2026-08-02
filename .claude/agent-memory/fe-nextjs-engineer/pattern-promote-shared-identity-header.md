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

Baselines after this story: **453 files / 3259 vitest**, **156 files / 1170
Storybook interaction** (both fully green, no flakes this run).
