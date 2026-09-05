# US-E24.4 Gộp "Bài tập" / "Bài kiểm tra" thành tab lọc xuyên môn trong Khoá học

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E24.2 (trang courses v2), US-E24.3 (`item-type-chip`, `item-state-pill` shared)
- Blocks: none
- Feature module(s) chạm: `src/features/lms/presentation/student-courses/**` (thêm view),
  `src/components/layout/app-shell/sidebar/nav-config.ts`, route `student/assignments/page.tsx`,
  `student/exams/page.tsx` (→ redirect), `student/exams/[examId]` GIỮ
- Shared contract/file: **`nav-config.ts`** và `messages/*` — serialize với nhánh teacher (E24.8 cũng
  sửa nav-config? KHÔNG — E24.8 không đổi nav; chỉ E24.4 đổi student nav). `features/exam` không đổi.

## Product Contract

Design: `course-items.jsx` → `CrossSubjectList`; `student.jsx` pill row "Môn học / Bài tập /
Bài kiểm tra". Quyết định user: **Q-C redirect**.

- `/student/courses?view=all|assignment|exam` (URL state, default `all`). Pill row trên cùng:
  Môn học · Bài tập · Bài kiểm tra.
- `assignment`/`exam`: banner info "Danh sách này lọc mọi … từ timeline của tất cả môn học — bài
  sắp hết hạn xếp trước."; sub-tab gạch chân có count: Đang mở · (Sắp mở — **chỉ ở exam**, D7) ·
  Đã đóng. Row = chip loại, tiêu đề, `Badge` màu môn, khung thời gian (+ "còn N giờ" đỏ khi OPEN
  ≤48h), "✓ Đã nộp" nếu có submission (assignment: `getMySubmission`… → chỉ gọi khi mở hàng?
  KHÔNG: dùng `Assignment`/`Submission` list per course — chấp nhận N course × 1 call
  `listAssignments(courseId)` + submission `me` theo nhu cầu; hoặc hiển thị "Đã nộp" chỉ khi dữ liệu
  có sẵn — ghi rõ trong VM là optional).
- Nút: exam OPEN chưa nộp → "Vào làm bài" → `examUrl` hoặc `/student/exams/[examId]`; còn lại →
  "Xem trong khoá học" → `/student/courses/[courseId]`.
- Empty theo nhóm: "Không có mục nào trong nhóm này."
- **Sidebar student**: xoá `/student/assignments`, `/student/exams`. `nav-config.test` cập nhật.
  `DEFAULT_ROUTE` không đổi.
- **Redirect**: `student/assignments/page.tsx` → `redirect('/…/student/courses?view=assignment')`
  (giữ locale + tenant qua helper hiện có); `student/exams/page.tsx` → `?view=exam`. Xoá
  `student-assignments/**` presentation + `exam-list` presentation **nếu** không còn nơi dùng
  (grep trước; `exam-briefing/taking/result` GIỮ). page.test.ts cũ đổi thành test redirect.
- Hardcoded `MOCK_STUDENT_ID = "current-student"` trong `exams/page.tsx` biến mất cùng redirect.

## Relevant Product Docs

- `docs/product/design-spec.jsonc#student-course-timeline` (cross-subject block)
- `docs/product/screens.md` hàng Assignments/Exams (đổi thành redirect note)
- `.claude/rules/i18n.md`, `component-organization.md`

## Acceptance Criteria

- Sidebar student = Tổng quan, Khoá học, Điểm số, Hạnh kiểm, Lịch học, Nhắn tin, Hồ sơ (nav-config test).
- `GET /student/assignments` → 307/308 tới `/student/courses?view=assignment`; `/student/exams` →
  `?view=exam`; `/student/exams/[examId]` vẫn render (test không đổi).
- `view=assignment`: không có sub-tab "Sắp mở"; `view=exam`: có, và EXAM UPCOMING_HIDDEN nằm đó.
- Sort: OPEN theo `dueAt` tăng (null cuối); UPCOMING theo `startAt`; CLOSED theo `dueAt` giảm (unit test).
- Urgent (≤48h): border error-tint + text "còn N giờ" (N ≥1), có icon — không chỉ màu.
- Sub-tab là `role="tablist"`/`tab` với `aria-selected`; count trong badge có `aria-label`.
- URL đổi → nội dung đổi, back/forward hoạt động (URL là state, không `useState`).
- Storybook: all / assignment-open-urgent / exam-upcoming / closed / empty.
- i18n: `courses.views.*`, `courses.cross.*`; xoá keys `assignments.*`/exam list không còn dùng
  (kiểm `tsc` phát hiện key chết? — không; grep thủ công + ghi Evidence).
