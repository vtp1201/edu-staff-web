# US-E11.1 — Design Review Gate

## Tokens-only compliance

All color via semantic tokens — no raw hex / Tailwind palette colors. Score color
rule applied exactly: `>=8 text-edu-success-text`, `>=5 text-primary`,
`<5 text-edu-error-text` (`scoreColorClass` in domain, unit-tested). No new token
introduced → no ADR required.

## State coverage (loading / empty / error / success)

- **List**: AllStatuses (success), EmptyState (filtered empty), Loading (skeleton).
- **Briefing**: Default (CTA disabled) + Agreed (CTA enabled) gate.
- **Taking**: AnswerFlow, FlaggedQuestion, SubmitModal; Timer Warning/Error states.
- **Result**: Pass, Fail, QuestionReview (filter).
- **Error**: submit failure surfaces a localized `role=alert` banner in the detail
  step machine (errorKey → `errors.<key>`).

## Accessibility (WCAG 2.1 AA)

- Timer is `role="status" aria-live="polite"` with a `aria-label` so SR announces
  remaining time politely (not assertively).
- All interactive elements are real `<button type="button">`; option buttons use
  `aria-pressed`; navigator buttons have per-question `aria-label` + `aria-current`.
- Filter/review tabs use `role=tab` + `aria-selected`.
- Checkbox has a linked `<label htmlFor>`; CTA disabled until agreed.
- Touch targets ≥44px (`min-h-11` / `size-11` on tappable controls).
- Status conveyed by badge text + icon, never color alone.
- Score-on-tint and warning text use AA-compliant `*-text` / `-foreground` tokens.

## impeccable hook

PostToolUse design hook scanned every presentation file on write — no
anti-patterns reported. Typography hierarchy, spacing rhythm, contrast intentional.

## Post-review a11y fixes applied (2026-06-18)

10 findings (A11Y-001 through A11Y-010) from fe-accessibility-auditor addressed:
- A11Y-001 (Critical): text-xs contrast — replaced `text-muted-foreground` with
  `text-foreground` on all 12 px label elements across 5 files.
- A11Y-002 (Critical): QuestionNavigator wrapped in `<nav aria-label>` with
  `taking.navigatorTitle` i18n key.
- A11Y-003 (Major): Timer SR verbosity fixed — visual div now `aria-hidden="true"`;
  milestone-only sr-only `role="status"` announces at 600/300/120/60 s.
- A11Y-004 (Major): Step-transition focus — `autoFocus` + `tabIndex={-1}` on
  ExamTaking + ExamResult `<h1>`.
- A11Y-005 (Major): Dialog close button sr-only text changed from "Close" to "Đóng".
- A11Y-006 (Major): `<Progress>` now has `aria-label` + `aria-valuetext`.
- A11Y-007 (Minor): tablist `aria-label` improved on ExamList + ExamResult.
- A11Y-008 (Minor): Option button `aria-label` removed; sr-only prefix span added so
  full answer text is announced.
- A11Y-009 (Minor): Review `<li>` items get conditional `aria-label` for correct/wrong.
- A11Y-010 (Minor): Covered by A11Y-006.

Tech-lead Approved. A11y: Conditional Pass → All fixes applied → Pass.

## Verdict

PASS — fe-tech-lead-reviewer: Approved. fe-accessibility-auditor: Pass (all 10
findings resolved). Design system compliance: tokens-only, no new tokens, no ADR
required. Pre-push gate: 564 tests green, tsc clean, bun build success.
