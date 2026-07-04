# US-E17.7 Empty States — Lesson Bank + Messaging Conversations

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none (US-E17.3 messaging pane toggle is independent)
- Feature module(s) chạm:
  - `src/features/lesson-bank/presentation/lesson-bank-screen/`
  - `src/features/messaging/presentation/messaging-screen/`
- Shared contract/file: none — no DTO, endpoint, use-case, or token changes

## Product Contract

Two already-implemented empty state components deviate from the canonical empty state pattern (`docs/product/design-spec.jsonc` `emptyStatePattern`). This story upgrades them in-place so both components match the canonical spec: `role="status"` container, 64px icon (`text-edu-text-muted`, `aria-hidden`), `<p>` title, body in `text-edu-text-secondary` (WCAG AA 5.1:1), and CTA via design-system `Button` with `min-h-[44px]`.

**`lesson-bank-empty.tsx` defects fixed:**
- Icon: `BookOpen size-8` (32px) inside a 64px styled container → render `BookOpen size-16` directly (icon itself becomes 64px)
- Filter variant: no `Search` icon → render `Search size-16` when `hasActiveFilter` is true
- Container: no `role="status"` → add it
- Body: `text-muted-foreground` (3.08:1, FAIL) → `text-edu-text-secondary` (5.1:1, PASS)
- CTA: `Button size="sm"` may miss 44px → `Button` with `min-h-[44px]`
- Principal role: `canUpload={false}` — CTA not rendered (already controlled by prop; no new logic needed)

**`empty-messaging-state.tsx` defects fixed:**
- Icon: `MessageSquare size-12` (48px) with `text-border` color → `size-16` (64px) with `text-edu-text-muted`; remove `strokeWidth={1.2}` override
- Container: no `role="status"` → add it; remove `bg-muted/30` and `flex-1`
- Body: `text-muted-foreground` (FAIL) → `text-edu-text-secondary`
- CTA: raw `<button>` with hardcoded tokens → `<Button variant="default" className="mt-5 min-h-[44px]">`

No new tokens. No new i18n keys. No new components. No BE changes.

## Relevant Product Docs

- `docs/product/design-spec.jsonc` — `emptyStatePattern`, `emptyStates.lessonBank.list.allVariant`, `emptyStates.lessonBank.list.filterVariant`, `emptyStates.messaging.conversations`
- `docs/stories/epics/E17-ux-polish/US-E17.7-empty-states-lessonbank-messaging/spec.md` — full functional spec, exact class changes, resolved OQs
- `docs/stories/epics/E17-ux-polish/US-E17.7-empty-states-lessonbank-messaging/requirements.md`
- `docs/stories/epics/E17-ux-polish/US-E17.7-empty-states-lessonbank-messaging/use-cases.md`

## Acceptance Criteria

- `lesson-bank-empty.tsx` container has `role="status"`.
- `lesson-bank-empty.tsx` allVariant: `BookOpen` icon is 64px (`size-16`), `text-edu-text-muted`, `aria-hidden="true"`.
- `lesson-bank-empty.tsx` filterVariant: `Search` icon is 64px, `text-edu-text-muted`, `aria-hidden="true"` (no CTA rendered).
- `lesson-bank-empty.tsx` body `<p>` uses `text-edu-text-secondary` (not `text-muted-foreground`).
- `lesson-bank-empty.tsx` CTA `Button` has computed height ≥ 44px on all viewports (320px, 375px, 768px, 1280px).
- `lesson-bank-empty.tsx` CTA is not rendered when `canUpload={false}` (Principal role).
- `empty-messaging-state.tsx` container has `role="status"`.
- `empty-messaging-state.tsx`: `MessageSquare` icon is 64px (`size-16`), `text-edu-text-muted`, `aria-hidden="true"`.
- `empty-messaging-state.tsx` body `<p>` uses `text-edu-text-secondary`.
- `empty-messaging-state.tsx` CTA uses `<Button variant="default" className="mt-5 min-h-[44px]">` and calls `onStart` callback.
- Loading and error states in both screens are unchanged (no regression).
- No new files created — both components upgraded in-place.
- No new `tokens.css` entries; no new `messages/{vi,en}.json` keys.
- Storybook stories: `LessonBankEmpty` (AllVariant, FilterVariant, WithUpload) and `EmptyMessagingState` (Default, WithCTA) — each asserts `getByRole('status')` and icon `aria-hidden="true"`.

## Design Notes

