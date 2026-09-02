# US-E24.3 Chi tiết khoá học = 1 timeline dọc theo tuần (student mode)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E24.1, US-E24.0b
- Blocks: US-E24.5 (player mở từ dòng timeline), US-E24.10 (teacher mode tái dùng component)
- Feature module(s) chạm: `src/features/lms/presentation/lesson-player/**` (đổi tên →
  `course-timeline/`), `src/features/lms/domain/use-cases/group-items-by-week.ts`
- Shared contract/file: `components/shared/status-badge` (dùng lại), `messages` namespace `courses`

## Product Contract

Design: `design_src/edu/course-items.jsx` → `CourseTimelinePage`, `CiRow`, `CiStatusPill`,
`CiTypeChip`; design-spec `student-course-timeline`. Route `/student/courses/[courseId]`.

- Header course: icon môn, tên, GV, "N mục đang mở", legend 3 trạng thái (Sắp mở / Đang mở /
  Đã đóng — chỉ xem) bằng màu + chữ.
- MỘT timeline dọc: rail + dot màu theo state; nhóm theo tuần; mỗi dòng = chip loại (Bài giảng
  `play`/primary, Bài tập `clipboard`/warning-text, Kiểm tra `fileText`/error-text, Tài liệu
  `link`/teal), tiêu đề, "Loại · khung thời gian" (`ciWindow`: `start → due` | `Mở từ` | `Hạn` |
  `Luôn mở`), pill trạng thái.
- **D7**: student chỉ thấy item BE trả về; `UPCOMING_HIDDEN` chỉ xuất hiện ở EXAM → hiện 🔒 +
  "Sắp mở", dòng mờ 0.72, không click. Không tự tính state từ clock.
- Click dòng (OPEN/CLOSED) → `/student/courses/[courseId]/items/[itemId]` (E24.5). Cho tới khi
  E24.5 merge, click mở expand inline như design (CiItemDetail) — phần expand là **tạm**, E24.5 gỡ.
- Empty: "Giáo viên chưa thêm nội dung cho khoá học này."
- Week grouping (domain pure `groupItemsByWeek(items, locale)`): key = ISO week của `startAt`;
  `startAt=null` → nhóm đầu "Luôn mở"; nhãn "Tuần dd/MM – dd/MM" (ask #5: khi BE có số tuần →
  "Tuần 30 · dd/MM – dd/MM"). Sort tuần tăng dần, item trong tuần theo `position`.
- Component nhận prop `mode: 'student' | 'teacher' | 'readonly'` từ đầu (E24.10 dùng) nhưng US này
  chỉ implement `student`; `teacher/readonly` throw/notImplemented có test.

## Relevant Product Docs

- `docs/product/design-spec.jsonc#student-course-timeline`; `docs/product/screens.md`
- `.claude/rules/design-system.md` §Status/badge; `accessibility.md`

## Acceptance Criteria

- Render đúng nhóm tuần + thứ tự; item `startAt` null nằm nhóm "Luôn mở" (unit test grouping với
  fixture 3 tuần + null + closed).
- Pill trạng thái: `OPEN` success-text, `UPCOMING_HIDDEN` info, `CLOSED` muted — mỗi pill có chữ.
- Dòng CLOSED: tiêu đề `text-muted-foreground`, vẫn click được (xem để ôn tập).
- EXAM UPCOMING: có icon lock + `aria-disabled`, không điều hướng, tooltip "Nội dung sẽ mở lúc …".
- Header đếm đúng "N mục đang mở" (state OPEN).
- Course không tồn tại/403 → `notFound()` (giữ hành vi E24.1); timeline lỗi nhưng course OK →
  banner lỗi + retry, header vẫn hiện (giữ contract degrade E24.1).
- Keyboard: dòng là `<a>` hoặc button; tab order theo thứ tự đọc; focus ring.
- Storybook: 3-weeks / with-upcoming-exam / all-closed / empty / error / loading; mobile 375 không
  vỡ (rail 34px + card co).
- i18n vi+en: `courses.timeline.*` (legend, alwaysOpen, weekLabel, opensAt, closedReadOnly, empty).
- Gate xanh; design-review + a11y pass.

## Design Notes

- Queries: `getCourse`, `listItems` (đã có), gộp trong page RSC.
- Domain: `group-items-by-week.ts`, `format-item-window.ts` (pure, locale-aware qua Intl).
- UI: `course-timeline/{course-timeline.tsx, timeline-row.tsx, item-type-chip.tsx,
  item-state-pill.tsx, course-header.tsx}` — `item-type-chip`/`item-state-pill` sẽ được E24.4/E24.5
  dùng → đặt trong `features/lms/presentation/shared/` ngay (1 nơi, decision 0026).
- Tokens: rail `bg-border`, dot OPEN `bg-edu-success-text`, UPCOMING `bg-edu-info`, CLOSED `bg-border`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | grouping, window formatting, state→tone mapping |
| Integration | page.test.ts (RSC) |
| E2E | Storybook interaction (click row → href; upcoming exam not navigable) |
| Platform | tsc/vitest/build |
| Release | design-review + a11y |

## Harness Delta

None.

## Evidence

### Deviations vs `docs/product/design-spec.jsonc#student-course-timeline`

Ghi TRƯỚC design-review gate. Hai điểm cố ý lệch spec; `status` của entry tương ứng đã
sync sang `partially implemented … (US-E24.3, 2 deviations)`.

1. **Bỏ `opacity .72` cho dòng `UPCOMING_HIDDEN`.** Spec làm mờ cả dòng sắp mở. Chữ meta
   của dòng dùng `text-muted-foreground` (= `--edu-text-secondary`, 5.48:1); nhân thêm
   `.72` alpha kéo tương phản thực tế xuống dưới 4.5:1 → vi phạm WCAG 1.4.3
   (`.claude/rules/accessibility.md`). Trạng thái "sắp mở" vẫn đủ kênh: **text pill**
   ("Sắp mở"), **dot rail** `bg-edu-info`, và dòng `opensAt` in rõ giờ mở — không kênh nào
   chỉ dựa vào màu/opacity. Không cần token mới.

