---
name: infra-dialog-close-i18n
description: INFRA-dialog-close-label-i18n fix — Dialog/Sheet close-button label hardcoded literal ignoring locale
metadata:
  type: project
---

US-E09.6's `fe-accessibility-auditor` finding closed as its own tiny-lane INFRA story:
`dialog.tsx`'s icon-only close button hardcoded the Vietnamese literal `"Đóng"` as its
`sr-only` accessible name regardless of active `next-intl` locale. Grepping every
`components/ui/*` primitive for the same defect class found `sheet.tsx`'s `closeLabel`
prop had the mirror bug (hardcoded English `"Close"` default, ignored `vi` locale) —
same commit fixed both. `AlertDialog`/`command`/`popover` have no icon-only close button
with a hardcoded label (AlertDialog only has Action/Cancel, always caller-supplied text)
— correctly out of scope. `pagination.tsx` has a related-but-distinct hardcoded-English-
aria-label defect (not a close button) — flagged as a follow-up, not bundled in.

**Why:** "check sibling primitives with the same pattern" instructions are a real grep
task, not a formality — the bug existed in both directions (vi hardcoded in one file, en
hardcoded in the mirror file) and only a targeted grep across all `ui/` primitives + a
usage-site scan (`grep closeLabel=`) surfaces both, plus confirms no consumer currently
overrides the default (so the fix is safe).

**How to apply:** When a locale/i18n defect is reported against one primitive, always
grep sibling primitives (`components/ui/*`) for the identical anti-pattern before closing
the story — the fix commit should close the whole defect class, not just the reported
instance. Reused the existing `Common` namespace (`Common.close`) rather than minting a
new one — check for a reusable key in `Common` before adding a namespace for a
cross-cutting UI-primitive string.

Also found: the primitives' pre-existing `.stories.tsx` files were stale
`@storybook/react`-era scaffolding (no `NextIntlClientProvider`, broken JSX composition —
Header/Footer as Dialog children instead of nested in DialogContent) that predated the
repo's current `@storybook/nextjs-vite` + `NextIntlClientProvider`-per-story pattern and
had zero `play()` assertions. Rewrote both fully rather than patch — an untested/stale
primitive story is effectively undetectable regression risk for a shared primitive used
by ~20+ screens.

One test-writing gotcha: `waitFor()` is required around "dialog no longer in DOM" after
clicking close — Radix animates the close (`data-[state=closed]` class applied first,
element removed after the animation frame), so an immediate synchronous
`queryByRole("dialog")` assertion right after `userEvent.click()` is flaky/fails even
though the fix is correct.

See [[project-parallel-branch-workflow]] for the branch lifecycle used (solo lane, no
other in-flight branch besides a stale unrelated `feat/theme-shadcn-skyblue`).

Follow-up closed: `pagination.tsx`'s hardcoded English `aria-label`s/text fixed as its own
tiny-lane story `INFRA-pagination-aria-i18n` (branch `fix/pagination-aria-label-i18n`,
merged) — same pattern (`Common.pagination.*` keys, `useTranslations`, explicit-override
preserved, stale `@storybook/react`-era story rewritten to `@storybook/nextjs-vite` +
`NextIntlClientProvider` with locale interaction tests). Repo-wide re-sweep confirmed no
other `components/ui/*` primitive has this defect class (no carousel/breadcrumb exists;
other "Previous/Next/slide" grep hits were Tailwind animation-class fragments, not text).
