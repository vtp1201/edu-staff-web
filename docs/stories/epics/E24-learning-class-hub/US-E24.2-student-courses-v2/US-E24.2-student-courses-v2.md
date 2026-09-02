# US-E24.2 Khoá học của tôi v2 — card "sắp đến hạn" + "N mục đang mở"

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E24.1 (contract + `features/lms` mới), US-E24.0b (mockup v3)
- Blocks: US-E24.4 (tab xuyên môn dùng chung trang), US-E24.3 (điều hướng card → timeline)
- Feature module(s) chạm: `src/features/lms/presentation/student-courses/**`,
  `src/features/lms/domain/use-cases/` (thêm `summarize-course.ts` pure)
- Shared contract/file: `messages/{vi,en}.json` namespace `courses`; `nav-config.ts` KHÔNG đổi ở US này

## Product Contract

Design: `design_src/edu/course-items.jsx` → `StudentCoursesV2`, `ciCourseSummary`;
design-spec `student-course-timeline` (phần cards). Mỗi card môn hiển thị: tên môn, GV, ô
"Sắp đến hạn" (mục có `dueAt` gần nhất còn mở; nền warning khi ≤48h), dòng "N mục đang mở",
CTA "Vào khoá học". **Bỏ** % tiến độ và điểm TB (BE chưa có — US-254 draft).

