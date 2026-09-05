# US-E24.8 Class detail shell — tab theo vai trò + deep-link từ dashboard & lịch tuần

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E24.7 (`roles` trên `TeacherClass`)
- Blocks: US-E24.9, E24.10, E24.11 (mỗi tab)
- Feature module(s) chạm: route `teacher/classes/[classId]/page.tsx` (mới) + `students/page.tsx`
  (→ redirect `?tab=students`), `features/teacher/presentation/class-hub/**` (mới),
  `teacher-dashboard-home` (href shortcuts), `features/timetable/presentation/teacher-schedule`
  (cell → Link)
- Shared contract/file: `messages` `teacher.classHub`; đổi nhãn i18n "Tiết học" → "Thời khoá biểu"
  (key `teacher.classHub.tabs.timetable`). `nav-config.ts` KHÔNG đổi.

## Product Contract

Design v3: `class-hub.jsx` → `ClassHubScreen` (breadcrumb, header, tabs), `app.jsx`
`navParam {classId, tab}`; `teacher.jsx` dashboard rows + `TeacherScheduleFull` cells clickable.

- Route `/teacher/classes/[classId]?tab=students|timetable|course|homeroom` (URL = state; default
  `students` nếu GVBM, `homeroom` nếu chỉ GVCN). Tab không hợp lệ/không được phép (homeroom khi
  không phải GVCN) → về default.
- Breadcrumb "Lớp học › Lớp 10A1"; header card: icon, "Lớp 10A1", `RoleBadges`, "36 học sinh ·
  Năm học 2025–2026".
- Tabs (`role=tablist`, Link-based): Học sinh · Thời khoá biểu · Khoá học online · Chủ nhiệm (GVCN).
  US này chỉ dựng shell + tab **Học sinh** = roster hiện có (`teacher-class-students-screen`) nhúng
  làm tab; 3 tab còn lại render placeholder "Đang xây dựng (US-E24.9/10/11)" — placeholder có test
  và bị thay ở US tương ứng.
- `/teacher/classes/[classId]/students` → `redirect(...?tab=students)` (giữ deep-link cũ).
- Deep-link: dashboard "Tiết sắp dạy" rows → `/teacher/classes/[classId]?tab=timetable`; "Bài chờ
  chấm" → `?tab=students`; `/teacher/schedule` mỗi ô tiết có lớp → `?tab=timetable` (cell = Link,
  hover tint, focus ring). Cần `classId` thật trong VM schedule (hiện có `className`? — nếu chỉ có
  tên lớp, thêm `classId` vào entity `ScheduleItem` từ `SlotResponse.classId`).