- Gate xanh; design-review + a11y pass.

## Design Notes

- Queries: reuse `listCourses` + `listItems`×N (đã tải cho card view — chia sẻ 1 fetch trong page,
  truyền xuống cả 2 view). Không TanStack Query cần thiết nếu RSC đủ; nếu client filter → chỉ state URL.
- UI: `student-courses/{view-switcher.tsx, cross-subject-list.tsx, cross-subject-row.tsx}`.
- Tokens: badge môn = `Badge` với color prop từ subject palette (đã có map môn→token ở
  `presentation/tone.ts`).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | sort/group, urgent calc (now inject), nav-config |
| Integration | redirect page tests; courses page với `view` param |
| E2E | Storybook tab switching |
| Platform | tsc/vitest/build |
| Release | design-review + a11y |

## Harness Delta

`docs/product/screens.md`: 2 hàng route cũ → "redirect (US-E24.4)".

## Evidence

### Proof commands (run on `feat/us-e24.4-cross-subject-tabs`)

- `bun vitest run` → **551 files / 4434 tests passed**.
- `bunx vitest run --config vitest.storybook.mts src/features/lms/presentation/student-courses` →
  **2 files / 19 tests passed** (11 pre-existing card-grid stories + 8 new cross-subject stories).
- `bunx tsc --noEmit` → clean.
- `bun lint` → clean (0 errors; 1 pre-existing unrelated warning in
  `messaging/message-context-menu.tsx`).
- `bun build` NOT run in this session (out of the implementation scope handed over).

### Behaviour-preserving refactor of the N+1 fan-out

`ListCoursesWithSummaryUseCase` (US-E24.2) now calls the extracted
`fetchCourseTimelines`. Its test file
(`__tests__/list-courses-with-summary.use-case.test.ts`) was **not modified** and
stays green — that is the no-regression proof. `fetch-course-timelines.test.ts`
(5 cases) owns the fan-out contract from here on.

### Dead i18n keys removed — grep evidence

The whole top-level `assignments.*` namespace (page/card/empty/skeleton/error/
submit/errors — 62 lines) was deleted from `messages/{vi,en}.json` after:

```
$ grep -rn 'useTranslations("assignments\|getTranslations("assignments\|t("assignments\|assignments\.errors\|assignments\.card\|assignments\.page' src/ | grep -v staffing
src/features/lms/domain/failures/lms.failure.ts:6: * `assignments.errors.<type>`; …   ← a stale DOC COMMENT, updated to `courses.errors.<type>`
```

Zero code consumers. `courses.errors.*` already carries the identical 12-key
failure catalogue. A vi/en key-set diff after the edit is empty in both
directions (mirror intact). `exam.*` is UNTOUCHED (still read by
`exam-briefing` / `exam-taking` / `exam-result`).

### Deleted as dead (grep-verified zero consumers before removal)

- `src/features/lms/presentation/student-assignments/**` (whole folder)
- `src/features/exam/presentation/exam-list/**` (whole folder)
- `src/app/[locale]/t/[tenant]/(app)/student/assignments/actions.ts`
- `bootstrap/di/lms.di.ts` → `makeListAssignmentsUseCase` factory

`bootstrap/di/exam.di.ts` + `features/exam/{domain,infrastructure}` +
`exam-briefing`/`exam-taking`/`exam-result` are untouched: `/student/exams/[examId]`
still resolves an exam through `makeListExamsUseCase` (core has no single-exam GET).

### Deviations

- **D-1 extended (new record, synced into `design-spec.jsonc#student-course-timeline.crossSubjectList`)** —
  the row drops any "✓ Đã nộp" decoration and the EXAM CTA branches on `state`
  ALONE (no submission read, zero extra calls). `CourseItem` carries no
  per-student submission flag and there is no batched submission endpoint, so
  the mockup's "& unsubmitted" condition would cost one request per row
  (N courses × M items). US-E24.5 already accepted the same fact for the
  single-item player.
