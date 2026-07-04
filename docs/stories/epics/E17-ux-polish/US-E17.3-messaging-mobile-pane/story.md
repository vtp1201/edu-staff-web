# US-E17.3 Messaging Mobile Pane Toggle

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: US-E17.7 (messaging empty state — conversation list pane structure established here)
- Feature module(s) chạm: `src/features/messaging/presentation/messaging-screen/`
- Shared contract/file: `ChatWindow` component's `onBack` prop + existing i18n key `messaging.chat.backToList`

## Product Contract

At viewports ≤ 768 px, the messaging screen SHALL show one pane at a time:
- Default: conversation list at full viewport width; chat pane off-screen and `aria-hidden="true"`.
- Tapping a conversation: chat pane slides in from the right (translateX 100% → 0, 0.25 s ease); list slides out to the left; list becomes `aria-hidden="true"`.
- Tapping back button: reversal; list slides back in; chat pane becomes `aria-hidden="true"`.
- `prefers-reduced-motion: reduce` active: instant toggle, no animation.
- Desktop (> 768 px): both panes visible side-by-side, layout unchanged.
- No new tokens, no new i18n keys, no BE changes.

## Relevant Product Docs

- `docs/product/design-spec.jsonc` — key `responsiveGrid.messagingLayout`
- `docs/stories/epics/E17-ux-polish/US-E17.3-messaging-mobile-pane/spec.md`
- `.claude/rules/accessibility.md` — motion-safe, aria-hidden, touch targets
- `.claude/rules/i18n.md` — back button aria-label must reuse existing key

## Acceptance Criteria

- AC-01: At 375 px on mount — list panel at 100% width; chat pane `aria-hidden="true"`; no page overflow.
- AC-04: With chat pane off-screen — Tab key does not reach any focusable element in the chat pane.
- AC-05: Tapping conversation (standard motion, 375 px) — chat pane transitions translateX(100%) → translateX(0) over 0.25 s ease; after transition list is off-screen and `aria-hidden="true"`.
- AC-10: Tapping back button (standard motion, 375 px) — list slides in from left over 0.25 s ease; chat pane becomes `aria-hidden="true"`.
- AC-12: Back button `aria-label` from existing key `messaging.chat.backToList`; zero new i18n key additions.
- AC-11: Back button hit area ≥ 44 × 44 px at 375 px.
- AC-09: Conversation rows computed height ≥ 44 px.
- AC-16: With `prefers-reduced-motion: reduce` — no CSS transition plays; pane switch instant.
- AC-17: Reduced-motion guard via `motion-reduce:transition-none` Tailwind utility — no JS `matchMedia` call.
- AC-19: At 1280 px — both panes visible; neither `aria-hidden`; no CSS transform applied.
- AC-23: At 320 px (any state) — `document.documentElement.scrollWidth === document.documentElement.clientWidth`.
- (Full AC list in spec.md §6.)

## Design Notes

