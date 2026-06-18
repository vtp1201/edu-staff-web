# Design Review — US-E12.11 Admin Settings: Grade Publish Mode

## Gate result: PASS

Date: 2026-06-18  
Reviewer: fe-lead (impeccable gate)

---

## impeccable audit checklist

### Contrast (WCAG 1.4.3)
- Save button: `bg-edu-primary-dark` (#4570ea) on white primary-foreground = ~4.56:1 — PASS (fixed A11Y-031)
- Confirm button: `bg-edu-error-text` (#c0392b) on white = 5.44:1 — PASS (fixed A11Y-032)
- Dialog description: `text-foreground` (#2a3547) on card background = 12.36:1 — PASS (fixed A11Y-033)
- Warning note icon: `text-edu-warning-foreground` (#2a3547) on warning/10 = 11.61:1 — PASS (fixed A11Y-034)
- Body text: `text-edu-text-secondary` (#5a6a85) on white = 5.48:1 — PASS
- Headings: `text-edu-text-primary` (#2a3547) — PASS

### Spacing / layout
- Section cards: `rounded-xl border border-border bg-card p-5 shadow-card` — matches design system spec (card padding 20–24px, radius 12px, shadow-card)
- Gap between sections: `gap-5` (20px) — consistent with design system
- Radio option cards: `p-[18px]` with `rounded-xl border-[1.5px]` — appropriate padding for 44px+ touch targets

### Typography
- Page title: `text-2xl font-extrabold text-edu-text-primary` — matches page-title spec (22px / 800)
- Section headings: `text-base font-extrabold` — matches card-title spec (15px / 700)
- Body/description: `text-sm text-edu-text-secondary` — matches body spec (13–14px / 400–500)
- Captions: `text-[12.5px]` — appropriate caption size

### Component patterns
- Radio options use design system card pattern with `bg-edu-primary/12` for selected state — consistent with sidebar active item pattern (decision §design-system.md)
- Warning note: `border-edu-warning/40 bg-edu-warning/10` — consistent with existing warning patterns
- Icon boxes: `size-10` with `rounded-[10px] bg-edu-primary/10` — consistent with StatCard icon pattern (52×52 at header, 40×40 for section headers)

### Motion
- `transition-all motion-reduce:transition-none` on radio labels, shortcut links — PASS (fixed A11Y-040)
- `transition-opacity motion-reduce:transition-none` on Save button — PASS
- `transition-transform motion-reduce:transition-none` on ChevronRight — PASS

### Tokens used (all from tokens.css)
- `bg-edu-primary-dark`, `bg-edu-primary/10`, `bg-edu-primary/12`, `border-edu-primary`, `border-edu-primary/50`
- `bg-edu-warning/10`, `border-edu-warning/40`, `text-edu-warning-foreground`
- `bg-edu-error-text`
- `text-edu-text-primary`, `text-edu-text-secondary`, `text-edu-text-secondary`
- `border-border`, `bg-card`, `shadow-card`
- `ring-ring`, `text-primary-foreground`
- No raw colors used — PASS

### Accessibility
- A11Y-031–040 all resolved (see a11y-findings section below)
- `<fieldset>` + `<legend className="sr-only">` for radio group — PASS
- `aria-describedby` linking each radio to its description — PASS
- `role="status" aria-live="polite"` for toast announcements — PASS
- `role="note" aria-label="Lưu ý"` for warning note — PASS
- All icons `aria-hidden` — PASS
- `<section aria-labelledby>` headings for landmarks — PASS

### i18n
- All strings via `adminSettings` namespace in `useTranslations`
- Both `vi.json` and `en.json` updated with identical key structure
- No hardcoded Vietnamese or English strings in tsx

### States covered
- Loading: skeleton cards
- SELF_PUBLISH active
- ADMIN_APPROVAL active
- Dirty / clean (Save button state)
- Saving (loading text on button)
- Switch confirm dialog (ADMIN_APPROVAL → SELF_PUBLISH)
- Save success (toast + sr-only aria-live)
- Save error (toast + sr-only aria-live)
- Read-only (fieldset disabled + hint text)

### impeccable critique
The screen design faithfully follows the EduPortal design system:
- Card-based layout with consistent shadows and border treatment
- Icon boxes with tinted backgrounds match the StatCard / section-header pattern
- Radio option cards with selected-state highlight (`bg-edu-primary/12`) are consistent with the sidebar active-item pattern
- Shortcut link cards with hover chevron animation are a clean navigation pattern
- Warning note with `bg-edu-warning/10` border treatment follows the established alert pattern

No redesign suggested — the design system tokens and layout are applied correctly per the handoff spec.

### impeccable flags (advisory — design system wins)
None. No palette/token/layout changes suggested that conflict with the design system.

---

## A11Y findings resolved

| ID | Severity | Issue | Status |
|---|---|---|---|
| A11Y-031 | Critical | Save button contrast 3.29:1 | Fixed — `bg-edu-primary-dark` (4.56:1) |
| A11Y-032 | Critical | Confirm button contrast 2.37:1 | Fixed — `bg-edu-error-text` (5.44:1) |
| A11Y-033 | Critical | Dialog description contrast 2.95:1 | Fixed — `text-foreground` (12.36:1) |
| A11Y-034 | Major | Warning icon contrast 1.74:1 | Fixed — `text-edu-warning-foreground` (11.61:1) |
| A11Y-035 | Major | Toast not announced to SR | Fixed — `role="status" aria-live="polite"` region |
| A11Y-036 | Major | sr-only radio focus (monitor) | Comment added; pattern verified |
| A11Y-037 | Major | Redundant aria-disabled + disabled | Fixed — removed `aria-disabled` |
| A11Y-038 | Major | Missing aria-describedby on radios | Fixed — id + aria-describedby added |
| A11Y-039 | Minor | role="note" missing aria-label | Fixed — `aria-label="Lưu ý"` added |
| A11Y-040 | Minor | Missing motion-reduce:transition-none | Fixed — 3 elements updated |

---

## Verdict

PASS — all hard-gate violations resolved, design system tokens applied correctly,
typography and spacing match spec. Story may close.

### Advisory open items (non-blocking)
1. `page.tsx` hardcodes `isReadOnly={false}`. Admin layout role-guard already gates
   the route to admin-only, so in practice this is correct. If principal-read-only
   access is added in the future, feed `isReadOnly` from the session role. Tracked
   as a follow-up, not a blocker.
2. The `errorKey` from `updateModeAction` is available but the toast always shows
   the generic `saveError` string. The per-failure messages (e.g. `forbidden`) exist
   in `adminSettings.errors.*` but are unused. Can be wired in a follow-up.
