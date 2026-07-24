# INFRA-storybook-suite-green: Fix Storybook Interaction Suite (68 failures / 16 files)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `discipline`, `teaching-plan`, `admin/timetable`, `lesson-bank`,
  `notification`, `exam`, `grades`, `messaging`, `teacher`, `admin/class-management`,
  `admin/staffing`, `admin-settings`, `announcements`, `ui/card` (test files + 3 production files)
- Shared contract/file: none (per-file story fixes; no shared contract touched)

## Product Contract

`bunx vitest run --config vitest.storybook.mts` (the Storybook interaction/E2E test tier) must be
100% green. It landed on `main` broken (68 failing tests / 16 files) undetected because this
suite is not part of the pre-push gate (`bun vitest run` — the main suite — was and remained
green throughout).

## Root Cause (per failure class)

**Class 1 — whole-file crashes (35 tests / 4 files), two distinct causes:**

1. `discipline-screen.stories.tsx`, `teaching-plan-screen.stories.tsx`,
   `admin/timetable/timetable-screen.stories.tsx` (16 + 11 + 4 = 31 tests) were missing
   `parameters.nextjs.appDirectory: true` in their story meta. Sibling story files
   (`timetable-view.stories.tsx`, `teacher-schedule.stories.tsx`) already had it — this was a
   copy-paste gap when these three screens were authored, not a recent regression. Without it,
   `useRouter()` throws `invariant expected app router to be mounted` and crashes every story in
   the file.
2. `lesson-bank-screen.stories.tsx` (4 tests) crashed for a different, **real production** reason:
   `lesson-bank-filter-bar.tsx` rendered `<SelectItem value="">` for its "All" filter options.
   Radix Select reserves the empty string to mean "clear selection" and throws at runtime. Fixed
   with the codebase's existing `ALL = "__all__"` sentinel pattern (already used in
   `exam-bank-filter-bar.tsx`).

**Class 2 — scattered assertion failures (33 tests / 12 files) — mostly test staleness, plus two
real defects surfaced by the tests:**

- **Real bug 1** (`teaching-plan`): the reject/approve buttons showed "Trả lại"/"Phê duyệt" to
  sighted users but announced "Từ chối kế hoạch .../Duyệt kế hoạch ..." via `aria-label` — a
  different verb than the visible text, a genuine a11y/i18n terminology mismatch. Realigned the
  `rejectForPlan`/`approveForPlan` i18n templates (vi + en) to match the visible button copy.