- Commands: none
- Queries: none
- API: none
- Tables: none
- Domain rules: none
- UI surfaces (all in `messaging-screen.tsx` lines 294–316):
  - List pane div: add `transition-transform duration-[250ms] ease-in-out motion-reduce:transition-none`; add conditional `translate-x-[-100%]` when `mobilePane === "chat"` else `translate-x-0`; add `aria-hidden={mobilePane === "chat" ? "true" : undefined}` (mobile only)
  - Chat pane div: add `transition-transform duration-[250ms] ease-in-out motion-reduce:transition-none`; add conditional `translate-x-[100%]` when `mobilePane === "list"` else `translate-x-0`; add `aria-hidden={mobilePane === "list" ? "true" : undefined}` (mobile only)
  - Outer wrapper (line 294): confirm `overflow-hidden` is present (clips panes during transition)
  - `ChatWindow` back button: confirm `min-h-[44px] min-w-[44px]` on the button element
  - Conversation row elements: confirm `min-h-[44px]`
  - Storybook: add viewport story at 375 px showing list pane, then interaction test simulating tap → chat pane; add `prefers-reduced-motion: reduce` story variant

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E17.3 --unit 1 --integration 1 --e2e 0 --platform 0`.

| Layer | Expected proof |
|---|---|
| Unit | Vitest: assert `aria-hidden="true"` on chat pane when `mobilePane="list"`; assert `aria-hidden="true"` on list pane when `mobilePane="chat"`; assert neither pane has `aria-hidden` at 1280 px; assert `transition-transform` + `motion-reduce:transition-none` classes present; assert back button `aria-label` equals `t("messaging.chat.backToList")` |
| Integration | N/A — pure UI/layout change; no HTTP boundary |
| E2E | Storybook interaction story at 375 px: mount → list visible → tap conversation → chat pane visible → tap back → list visible; verify `aria-hidden` toggling; Playwright: `scrollWidth === clientWidth` at 320 px; Storybook story with `prefers-reduced-motion: reduce` emulation verifying no transition |
| Platform | Manual test on iOS Safari (momentum not applicable here but check pane toggle feels native) |
| Release | n/a |

## Harness Delta

No harness changes required. This story introduces no new endpoints, tokens, or i18n keys.
Confirm `messaging.chat.backToList` key exists in `vi.json` / `en.json` before closing (see OQ-001 in spec.md).

## Evidence

Design review: pass
- design-system: conform — zero new tokens/colors; pure layout/transform/aria change; existing pane/back-button patterns reused, not forked (`fe-tech-lead-reviewer`: Approved).
- a11y: WCAG AA OK (`fe-accessibility-auditor`: PASS, 0 blocker/critical). Keyboard/focus OK (`aria-hidden` + native `inert` dual-gate on the off-screen pane); reduced-motion OK (`motion-reduce:transition-none`, CSS-only per AC-17); touch targets OK (back button `min-h-[44px] min-w-[44px]`, rows already `min-h-[44px]`). 2 Minor findings: A11Y-001 (pre-hydration `matchMedia` gap) fixed in `a6e2d14`; A11Y-002 (Tab-walk hardening, optional) left open, non-blocking.
- impeccable audit: 0 finding requiring design-system deviation — scope is pure motion/aria on an already-approved layout; no visual redesign surface.
- states: loading/empty/error/success unaffected on desktop; mobile empty/error states proven to correctly hide the chat pane (AC-03/AC-22, new Storybook stories). Responsive 320px OK (AC-23, `scrollWidth === clientWidth` across loaded/empty/error, new Storybook stories). Desktop 1280px OK (AC-19/20/21, new Storybook stories) — unchanged from pre-story.

QA (`fe-qa-playwright`): Go — 19/23 spec.md AC proven by automated test (82.6%); 100% of `story.md`'s critical AC subset (AC-01,04,05,09,10,11,12,16,17,19,23) proven green in the real Chromium Storybook browser runner (`vitest.storybook.mts`). 4 acknowledged non-blocking gaps (AC-02/06/07/08) are pre-existing scope-boundary items in the base messaging feature, not regressions from this story. One out-of-scope defect found and logged for follow-up: DEF-01 — `ChatWindow` has no chat-fetch-error UI (AC-08 in spec.md, not in this story's critical list); recommend a separate backlog item against the base messaging feature.

Proof:
- Unit: `bun vitest run` — 942/942 passed (full suite), including 69/69 in `src/features/messaging` (`pane-visibility.test.ts` covers `listPaneClass`/`chatPaneClass`/`paneAriaHidden`/`paneInert`/`BACK_BUTTON_CLASS`).
- E2E/Story: `bun vitest run --config vitest.storybook.mts src/features/messaging/presentation/messaging-screen/messaging-screen.stories.tsx` — 21/23 passed (the 2 failures, `Create Group Optimistic Prepend` / `Reply Strip Active`, are pre-existing flakes on `main`, unrelated to this story — confirmed by re-running against `main`'s copy of the file).
- `bunx tsc --noEmit` — clean.
- `bun lint:fix` (Biome) — clean on all files touched by this story.
- i18n: `git diff origin/main..HEAD -- src/bootstrap/i18n/messages/` — empty (zero new keys; reuses `messaging.chat.backToList`).
- `bun build` — run as the final pre-merge gate (see harness proof below).