2. **Lesson tự load nội dung khi expand, thay cho nút "Xem bài giảng" riêng.** Spec cho
   dòng LESSON một nút điều hướng sang trang bài giảng. Route đó
   (`/student/courses/[courseId]/items/[itemId]`) thuộc scope **US-E24.5** và chưa tồn tại
   → một nút dẫn tới 404 tệ hơn. Tạm thời `item-detail.tsx` gọi `getLesson` ngay khi dòng
   mở và render inline (loading/error/ready). Đây là **TEMP code đã đánh dấu trong file**
   (header `item-detail.tsx` + block comment trong `timeline-row.tsx`): US-E24.5 xoá
   `item-detail.tsx` và trả dòng về đúng href của spec. Mọi key
   `courses.timeline.itemDetail.*` chỉ phục vụ file này và chết cùng nó.

### Review fix round (fe-tech-lead-reviewer SHOULD FIX + fe-accessibility-auditor minor)

- Dọn i18n chết sau migration `player.*` → `timeline.*` (vi + en, parity 4157/4157 keys):
  xoá `courses.player.content.empty.{title,body}`, `courses.a11y.{activeLessonState,
  lessonChanged}`, `courses.timeline.closedReadOnly` (trùng nội dung
  `timeline.itemDetail.closedNote` — giữ bản đang dùng ở `item-detail.tsx:51`), và
  `courses.timeline.navLabel` (chết theo thay đổi `<nav>` → `<div>` bên dưới).
- `item-type-chip.tsx`: thêm `"use client"` cho khớp `item-state-pill.tsx`.
- `course-timeline.tsx`: `<nav aria-label>` → `<div>` — các dòng là button toggle-expand,
  không phải navigation; mỗi tuần đã có `<section aria-label>` riêng.
- `timeline-row.tsx`: comment giải thích vì sao rail-dot CLOSED (`bg-border`, bám màu rail
  `#C3CBD9`) khác pill-dot CLOSED (`bg-edu-text-secondary`, nếu dùng `bg-border` sẽ chìm
  trong badge muted) — hai map giữ riêng có chủ đích, KHÔNG hợp nhất.
- **A11Y-001**: nút toggle nhận `aria-controls={panelId}`, panel expand nhận
  `id={"ci-panel-" + item.id}`; assert bằng `getAttribute` + `getElementById` trong story
  `ExpandRow`.
- **A11Y-002**: nút dòng OPEN/CLOSED thêm `transition-colors hover:bg-muted/60` (tiền lệ
  `features/grades/.../pending-approval-list.tsx`); no-op khi đã expand vì card lúc đó đã
  là `bg-muted`, nên hover chỉ báo "dòng đang đóng này bấm được".

### fe-tech-lead-reviewer verdict

**Approved.** Layers clean (domain pure, formatter injected; presentation imports no
infrastructure/DI); component-organization.md compliant (`item-type-chip`/`item-state-pill`
promoted to `features/lms/presentation/shared/`, `StatusBadge` composed via children slot,
untouched); ISO-week algorithm traced correct (Monday-start, Thursday decides ISO year,
UTC-only, no DST slip) against 6 boundary cases; RBAC intact (`requireRole(["student"])` in
page + both Server Actions); i18n vi/en parity verified (4157/4157 keys after fix round);
`bun vitest run` 529 files/4245 tests, `bunx tsc --noEmit` clean, `bunx vitest run --config
vitest.storybook.mts` 161 files/1277 tests — all independently re-run by the reviewer, not
just self-report. All 9 engineer-reported deviations (shared-folder placement, no-teacher-name,
dropped opacity, muted legend/type-label colour, visible opens-at text, `useState` over
`useTransition`, hand-written ISO week, parallel reads, TEMP markers) accepted with reasoning.
Should-fix items (dead i18n keys, design-spec deviation record, 2 CONSIDER items) closed in
the fix-round commit `94249e56`.

### fe-accessibility-auditor verdict

**Pass, 2 minor findings** (both closed in the fix-round): A11Y-001 (`aria-controls`/`id`
pairing missing on the toggle-expand disclosure pattern) and A11Y-002 (row button had no
hover affordance for sighted mouse users, though keyboard/AT access was already correct).
No blocking/critical/major finding — visible learning-transfer from US-E24.2's A11Y-001/002/004
(ring-inset not needed here since no `overflow-hidden` clips the row; colour-only status
avoided throughout; visible text instead of tooltip-only disclosure for the locked-row
opens-at line).

### Design-review gate

- design-system: conform — zero raw color in `course-timeline/`+`shared/`; every token
  resolved against `tokens.css`/`globals.css` `@theme`; 2 documented, justified deviations
  from `design-spec.jsonc` (see above) rather than silent drift; `design-spec.jsonc` entry
  status synced to reflect partial implementation.
- a11y: WCAG AA OK post-fix; keyboard OK (real `userEvent.tab()` proof); reduced-motion N/A
  (no transition/animation classes in this feature).
- impeccable audit: per-edit design hook ran on every change across all 3 rounds (domain,
  rebuild, fix) — 0 anti-patterns flagged each time.
- states: loading/empty/error/3-weeks/all-closed/upcoming-exam covered in Storybook (11
  stories); mobile reflow proven at both 320px (`Mobile375` — mislabeled, actually the
  `mobile1` 320px preset, tracked as a QA follow-up) and a genuine 375px (`Viewport375Real`,
  added by QA).

### fe-qa-playwright verdict

**Go.** 100% AC coverage (11/11), all with real (non-static) test proof. QA added 3
Storybook interaction stories closing 2 AC gaps that were previously proximate-only:
`Viewport375Real` (exact 375px via `page.viewport(375,800)` + `scrollWidth` check) and
`KeyboardOperability`/`LockedRowRejectsActivation` (real `userEvent.tab()` walk in reading
order, locked row confirmed unreachable/inert). Zero production defects found. One minor
housekeeping item flagged (non-blocking): the pre-existing `Mobile375` story uses
Storybook's `mobile1` viewport preset (320px, not 375px) — mislabeled but not a functional
gap since 320px is a strict subset of 375px; follow-up rename recommended, not required.

Final commands run (fe-lead, post-QA): `bun vitest run` → 529 files/4245 tests green;
`bunx vitest run --config vitest.storybook.mts src/features/lms/presentation/course-timeline`
→ 11/11 green.

## Implementation Plan

### 0. Reality check (code read before planning)

