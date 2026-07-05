---
name: us-e17.7-qa-patterns
description: QA patterns from US-E17.7 (lesson-bank + messaging empty states migrated onto shared EmptyState) — role-variant AC gap pattern to watch for
metadata:
  type: project
---

US-E17.7 migrated `lesson-bank-empty.tsx` + `empty-messaging-state.tsx` onto the
already-hardened shared `src/components/shared/empty-state/empty-state.tsx`
(built US-E17.4, hardened US-E17.6). Icon/body color is `text-edu-text-secondary`
(5.1–5.48:1), not the AC's literal `text-edu-text-muted` (2.95:1, fails WCAG) —
an intentional, already-reviewed accessible deviation from a literal spec value;
don't re-flag this as a defect once it's documented in the story's Evidence
section and the shared component's own JSDoc/tests already assert it.

**Real gap found and closed:** none of the 3 spec-mandated `lesson-bank-empty`
stories (AllVariant, FilterVariant, WithUpload) exercised `canUpload={false}`
(the Principal-role branch, AC-07.1). All three passed `canUpload: true`.
FilterVariant suppresses the CTA via `hasActiveFilter`, not `canUpload` — so it
does NOT stand in for the role-gated case. Added a 4th story
(`PrincipalNoUpload`) asserting title/body render but no `<button>` inside the
`role="status"` container. **Pattern to check on every story with a role-gated
boolean prop that also has another independent CTA-suppression path (filter,
loading, etc.): confirm the boolean-prop-false case has its own dedicated story,
not just inferred from a different suppression path.**

**Delegation-to-shared-component judgment call:** AC items about icon size
(size-16), icon aria-hidden, title `<p>` not `<h2/h3>`, body `max-w-xs`,
container padding (`px-5 py-10`) are proven once at the shared `EmptyState`
level (`empty-state.test.tsx` via `renderToStaticMarkup` + `empty-state.stories.tsx`
play()) and don't need re-assertion in every consumer's stories — the consumer
only needs to assert its own prop-driven branching logic (icon swap, title/body
text per variant, CTA presence per prop). Don't scope-creep into re-testing the
shared component's own already-covered rendering.

AC-02.7/02.8 (dynamic allVariant↔filterVariant icon/title/CTA transition on
prop change) — no dedicated story needed: the component is a pure function of
props with no internal state/memoization, so two independent stories asserting
each variant's output is equivalent proof to a rerender-based transition test.
Only add a transition-specific story if the component has internal state,
`useEffect`, or `React.memo` that could break on prop updates.

Storybook interaction test env for this repo: `bunx vitest --config
vitest.storybook.mts run <file globs>` — real browser (Playwright), so
`el.clientHeight` in play() assertions returns real computed layout height
(44px touch-target checks are trustworthy, not JSDOM-zero).