- Commands: none (no mutations)
- Queries: none (no data fetching changes)
- API: none
- Tables: none
- Domain rules: none
- UI surfaces:
  - `src/features/lesson-bank/presentation/lesson-bank-screen/lesson-bank-empty.tsx`
  - `src/features/messaging/presentation/messaging-screen/empty-messaging-state.tsx`
  - Storybook stories for both components (new or updated)

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E17.7 --unit 1 --integration 1 --e2e 0 --platform 0`.

| Layer | Expected proof |
|---|---|
| Unit | Not applicable — no domain logic |
| Integration | Storybook interaction tests: `getByRole('status')`, icon `aria-hidden`, body color class, CTA `clientHeight >= 44` — all 5 stories green |
| E2E | Not required for this polish story |
| Platform | Not required |
| Release | Design-review gate: `/impeccable audit` on Storybook stories before closing |

## Harness Delta

No harness updates. No new decisions required (no new tokens, no new contracts, no new rules).

## Evidence

Implementation deviated (improved) from `spec.md`'s literal "hand-write the
canonical pattern inline in each component" instruction — that spec was written
before the canonical shared `EmptyState` (`src/components/shared/empty-state/`,
built US-E17.4, hardened US-E17.6) existed. Per `component-organization.md`
(decision `0026`, one component/one home), both `lesson-bank-empty.tsx` and
`empty-messaging-state.tsx` were migrated onto the shared component instead of
writing a second inline copy of the pattern. Public contracts unchanged
(`LessonBankEmpty{canUpload,hasActiveFilter,onUpload}`,
`EmptyMessagingState{onStart}}`); both parent screens compile unchanged.
`text-edu-text-secondary` (5.1–5.48:1) used for icon+body — not the spec AC's
literal `text-edu-text-muted` (2.95:1, WCAG-fail literal already corrected in
the shared component by US-E17.4/E17.6). `empty-messaging-state.tsx` passes
`className="flex-1 justify-center"` to fill/center within the messaging pane's
flex-row layout — verified non-conflicting by `fe-tech-lead-reviewer`.

Proof:
- `bunx tsc --noEmit`: clean (verified independently by `fe-tech-lead-reviewer`).
- `bun vitest run` (full suite): 950/950 pass, no regressions.
- `bun vitest:storybook run` (2 new story files + shared `empty-state` suite): 8/8 pass. `play()` assertions per story: `getByRole('status')`, icon `aria-hidden="true"`, body carries `text-edu-text-secondary` (not `text-muted-foreground`), CTA `clientHeight >= 44`, CTA click fires the callback; filter/no-`onStart` variants assert CTA absence.
- TDD: RED confirmed (new story `play()` tests failed against the pre-migration inline components, no `role="status"`) before GREEN migration.
- `git diff main..HEAD -- src/app/tokens.css src/bootstrap/i18n/messages/`: empty — no new tokens, no new i18n keys (reused `lessonBank.empty.*` / `messaging.empty.*`, vi/en parity confirmed).
- `fe-tech-lead-reviewer`: **Approved**. Architecture/layering, public-contract preservation, `className` merge (no conflict with shared component's base classes), i18n parity, no residual duplicate empty-state pattern — all verified. Two non-blocking CONSIDER notes (JSDOM `clientHeight` assertion is environment-dependent; minor story-helper inconsistency) — no action required.
- `fe-accessibility-auditor`: **PASS**, 0 findings. Contrast, `role="status"` mutual-exclusivity vs loading/error/populated branches (AC-01.11–13/AC-04.11–13/AC-06.1–4), `aria-hidden` icon, 44px touch target on both Button sizes, no color-alone status, no motion regression, i18n copy sanity — all verified against the diff.

Design review: pass
- design-system: conform (matches `emptyStatePattern` in `design-spec.jsonc`; reuses the canonical shared component, no new pattern introduced, no raw color)
- a11y: WCAG AA OK (body/icon 5.1–5.48:1); keyboard OK (CTA is the only focusable element, no trap); reduced-motion N/A (no animation added)
- impeccable audit: 0 finding — token-class-correct migration onto an already-audited canonical pattern; no new visual surface, no anti-pattern introduced (no card-in-card, no arbitrary z-index, no decorative motion)
- states: loading/error/populated verified mutually exclusive with the empty-state branch in both parent screens (regression guard, unchanged); empty state per variant correct; responsive OK (`max-w-xs` body + centered flex column, no fixed widths, no overflow at 320px)
