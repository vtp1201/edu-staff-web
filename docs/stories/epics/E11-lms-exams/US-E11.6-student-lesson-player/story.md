# US-E11.6 Student Lesson Player (Course Viewer with Chapter Navigation)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E11.2 (Lesson Bank — teacher uploads lessons; student player consumes same content)
- Depends on (soft): US-E12.3 (subject catalogue — subject names for course header)
- Blocks: none
- Feature module(s) cham: `src/features/lms/` (new feature; or `src/features/courses/` — to be decided by fe-component-architect)
- Shared contract/file: `bootstrap/endpoint/lms.endpoint.ts` (new or extends lesson-bank endpoint); lesson entity (may share with E11.2 LessonBank)

## Product Contract

Hoc sinh xem khoa hoc va hoc bai giang theo luong: Courses list -> Lesson Player.

**`StudentCourses` screen (`/student/courses`):**
- 3 tabs: "Tat ca" / "Dang hoc" / "Hoan thanh" (filter theo `status` cua student enrollment).
- Grid 3 cot (responsive -> 1 cot mobile): course card moi co thumbnail placeholder, tieu de mon hoc, giao vien, so bai, tiep tuc / bat dau CTA, progress bar (so bai hoan thanh / tong so bai).
- Hover: card lift animation (motion-safe).
- Empty state tung tab.

**`LessonPlayer` screen (`/student/courses/[courseId]` hoac `/student/lessons/[lessonId]`):**
- Layout 2-cot:
  - Left pane (60%): content area + Notes/Q&A tabs bên duoi.
  - Right pane (40%): progress card tren cung (so bai hoan thanh / tong) + collapsible chapter list.
- **Chapter list (right pane):**
  - Nhom bai theo chapter (co the collapse/expand).
  - Moi bai: icon type (video / pdf / text), ten bai, trang thai (done checkmark / active highlight / upcoming).
  - Active lesson co highlight (primary tint).
  - Click bai -> load bai do vao content pane; chuyen active state.
- **Content pane — 3 loai bai:**
  - `video`: video player voi faux chrome (play/pause, seek bar, thoi luong, nut fullscreen placeholder). Progress bar ben duoi.
  - `pdf`: iframe / embed khu vuc xem truoc + nut "Tai xuong PDF" (icon `paperclip`).
  - `text`: scroll-area voi content text / HTML.
- **Notes tab:** textarea nhap ghi chu ca nhan (local / mock-first — luu per lessonId); nut "Luu ghi chu".
- **Q&A tab:** danh sach cau hoi + tra loi (mock-first); text input gui cau hoi moi.
- **Progress tracking:** khi hoc sinh di chuyen qua bai -> bai chuyen trang thai `done` (optimistic update); progress card + progress bar trong course list cap nhat.
- **Mark complete:** nut "Danh dau hoan thanh" tren content pane; dis khi da hoan thanh.

**RBAC:** Chi student.
Mock-first: `lms` service chua ship (decision 0014). Dung `COURSE_LESSONS` mock tu `student.jsx`.

## Relevant Product Docs

- `design_src/edu/student.jsx` — `StudentCourses` (lines ~1-120), `LessonPlayer` (lines ~125-320), `LessonBody` video/pdf/text (lines ~325-440), `COURSES` + `COURSE_LESSONS` mock data (chapter/lesson hierarchy, done/active states)
- `docs/product/screens.md` — Student section "Courses + lesson player" row (currently ⬜ E11)
- `docs/stories/epics/E11-lms-exams/US-E11.2-lesson-bank/story.md` — lesson entity shape (teacher side); may share lesson types

## Acceptance Criteria

- AC-1 (courses list loading): Skeleton khi load danh sach khoa hoc.
- AC-2 (courses list tabs): 3 tabs (Tat ca / Dang hoc / Hoan thanh) loc dung theo enrollment status; empty state cho tung tab.
- AC-3 (courses list card): Moi card hien thumbnail, tieu de, giao vien, progress bar (so bai hoan thanh/tong), CTA phu hop voi trang thai ("Tiep tuc" / "Bat dau").
- AC-4 (courses list hover): Card lift animation (box-shadow tang) khi hover; motion-safe (skip animation khi reduced-motion).
- AC-5 (lesson player load): Content pane render dung loai bai (video/pdf/text) khi click bai trong chapter list.
- AC-6 (chapter list navigation): Click bai bat ky trong chapter list -> content pane load bai do; bai do duoc highlight la active; bai truoc mat highlight.
- AC-7 (chapter collapse): Click chapter header -> collapse/expand danh sach bai trong chapter; trang thai duoc giu khi navigate bai khac.
- AC-8 (video — controls): Video player hien play/pause, seek bar, thoi luong; thao tac keyboard duoc (Space = play/pause, Left/Right arrow = seek).
- AC-9 (pdf — download): PDF pane hien khu vuc xem truoc + nut "Tai xuong" kich hoat download; nut co accessible label.
- AC-10 (text — scroll): Text bai hien vua trang, scroll doc; khong tran ra ngoai container.
- AC-11 (mark complete): Click "Danh dau hoan thanh" -> lesson chuyen sang trang thai `done` (optimistic); nut doi sang disabled; progress card cap nhat.
- AC-12 (notes tab): Click tab "Ghi chu" -> textarea hien; nhan "Luu" -> luu (mock-first); ghi chu con lai khi quay lai bai (mock persistence per lessonId).
- AC-13 (q&a tab): Click tab "Q&A" -> danh sach cau hoi hien (mock); gui cau hoi moi -> xuat hien dau danh sach (optimistic mock).
- AC-14 (a11y): Video player controls keyboard-accessible; chapter list la `<nav>` hoac `role="navigation"` voi label; lesson items co accessible state (aria-current="page" cho active); tabs dung Radix Tabs or equivalent ARIA pattern; motion-safe hover.
- AC-15 (responsive): Tren mobile (< 768px): right pane chapter list chuyen xuong duoi hoac an (accordion toggle); content pane chiem full width.
- AC-16 (i18n): Tat ca strings qua namespace `courses`.