- Tab Học sinh header theo vai trò (design `ChStudentsTab`): GVBM "Điểm môn X của tôi" + nút "Nhập
  điểm X" → `/teacher/grades?classId=`; GVCN "Toàn cảnh lớp (GVCN)" chỉ đọc. Cột điểm chi tiết theo
  design (Miệng/15'/1 tiết/TB) **không** làm ở đây — roster hiện tại giữ cột hiện có; ghi backlog
  E24.17 "students tab grade columns (US-246 draft)".

## Relevant Product Docs

- `docs/product/design-spec.jsonc#teacher-class-hub`; `docs/product/screens.md`
- `docs/stories/epics/E13-teacher-workspace/US-E13.1-teacher-class-view/*` (roster hiện tại)

## Acceptance Criteria

- `/teacher/classes/10A1` (GVCN+GVBM) → 4 tab; lớp chỉ GVBM → 3 tab; `?tab=homeroom` trên lớp không
  GVCN → fallback default (page test).
- `/teacher/classes/[id]/students` redirect 308 → `?tab=students` (test).
- Dashboard row click → đúng URL (story interaction); schedule cell là `<a>` có href đúng.
- Tab hiện tại `aria-selected`, điều hướng bằng bàn phím (arrow keys optional; Tab/Enter bắt buộc).
- Nhãn tab "Thời khoá biểu" (không còn "Tiết học") trong vi; en "Timetable".
- Lớp không tồn tại/không phải lớp của tôi → `notFound()`.
- Storybook: shell-both-roles / subject-only / placeholder tabs; mobile: tabs wrap.
- Gate xanh; design-review + a11y.

## Design Notes

- Queries: `getMyClass(classId)` (mới trên repo teacher: lọc từ `listMyClasses` hoặc `GET classes/{id}`
  + roles) → VM `ClassHubHeaderVm`.
- UI: `class-hub/{class-hub-screen.tsx, class-hub-header.tsx, class-hub-tabs.tsx, tab-placeholder.tsx}`;
  tab content là RSC con theo `searchParams.tab` (không client fetch).
- Redirect helper: cùng pattern E24.4.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | tab resolver (roles × param → tab), href builders |
| Integration | page tests (tabs, redirect, notFound) |
| E2E | Storybook shell + dashboard/schedule link stories |
| Platform | tsc/vitest/build |
| Release | design-review + a11y |

## Harness Delta

Backlog item E24.17 (students tab grade columns) — `harness-cli backlog add`.

## Evidence

Implementation (fe-nextjs-engineer, 2026-09-03) — branch `feat/us-e24.8-class-detail-shell`.

| Layer | Proof |
| --- | --- |
| Unit | `features/teacher/domain/tab-resolver.test.ts` (9), `class-hub-tabs.test.ts` (4), `use-cases/get-my-class.use-case.test.ts` (4), `shared/class-hub-href.test.ts` (4), `timetable/.../real-weekly-timetable.mapper.test.ts` (+1 `classId` passthrough) |
| Integration | `teacher/classes/[classId]/page.test.ts` (10 — 4-tab/3-tab, `?tab=homeroom` fallback + body, tab hrefs, roster body/error, placeholders, notFound×2), `[classId]/students/page.test.ts` (2 — 308 target), `teacher/classes/page.test.ts` (card href → hub), `features/teacher/presentation/teacher-dashboard.test.ts` (4 — deep-link tabs + no-classId ⇒ no href), `timetable-grid-class-link.test.tsx` (4) |
| E2E / Story | `class-hub-screen.stories.tsx` (ShellBothRoles / SubjectOnly / PlaceholderTabs / MobileWrapTabs), `teacher-dashboard-home.stories.tsx` (+ClassHubDeepLinks, +NoClassIdMeansNoLink), `teacher-schedule.stories.tsx` (+TeacherView_ClassHubDeepLink), `teacher-class-students-screen.stories.tsx` (+EmbeddedInClassHub) |
| Platform | `bunx tsc --noEmit` ✅ · `bun lint` ✅ · `bun vitest run` ✅ 538 files / 4319 tests · `bun vitest run --config vitest.storybook.mts` ✅ 160 files / 1280 tests · `bun run build` ✅ |

Decisions taken while implementing (flagged to `fe-lead`, no ADR judged necessary):

- **i18n namespace** is literally `teacher.classHub.*` (new top-level `teacher`
  object in `messages/{vi,en}.json`) per this packet's Dependencies line, even
  though the sibling class screens live under `teacherClasses.*`. Tab label is
  `Thời khoá biểu` / `Timetable` — no key ever carried the old "Tiết học".
- **`classId` needed no BE ask**: `SlotResponse.classId` is `required` in
  `services/core/docs/openapi.yaml`; the by-member mapper already read it (for
  the `className` lookup) and now also keeps the raw id on `TimetableSlot`.
- **`ScheduleItem.classId` / `PendingGradeItem.classId` are optional**: the real
  dashboard repository still returns `[]`, so only the mock seed sets them. A row
  without an id renders unlinked (no dead links) — asserted in both a unit test
  and a story.
- **Class-card CTA now points straight at the hub** (`?tab=students`) instead of
  the legacy `/students` path, so the primary entry point does not pay a 308 hop;
  the legacy route remains a permanent alias for existing links/bookmarks.
- **Arrow-key roving tabindex deliberately not built** (AC marks it optional):
  tabs are real anchors, so Tab/Enter works natively. Additive if the a11y audit
  asks for it.
- **Mock-mode limitation**: the mock teacher-timetable fixtures use class NAMES
  (`11A2`, `8B1`, …) that have no counterpart id in the mock class list, so mock
  schedule cells stay unlinked. Real mode links; the story proves the markup.

Tech-lead review: **APPROVED** (fe-tech-lead-reviewer). Layer boundaries clean
(RSC page resolves tab server-side, `'use client'` shell takes the server-composed
body as `children` — no infra/DI import in presentation); `SlotResponse.classId`
ground-truthed as `required` in edu-api core openapi (no invention); no dead links
(optional classId omits the Link, never 404s); tokens-only; i18n parity exact.
SHOULD FIX 1 (transport failure vs 404), 2 (aria-controls), 3 (design-spec status)
+ CONSIDER 4-6 (i18n namespace rename, placeholder copy, VM field rename) all
applied. CONSIDER 7 (shared/class-hub-href.ts cross-feature import) accepted as-is.

A11y audit (fe-accessibility-auditor): 6 findings — A11Y-001 (Blocking,
aria-controls wrongly pointed every tab at the active panel), A11Y-002 (Critical,
duplicate `<h1>` when roster embedded in students tab), A11Y-003 (Major, active
tab label contrast 4.41:1 < 4.5:1), A11Y-004 (Major, dashboard deep-link rows
<44px touch target), A11Y-006 (Minor, schedule-cell hover shadow-only). All
closed in the fix commit. A11Y-005 (optional arrow-key roving tabindex) skipped
per AC.

Design review: pass
- design-system: conform — tokens-only (bg-edu-role-parent/18, bg-primary/18 icon
  box, text-edu-primary-accessible active tab, StatusBadge/RoleBadges reuse from
  US-E24.7), matches design-spec.jsonc#teacher-class-hub.classDetail (46px icon
  box radius 11, title 17px/800, underline tablist).