- `lesson-player/` today is a two-pane LESSON reader (breadcrumb + lazy lesson body left,
  flat `TimelineList` right) — no week grouping, no expand-detail, no ASSIGNMENT/DOCUMENT/EXAM
  affordance beyond a link-out. It does **not** match `CourseTimelinePage`'s vertical-timeline
  shape at all → this is a **rebuild behind the same route**, not a refactor. `lesson-player.derive.ts`
  keeps two useful pure fns (`toParagraphs`, the lazy-lesson-body fetch flow) — everything else
  (`toTimelineItems`, `pickInitialLessonId`, `.i-vm.ts`, `player-breadcrumb.tsx`, `timeline-list.tsx`)
  is superseded and deleted.
- `summarizeCourse()` (US-E24.2, `domain/use-cases/summarize-course.ts`) already computes
  `openCount = items.filter(state === "OPEN").length` — the header's "N mục đang mở" reuses this
  helper verbatim (no new counting logic).
- `components/shared/status-badge` (`StatusBadge`/`statusToneClass`) is tint+text only — **no dot**.
  Design's `CiStatusPill` is dot+text (a11y: colour never alone). Precedent for the dot exists
  inline in `course-card.tsx` (`<span className="size-[7px] rounded-full bg-edu-success-text" />`
  next to text). Decision: `item-state-pill.tsx` **wraps** `StatusBadge` (adds the dot span before
  `children`) — composition, not a competing badge component. Satisfies "dùng lại `status-badge`"
  in Dependencies while meeting the design contract.
- `courses.errors.*` (vi.json ~L1256) already carries `not-found`/`forbidden`/`network-error`/
  `unknown` — reused verbatim for the timeline-read error banner. `courses.player.*` (~L1216) is
  the namespace being replaced; **migrated, not left side-by-side**:
  - kept as-is (different concern, still used by lazy lesson-body fetch): `player.content.*`
    (empty/loading/loadError), `a11y.lessonChanged`, `a11y.activeLessonState`.
  - deleted (superseded by `timeline.*`): `player.breadcrumb.*`, `player.timeline.*`,
    `player.itemType.*`, `player.itemState.*`.
  - new namespace `courses.timeline.*` per AC; `itemType`/`itemState` labels move there (shared by
    `item-type-chip`/`item-state-pill`, so E24.4/E24.5 read the same keys — no duplicate catalogue).
- Route page + Server Action (`.../[courseId]/{page.tsx,actions.ts}`) keep their RSC shape
  (`requireRole` → `getCourse` → `notFound()`/error → `listItems` degrade); only the VM/derive
  imports and the rendered component swap from `lesson-player` to `course-timeline`.

### 1. Domain (pure, no framework)

**Files**
- `features/lms/domain/use-cases/group-items-by-week.ts`
- `features/lms/domain/use-cases/format-item-window.ts`
- `features/lms/domain/use-cases/__tests__/group-items-by-week.test.ts`
- `features/lms/domain/use-cases/__tests__/format-item-window.test.ts`

**`groupItemsByWeek(items: CourseItem[]): WeekGroup[]`**
```ts
interface WeekGroup { key: string /* "always" | ISO-week "2026-W17" */; weekStart: string | null; weekEnd: string | null; items: CourseItem[] }
```
- `key`: `startAt === null` → `"always"`, grouped first, label resolved in presentation as
  "Luôn mở" (i18n, not baked into the domain string). Otherwise ISO week of `startAt` (UTC-based,
  Mon-start) → `weekStart`/`weekEnd` as ISO date strings (ready for `Intl.DateTimeFormat` at the
  edge, not formatted here — domain stays presentation-agnostic per Clean Arch).