Data: `listCourses(classId)` (đã có) rồi `listItems(courseId)` cho từng course (N+1 chấp nhận
tạm — ask #4 xin `courses/me` có summary; khi có thì chỉ đổi repo). Summary tính ở domain
(`summarizeCourse(items, now)`: `openCount` = items `state === 'OPEN'`; `nextDue` = item OPEN có
`dueAt` nhỏ nhất ≥ now). `now` inject (test deterministic). Chỉ dùng item student nhìn thấy
(BE đã lọc UPCOMING_HIDDEN trừ EXAM — không lọc lại ở client, chỉ tính `state`).

Class của student: `resolve-my-class.ts` (đã có từ E24.1).

## Relevant Product Docs

- `docs/product/design-spec.jsonc#student-course-timeline`, `docs/product/screens.md` hàng student Courses
- `docs/reports/2026-09-02-fe-to-be-asks-adr0143.md` #4
- `.claude/rules/design-system.md` (StatCard/Badge patterns), `component-organization.md`

## Acceptance Criteria

- Given student có 6 course, When mở `/student/courses`, Then thấy grid card (≥300px, auto-fill),
  mỗi card có màu môn, tên, GV, ô sắp đến hạn hoặc "Không có mục nào sắp đến hạn.", "N mục đang mở".
- Given mục due ≤48h, Then ô sắp đến hạn dùng tone warning (`bg-edu-warning-light`,
  `text-edu-warning-text`) + icon clock; >48h dùng muted. Không truyền nghĩa chỉ bằng màu (có nhãn).
- Given course không có item, Then card vẫn render với "0 mục đang mở".
- Given `listItems` 1 course lỗi, Then card đó hiện summary "—" + tooltip lỗi, các card khác bình thường
  (degrade từng card, không error toàn trang).
- Loading: skeleton grid; empty: "Chưa có khoá học" (reuse `courses-empty.tsx`); error toàn trang khi
  `listCourses` fail (reuse pattern hiện tại).
- Card là `<a>`/Link tới `/student/courses/[courseId]`; focus ring visible; toàn card 44px+ target.
- Unit: `summarizeCourse` (openCount, nextDue chọn đúng, bỏ CLOSED, dueAt null, now inject).
- Storybook: default / due-soon / empty-course / partial-error / loading / empty / error.
- i18n vi+en: `courses.card.dueNext`, `courses.card.nothingDue`, `courses.card.openCount`,
  `courses.card.open`; xoá key % tiến độ/điểm TB không còn dùng.
- Design-review gate pass; a11y audit pass. `tsc`, `vitest`, `build` xanh.

## Design Notes

- Commands: none. Queries: `listCourses`, `listItems` ×N (server, trong page RSC hoặc 1 use-case
  `ListCoursesWithSummaryUseCase` gọi song song `Promise.allSettled`).
- UI surfaces: `student-courses-screen.tsx` (rewrite card), `course-card.tsx`.
- Domain rules: xem Product Contract. Không dùng `Date.now()` trong component — nhận `now` từ VM.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `summarize-course.test.ts`, use-case allSettled test |
| Integration | page.test.ts render RSC với mock DI (pattern E24.1) |
| E2E | Storybook interaction stories |
| Platform | tsc/vitest/build |
| Release | design-review gate + a11y |

## Harness Delta

None.

## Evidence

(điền sau)

## Implementation Plan

### 0. Codebase reality check (read before coding)

- `student-courses-screen.tsx` + `course-card.tsx` + `.i-vm.ts` already exist (US-E24.1
  post-redesign baseline): plain RSC grid, no client state, `CourseCardVm` deliberately
  dropped `progressPct`/`gradeAvg`/`subjectId` (see its doc comment) — **the "xoá key %
  tiến độ/điểm TB" AC line is already satisfied**, `messages/vi.json` `courses.*` has no such
  keys today. No stale keys to remove — this phase is additive only.
- `page.tsx` (`/student/courses`) already does RBAC (`requireRole(["student"])`) →
  `resolveMyLmsClassId()` → `makeListCoursesUseCase().execute(classId)` → maps to
  `CourseCardVm[]`. This plan extends that chain, does not rebuild it.
- **Gap found, not in the packet's Product Contract**: neither `Course` nor `CourseSummary`
  (`src/features/lms/domain/entities/course.entity.ts`) carries a teacher NAME. `createdBy` is
  a memberId (per `i-lms.repository.ts` convention), and no endpoint this repo consumes
  resolves memberId → display name for a student caller. The design (`ciCourseSummary`/
  `StudentCoursesV2` in `course-items.jsx`) shows `c.teacher` from static fixture data — not
  wire-real. **Decision: drop the teacher line from the card**, same precedent as the existing
  `CourseCardVm` doc comment already used for `subjectId` ("no endpoint resolves it to a name").
  Flag to `fe-lead`: this is a data-availability gap (not a token/architecture decision), no ADR
  needed — just note it so E24.3/E24.4 don't re-invent a fake teacher field either.
- `ILmsRepository.listItems(courseId)` and `.listCourses(classId)` already exist and are reused
  as-is — no infrastructure/DTO/mapper changes in this US.

### Phase 1 — Domain: `summarizeCourse` (pure)

Files: `src/features/lms/domain/use-cases/summarize-course.ts` (not a `*.use-case.ts` class —
it's a pure function, no repo dependency, so it doesn't need the `Result`/`runCatching`
ceremony; matches existing pure-helper precedent `derive-overdue.ts`).

```ts
export interface CourseSummaryStats {
  openCount: number;
  nextDue: CourseItem | null;
}
export function summarizeCourse(items: CourseItem[], now: Date): CourseSummaryStats
```

- `openCount` = `items.filter(i => i.state === "OPEN").length`.
- `nextDue` = among `state === "OPEN"` items with `dueAt !== null` and `new Date(dueAt) >= now`,
  the one with the smallest `dueAt`; `null` if none. `CLOSED`/`UPCOMING_HIDDEN` excluded by the
  `state === "OPEN"` filter (student never receives `UPCOMING_HIDDEN` except EXAM per EPIC §2 —
  irrelevant here since only OPEN is considered anyway).
- `now` is an injected `Date`, never `Date.now()` inside — matches packet Design Notes + repo
  convention (decision 0018 clock-skew precedent).

**Test first**: `src/features/lms/domain/use-cases/__tests__/summarize-course.test.ts`
- `openCount` counts only OPEN items (mix of OPEN/CLOSED/UPCOMING_HIDDEN).
- `nextDue` picks the OPEN item with the smallest `dueAt` ≥ `now`, ignores OPEN items with
  `dueAt: null`.
- an OPEN item whose `dueAt` is in the past relative to `now` is excluded (edge case not
  explicit in AC but matches design mockup `withDue` filter `>= CI_NOW`).
- `CLOSED` items with a `dueAt` never selected even if soonest.
- empty `items[]` → `{ openCount: 0, nextDue: null }` (AC "course không có item").

Done when: unit tests green, function has zero framework/lib imports besides the `CourseItem`
entity type.

### Phase 2 — Domain orchestration: `ListCoursesWithSummaryUseCase`

Packet's Design Notes floats two options (page.tsx `Promise.allSettled` vs a use-case). Pick
the **use-case** — keeps the N+1 fan-out + per-course degrade logic unit-testable against a
mock `ILmsRepository` (TDD requirement) instead of only reachable via an RSC integration test.

Files: `src/features/lms/domain/use-cases/list-courses-with-summary.use-case.ts`

```ts
export interface CourseWithSummary {
  course: CourseSummary;
  summary: CourseSummaryStats | null; // null = this course's listItems failed
  itemsFailed: boolean;
}
export class ListCoursesWithSummaryUseCase {
  constructor(private readonly repo: ILmsRepository) {}
  async execute(classId: string, now: Date, subjectId?: string): Promise<Result<CourseWithSummary[]>>
}
```

- `listCourses(classId, subjectId)` first; on failure, propagate the `Result` failure as-is
  (whole-page error path — matches AC "error toàn trang khi listCourses fail").
- On success, `Promise.allSettled(courses.map(c => repo.listItems(c.id)))` — one `listItems`
  call per course, in parallel (no artificial concurrency cap; class course counts are small).
- Per course: `status === "fulfilled"` → `{ course, summary: summarizeCourse(value, now),
  itemsFailed: false }`; `status === "rejected"` → `{ course, summary: null, itemsFailed: true }`
  (AC "card đó hiện summary '—' + tooltip lỗi, các card khác bình thường" — degrade per-card,
  never bubble a single `listItems` rejection to the whole-page error).

**Test first**: extend `src/features/lms/domain/use-cases/__tests__/` (new file
`list-courses-with-summary.use-case.test.ts`, mock `ILmsRepository`):
- `listCourses` failure → `Result.ok === false` with the same failure (no re-mapping, matches
  repo-wide convention asserted in `lms.use-cases.test.ts` header comment).
- all `listItems` succeed → every row has `itemsFailed: false` + correct `summarizeCourse`
  output (inject a fixed `now`).
- one `listItems` rejects (repo throws `LmsFailure`) → only that row has `itemsFailed: true,
  summary: null`, sibling rows unaffected — the concrete proof for AC's partial-error line.
- zero courses → `Result.ok === true, data: []` (no `Promise.allSettled([])` edge-case crash).

Done when: both use-case test files green; `ListCoursesUseCase`/`ListCourseItemsUseCase`
unchanged (still exported/used elsewhere — `[courseId]` route keeps using
`ListCourseItemsUseCase` directly, untouched by this US).

### Phase 3 — DI wiring

Files: `src/bootstrap/di/lms.di.ts` — add
`makeListCoursesWithSummaryUseCase()` factory (same `makeRepo()` gate, no new repo, no new
endpoint). No infrastructure/DTO/mapper phase needed (BE surface unchanged, N+1 pattern only).

### Phase 4 — Presentation rewrite

Files:
- `student-courses-screen.i-vm.ts` — extend `CourseCardVm` with:
  ```ts
  openCount: number;
  nextDue: { title: string; typeLabel: string; dueAt: string /* ISO, formatted at render */; itemType: CourseItemType } | null;
  dueSoon: boolean; // computed server-side: (dueAt - now) <= 48h — no client Date math (a11y/i18n rule: presentation formats, doesn't compute business state)
  itemsFailed: boolean;
  ```
  Drop nothing already there (`id/title/status/isDefault/tone/href` stay). Update the file's
  doc comment — the "dropped for now" framing for progress/grade stays true; add a note that
  `openCount`/`nextDue` are new and teacher name is deliberately absent (data gap, see §0).
- `course-card.tsx` — add the "Sắp đến hạn" block (per design-spec `courseCards.dueNextBlock`):
  icon + uppercase label + item title (truncate) + `"<typeLabel> · hạn dd/MM HH:mm"`; tone
  branch `dueSoon ? warning : muted` using existing `TONE_*` pattern is NOT reused here (this is
  urgency, not course tone) — new local classes `bg-edu-warning-light`/`border-edu-warning/55`/
  `text-edu-warning-text` (all already-defined tokens, no ADR) vs `bg-muted`/`border-border`.
  Empty state: `"Không có mục nào sắp đến hạn."` on `bg-muted`. Then "N mục đang mở" row
  (`text-edu-success-text` dot + label) OR itemsFailed → "—" + `title=` tooltip with the error
  copy (native `title` attribute is enough for a tooltip per existing repo patterns — grep
  confirms no dedicated Tooltip primitive used elsewhere in this feature; keep it simple, no new
  primitive).
- `student-courses-screen.tsx` — no structural change beyond passing the new VM fields through
  to `CourseCard` (still a plain RSC-fed component, no `'use client'` needed — confirmed no new
  client interactivity introduced).
- `page.tsx` — swap `makeListCoursesUseCase()` for `makeListCoursesWithSummaryUseCase()`, pass
  `new Date()` as `now` (the ONE place `Date.now()`-equivalent is allowed — server boundary,
  not component), map `CourseWithSummary[]` → `CourseCardVm[]` (format `dueAt`, compute
  `dueSoon` here, resolve `typeLabel` via `getTranslations("courses")` since page.tsx is RSC).

**Component placement** (`component-organization.md`): `course-card.tsx` stays
`features/lms/presentation/student-courses/` — it's already feature-local pattern precedent
(1 consumer: this screen). No promotion trigger (design-spec notes it shares a "shell" visual
pattern with the class-hub card, but that's a different feature's component with no shared
code today — do NOT preemptively extract a shared component; promote only on an actual 2nd
consumer, per the rule).

### Phase 5 — i18n

Add to `messages/vi.json` + `messages/en.json` under `courses.card`:
`dueNext` ("Sắp đến hạn"/"Due next"), `nothingDue` ("Không có mục nào sắp đến hạn."/"Nothing due
soon."), `openCount` (ICU plural-free interpolation `"{count} mục đang mở"`/`"{count} open
items"`), `open` — re-check AC wording: likely the due-line separator label, map to
`"<typeLabel> · hạn {date}"` → key `courses.card.dueLabel` (AC lists `courses.card.open` — most
likely shorthand for the CTA/openCount pairing, confirm against design-spec exact strings during
implementation; **do not invent a 5th key if 4 covers all copy** — cross-check literally against
`courseCards` block in `design-spec.jsonc` before finalizing key names). Reuse existing
`courses.player.itemType.*` for type labels (lesson/assignment/document/exam) — do NOT
duplicate under `card.*`. Add `courses.card.summaryError` for the per-card tooltip text (AC
"tooltip lỗi").

### Phase 6 — Storybook + tests

`student-courses-screen.stories.tsx` — extend `MOCK_COURSES` (now `CourseCardVm[]` with new
required fields) and add stories: `CoursesGrid_DueSoon` (warning tone card), `CoursesGrid_
EmptyCourse` (0 open items, "0 mục đang mở"), `CoursesGrid_PartialError` (one card
`itemsFailed: true`, others normal — assert the failed card shows "—" and siblings unaffected).
Existing `CoursesGrid_Success/_Empty/_Error/_NoClass` stay, updated with new VM shape.
`courses-skeleton.tsx` unchanged (already generic).

`page.test.ts` (existing, RSC integration pattern from E24.1) — extend to assert
`makeListCoursesWithSummaryUseCase` is called with a `Date` `now`, and VM mapping (dueSoon
threshold, itemsFailed passthrough).

### Validation → packet's table

| Packet row | Concrete proof |
| --- | --- |
| Unit `summarize-course.test.ts` | Phase 1 |
| Unit "use-case allSettled test" | Phase 2 (`list-courses-with-summary.use-case.test.ts`) |
| Integration `page.test.ts` | Phase 6, extends existing file |
| E2E Storybook | Phase 6 new stories + play functions |
| Platform | `tsc`/`vitest run`/`bun build` gate before merge (parallel-workflow.md) |
| Release | design-review gate (`/impeccable`) + a11y audit — card is a single `<Link>`
  already (a11y precedent kept), new content must not add nested interactive elements |

### Architect / state-engineer need — SKIP both

- `fe-component-architect`: not needed. One existing feature-local component
  (`course-card.tsx`) gets new props/markup within its established shape; no new component tree,
  no new shared primitive, no cross-feature contract. This matches the Selection-rules "skip for
  ... single-component additions in an existing feature" bar.
- `fe-state-engineer`: not needed. Zero TanStack Query, zero client state — this stays a plain
  RSC page (`page.tsx` → server use-case → props). The N+1 fan-out is `Promise.allSettled`
  inside a domain use-case, same shape as the already-shipped `list-course-items` +
  `resolve-my-class` server-side composition precedent; no cache/invalidation concern exists.
- Route straight to `fe-nextjs-engineer` for TDD implementation.

### Open questions (flag to fe-lead, no ADR required)

1. **Teacher name gap** (§0) — card drops teacher line vs design mockup; confirm this is
   acceptable for E24.2 sign-off or whether BE has an undocumented member-name-resolution
   endpoint the FE-to-BE asks doc missed.
2. **`courses.card.open` key wording** — packet AC names it explicitly; design-spec's
   `courseCards` block doesn't show a 4th distinct string beyond dueNext/nothingDue/openCount.
   Engineer should re-derive the exact 4 (not 5) keys from `design-spec.jsonc` `courseCards` at
   implementation time rather than guess here.
3. Ask #4 (`courses/me` summary endpoint, BE US-254) not yet answered — this whole N+1 +
   `ListCoursesWithSummaryUseCase` is the interim shape; when BE ships, only Phase 2/3 (swap the
   use-case body for one `listCoursesWithSummary` repo call) and DTO/mapper need to change —
   Phase 4/5/6 (VM shape, UI, i18n) stay stable by design.