- **`?sub=` is a URL param** (the packet only named `?view=`). The AC's own
  "URL là state, không `useState`" makes no view/sub distinction, and putting
  the sub-tab in the URL is what lets the whole screen ship with **zero Client
  Components**. `sub=upcoming` on the assignment view falls back to `open` (D7).
- **Subject badge shows the COURSE title**, not a subject name — the same
  US-E24.2 gap (no student-callable endpoint resolves `subjectId` → a name), not
  a new one.

### Known follow-ups

- `ListAssignmentsUseCase` + `ILmsRepository.listAssignments` remain (they are
  the `GET /assignments?classId=` contract surface and keep their repository /
  mock integration tests) but no longer have a DI factory, i.e. nothing wires
  them into a screen. Deleting the whole stack was outside this story's
  authorised deletion list.

## Implementation Plan

### 0. Code-verified corrections vs packet text

- **`ListExamsUseCase`/`makeListExamsUseCase` (`bootstrap/di/exam.di.ts`) is NOT
  dead code.** `student/exams/[examId]/page.tsx` calls it (`allExams.find(e =>
  e.id === examId)`) — `lms` has no single-exam-get, so the detail route looks
  the exam up from the full list. **Only `features/exam/presentation/exam-list/**`
  (the screen component) and the route `student/exams/page.tsx` that renders it
  are dead** after the redirect lands. `features/exam/{domain,infrastructure}`
  and `exam-briefing/exam-taking/exam-result` presentation — and `exam.di.ts`
  itself — stay untouched.
- **No submission-status read for the cross-subject row, at all** (not "N calls
  vs 1", zero calls) — this MIRRORS a precedent already shipped in US-E24.5, not
  an invented shortcut:
  - The course player's exam body (`body-exam.tsx`, design-spec
    `student-course-player.contentPane.bodyByType.exam`) branches the CTA on
    `item.state` alone (open/closed/upcoming) — it never checks "already
    submitted" for EXAM, because nothing on the wire carries that for an exam
    tile (`CourseItem.exam` has no submission field).
  - D-1 (US-E24.5 deviation, `docs/product/design-spec.jsonc`
    `student-course-player.deviations`) already dropped the per-item "✓ Đã nộp"
    decoration for ASSIGNMENT for the identical reason (`CourseItem` carries no
    per-student submission flag) rather than pay an extra read per item.
  - Cross-subject view is N×M worse (N courses × M items each), so paying for
    it here when the single-item player already refused to pay for one item
    is not defensible. **AC's "✓ Đã nộp nếu có" and "exam OPEN chưa nộp →
    Vào làm bài" both collapse to: EXAM row's CTA is `state === "OPEN" ?
    "Vào làm bài" : "Xem trong khoá học"`.** Logged as a new deviation (§8).
- **`formatItemWindow`** (`course-timeline/../use-cases/format-item-window.ts`)
  is explicitly documented ("shared by … the cross-subject list (US-E24.4)")
  — reused as-is for the row's window text, no new window logic.
  **`groupItemsByWeek`** is NOT reusable — it groups by ISO week from
  `startAt`; cross-subject groups by `(itemType, state)` with a different sort
  per group. A new pure fn is required (§2).
- **No new "subject Badge" component.** `course-card.tsx` already renders a
  tone-coloured pill inline (`TONE_TINT[tone]` bg + `TONE_TEXT_ACCESSIBLE[tone]`
  text, plain `<span>` — no shared "Badge with arbitrary color" primitive
  exists). `cross-subject-row.tsx` does the same inline; not promoted to
  `shared/` (single caller).
- **Subject name gap confirmed, not new**: `CourseCardVm` doc already states no
  endpoint resolves `subjectId`→name for a student, so the badge shows
  `course.title` (e.g. "Toán 10A1", whatever `lms` returns) with `tone`, not a
  separate subject label. Same limitation as the card view; not a new gap to
  flag.

### 1. Domain — data fetch (extend, don't fork, the N+1 fan-out)

`ListCoursesWithSummaryUseCase` (US-E24.2) already does `listCourses` once +
`listItems` per course via `Promise.allSettled` — the cross-subject view needs
the SAME fan-out but the raw `CourseItem[]` per course instead of a folded
summary. Extract the fan-out into a shared, independently-tested helper so the
logic exists once:

```
domain/use-cases/fetch-course-timelines.ts   (NEW — extracted, not duplicated)
  export interface CourseTimeline { course: CourseSummary; items: CourseItem[]; itemsFailed: boolean }
  export function fetchCourseTimelines(repo: ILmsRepository, classId: string, subjectId?: string): Promise<CourseTimeline[]>
    // listCourses once, Promise.allSettled(listItems) per course — moved
    // verbatim out of ListCoursesWithSummaryUseCase.execute's body.
