# US-E17.12 Contextual Toast Messages

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: none (US-E17.8 is upstream context for announcements send flow, but toast upgrade is independent)
- Blocks: none
- Feature module(s) chạm:
  - `src/features/announcements/presentation/` (announcements send toast call site)
  - `src/features/discipline/presentation/` (discipline violation record toast call site)
  - `src/bootstrap/i18n/messages/vi.json` (net-new key)
  - `src/bootstrap/i18n/messages/en.json` (net-new key — same commit)
- Shared contract/file: none

## Product Contract

Two generic success toasts are upgraded to contextual variants. After announcements send-to-school succeeds: if `recipientCount` is available, show `announcements.sendToastContext` with `{recipientCount, time}` for 4000ms; otherwise show generic `announcements.sendToast` for 2000ms. After discipline violation record succeeds: if `studentName` is available, show net-new `discipline.violations.successContext` with `{studentName}` for 4000ms; otherwise show generic `discipline.violations.success` for 2000ms. Generic keys are NEVER deleted. One net-new i18n key (`discipline.violations.successContext`) must be added to both `vi.json` and `en.json` atomically.

## Relevant Product Docs

- `docs/design-requests/DR-011-ux-polish-interactions.md` §UX-06
- `docs/product/design-spec.jsonc` → `interactionPatterns.contextualToast`
- `docs/stories/epics/E17-ux-polish/US-E17.12-contextual-toast/spec.md`

## Acceptance Criteria

- AC-E17.12-01: After announcements send with `recipientCount=312` at 14:35 (vi), sonner success toast shows `announcements.sendToastContext` interpolated with `{312, "14:35"}`; visible 4000ms.
- AC-E17.12-04: When `recipientCount` is undefined, toast falls back to `announcements.sendToast` with 2000ms duration (no broken placeholder).
- AC-E17.12-06: After discipline violation recorded for "Nguyen Van A", sonner success toast shows `discipline.violations.successContext` interpolated with `{studentName: "Nguyen Van A"}`; visible 4000ms.
- AC-E17.12-07: `vi.json` has `discipline.violations.successContext = "Đã ghi nhận vi phạm của {studentName}"`; `en.json` has `"Violation recorded for {studentName}"`.
- AC-E17.12-09: When `studentName` is undefined, toast falls back to `discipline.violations.success` with 2000ms (no broken placeholder).
- AC-E17.12-13: No changes made to staff-leave toast keys or call sites.

## Design Notes

- Commands: none (toast fires from mutation success callback in presentation layer)
- Queries: none
- API: none (no new BE calls; `recipientCount` from entity state, `studentName` from form state, `time` from `new Date()`)
- Tables: none
- Domain rules: contextual toast (4000ms) used when context data available; generic toast (2000ms) fallback when unavailable; generic keys never deleted; toast call sites in presentation layer only
- UI surfaces:
  - Modify: announcements send-to-school mutation success callback (presentation layer)
  - Modify: discipline violation record mutation success callback (presentation layer)
  - Modify: `src/bootstrap/i18n/messages/vi.json` — add `discipline.violations.successContext`
  - Modify: `src/bootstrap/i18n/messages/en.json` — add `discipline.violations.successContext` (same commit)
- i18n keys:
  - `announcements.sendToast` — existing, fallback, must NOT delete
  - `announcements.sendToastContext` — existing (DR-011), contextual variant
  - `discipline.violations.success` — existing, fallback, must NOT delete
  - `discipline.violations.successContext` — **NET-NEW** (must add in this story to both files)

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E17.12 --unit 1 --integration 0 --e2e 1 --platform 0`.

| Layer | Expected proof |
|---|---|
| Unit | Vitest: toast params — contextual key + 4000ms when context available; generic key + 2000ms when context absent; net-new key present in both message files |
| Integration | None |
| E2E | Storybook: contextual toast story (with data) + fallback toast story (without data) for both announcements and discipline |
| Platform | None |
| Release | n/a |

## Harness Delta

Net-new i18n key `discipline.violations.successContext` added to both `vi.json` and `en.json`. No other harness changes.

## Evidence

**Implementation:**
- `src/features/announcements/presentation/announcements-screen/send-toast-params.ts` (+ `.test.ts`) — `resolveSendToastParams(recipientCount, time)`, `formatSendToastTime(locale, date)`.
- `src/features/announcements/presentation/announcements-screen/announcement-drawer.tsx` — wired into `submit()`'s `mode === "now"` success branch only; draft/scheduled toasts untouched.
- `src/features/discipline/presentation/discipline-screen/components/violation-toast-params.ts` (+ `.test.ts`) — `resolveViolationToastParams(studentName)`.
- `src/features/discipline/presentation/discipline-screen/components/violations-tab.tsx` — wired into `handleSubmit()`'s success branch; `input.studentName` trimmed once at the call site (shared by the toast and the optimistic row).
- Net-new i18n key `discipline.violations.successContext` was already present in both `vi.json`/`en.json` from a prior DR-011 batch (verified byte-for-byte against spec — no change needed); `announcements.sendToastContext` likewise pre-existing.
- Storybook: `CreateDrawer_SendSubmit_ContextualToast` (announcements) + `ViolationsTab_RecordViolation_ContextualToast` (discipline), both asserting the interpolated toast text via `findByText` against a `<Toaster/>` added to each story file's decorator.
- The generic-fallback branch (recipientCount undefined/0, studentName undefined/empty) is NOT reachable through either screen's current UI (recipient estimate is always >0 for any selectable audience; the discipline submit button is disabled while studentName is empty) — that branch is pinned by the two new unit-test files only, per `fe-tech-lead-reviewer`'s confirmation.

**Proof:**
- Unit: `bun vitest run` → 1043/1043 passed (9 new: `send-toast-params.test.ts` 6, `violation-toast-params.test.ts` 3).
- Types: `bunx tsc --noEmit` clean.
- Lint: `bun lint:fix` clean on changed files.
- Storybook (`@vitest/browser-playwright`): the new `announcements-screen.stories.tsx` story passes; the new `discipline-screen.stories.tsx` story is correctly authored but the ENTIRE file (all 16 stories, pre-existing + new) fails under this harness with "invariant expected app router to be mounted" from `useRouter` in `discipline-screen.tsx` — confirmed via `git stash` that this is a PRE-EXISTING repo-wide harness issue unrelated to this change (identical failure on `main`, `discipline-screen.tsx` has zero diff on this branch).

**Design review:** pass
- design-system: conform — no new markup/component/token; only toast copy + `duration` option changed on the existing sonner `toast.success()` call.
- a11y: WCAG AA OK (fe-accessibility-auditor verdict: PASS, 0 blocking findings; A11Y-001 informational note on 4000ms readability for long names — no code change required, screen-reader announcement unaffected by visual duration).
- impeccable audit: 0 findings applicable — copy/timing-only diff, no visual hierarchy/layout/token surface to audit.
- states: no new states introduced (existing loading/empty/error/success flows for both screens unaffected).

**fe-tech-lead-reviewer verdict:** Approved (layering, i18n typing/parity, TDD proof, data-source assumptions all confirmed correct).
