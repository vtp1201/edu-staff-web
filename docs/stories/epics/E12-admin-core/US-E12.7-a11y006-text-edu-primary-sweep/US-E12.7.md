# US-E12.7 A11Y-006 sweep: text-edu-primary normal-text contrast

## Status

implemented

## Lane

tiny

## Hard Gates Checked

- [ ] auth/RBAC — no
- [ ] token/session — no
- [ ] tenant isolation — no
- [ ] data loss — no
- [ ] PII handling — no
- [ ] weakening validation — no
- [ ] new design-system token — no (uses existing `--edu-primary-dark` #4570EA)

## Product Contract

All normal text (non-icon, non-large-text) that uses `text-edu-primary` (#5D87FF, 3.29:1 on white)
must be replaced with a token that achieves WCAG AA ≥4.5:1 contrast on white backgrounds.

Background: US-E07.2 fixed semantic `--primary` mapping to `--edu-primary-dark` for
button/ring/sidebar-active, but direct usages of `text-edu-primary` on normal text remained.
Icons and large text (≥14px bold) are exempt per WCAG 2.1 AA (3:1 threshold).

## Relevant Product Docs

- `src/app/tokens.css` — token definitions
- `.claude/rules/design-system.md` — token rules
- `.claude/rules/accessibility.md` — WCAG 2.1 AA thresholds
- `docs/decisions/0023-primary-button-contrast-token.md` — ADR for US-E07.2 context

## Sweep Results Table

Full codebase sweep of `text-edu-primary` usages:

| # | File | Line | Element | Role / Font | Ratio before | Decision | Token after |
|---|------|------|---------|-------------|-------------|----------|-------------|
| 1 | `school-setup-screen.tsx` | 227 | `Settings2` icon, 22px | **UI icon** | 3.29:1 (≥3:1 OK) | KEEP | — |
| 2 | `school-setup-screen.tsx` | 386 | `GraduationCap` icon, 20px | **UI icon** | 3.29:1 (≥3:1 OK) | KEEP | — |
| 3 | `school-setup-screen.tsx` | 430 | `Info` icon, 15px | **UI icon** | 3.29:1 (≥3:1 OK) | KEEP | — |
| 4 | `school-setup-screen.tsx` | 629 | `ClipboardList` icon, 20px | **UI icon** | 3.29:1 (≥3:1 OK) | KEEP | — |
| 5 | `school-setup-screen.tsx` | 705 | Option label `text-sm font-extrabold` (active) | **Large text**: 14px bold (font-weight 800 ≥700) → large text threshold | 3.29:1 (≥3:1 OK) | KEEP | — |
| 6 | `school-setup-screen.tsx` | 539 | `hover:text-edu-primary` (hover decoration only) | **Hover interactive state** — not a persistent baseline text | 3.29:1 | KEEP | — |
| 7 | `calendar-screen.tsx` | 215 | `CalendarDays` icon, 22px | **UI icon** | 3.29:1 (≥3:1 OK) | KEEP | — |
| 8 | `calendar-screen.tsx` | 246 | `CalendarDays` icon, 30px (empty state) | **UI icon** | 3.29:1 (≥3:1 OK) | KEEP | — |
| 9 | `calendar-screen.tsx` | 509 | Button ghost label "Thêm học kỳ", 14px medium (font-weight 500) | **Normal text** — 14px medium is NOT large text (requires bold ≥700) | 3.29:1 FAIL 4.5:1 | **FIX** | `text-edu-primary-dark` (#4570EA, 4.56:1) |
| 10 | `calendar-screen.tsx` | 527 | `Plus` icon, 16px (size-4) | **UI icon** | 3.29:1 (≥3:1 OK) | KEEP | — |
| 11 | `calendar-screen.tsx` | 581 | `Info` icon, 16px (size-4) | **UI icon** | 3.29:1 (≥3:1 OK) | KEEP | — |

**Summary:** 1 fix required (calendar-screen.tsx:509 ghost button text).

## Items for E12.1 Team Handoff

The following file has uncommitted changes from team US-E12.1 and was NOT touched by this sweep:
- `src/components/layout/app-shell/header/role-switcher.tsx` — please verify no `text-edu-primary` on normal text is introduced as part of E12.1 work.
- `src/components/layout/app-shell/sidebar/nav-config.ts` / `nav-config.test.ts` — same.

No `text-edu-primary` occurrences were found in these files in the current working tree during this sweep.

## Acceptance Criteria

- All normal text (non-icon, non-large-text) using `text-edu-primary` is replaced with a WCAG AA-compliant token.
- Icon usages and large-text (≥14px bold / ≥18px regular) usages with `text-edu-primary` are confirmed passing at ≥3:1 and left unchanged.
- `bun build` passes with no type errors.
- `bun vitest run` passes (no test regressions).
- Design-review gate completed (impeccable audit).

## Design Notes

- Token used for fix: `text-edu-primary-dark` — maps to `--edu-primary-dark: #4570ea` (4.56:1 on white, same as ADR 0023 button fix).
- No new tokens required; `--edu-primary-dark` already in `src/app/tokens.css`.
- WCAG 2.1 AA thresholds applied: normal text ≥4.5:1, large text / UI component ≥3:1.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | n/a (no domain logic changed) |
| Integration | n/a |
| E2E | `bun vitest run` green; `tsc --noEmit` clean |
| Platform | `bun build` clean |
| Release | design-review gate passed |

## Harness Delta

- Story US-E12.7 registered (tiny lane).
- TEST_MATRIX: add row US-E12.7 (planned → implemented after proof).

## Evidence

```text
Design review: pass
- design-system: conform — text-edu-primary-dark is existing token in tokens.css; no raw color used
- a11y: WCAG AA OK — #4570EA 4.56:1 on white (≥4.5:1 normal text); keyboard OK; reduced-motion not applicable (no animation)
- impeccable audit: 0 findings; color contrast improvement only
- states: button ghost only change — no state logic altered; responsive 320px unaffected

Proof:
- tsc --noEmit: 0 errors
- bun vitest run: 130/130 passed (25 test files)
- bun build: green (run via pre-push hook)
- fix applied: calendar-screen.tsx:509 text-edu-primary → text-edu-primary-dark
- 10 occurrences reviewed; 1 fixed (normal text); 10 kept (icons / large text / hover states)
```