```

- `list-courses-with-summary.use-case.ts` refactors to call
  `fetchCourseTimelines` then map `items → summarizeCourse(items, now)` —
  **behavior-preserving refactor**, its existing test file must stay green
  unmodified (proves no regression).
- `list-courses-with-items.use-case.ts` (NEW) wraps `fetchCourseTimelines` in
  the `Result<T>`/`runCatching` ceremony (same shape as
  `ListCourseItemsUseCase`), returning `Result<CourseTimeline[]>` — the read
  `/student/courses?view=assignment|exam` needs.

**Test first (red→green):**
- `fetch-course-timelines.test.ts` — moved assertions from
  `list-courses-with-summary.use-case.test.ts`'s fan-out cases (one course's
  `listItems` rejects → `itemsFailed: true`, siblings unaffected).
- `list-courses-with-summary.use-case.test.ts` — re-run unchanged, green.
- `list-courses-with-items.use-case.test.ts` (NEW) — `listCourses` failing ⇒
  whole result fails; one `listItems` rejecting ⇒ only that course flagged.

### 2. Domain — cross-subject sort (new pure fn, TDD subject #1)

```
domain/use-cases/sort-cross-subject-items.ts
  export interface CrossSubjectRow { course: CourseSummary; item: CourseItem }
  export interface CrossSubjectGroups {
    open: CrossSubjectRow[]; upcoming: CrossSubjectRow[]; closed: CrossSubjectRow[];
  }
  export function sortCrossSubjectItems(
    timelines: CourseTimeline[],
    itemType: "ASSIGNMENT" | "EXAM",
  ): CrossSubjectGroups
```

Rules (pure, no `Date.now()`, no re-derivation of `state`):
- Flatten `timelines` → rows, KEEP only `item.itemType === itemType` (drops
  LESSON/DOCUMENT even if present).
- `open`   = `state === "OPEN"`, sort `dueAt` ASC, `dueAt: null` LAST.
- `upcoming` = `state === "UPCOMING_HIDDEN"`, sort `startAt` ASC, `null` LAST.
  (Only ever populated when `itemType === "EXAM"` per D7 — the fn does not
  special-case that; an empty array for assignment is the natural result of
  the student read never containing an `UPCOMING_HIDDEN` non-exam row.)
- `closed` = `state === "CLOSED"`, sort `dueAt` DESC (most recent first),
  `null` LAST (decision: packet is silent on null-in-closed; treat identically
  to the open group's "unknown sorts last" rule for consistency).
- A course whose `itemsFailed` is `true` contributes NO rows (degrades
  silently — same "must not lie with a wrong count" principle as the card).

**Test first:** 5 cases — OPEN ascending w/ null-last; UPCOMING ascending;
CLOSED descending w/ null-last; non-matching `itemType` excluded; empty
`timelines` → three empty arrays; a row from an `itemsFailed` course excluded.

### 3. Presentation — derive (urgent flag + VM), mirrors `student-courses.derive.ts`

```
presentation/student-courses/cross-subject.derive.ts
  toCrossSubjectRowVm(row: CrossSubjectRow, now: Date, hrefFor, examHrefFor): CrossSubjectRowVm
  toCrossSubjectGroupsVm(groups: CrossSubjectGroups, now: Date, ...): CrossSubjectGroupsVm