- Sort: `"always"` group first, then remaining groups ascending by `weekStart`. Within a group,
  items **already in BE order** (`position`) — the fn must NOT re-sort by any other field
  (mirrors `toTimelineItems`'s "BE order is the contract" rule); only groups them, stable sort.
- No `now` param — grouping is a pure function of `startAt` alone; `now` isn't needed for it
  (unlike `summarizeCourse`, which needs it to decide "still ahead").
- Test cases: (a) 3 distinct weeks + one `startAt=null` + one CLOSED with past week → "always"
  first, then weeks ascending, CLOSED item stays in its own week (state doesn't affect grouping);
  (b) empty items → `[]`; (c) items within same week keep `position` order regardless of
  `createdAt`; (d) `startAt` spanning a year boundary (Dec 29 / Jan 2) groups by ISO week correctly
  (not calendar week) — regression case for the ISO-week library/algorithm choice; (e) all items
  `startAt=null` → single "always" group, no other groups.

**`formatItemWindow(item: Pick<CourseItem,"startAt"|"dueAt">, formatter: (d: Date) => string): string`**
- Caller passes a pre-bound `Intl.DateTimeFormat`/next-intl `format.dateTime` formatter (keeps this
  fn framework-agnostic and testable with a fake formatter — mirrors `course-card.tsx`'s pattern of
  formatting at the presentation edge via `useFormatter`). Returns one of 4 **label keys**, not
  formatted text directly — actually: since this is domain (no i18n access), it returns a
  discriminated result the presentation composes with `t()`:
  ```ts
  type ItemWindow =
    | { kind: "range"; startText: string; dueText: string }
    | { kind: "from"; startText: string }
    | { kind: "due"; dueText: string }
    | { kind: "always" }
  ```
  Presentation does `t(\`timeline.window.${kind}\`, { start, due })`. This keeps `formatItemWindow`
  pure domain (no i18n import) while still centralizing the branch logic once (not re-implemented
  per row/chip caller across E24.3/E24.4/E24.10).
- Test cases: both dates → `range`; only `startAt` → `from`; only `dueAt` → `due`; neither →
  `always`; formatter is injected as a plain fn so the test doesn't need next-intl.

### 2. Presentation — shared chips/pills (promoted-on-day-1 per Design Notes)

**Files** (new folder `features/lms/presentation/shared/` — confirmed not yet existing; create it)
- `features/lms/presentation/shared/item-type-chip.tsx`
- `features/lms/presentation/shared/item-state-pill.tsx`
- `features/lms/presentation/shared/__tests__/item-type-chip.stories.tsx` /
  `item-state-pill.stories.tsx` (interaction: renders label + correct tone/icon per type/state)

- `ItemTypeChip({ itemType, className? })`: 32×32 radius-9 box, `bg-<tone>/16`, icon per
  `itemTypes` map in design-spec (`lesson→play/primary`, `assignment→clipboard/warning-text`,
  `exam→fileText/error-text`, `document→link/teal`). Tone comes from a local
  `ITEM_TYPE_TONE: Record<CourseItemType, CourseTone>` map (reuses `TONE_TEXT_ACCESSIBLE`/
  `TONE_TINT` from `../tone.ts` — no new tone system).
- `ItemStatePill({ state, examLocked?, className? })`: wraps `StatusBadge` (`tone` derived from
  state: `OPEN→success`, `UPCOMING_HIDDEN→info`, `CLOSED→muted`), prepends a `size-[7px]
  rounded-full` dot in the matching color (`aria-hidden`) before the label span, and — when
  `examLocked` — prefixes a `Lock` icon (`size-3`, `aria-hidden`) per D7's EXAM-only 🔒. Label text
  comes from `courses.timeline.itemState.*` (open/closed/upcoming) — the dot+lock are the ONLY
  non-text signal, text is always present (a11y rule kept).
- Placed here (not in `course-timeline/`) BECAUSE Design Notes flags reuse by E24.4 (cross-subject
  list) / E24.5 (player) / E24.10 (teacher mode) — decision 0026 "promote on day 1 when a 2nd
  consumer is already named", applied proactively since both consumers are already-slated US in
  this epic (not speculative).

### 3. Presentation — course-timeline feature tree (replaces lesson-player/)

**Files**
- `features/lms/presentation/course-timeline/course-timeline.tsx` (root, `'use client'`)
- `features/lms/presentation/course-timeline/course-header.tsx`
- `features/lms/presentation/course-timeline/week-section.tsx` (week label + hairline rule + rows)
- `features/lms/presentation/course-timeline/timeline-row.tsx` (rail dot + `CiRow` card)
- `features/lms/presentation/course-timeline/item-detail.tsx` (**TEMP** expand-inline, see §5)
- `features/lms/presentation/course-timeline/course-timeline.derive.ts` (VM mapping, reuses
  `groupItemsByWeek`/`formatItemWindow`/`summarizeCourse`)
- `features/lms/presentation/course-timeline/course-timeline.i-vm.ts`
- `features/lms/presentation/course-timeline/course-timeline.stories.tsx`
- `features/lms/presentation/course-timeline/__tests__/course-timeline.derive.test.ts`
- Deleted: `lesson-player/{lesson-player.tsx,lesson-player.derive.ts,lesson-player.i-vm.ts,
  player-breadcrumb.tsx,timeline-list.tsx}`. **Kept, moved into `course-timeline/`**:
  `text-content.tsx` (renders lesson body paragraphs — reused by `item-detail.tsx`'s LESSON
  branch, "Xem bài giảng" → inline body, matching current UX until E24.5 owns a real
  `/items/[itemId]` route) and its lazy-fetch pattern (`getLessonAction` binding stays in
  `actions.ts`, untouched).

**`CourseTimelineVm`** (mirrors `LessonPlayerVm` shape, extended for week grouping):
```ts
interface CourseTimelineVm {
  courseId: string; courseName: string; teacherName: string | null; tone: CourseTone;
  openCount: number; // from summarizeCourse
  weeks: WeekVm[]; // WeekGroup + resolved label pieces, no formatted text (i18n at render)
  errorKey: LmsFailure["type"] | null; // timeline-read error, course header still renders
  mode: "student"; // discriminated union below, see §6
}
```
- `course-timeline.tsx` composes `CourseHeader` + `errorKey` banner-with-retry + `weeks.map(WeekSection)`
  + `EmptyState` when `weeks.length === 0`.
- Retry: RSC cannot self-retry a failed Server Component read. `CourseTimeline` is itself the
  Client Component root (as `LessonPlayer` already is) — retry is a `useState` refetch: clicking
  "Thử lại" calls a **Server Action** `retryListItemsAction(courseId)` (new, thin wrapper around
  `makeListCourseItemsUseCase`, same shape as `getLessonAction`) via `useTransition`, replacing
  `weeks`/`errorKey` in local state on success. No TanStack Query needed here (matches
  `student-courses-screen.tsx`'s existing RSC+action pattern, no new client cache).
- `course-header.tsx`: icon box (tone), course name, teacher name, `"{openCount} mục đang mở"`
  dot+text (reuse the same dot pattern as `course-card.tsx`), legend = 3 `ItemStatePill`-style
  dot+label pairs (static, not full pills — just the 3-state key).
- `week-section.tsx` / `timeline-row.tsx`: rail is a single `aria-hidden` absolutely-positioned
  line + per-row dot (per a11y note: "rail is decorative → aria-hidden; item order via DOM order").
  Row is `<a>`-like: OPEN/CLOSED → `<button onClick={toggle expand}>` (not `<Link>`, since E24.5's
  real navigation doesn't exist yet — see §5); EXAM UPCOMING_HIDDEN → non-interactive `<div
  aria-disabled="true">` with `title=courses.timeline.opensAt` tooltip (native `title`, simplest
  a11y-compliant tooltip for a11y note "tooltip" — no new Radix Tooltip dependency unless reviewer
  asks).

### 4. Route wiring

**Files**
- `app/[locale]/t/[tenant]/(app)/student/courses/[courseId]/page.tsx` (edit: swap `LessonPlayer`
  import/derive for `CourseTimeline`/`course-timeline.derive`; `teacherName` needs a source check —
  `CourseResponseDto`/`Course` entity currently has no teacher field confirmed in US-E24.1; if
  absent, header omits teacher name this US and flags an [OPEN QUESTION] below rather than
  inventing data).
- `.../actions.ts` (edit: keep `getLessonAction` as-is; add `retryListItemsAction`).
- `.../page.test.ts`, `.../actions.test.ts` (edit expectations for the new VM shape).

### 5. TEMP expand-inline (explicitly marked for E24.5 removal)

- `item-detail.tsx` renders `CiItemDetail`-equivalent content inline under the clicked row (LESSON
  → `TextContent` body via `getLessonAction`; ASSIGNMENT/DOCUMENT/EXAM → static explainer text per
  design, since submit/deep-link flows are E24.5/E24.10 scope — this US only needs the row to
  *expand*, not to submit).
- Every file/block introduced for this MUST carry a comment:
  `// TEMP (US-E24.3): inline expand until US-E24.5 ships /items/[itemId] — remove this file and
  route CiRow clicks to a real href instead.` — placed at the top of `item-detail.tsx` and inline
  at the `onClick` in `timeline-row.tsx`, so `fe-tech-lead-reviewer`/E24.5's implementer can grep
  `TEMP (US-E24.3)` and find every site to delete.

### 6. `mode` prop typing

- Discriminated union, not optional param — matches how `LmsFailure`/`CourseItemState` are already
  modeled in this codebase (typed unions over string+optional-flag):
  ```ts
  export type CourseTimelineMode = "student" | "teacher" | "readonly";
  ```
  `course-timeline.tsx` takes `mode: CourseTimelineMode` and does:
  ```ts
  if (mode !== "student") throw new Error(`CourseTimeline: mode "${mode}" not implemented (US-E24.10)`);
  ```
  at the top of the component body — test: `course-timeline.derive.test.ts` (or a dedicated
  `course-timeline.test.tsx`) asserts render throws for `"teacher"`/`"readonly"`. Keeping the prop
  as a real union (not `mode?: "student"`) is deliberate: it documents the full contract E24.10
  will fill in, and TypeScript forces every future caller to pick one of the 3 explicitly.

### 7. i18n

`messages/{vi,en}.json` `courses.timeline.*` (new namespace, sibling to `courses.player.*`):
```
timeline.legend.{open,upcoming,closed}
timeline.alwaysOpen        // "Luôn mở" group label
timeline.weekLabel         // "Tuần {start} – {end}" (+ weekLabelNumbered when BE ships week# — not this US)
timeline.window.{range,from,due,always}  // "{start} → {due}" | "Mở từ {start}" | "Hạn {due}" | "Luôn mở"
timeline.opensAt           // "Nội dung sẽ mở lúc {date}."
timeline.closedReadOnly    // "Đã đóng — chỉ xem"
timeline.empty             // "Giáo học chưa thêm nội dung cho khoá học này." (reuse EmptyState pattern)
timeline.itemType.{lesson,assignment,document,exam}   // moved from player.itemType.*
timeline.itemState.{open,closed,upcoming}              // moved from player.itemState.*
timeline.retry             // "Thử lại"
timeline.header.openCount  // "{count} mục đang mở"
```
- Delete `player.breadcrumb.*`, `player.timeline.*`, `player.itemType.*`, `player.itemState.*` from
  both files in the same commit (no dangling dead keys, no side-by-side duplicate catalogue).
- Keep `player.content.*`, `a11y.lessonChanged`, `a11y.activeLessonState` (still used by the
  lazy-lesson-body fetch inside `item-detail.tsx`).
  > **Corrected in the fix round** (xem §Evidence): chỉ `player.content.{loading,loadError}`
  > thực sự còn consumer. `player.content.empty.*`, `a11y.lessonChanged`,
  > `a11y.activeLessonState`, `timeline.closedReadOnly` (trùng `timeline.itemDetail.closedNote`)
  > và `timeline.navLabel` đã bị xoá khỏi cả `vi.json` + `en.json`.

### 8. Test plan → Validation table

| Layer | File | Asserts |
| --- | --- | --- |
| Unit | `group-items-by-week.test.ts` | 5 cases in §1 |
| Unit | `format-item-window.test.ts` | 4 branch cases in §1 |
| Unit | `course-timeline.derive.test.ts` | entity→VM mapping incl. `openCount` via `summarizeCourse`, `errorKey` passthrough |
| Unit | `course-timeline` mode-guard test | throws for teacher/readonly |
| Integration | `page.test.ts` | RSC: notFound on course not-found/403; timeline-error degrade keeps header; both reads composed |
| Integration | `actions.test.ts` | `retryListItemsAction` role-gate + success/failure shape |
| E2E/Story | `course-timeline.stories.tsx` | states: `three-weeks`, `with-upcoming-exam`, `all-closed`, `empty`, `error`, `loading`; interaction: click OPEN row expands, EXAM upcoming row not clickable (assert no navigation/expand), tab order |
| E2E/Story | `item-type-chip.stories.tsx` / `item-state-pill.stories.tsx` | one story per enum value |
| Platform | — | `tsc --noEmit`, `vitest run`, `bun build` |
| Release | — | design-review gate + a11y audit (contrast on dot colors, `aria-disabled` semantics, tooltip reachability) |

## Component/state assessment

- **`fe-component-architect`: recommended.** This is not a single-component addition — it's (a) a
  full presentation-tree replacement (5 files under `course-timeline/`) plus (b) two components
  explicitly promoted to `presentation/shared/` on day 1 because 2+ future consumers are already
  named in this same epic (E24.4, E24.5, E24.10). Getting `ItemTypeChip`/`ItemStatePill`'s prop
  contract right now avoids a rework when E24.4/E24.5 land. Architect should confirm the VM/prop
  contracts in §2–§3 before `fe-nextjs-engineer` starts, particularly the `mode` union (§6) since
  E24.10 depends on it verbatim.
- **`fe-state-engineer`: not needed.** No global/query state — the page stays RSC-composed reads
  (`getCourse` + `listItems`) exactly like US-E24.1/E24.2; the only "state" is local `useTransition`
  retry (component-local, no TanStack Query key, no cross-component cache). If E24.10 later adds
  teacher drag-reorder (`PUT items/order`) that WILL need `fe-state-engineer` — flagged for that US,
  not this one.

## Risks / open questions

- **[OPEN QUESTION]** Does `Course` entity carry a teacher name field? Not confirmed present on
  `CourseResponseDto`/`course.entity.ts` from US-E24.1 read. If absent, header drops "teacher" from
  the meta line this US (no invented data) — flag to `fe-lead`/BE-ask list if design expects it.
  Should be resolved before `fe-component-architect` finalizes `CourseHeaderProps`.
- **[OPEN QUESTION]** Week label "Tuần 30 · dd/MM" needs an academic-week number BE does not expose
  yet (epic ask #5, no reply). This US ships the fallback ("Tuần dd/MM – dd/MM") only —
  `timeline.weekLabelNumbered` key can be added later without a migration (additive).
- Native `title` attribute for the EXAM-upcoming tooltip is the cheapest AA-compliant option (no
  new dependency) but is not touch-reachable; flag to `fe-accessibility-auditor` — may need to
  become a focus-visible `aria-describedby` inline text instead if the auditor rejects `title`.
- The TEMP expand-inline (§5) duplicates layout effort that gets deleted at E24.5 — accepted
  tradeoff per Dependencies ("Blocks: US-E24.5"), scoped narrowly (no submit/exam-launch logic,
  just read-only content display) to minimize throwaway work.
- ISO-week computation: no existing date-utility import found in `features/lms/`; plan uses a
  small inline ISO-8601 week algorithm in `group-items-by-week.ts` (no new npm dependency) —
  confirm with reviewer this doesn't duplicate a project-wide date util elsewhere in `shared/`.

## Component Architecture

### 0. Confirmations before contracts (per architect task)

- **Date util grep (re-checked):** no `date-fns`/`dayjs` in `package.json` dependencies; no
  `shared/date*` or `shared/iso-week*` util exists in the repo. Planner's call stands — write the
  ISO-week algorithm inline in `group-items-by-week.ts` (domain, pure, no new dependency). Flag to
  `fe-tech-lead-reviewer` as a one-time decision, not a pattern to repeat without checking again.
- **`ItemTypeChip` tone map — reuse confirmed, no parallel table.** `tone.ts` already exports
  `TONE_TEXT_ACCESSIBLE`/`TONE_TINT` keyed by `CourseTone` (`primary|success|warning|purple|teal|error`).
  `ItemTypeChip` does NOT invent a new color system — it defines only the **item-type → CourseTone**
  mapping (the missing piece) and resolves classes through the existing maps:
  ```ts
  const ITEM_TYPE_TONE: Record<CourseItemType, CourseTone> = {
    LESSON: "primary", ASSIGNMENT: "warning", EXAM: "error", DOCUMENT: "teal",
  };
  const ITEM_TYPE_ICON: Record<CourseItemType, LucideIcon> = {
    LESSON: Play, ASSIGNMENT: Clipboard, EXAM: FileText, DOCUMENT: Link,
  };
  ```
  This matches the AC's icon/color list verbatim (lesson=play/primary, assignment=clipboard/
  warning-text, exam=fileText/error-text, document=link/teal).
- **`ItemStatePill` — composition over `StatusBadge`, confirmed no fork.** `StatusBadge` (read above)
  is `Badge` + `statusToneClass(tone)`, tint+text only, no dot slot, `children: ReactNode` (so a
  leading `<span>` sibling before the text is a valid children composition — no prop needed on
  `StatusBadge` itself, nothing to modify there). `ItemStatePill` renders `<StatusBadge tone={...}><Dot
  />{label}</StatusBadge>`, i.e. `Dot` is JSX composed INTO `children`, not a new component in `ui/`.
  No change to `components/shared/status-badge/status-badge.tsx` — it stays the single canonical
  tint+text badge; the dot is `item-state-pill`'s own concern.
- **Promote destination — `features/lms/presentation/shared/`, not `components/shared/`.**
  Both chips are LMS-domain-specific: `ItemTypeChip` only makes sense for `CourseItemType`
  (`LESSON|ASSIGNMENT|EXAM|DOCUMENT`), a type that lives in `features/lms/domain/entities`;
  `ItemStatePill` only makes sense for `CourseItemState`. Neither is a generic cross-feature
  pattern like `StatCard`/`Badge`/`ProgressBar` (component-organization.md's `components/shared/`
  tier is for those). Decision-`0026` tier-2 ("composed, reused by ≥2 screens") is satisfied at
  the **feature** level, not the **app** level — E24.4/E24.5/E24.10 are all `features/lms/*`
  screens, none outside LMS. `features/lms/presentation/shared/` is a new, narrower tier this repo
  doesn't have a name for yet in the rule doc; it is the correct home by the rule's own logic
  (one canonical place, promoted not copied, scoped to the actual consumer set) — flag to `fe-lead`
  as a *documentation* note only (not a new token/ADR): component-organization.md's table could grow
  a `feature-shared` row (`features/<x>/presentation/shared/<name>/` — composed, reused by ≥2
  screens **within one feature**) to make this precedent explicit for future features. No code
  decision is blocked on this — proceed with `features/lms/presentation/shared/`.

### 1. Component tree

```
app/[locale]/t/[tenant]/(app)/student/courses/[courseId]/page.tsx        RSC (container)
└─ CourseTimeline                                                        'use client' (container — owns retry state)
   ├─ CourseHeader                                                       presentational
   ├─ [banner] "timeline lỗi, thử lại"                                  presentational (inline in course-timeline.tsx)
   ├─ EmptyState (existing shared component — reuse, do not refork)      presentational
   └─ WeekSection[]  (one per WeekVm)                                    presentational
      └─ TimelineRow[]  (one per item in the week)                       presentational, controlled
         ├─ ItemTypeChip            features/lms/presentation/shared/    presentational
         ├─ ItemStatePill           features/lms/presentation/shared/    presentational
         └─ ItemDetail (TEMP, conditional on expanded row)                container (calls getLessonAction)
            └─ TextContent (moved from lesson-player/, unchanged)        presentational
```

- **RSC container** (`page.tsx`): calls `getCourse` + `listItems` in parallel (`Promise.allSettled`
  or equivalent — matches existing E24.1 degrade contract), maps entities → `CourseTimelineVm` via
  `course-timeline.derive.ts`, renders `<CourseTimeline vm={vm} mode="student" actions={{ getLesson,
  retryListItems }} />`. Never imports `infrastructure/`/`bootstrap/di/` into `course-timeline.tsx`
  itself — only `page.tsx`/`actions.ts` touch DI.
- **`CourseTimeline`** is the ONE client/container component in the tree (mirrors `LessonPlayer`'s
  existing shape) — it owns the `mode` guard (§6), the retry `useTransition` state, and the
  expanded-row-id state (which row's `ItemDetail` is open). Every other component below it is
  **presentational**: props in, `onXxx` callbacks out, no `useState` beyond pure UI toggles that
  don't need to survive re-render of the parent (none needed — expansion state lives in
  `CourseTimeline` because a click on `TimelineRow` must close a previously-open row elsewhere in
  the list, i.e. it's shared state across siblings).
- **`WeekSection`** and **`TimelineRow`** are pure presentational — no server actions, no state;
  `TimelineRow` reports `onToggleExpand(itemId)` upward, `CourseTimeline` decides which one is open.
- **`ItemDetail`** is technically a mini-container (it calls `actions.getLesson` for the LESSON
  branch) but is scoped/TEMP — treat it as a leaf owned by `CourseTimeline`, deleted whole by E24.5.

### 2. `.i-vm.ts` — `course-timeline.i-vm.ts`

```ts
import type { CourseItemState, CourseItemType } from "@/features/lms/domain/entities/course-item.entity";
import type { LmsFailure } from "@/features/lms/domain/failures/lms.failure";
import type { CourseTone } from "../tone";

export type CourseTimelineMode = "student" | "teacher" | "readonly";

/** One rendered row — entity fields narrowed/renamed to what the row draws. */
export interface TimelineItemVm {
  id: string;
  itemType: CourseItemType;
  title: string;
  state: CourseItemState;
  /** Pre-resolved by `formatItemWindow` — presentation only interpolates via t(). */
  window: ItemWindowVm;
  /** EXAM + UPCOMING_HIDDEN only — drives the 🔒 + aria-disabled + tooltip. */
  examLocked: boolean;
  /** EXAM only, ISO — interpolated into `timeline.opensAt` tooltip text; null otherwise. */
  opensAt: string | null;
}

export type ItemWindowVm =
  | { kind: "range"; startText: string; dueText: string }
  | { kind: "from"; startText: string }
  | { kind: "due"; dueText: string }
  | { kind: "always" };

export interface WeekVm {
  key: string; // "always" | "2026-W17"
  /** null for the "always" group. */
  weekStart: string | null;
  weekEnd: string | null;
  items: TimelineItemVm[];
}

export interface CourseTimelineVm {
  courseId: string;
  courseName: string;
  /** [OPEN QUESTION] null until Course entity confirms a teacher field (see Risks). */
  teacherName: string | null;
  tone: CourseTone;
  /** From `summarizeCourse()` — count of items with state === "OPEN". */
  openCount: number;
  weeks: WeekVm[];
  /** Timeline-read failure only; when set, `weeks` is `[]` and header still renders. */
  errorKey: LmsFailure["type"] | null;
  mode: CourseTimelineMode;
}

/** Server Action refs — passed as props, never imported directly by presentation. */
export interface CourseTimelineActions {
  getLesson: (lessonId: string) => Promise<GetLessonResult>;
  retryListItems: (courseId: string) => Promise<RetryListItemsResult>;
}

export type GetLessonResult =
  | { ok: true; data: { id: string; title: string; content: string } }
  | { ok: false; errorKey: LmsFailure["type"] };

export type RetryListItemsResult =
  | { ok: true; data: { weeks: WeekVm[]; openCount: number } }
  | { ok: false; errorKey: LmsFailure["type"] };
```

### 3. Prop interfaces per component

**`course-timeline.tsx`** (container, `'use client'`)
```ts
export interface CourseTimelineProps {
  vm: CourseTimelineVm;
  actions: CourseTimelineActions;
}
```
Internal state: `expandedItemId: string | null` (which row is expanded — TEMP, §5); `weeks`/
`openCount`/`errorKey` mirrored into local `useState` seeded from `vm`, replaced on successful
retry (via `useTransition`). Guards `mode !== "student"` → throw (see §6) before any render.

**`course-header.tsx`** (presentational)
```ts
export interface CourseHeaderProps {
  courseName: string;
  teacherName: string | null;
  tone: CourseTone;
  openCount: number;
}
```
Renders icon box (tone), name, teacher line (omit row when `teacherName === null` — no invented
data), `"{openCount} mục đang mở"` via `t("timeline.header.openCount", { count: openCount })`,
and the static 3-item legend (`ItemStatePill`-style dot+label using `timeline.legend.*`, not real
`ItemStatePill` instances — legend has no `state` payload, just 3 fixed dot colors).

**`week-section.tsx`** (presentational)
```ts
export interface WeekSectionProps {
  week: WeekVm;
  expandedItemId: string | null;
  onToggleExpand: (itemId: string) => void;
  actions: Pick<CourseTimelineActions, "getLesson">;
}
```
Resolves the week label text (`t("timeline.alwaysOpen")` when `week.key === "always"`, else
`t("timeline.weekLabel", { start, due })` with dates pre-formatted via `useFormatter` at this
level — keeps `TimelineRow` free of i18n date formatting concerns), renders the hairline rule +
`week.items.map(TimelineRow)`.

**`timeline-row.tsx`** (presentational, controlled)
```ts
export interface TimelineRowProps {
  item: TimelineItemVm;
  expanded: boolean;
  onToggleExpand: (itemId: string) => void;
  getLesson: CourseTimelineActions["getLesson"];
}
```
- Rail dot color resolved from `item.state` (`OPEN → bg-edu-success-text`, `UPCOMING_HIDDEN →
  bg-edu-info`, `CLOSED → bg-border`) — a **local** `STATE_DOT` map in this file (3 fixed classes,
  not worth extracting — if a 3rd consumer needs the exact same dot-color-by-state mapping, promote
  it into `item-state-pill.tsx` as an exported const at that time, not preemptively).
- `item.examLocked === true` → renders a non-interactive `<div role="group" aria-disabled="true"
  title={t("timeline.opensAt", { date: item.opensAt })}>` — no `onClick`, no `tabIndex`.
- Otherwise → `<button type="button" aria-expanded={expanded} onClick={() =>
  onToggleExpand(item.id)}>` (button, not `<a>`/`<Link>`, since target is an inline expand not real
  navigation until E24.5 — comment cites `TEMP (US-E24.3)` per §5).
- Renders `<ItemTypeChip itemType={item.itemType} />`, title (`text-muted-foreground` when
  `item.state === "CLOSED"`, `text-foreground` otherwise), `t(\`timeline.window.${item.window.kind}\`,
  item.window)` line, `<ItemStatePill state={item.state} examLocked={item.examLocked} />`.
- Conditionally renders `<ItemDetail item={item} getLesson={getLesson} />` directly below itself
  when `expanded`.

**`item-detail.tsx`** (TEMP, mini-container)
```ts
// TEMP (US-E24.3): inline expand until US-E24.5 ships /items/[itemId] — remove this file and
// route TimelineRow clicks to a real href instead.
export interface ItemDetailProps {
  item: Pick<TimelineItemVm, "id" | "itemType" | "title">;
  getLesson: CourseTimelineActions["getLesson"];
}
```
LESSON branch: calls `getLesson(item.id)` on mount (lazy fetch, mirrors current `lesson-player`
pattern), renders `<TextContent paragraphs={toParagraphs(content)} />` on success, existing
`player.content.*` loading/error/empty keys. ASSIGNMENT/DOCUMENT/EXAM branches: static explainer
text per design (`timeline.itemDetail.*` — TEMP-only keys, deleted alongside this file at E24.5,
so scope them under a clearly-named sub-namespace the E24.5 implementer can grep and drop).

**`features/lms/presentation/shared/item-type-chip.tsx`**
```ts
export interface ItemTypeChipProps {
  itemType: CourseItemType;
  className?: string;
}
```
32×32 `rounded-[9px]` box, `bg-{TONE_TINT[ITEM_TYPE_TONE[itemType]]}`, icon
`TONE_TEXT_ACCESSIBLE[ITEM_TYPE_TONE[itemType]]` colored, `aria-hidden` (decorative — the type is
also conveyed by the row's title/window text, so the chip icon alone is never the only signal).

**`features/lms/presentation/shared/item-state-pill.tsx`**
```ts
export interface ItemStatePillProps {
  state: CourseItemState;
  /** true only reachable when itemType === "EXAM" && state === "UPCOMING_HIDDEN" (D7). */
  examLocked?: boolean;
  className?: string;
}
```
`STATE_TONE: Record<CourseItemState, StatusTone> = { OPEN: "success", UPCOMING_HIDDEN: "info",
CLOSED: "muted" }`; renders `<StatusBadge tone={STATE_TONE[state]}><Dot state={state} />{examLocked
&& <Lock aria-hidden className="size-3" />}{t(\`timeline.itemState.${stateKey}\`)}</StatusBadge>`
where `stateKey` maps `UPCOMING_HIDDEN → "upcoming"` (matches i18n key list in Implementation Plan
§7). Dot is an inline `<span aria-hidden className={cn("size-[7px] rounded-full", DOT_CLASS[state])}
/>` — colour is decoration, the pill's text is always the real signal (a11y rule kept, per Design
Notes tokens: OPEN `bg-edu-success-text`, UPCOMING `bg-edu-info`, CLOSED `bg-border`).

### 4. State ownership (contract level — handoff to `fe-state-engineer` N/A per planner, noted for completeness)

- **Controlled/prop-only**: `CourseHeader`, `WeekSection`, `TimelineRow`, `ItemTypeChip`,
  `ItemStatePill` — zero internal state, pure render of props + callback emission.
- **Container-local `useState`/`useTransition`** (lives only in `CourseTimeline`):
  `expandedItemId`, `weeks`/`openCount`/`errorKey` (retry-replaceable copy of the VM's initial
  values), `isRetrying` (from `useTransition`). No TanStack Query, no global store — matches
  planner's assessment that `fe-state-engineer` isn't needed for this US.
- **Server Action refs** (`CourseTimelineActions`): passed down as props from `page.tsx` through
  `CourseTimeline` → `WeekSection`/`TimelineRow`/`ItemDetail`; never imported directly by any
  presentational component (keeps the layer boundary — presentation never touches
  `infrastructure/`/`bootstrap/di/`, only receives already-bound Server Action functions).

### 5. Composition & variant strategy

- `ItemStatePill` is a **composition** over `StatusBadge` (children slot), not a `cva` variant of
  `Badge`/`StatusBadge` — the dot is orthogonal to tone and only needed by this one call site
  family; no change to the `ui/`-tier `Badge` primitive.
- `ItemTypeChip`/`ItemStatePill` accept `className?` (merged via `cn()`) as the sole extension
  point — no `asChild`/`Slot` needed (neither wraps a foreign interactive element).
- `WeekSection`/`TimelineRow` have no variants — a single shape per Design Notes; `mode` branching
  lives ONLY at the `CourseTimeline` root (§6), not threaded through every child, since `teacher`/
  `readonly` throw before any child renders in this US.
- No premature abstraction: the rail-dot color map (`STATE_DOT` in `timeline-row.tsx`) and the
  pill's own `DOT_CLASS` are two small parallel 3-entry maps for now (row rail vs. pill dot are
  visually separate elements per design) — **do not** unify them into one shared export until a
  3rd consumer needs the exact same mapping (per component-organization.md, extract on 3rd use).

### 6. Accessibility contract

- `TimelineRow` (interactive, non-locked): `<button type="button" aria-expanded={expanded}>` —
  keyboard-operable natively (Enter/Space), focus ring via existing `Button`/native focus styles;
  `aria-expanded` announces open/closed state to AT.
- `TimelineRow` (EXAM `examLocked`): `<div role="group" aria-disabled="true" title="...">` — not
  in tab order (no `tabIndex`), so it's correctly *unreachable* by keyboard (matches "không click");
  flagged `[OPEN QUESTION]` per Implementation Plan §3 — `title` alone isn't touch-reachable, `fe-
  accessibility-auditor` may require an inline `<span id="opens-at-{id}">` + `aria-describedby` on
  a focusable-but-disabled wrapper instead. Architect defers the final call to the auditor but
  specifies the prop needed either way: `item.opensAt` (ISO string) is already on the VM.
- `ItemTypeChip`: `aria-hidden="true"` (decorative; type is redundantly conveyed by row text).
- `ItemStatePill`: text label always rendered (`t("timeline.itemState...")`) — dot and lock icon
  are `aria-hidden`; colour is never the only signal (WCAG 1.4.1).
- `CourseHeader` legend dots: same rule — each legend entry is `dot (aria-hidden) + text label`.
- Retry banner button: standard `<Button>` with visible text "Thử lại" (`timeline.retry`), not
  icon-only — no extra `aria-label` needed.
- Empty state: reuse existing shared `EmptyState` component's established a11y contract (heading +
  body text, no image without alt) — do not hand-roll a new empty block.

