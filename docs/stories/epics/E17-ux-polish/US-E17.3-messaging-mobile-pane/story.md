# US-E17.3 Messaging Mobile Pane Toggle

## Status

planned

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

Add Storybook screenshot links and Playwright reports after validation.