## Design Notes

- Commands: `markLessonComplete` (mock: `PUT /lms/api/v1/lessons/:id/complete`); `saveNote` (mock local)
- Queries: `getCourses` (filter: all/in-progress/completed); `getCourseLessons` (course id -> chapters + lessons + progress state)
- API (mock-first — lms service planned):
  - `GET /lms/api/v1/courses?status=` — student's enrolled courses
  - `GET /lms/api/v1/courses/:id/lessons` — chapter/lesson hierarchy + student progress
  - `PUT /lms/api/v1/lessons/:id/complete` — mark lesson done
- Tables: none
- Domain rules: progress = (done lessons / total lessons); `courseStatus`: in-progress if 0 < done < total; completed if done === total; not-started if done === 0
- UI surfaces:
  - `src/features/lms/presentation/student-courses/StudentCoursesScreen.tsx` — tab view + grid
  - `src/features/lms/presentation/lesson-player/LessonPlayer.tsx` — 2-col layout
  - `src/features/lms/presentation/lesson-player/LessonBody.tsx` — video/pdf/text switch
  - `src/features/lms/presentation/lesson-player/ChapterList.tsx` — collapsible chapter nav
  - `src/features/lms/domain/` — CourseEntity, LessonEntity (type: video|pdf|text), progress rules
- Routes: `/student/courses` (list); `/student/courses/[courseId]` (player) — confirmed by fe-lead, matches `student/exams` + `student/exams/[examId]` precedent

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `getCourseProgressUseCase` (progress calc: 0/partial/complete states); `markLessonCompleteUseCase` (ok/not-found/already-complete); lesson type switch logic |
| Integration | `courses.mapper` (lesson hierarchy + done state); `MockCoursesRepository` (COURSE_LESSONS seed) |
| E2E | Storybook: CoursesGrid_Loading / CoursesGrid_AllTab / CoursesGrid_InProgressTab / CoursesGrid_Empty; LessonPlayer_Video / LessonPlayer_Pdf / LessonPlayer_Text / ChapterList_Navigation / MarkComplete_Flow / Notes_Save / QA_Ask; play() assertions |
| Platform | bun build green; tsc --noEmit 0 errors; biome clean |
| Release | design-review gate PASS |

## Harness Delta

- `docs/product/screens.md`: update Student "Courses + lesson player" row from ⬜ to US-E11.6
- `docs/TEST_MATRIX.md`: add row US-E11.6 as `planned`

## Evidence

- Design review: pass — see `design-review.md` in this packet (APPROVED, after 1 fix
  round on tech-lead + a11y findings).
- Tests: 1237/1237 vitest pass (232 files); 15/15 Storybook interaction stories
  (`src/features/lms/**/*.stories.tsx`) with `play()` assertions; `tsc --noEmit`
  0 errors; `bun run build` green (routes `/student/courses` +
  `/student/courses/[courseId]` in manifest); biome clean.
- RBAC: `requireRole(["student"])` enforced on both RSC pages (read paths) and all
  5 Server Actions (`markLessonCompleteAction`, `saveNoteAction`, `askQuestionAction`,
  `getNoteAction`, `listQuestionsAction`) — covered by `actions.test.ts` (rejection +
  happy-path cases).
- AC traceability: all 16 AC + RBAC + empty-content fallback covered (100%),
  verified by `fe-qa-playwright` (Go/No-Go: PASS). 4 gaps found during QA
  (AC-7 collapse-persist, AC-8 keyboard controls, AC-15 mobile toggle, empty-course
  fallback) were closed with new Storybook interaction tests, no production code
  changes needed.
- New design token: ADR `0050` (`--edu-media-surface` / `--edu-media-surface-foreground`)
  for the video faux-chrome, consumed via Tailwind classes only (no raw hex).
- Mock-first: `lms` BE service not shipped (decision `0014`); `MockLmsRepository`
  seeded from `design_src/edu/student.jsx`'s `COURSES`/`COURSE_LESSONS`; real
  `LmsRepository` written to the documented (not-yet-live) contract, follow-up
  noted to map `ApiError.code` fully once the service ships.
- Harness: `docs/product/screens.md` line 91 updated; `docs/TEST_MATRIX.md` row
  updated to `implemented` with truthful unit/integration/e2e/platform flags.
