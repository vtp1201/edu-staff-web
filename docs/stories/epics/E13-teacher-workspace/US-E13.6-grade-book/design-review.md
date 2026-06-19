# US-E13.6 — Design Review

## Tokens (no raw color)
- TX group header → `bg-primary/12`; GK → `bg-edu-warning/12`; CK → `bg-edu-error/12`.
- Score cells → `getScoreColorClass(score, 10)` (existing util: ≥80% success,
  <50% error, else foreground). Average bold + same util.
- Conduct → `StatusBadge` tones (success/primary/warning/error) — text + color.
- Rank bars → `bg-edu-success` / `bg-primary` / `bg-edu-warning` /
  `bg-muted-foreground` / `bg-edu-error`; track `bg-muted`.
- Cards/banners → `bg-card`, `border-border`, radius `[12px]`, `shadow-card`;
  error banner `bg-edu-error-light` + `text-edu-error-text`.
- No raw hex / palette classes. All semantic tokens from `tokens.css`.

## Typography
- Page title `text-2xl` extrabold (page-title spec).
- Column headers `text-xs` bold uppercase (label spec); body `text-sm`.
- Chart section title `text-sm` bold (card-title family).

## A11y (WCAG 2.1 AA)
- Native `<table>` + `<caption class="sr-only">` + `scope` on every header.
- Conduct never color-only (Tốt/Khá/Trung bình/Yếu text in badge).
- Loading `role=status` + `aria-live`; error `role=alert`; gate `role=status`.
- Selectors have linked `<Label htmlFor>`. CTA disabled when no class selected.
- `text-edu-error-text` (#C0392B) on `edu-error-light` passes AA;
  `text-edu-success-text` on score cells passes AA (decision 0027 tokens).

## impeccable
PostToolUse design hook scanned every new `.tsx` → "No anti-patterns" on each.

## States covered (Storybook)
GradeBookTable: Teacher/Principal/Student/Parent/PublishGate/Empty.
GradeBookScreen: Loading/Teacher/Principal/Student/Parent/PublishGate/
NoSelection/Empty/Error.

## Verdict
Token-only, a11y-complete, single canonical GradeBookTable (no duplication).
Ready for gate.