- a11y: WCAG AA OK post-fix — single `<h1>` per page (roster demotes to `<h2>`
  when embedded), aria-controls only on the active tab, active-tab contrast
  ~4.88:1, deep-link rows ≥44px, keyboard Tab/Enter native via real anchors,
  reduced-motion gated (`motion-safe:`).
- impeccable audit: code-level pass — no anti-pattern tells (top icon box is
  design-spec-prescribed, not a side-stripe; no gradient text/glassmorphism/
  hero-metric template; tab strip is a real underline pattern, not a fabricated
  SPA toggle).
- states: shell-both-roles / subject-only / placeholder-tabs / mobile-wrap
  covered in Storybook; 308 redirect + notFound() + transport-error surface
  covered by page tests; responsive tabs wrap at mobile (`flex-wrap`).

Test proof: unit (tab resolver every role×param combo, visibleTabs, GetMyClassUseCase
incl. failure passthrough, href builders, mapper classId passthrough) + integration
(page tests: tab set/active/body-rendered, redirect 308 digest, notFound,
transport-error-not-404) + Storybook interaction (shell/placeholder/mobile-wrap,
deep-link stories) — 539 files / 4323 tests + 160 Storybook files / 1280 tests,
all green. `bunx tsc --noEmit`, `bun lint`, `bun run build` green. Pre-push gate
green on all pushed commits (one unrelated pre-existing flake in
`invitations-screen.stories.tsx`, confirmed not caused by this branch, cleared on
retry).

Descoped/deferred:
- Backlog #2 registered (`E24.17` students-tab grade columns, draft US-246) —
  roster keeps current columns in this shell.
- Mock-mode schedule cells stay unlinked (mock timetable fixtures use class
  names with no id counterpart in the mock class list) — real mode links
  correctly; not a regression, `USE_MOCK` is on globally today.
- Dashboard deep links are inert on the real path until BE ships today's-schedule/
  pending-grade data with `classId` (real repo already returned `[]` pre-existing).