```

- `urgent = item.state === "OPEN" && dueAt != null && (dueMs - nowMs) <= 48h`
  (same `DUE_SOON_MS` constant — import from `student-courses.derive.ts` or
  hoist to `tone.ts`/a tiny shared const; decide at code time, not worth its
  own file).
- `hoursLeftLabel = Math.max(1, Math.round((dueMs - nowMs) / 3_600_000))` →
  `courses.cross.urgent` i18n key `"còn {hours} giờ"`.
- CTA decision (see §0): `itemType === "EXAM" && item.state === "OPEN" ?
  "start" : "view"` — VM carries a `cta: "start" | "view"` discriminant,
  presentation renders the two button i18n keys/hrefs already established by
  `courses.timeline`/exam href builder (mirrors `readActiveItem`'s
  `examHrefFor` pattern from the player page).
- Window text: `formatItemWindow(item, format.dateTime)` (reused, no new
  branch).

**Test first:** urgent boundary (`<=48h` inclusive → true, `>48h` → false, only
when `state === "OPEN"` — a CLOSED row past due must never read urgent);
CTA discriminant per itemType×state matrix (4 cases: exam+open, exam+closed,
exam+upcoming, assignment+open).

### 4. Presentation — components (all server components, zero `'use client'`)

```
presentation/student-courses/
  view-switcher.tsx        # <Link> pill row: Môn học / Bài tập / Bài kiểm tra
  cross-subject-list.tsx   # info banner + sub-tab <Link> row + group render
  cross-subject-row.tsx    # one row: ItemTypeChip, title, subject pill, window+urgent, ItemStatePill, CTA
```

- **No client component anywhere in this feature.** Every interaction (switch
  view, switch sub-tab, open a course, start an exam) is plain navigation —
  `<Link href="...?view=X&sub=Y">` / `<Link href={row.href}>`. This satisfies
  "URL là state, không `useState`" LITERALLY (there is no state to manage) and
  is a stronger position than a client toggle would be. Reuses
  `ItemTypeChip`/`ItemStatePill` (already `'use client'` themselves — fine
  nested inside a server tree, Next allows that direction) from
  `presentation/shared/`.
- `view-switcher.tsx` takes `{ view: "all" | "assignment" | "exam"; hrefFor:
  (view) => string }` — active pill = `aria-current="page"` + filled style
  (matches mockup's filled/outline pill, not underline — underline is reserved
  for the SUB-tab per design-spec `crossSubjectList.subTabs`).
- `cross-subject-list.tsx` sub-tabs: `role="tablist"`, each `<Link>` is
  `role="tab"` + `aria-selected` + a count badge with `aria-label` (e.g.
  `"Đang mở, 4 mục"` — count pill text alone is not announced meaningfully).
  Renders `courses.cross.banner.assignment|exam` info strip, then the active
  group's rows or the empty state (`courses.cross.empty`).
- `cross-subject-row.tsx`: `ItemTypeChip` + title + subject pill (inline
  tone span, §0) + window/urgent text + `ItemStatePill` + CTA `<Link>` (styled
  as button, not a real `<button onClick>`, since it only navigates).

### 5. Route — `/student/courses` gains `?view=`/`?sub=` (URL state)

`page.tsx` (existing, US-E24.2) changes shape:

```ts
type SearchParams = Promise<{ view?: string; sub?: string }>;
export default async function StudentCoursesPage({ params, searchParams }) {
  const { view: rawView, sub: rawSub } = await searchParams;
  const view = rawView === "assignment" || rawView === "exam" ? rawView : "all";
  // defensive parse — sub=upcoming with view=assignment silently falls back
  const sub = parseSub(rawSub, view); // "open" | "upcoming" | "closed", default "open"
  ...
  if (view === "all") { /* existing ListCoursesWithSummaryUseCase path, unchanged */ }
  else {
    const result = await (await makeListCoursesWithItemsUseCase()).execute(classId);
    // ... sortCrossSubjectItems(result.data, view === "assignment" ? "ASSIGNMENT" : "EXAM")
    // ... toCrossSubjectGroupsVm(..., now, hrefFor, examHrefFor)
  }
  return (
    <>
      <ViewSwitcher view={view} hrefFor={...} />
      {view === "all" ? <StudentCoursesScreen .../> : <CrossSubjectList view={view} sub={sub} groups={groupsVm} />}
    </>
  );
}
```

- `hrefFor(view)` / sub-tab hrefs built here (locale/tenant known only at the
  route), same convention as `toCourseCardVms`'s `hrefFor` param.
- `examHrefFor(examId) = /${locale}/t/${tenant}/student/exams/${examId}` —
  same string shape the course-player page already builds.
- `courses/loading.tsx` (existing) stays as-is — Suspense boundary is per-route,
  not per-view.
- **Decision, flagged not silently assumed**: `sub` IS a URL param (not local
  state), even though the packet only names `view` explicitly. Rationale: the
  AC's own line "URL đổi → nội dung đổi, back/forward hoạt động (URL là state,
  không `useState`)" makes no view/sub distinction, and putting sub-tab in the
  URL is what makes the whole feature payable with zero client components
  (§4). No architecture cost — it's one more read in the same `searchParams`.

### 6. Redirects + dead-code removal

- `student/assignments/page.tsx` → replace body with
  `redirect(\`/\${locale}\${tenantUrl(tenant, "/student/courses")}?view=assignment\`)`
  (`tenantUrl` from `@/bootstrap/tenant`, same helper `parent/discipline/page.tsx`
  uses for the identical `/${locale}${tenantUrl(...)}` shape). Needs
  `params: Promise<{ locale; tenant }>` — this route currently takes NO params,
  so the signature grows.
- `student/exams/page.tsx` → same shape, `?view=exam`.
- Both become **only** a `redirect()` call — delete `MOCK_STUDENT_ID`,
  `makeListExamsUseCase`/`makeListAssignmentsUseCase` calls, and their
  `ExamListScreen`/`StudentAssignmentsScreen` imports FROM THESE TWO FILES only
  (the use-cases/DI themselves stay, per §0).
- `assignments/actions.ts` (`listAssignmentsAction`, `getAssignmentDetailAction`,
  `submitAssignmentAction`) — DELETE, no longer imported once the page is a
  redirect.
- `assignments/page.test.ts`, `exams/page.tsx`'s implicit test (none currently
  found — add one) → replace with a redirect assertion: `expect(redirect)
  toHaveBeenCalledWith(".../student/courses?view=assignment")` (mock
  `next/navigation`'s `redirect`, matching how other redirect tests in this repo
  assert — grep `principal/reports/layout.test` or similar for the mocking
  convention at code time).
