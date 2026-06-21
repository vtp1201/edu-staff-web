---
name: pattern-e17-ux-polish
description: E17 UX polish patterns — empty state canonical spec, responsive grid Tailwind approach, messaging pane animation — confirmed implementation facts for DR-010
metadata:
  type: project
---

## Canonical Empty State Pattern (DR-010, spec locked)

Pattern from `docs/product/design-spec.jsonc` `emptyStatePattern`:
- Container: `role="status"`, `flex flex-col items-center text-center px-5 py-10`
- Icon: Lucide `size-16` (64px), `text-edu-text-muted`, `aria-hidden="true"`
- Title: `<p>` NOT `<h2>`, `text-base font-bold text-foreground mt-4`
- Body: `text-sm text-edu-text-secondary mt-2 max-w-xs` — MUST be `text-edu-text-secondary` NOT `text-muted-foreground` (WCAG 1.4.3: 5.1:1 vs 3.08:1 at 13px)
- CTA: `<Button variant="default" className="mt-5 min-h-[44px]">`

## i18n Key Correction (design-spec.jsonc typo)

`emptyStates.gradebook.gradeTable.i18nKey` says `grades.gradeBook.emptyState` — WRONG.
Actual key in `vi.json`: namespace=`gradeBook`, key=`emptyState` → `useTranslations("gradeBook")` + `t("emptyState")`

## Responsive Grid Tailwind Approach (confirmed)

Tailwind arbitrary value `grid-cols-[repeat(auto-fit,minmax(200px,1fr))]` is supported — confirmed usage in `src/features/admin/subject-catalogue/` and `src/features/teacher/presentation/teacher-dashboard-home/teacher-dashboard-home.tsx` (had 180px, upgraded to 200px).
Do NOT use inline style for this — Tailwind arbitrary value is canonical.

## Messaging Pane Animation (US-E17.3)

Existing pane toggle is `hidden md:flex` / `flex` (instantaneous). Upgrade:
- Add `transition-transform duration-[250ms] ease-in-out` + `translate-x-[-100%]`/`translate-x-0` on list pane
- Add `translate-x-[100%]`/`translate-x-0` on chat pane
- `motion-reduce:transition-none` guard (Tailwind)
- `aria-hidden` on off-screen pane
- Back button already exists: ChatWindow `onBack` prop + `aria-label={t("chat.backToList")}` key `messaging.chat.backToList`

## Existing Component Audit Findings

**LessonBankEmpty** (`src/features/lesson-bank/presentation/lesson-bank-screen/lesson-bank-empty.tsx`):
- Icon `BookOpen size-8` (32px) — needs `size-16` (64px)
- No `role="status"` — add
- Body `text-muted-foreground` — change to `text-edu-text-secondary`
- Filter variant missing Search icon — add `Search` icon for `hasActiveFilter=true`
- CTA `size="sm"` — add `min-h-[44px]`

**EmptyMessagingState** (`src/features/messaging/presentation/messaging-screen/empty-messaging-state.tsx`):
- Icon `size-12 text-border` — change to `size-16 text-edu-text-muted`
- No `role="status"` — add
- Body `text-muted-foreground` — change to `text-edu-text-secondary`
- Raw `<button>` — replace with `<Button variant="default" className="min-h-[44px]">`

**Why:** DR-010 locked canonical pattern; body contrast is a mandatory WCAG fix.
**How to apply:** Any future empty-state spec must enforce text-edu-text-secondary for body, not text-muted-foreground.
