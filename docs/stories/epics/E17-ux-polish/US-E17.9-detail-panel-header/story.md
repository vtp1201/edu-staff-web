# US-E17.9 DetailPanelHeader Shared Component

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm:
  - `src/components/shared/detail-panel-header/` (new)
  - `src/features/announcements/presentation/` (wire consumer)
  - `src/features/messaging/presentation/` (wire consumer — replace AlertDialog-based back)
  - `src/features/exam-bank/presentation/` (wire consumer — add header)
- Shared contract/file: `src/components/ui/button/` (ghost variant — read-only)

## Product Contract

A canonical `DetailPanelHeader` in `src/components/shared/detail-panel-header/` provides consistent back navigation across detail drawers, sheets, and panels. The component renders a 3-zone row (back button left, optional title center, optional actions right). The back button is `variant="ghost"` with `ChevronLeft` icon, `min-h-[44px]` touch target, and `aria-label` equal to the `backLabel` prop. Title truncates on mobile (375px); action labels collapse to icon-only below 768px. No hardcoded strings — all display text passed by callers as resolved i18n values.

## Relevant Product Docs

- `docs/design-requests/DR-011-ux-polish-interactions.md` §UX-04
- `docs/product/design-spec.jsonc` → `interactionPatterns.detailPanelHeader`
- `docs/stories/epics/E17-ux-polish/US-E17.9-detail-panel-header/spec.md`
- `.claude/rules/component-organization.md` (composed, ≥3 screens → `components/shared/`)

## Acceptance Criteria

- AC-E17.9-02: Back button has `min-height: 44px` and `min-width: 44px` on all viewports.
- AC-E17.9-03: Back button `aria-label` equals the `backLabel` prop value exactly.
- AC-E17.9-04: Back button uses `variant="ghost"` with ChevronLeft icon (16px) before label text.
- AC-E17.9-08: At 375px, long title truncates with ellipsis; back button and actions zone are not displaced.
- AC-E17.9-09: At 375px, action text label is hidden (`md:hidden`); action icon remains visible.
- AC-E17.9-12: Clicking back button calls `onBack` exactly once.
- AC-E17.9-17: Announcements drawer back label shows `announcements.backToList` resolved value.
- AC-E17.9-22: Component source contains zero hardcoded Vietnamese or English UI strings.

## Design Notes

- Commands: none
- Queries: none
- API: none
- Tables: none
- Domain rules: `aria-label` on back button MUST equal `backLabel` prop (not truncated version); icon-only buttons in `actions` slot must carry their own `aria-label` (caller's responsibility)
- UI surfaces:
  - New: `src/components/shared/detail-panel-header/detail-panel-header.tsx`
  - New: `src/components/shared/detail-panel-header/index.ts`
  - New: `src/components/shared/detail-panel-header/detail-panel-header.stories.tsx`
  - Wire in: announcements detail drawer, messaging group-info panel (replace existing AlertDialog back), exam-builder header
- i18n keys used: `announcements.backToList` (existing), `messaging.chat.backToList` (existing); exam-builder supplies its own key from the exam namespace

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E17.9 --unit 1 --integration 0 --e2e 1 --platform 0`.

| Layer | Expected proof |
|---|---|
| Unit | Vitest: props rendering variants — 3-zone structure, `aria-label` equals `backLabel`, `min-h-[44px]` class on back button |
| Integration | None (no BE boundary) |
| E2E | Storybook interaction: 3 consumer stories + 375px viewport asserting title truncation, icon-only actions, 44×44px back button |
| Platform | Manual mobile device-mode at 375px for back button tap target |
| Release | n/a |

## Harness Delta

No new endpoints or design tokens. One net-new i18n key added (routine copy,
not a design-system token, no ADR needed): `announcements.backToList` (vi:
"Quay lại danh sách thông báo", en: "Back to announcements") — spec.md's
traceability table incorrectly listed it as pre-existing; confirmed missing
from `messages/{vi,en}.json` before this story and added in both files,
same commit.

## Evidence

Design review: pass
- design-system: conform — tokens-only (`border-border`, `bg-card`, `text-foreground`,
  `text-edu-text-secondary`, ghost `Button` variant); no raw color; canonical home
  `components/shared/detail-panel-header/` per decision `0026` (composed, 3 consumers).
- a11y: fe-accessibility-auditor found A11Y-001 (critical, back-button contrast
  `text-muted-foreground` 2.95:1 → `text-edu-text-secondary` 5.48:1) and A11Y-002
  (major, same issue on messaging edit-icon button) — both fixed in commit
  `e20c5a5`. Re-verified: WCAG AA contrast OK, keyboard (Enter/Space) OK, focus
  ring via `--ring` untouched, Radix Sheet title/description preserved (sr-only),
  reduced-motion N/A (no new animation), 44×44 touch target OK at all viewports.
- impeccable audit: 0 findings — scoped manual audit against
  `.claude/rules/impeccable.md` (design-system supremacy); reused ghost-Button
  pattern already established repo-wide, no anti-pattern introduced.
- states: default / with-title / with-actions / with-title-and-actions covered
  in Storybook; 375px mobile-viewport story demonstrates title truncation +
  icon-only actions (`sr-only md:not-sr-only` — corrected from spec's literal
  `md:hidden`, which was backwards vs. the stated intent); no horizontal
  overflow at 320px (flex-shrink-0 zones + min-w-0 title wrapper).

fe-tech-lead-reviewer verdict: **Approved** (layering N/A — pure presentational
shared component; tokens/i18n/TDD proof all verified independently).

Storybook stories: `src/components/shared/detail-panel-header/detail-panel-header.stories.tsx`
(Default, WithTitle, WithActions, WithTitleAndActions, MobileViewport).