- **DELETE** (confirmed dead by grep, §"Read" phase — zero other consumers):
  - `src/features/lms/presentation/student-assignments/**` (screen, cards,
    skeleton, error, submit-sheet, badge + its test, draft hook) — the WHOLE
    folder.
  - `src/features/exam/presentation/exam-list/**` (screen, skeleton, i-vm,
    stories) — the whole folder. `exam-briefing/exam-taking/exam-result` and
    everything in `exam/domain`+`exam/infrastructure` stay.
  - `src/bootstrap/di/lms.di.ts`: `makeListAssignmentsUseCase` becomes unused
    once `student-assignments-screen` is gone — confirm via grep at code time
    (only the deleted page/actions call it today) and remove the factory too
    (dead export is still dead code).
- Sidebar: remove the two `nav-config.ts` entries (`/student/assignments`,
  `/student/exams`); `nav-config.test.ts` gets a new assertion (student nav =
  the 7 remaining hrefs, `DEFAULT_ROUTE.student` unchanged at `/student`).

### 7. i18n

- New namespace `courses.views.*`: `all`, `assignment`, `exam` (pill labels —
  reuses existing icon set, no new icons).
- New namespace `courses.cross.*`: `banner.assignment`, `banner.exam`,
  `subTab.open`, `subTab.upcoming`, `subTab.closed`, `subTab.countAria`
  (`"{label}, {count} mục"`), `empty`, `urgent` (`"còn {hours} giờ"`), `cta.start`
  (`"Vào làm bài"` — may just alias `courses.player.exam.start`, decide at code
  time whether to reuse that key or add a sibling; adding a sibling avoids a
  cross-namespace i18n dependency that would break if the player copy changes
  for player-specific reasons), `cta.view` (`"Xem trong khoá học"`).
- **Delete on confirmed-zero-reference** (after the presentation folders in §6
  are gone): `assignments.page.*`, `assignments.card.*`, `assignments.empty.*`,
  `assignments.skeleton.*`, `assignments.error.*`, `assignments.submit.*`.
  **Keep** `assignments.errors.*` — IDENTICAL failure-key catalogue exists at
  `courses.errors.*` already (verified: same 12 keys) so `assignments.errors`
  can go too; nothing outside the deleted folder reads it (verify via grep at
  code time before deleting, since `tsc` cannot catch a dead JSON key).
  `exam.*` namespace is UNTOUCHED (used by `exam-briefing/taking/result`, kept).
  Evidence entry required: paste the grep command + zero-hits output proving
  each deleted key had no other reader (repo convention per `.claude/rules/i18n.md`
  "quét hardcoded" verification habit).