- **Real bug 2** (`discipline` — parent view): `LeaveRequestForm.tsx`'s `<input type="date"
  min={today}>` had no `noValidate` on its `<form>`, so the browser's native HTML5 constraint
  validation silently blocked submission for any past `startDate` before React/zod ever ran — the
  "Ngày nghỉ phải từ hôm nay trở đi" error never rendered. Added `noValidate`; also removed a
  redundant `form.register("startDate")` call that duplicated the `FormField` Controller
  registration for the same field.
- **Real bug 3** (`messaging`): selecting "Trả lời" (reply) from the message context menu
  refocused the message-bubble trigger button (the shared `closeContextMenu()` behavior) instead
  of moving focus into the reply textarea, breaking the "start typing immediately" UX the AC
  requires. Fixed `handleReplyFromMenu` in `chat-window.tsx` to focus the chat input directly.
- **Test-only staleness** (remaining ~28 tests): stale copy after known copy fixes (1h→5min
  delete window, dead unused selector, `grid` vs `table` ARIA role), Radix-Portal-scoped
  dialog/popover/menu queries missing `within(document.body)`, ambiguous duplicate-text matches
  (filter-pill label reused as card status text, self-overlapping typed preview string, "0/200"
  substring-matching "0/2000", stat-card label reused as a section heading, badge text reused
  elsewhere on the page), missing `waitFor` around async dialog-close assertions, a query for the
  background tablist after Radix marked it `aria-hidden` behind an open drawer, an unreachable
  "Loading" story (the `all` filter is SSR-seeded via TanStack Query `initialData`, so it can
  never show the client-fetch skeleton — switched to a non-seeded filter tab), and **missing
  `<Toaster />` decorators** in `class-management-screen.stories.tsx` and
  `staffing-departments-screen.stories.tsx` (every `toast.success(...)` assertion timed out with
  nowhere to render).

## Acceptance Criteria

- `bunx vitest run --config vitest.storybook.mts` exits 0 (was 68 failed / 16 files).
- `bun vitest run` (main suite) remains green.
- `bunx tsc --noEmit` reports 0 errors.
- `bun run build` succeeds.
- Every fix is either a corrected test assertion (documented why) or a genuine production fix
  (documented as such, not silently mixed in).

## Design Notes

No new UI, no new tokens. Production fixes touched: i18n aria-label templates (vi/en), one form's
`noValidate` + ref wiring, one Select's empty-string sentinel, one context-menu reply-focus
handler.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | n/a (no domain logic changed) |
| Integration | n/a |
| E2E | `bunx vitest run --config vitest.storybook.mts` — 954/954 passed, 145/145 files |
| Platform | `bunx tsc --noEmit` 0 errors; `bun run build` green |
| Release | merged to `main` (`d05cbbe`), branch deleted |

## Harness Delta

- New story registered: `INFRA-storybook-suite-green` (planned → implemented)
- TEST_MATRIX row added
- No ADR needed (no architecture/token/contract decision — pure bug fixes + test corrections)

## Evidence

- Before: 68 failed / 954 total, 16 files failing (verified on `main` @ `0c25bac`)
- After: 954/954 passed, 145/145 files (`bunx vitest run --config vitest.storybook.mts`)
- `bun vitest run` — 2527/2527 passed, 389/389 files (main suite, unaffected throughout)
- `bunx tsc --noEmit` — 0 errors
- `bun run build` — green (all routes compiled)
- Merge commit: `d05cbbe` (`chore(storybook): merge fix/storybook-suite-green`)

### Changes

| File | Change |
| --- | --- |
| `discipline-screen.stories.tsx` | Added `nextjs.appDirectory: true`; fixed duplicate-button-match, stale toast-with-period text |
| `teaching-plan-screen.stories.tsx` | Added `nextjs.appDirectory: true`; removed dead unused selector; fixed `grid`→`table` role; scoped Portal-rendered dialog/popover queries to `document.body` |
| `admin/timetable/timetable-screen.stories.tsx` | Added `nextjs.appDirectory: true`; fixed duplicate "resolve" link match |
| `lesson-bank-filter-bar.tsx` | **Production fix** — `SelectItem value=""` → `ALL = "__all__"` sentinel (3 selects) |
| `lesson-bank-screen.stories.tsx` | (no test change needed once production fix landed) |
| `src/bootstrap/i18n/messages/{vi,en}.json` | **Production fix** — `rejectForPlan`/`approveForPlan` aria-label templates realigned to match visible button copy |
| `src/features/teaching-plan/.../principal-review-screen.tsx` | n/a (no code change — i18n key content was the fix) |
| `src/components/ui/card/card.stories.tsx` | Fixed stale `tabindex="0"` assertion (native `<button>` is focusable by default, DR-009 US-E16.3) |
| `admin-settings-screen.stories.tsx` | Fixed duplicate sr-only+toast text match (`findAllByText`) |
| `announcements-screen.stories.tsx` | Fixed 8 staleness issues: unreachable Loading story, duplicate heading/badge/tab-label text, self-overlapping preview string, `0/200`⊂`0/2000`, missing `waitFor`, background-tablist queried after `aria-hidden` |
| `discipline/presentation/parent-discipline/ParentDisciplineScreen.stories.tsx` | (no test change — production fix below unblocked it) |
| `LeaveRequestForm.tsx` | **Production fix** — added `noValidate`; removed redundant `form.register("startDate")`; invalid-submit handler reads `errs` param instead of stale `formState.errors` |
| `exam-taking.stories.tsx` | Fixed exact-name assertion → prefix regex (accessible name includes visible option text) |
| `grade-approval-screen.stories.tsx` | Scoped duplicate dialog-title/trigger-button text to heading role |
| `message-context-menu.stories.tsx` | Fixed stale "1 giờ"→"5 phút" copy; moved boundary-adjacent fixture off the exact 5-min line |
| `chat-window.tsx` | **Production fix** — reply action now focuses the chat input instead of the message-bubble trigger |
| `messaging-screen.stories.tsx` | Switched to "Nhóm" tab before finding the tab-scoped CTA; asserted "at least one" for auto-selected group name |
| `notifications-center.stories.tsx` | Fixed `getByLabelText`→`getByText` for sr-only text; fixed aria-label mismatch on mark-all-read button (2 stories) |
| `teacher-dashboard-home.stories.tsx` | Updated stale side-stripe assertions to the DR-009 US-E16.1 full-row-tint pattern; scoped duplicate label/value text to their owning sections |
| `class-management-screen.stories.tsx` | **Added missing `<Toaster />` decorator**; scoped duplicate teacher-name text to the open dialog |
| `staffing-departments-screen.stories.tsx` | **Added missing `<Toaster />` decorator** |
