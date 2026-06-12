---
name: recurring-failures
description: A11y failure patterns that recur across edu-staff-web screens — check these first on every audit
metadata:
  type: feedback
---

## Contrast — Status badges using self-color as text
Pattern: `bg-edu-{status}/[0.18] text-edu-{status}` — the text color and background share the same hue; at low opacity the background is nearly white, giving < 2:1 contrast.
Fix: Use `text-edu-text-primary` (or `--edu-{status}-foreground` when it passes) for badge text on tinted backgrounds.
Seen in: US-E12.2 (active year badge, graded term badge).

## Contrast — text-muted-foreground on content text
Pattern: Using `text-muted-foreground` (#8898a9) for real content (dates, counts) rather than decorative placeholders.
Ratio: 2.75–2.95:1 on light surfaces — fails 4.5:1 for normal text.
Fix: Use `text-muted-foreground` only for placeholder / helper text where alternative cues exist; use `text-edu-text-secondary` or `text-foreground` for real data.
Seen in: US-E12.2 (date columns, table header labels).

## Keyboard — Accordion: aria-controls missing
Pattern: Accordion trigger buttons have `aria-expanded` but no `aria-controls` pointing to the panel ID, and the panel has no `id`. Screen readers cannot programmatically navigate trigger → panel.
Fix: Add matching `id` to each panel div and `aria-controls={panelId}` to its trigger button.
Seen in: US-E12.2.

## Keyboard / Focus — Inline edit row: no focus management
Pattern: When edit mode activates (replacing static row with inputs), focus stays on the edit button which is now removed from DOM. SR users hear no confirmation that the UI changed.
Fix: After `startEdit()` sets state, `useEffect` detects editing state and moves focus to the first input (name field) via a ref.
Seen in: US-E12.2.

## Touch — Icon action buttons 32px (size-8)
Pattern: Edit/Delete/Save/Cancel icon-only buttons use `size-8` (32×32px) which is below the 44×44px mobile touch target minimum.
Fix: Add `className="size-8 min-h-[44px] min-w-[44px]"` or wrap with a 44px hit-area using negative margin / padding, or use `size-11` (44px) and constrain the visual icon.
Seen in: US-E12.2.

## Contrast — edu-success as icon color on edu-success background
Pattern: Check icon `text-edu-success-foreground` (white) inside a `bg-edu-success` circle — 1.72:1, fails 3:1 icon minimum.
Fix: Use `text-edu-text-primary` (#2a3547) for icons/text on edu-success backgrounds (gives 7.17:1).
Seen in: School Setup screen (step completion circles).

## Contrast — edu-error as error text on edu-error-light
Pattern: `text-edu-error (#fa896b)` used for error message text on `bg-edu-error-light (#fff5f2)` — 2.21:1, fails 4.5:1.
Fix: Use `text-edu-text-primary` for error message text; keep edu-error only for icons/borders.
Seen in: School Setup screen (unconfigured grade banner, validation error text).

## A11y — Repeated action buttons without contextual aria-label
Pattern: Multiple identical button texts ("Cài đặt", "Mở") rendered for each of N steps — screen reader announces all as the same action with no step context.
Fix: Add `aria-label={t("guide.configureAriaLabel", { step: tSteps(step.labelKey) })}` to each button; add matching i18n key.
Seen in: School Setup screen (Configure + Open buttons in step lists).

## ARIA — aria-disabled instead of disabled on blocked buttons
Pattern: Blocked buttons use `aria-disabled="true"` without the native `disabled` attribute. This keeps the button keyboard-focusable (which is correct for tooltip access) but requires the click handler to be manually no-op'd (`e.preventDefault()`).
Assessment: This pattern is intentionally correct for tooltip-visible disabled buttons per ARIA APG. Not a failure — document as validated pattern.
Seen in: US-E12.2 (delete blocked button).