### 8. Deviation log (add to design-spec `crossSubjectList` or story Evidence)

- **New deviation, not in packet**: the row drops any "✓ Đã nộp" decoration and
  the EXAM CTA is `state`-only (no submission check) — extends D-1
  (US-E24.5) to the cross-subject list for the identical reason (§0). Record
  this in the story's Evidence section and, if `design-spec.jsonc`'s
  `crossSubjectList.row`/`action` still says "if submitted" when this ships,
  add a one-line normative correction there (not a new ADR — it is the same
  no-wire-data fact already accepted for the player).

### 9. Validation → proof mapping

| AC | Proof |
| --- | --- |
| Sort OPEN/UPCOMING/CLOSED | `sort-cross-subject-items.test.ts` (§2) |
| Urgent ≤48h + "còn N giờ" | `cross-subject.derive.test.ts` (§3) |
| No "Sắp mở" tab for assignment | `cross-subject-list.tsx` conditional render — Storybook `assignment-open-urgent` story asserts absence of the tab |
| Sidebar 7 items | `nav-config.test.ts` updated assertion |
| Redirect 307/308 + old exam-detail unaffected | `assignments/page.test.ts`, new `exams/page.test.ts` (redirect mock); `exams/[examId]/page.tsx` untouched → its existing tests (if any — check) stay green |
| URL is state / back-forward | no client component exists (§4) — nothing to test beyond the existing RSC page test pattern (`page.test.ts` asserting VM per `view`/`sub` combination) |
| tablist a11y | `fe-accessibility-auditor` gate + Storybook interaction (role=tab, aria-selected, count aria-label) |
| Storybook states | `cross-subject-list.stories.tsx`: all / assignment-open-urgent / exam-upcoming / closed / empty |
| Dead i18n keys | Evidence section: grep output (§7) |
| Gate | `bun vitest run && bun build` before merge, per `parallel-workflow.md` |

### 10. fe-component-architect / fe-state-engineer — NOT needed

- **fe-component-architect**: skip. 3 small components (`view-switcher`,
  `cross-subject-list`, `cross-subject-row`), all server components, reusing
  2 already-shared primitives (`ItemTypeChip`/`ItemStatePill`) and one already-
  shared pure fn (`formatItemWindow`). Complexity is comparable to US-E24.3
  (`timeline-row.tsx`/`week-section.tsx`), which shipped without this
  specialist. No new component-placement decision beyond what §0 already
  settled (no new shared primitive, no new Badge variant).
- **fe-state-engineer**: skip. Zero TanStack Query, zero client state, zero
  mutation — everything is an RSC read + `<Link>` navigation (URL fully
  replaces what a client store would hold). This is the same shape US-E24.2's
  `page.tsx` already used.

### 11. Shared-file merge discipline (parallel-workflow.md)

Before merging to `main`: `git fetch origin && git merge --no-ff origin/main`
first — `nav-config.ts` and `messages/{vi,en}.json` are the two shared files
this US edits (EPIC-OVERVIEW §3b confirms only E24.4 touches `nav-config.ts`
on the student side, so contention is with `messages/*` only, likely from the
teacher-branch stories run in the sibling worktree). Re-run
`bun vitest run && bun build` after the merge, before pushing to `main`.

### Open questions

- `[OPEN QUESTION]` Should `courses.cross.cta.start` alias
  `courses.timeline.itemType.exam`'s player CTA copy or get its own key? Leaning
  own key (see §7) — confirm at code time it doesn't drift from
  `courses.player.exam.start` wording ("Vào làm bài" is identical today).
- `[OPEN QUESTION]` `exams/page.tsx`/`assignments/page.tsx` currently have NO
  `params` prop (exams) or use `requireRole` without locale/tenant (assignments
  reads them from... neither currently reads locale/tenant at all, confirm at
  code time how to get `locale`/`tenant` into a route that never needed them
  before — likely just adding `params: Promise<{ locale; tenant }>` like every
  sibling route under `t/[tenant]/`).
- `[OPEN QUESTION]` Confirm no existing test file exists for
  `student/exams/page.tsx` today (only `assignments/page.test.ts` was found) —
  if true, this is a NET NEW test, not a rewrite, when redirecting it.
