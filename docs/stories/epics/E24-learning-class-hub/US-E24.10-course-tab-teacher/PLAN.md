# US-E24.10 Implementation Plan — Course tab (teacher): drag-reorder timeline,
# inline date edit, add item; GVCN read-only

Owner: fe-planner. No code written here. Lane **high-risk** — 7 mutation
surfaces on `lms` (`reorderItems` full-order PUT, `patchItem` window PATCH,
`createLesson`/`createAssignment`/`addDocumentItem` POST, `publishCourse`
POST, `deleteItem` DELETE) + a client-side subject-ownership gate the BE does
not itself enforce yet (ask #7).

## 0. Ground-truth corrections vs the packet (code + BE read before planning)

1. **`ILmsRepository`/`LmsRepository`/`MockLmsRepository` already implement 5
   of the 7 mutations** (US-E24.1): `createLesson`, `createAssignment`,
   `addDocumentItem`, `patchItem`, `reorderItems` all exist, are wired to the
   real endpoints, and have mock behavior matching the real failure codes.
   **Missing on the port**: `publishCourse(courseId): Promise<Course>` and
   `deleteItem(courseId, itemId): Promise<void>`. `LMS_EP.publishCourse` is
   already defined (unused); `LMS_EP.item(courseId, itemId)` already exists
   for PATCH and is reused for DELETE (ground-truthed
   `edu-api/services/lms/docs/openapi.yaml` — `POST .../publish` 200/409 on a
   second call, `DELETE .../items/{itemId}` 204, `409 LMS_ITEM_NOT_DOCUMENT`
   for a non-DOCUMENT delete, `404 LMS_ITEM_NOT_FOUND` on a repeat delete).
   Both failure codes already exist in `LmsFailure` (`not-document`,
   `not-found`) — **no new failure member needed**.
2. **Zero domain use-cases exist for any of the 7 mutations** — only the
   repository methods do. Every one of `ReorderItemsUseCase`,
   `PatchItemUseCase`, `CreateLessonUseCase`, `CreateAssignmentUseCase`,
   `AddDocumentItemUseCase`, `PublishCourseUseCase`, `DeleteItemUseCase` is a
   new file. None of the `makeXUseCase` DI factories exist either.
3. **`course-timeline/` is fully built for `mode: "student"` and already
   merged** (US-E24.3 shipped, US-E24.5 landed on top of it and deleted the
   TEMP expand-inline — `TimelineRow` today renders a real `<Link>`, no
   `item-detail.tsx` remains). `CourseTimeline` currently does:
   ```ts
   if (vm.mode !== "student") throw new Error(`... not implemented yet (US-E24.10)`);
   ```
   This US replaces that throw with real `teacher`/`readonly` branches — it
   does **not** touch the `student` branch's markup (regression risk is real:
   `CourseHeader`/`WeekSection`/`TimelineRow` are shared files edited in
   place).
4. **Subject-ownership check has no BE enforcement today** (design-spec
   `courseTab.deviation`, epic ask #7 unanswered): a GVCN who is not the
   subject's GVBM can currently call every mutation endpoint successfully if
   they have an active teaching assignment on the course — BE's real gate is
   `LMS_COURSE_TEACHER_NOT_ASSIGNED` (course-level), not a GVCN-vs-GVBM
   distinction. The `mode="readonly"` UI hiding is therefore a **client-side
   convenience**, and the packet's "authCtx" requirement is a defense-in-depth
   layer on top of BE's real (but coarser) course-teacher gate — same nuance
   US-E24.9 documented for period-log/prep. Every Server Action re-derives
   ownership server-side (§4) regardless of what the client rendered.
5. **`TeacherClass.subjects`** (already on `ClassHubHeaderVm.subjects`, no new
   read) is the teacher's OWN subject assignments in this class — sufficient
   to decide "is this course's subject mine" for the mode resolver. The GVCN
   **dropdown of ALL class subjects** needs a different, wider read:
   `GET /core/api/v1/classes/{classId}/subjects` (`CLASS_EP.classSubjects`,
   endpoint constant already exists, unused by any teacher-scoped consumer).
   The only existing consumer (`GetClassSubjectsUseCase` /
   `IPrincipalTeachersRepository.getClassSubjects`) lives under
   `features/principal/domain/teachers/` — principal-scoped naming, not a
   teacher-feature home. **Decision: add a narrow, teacher-owned read**
   (`ListClassSubjectsUseCase` in `features/lms` — see §1.4) rather than
   import a `principal/` DI factory into a teacher screen (wrong feature
   boundary; that repo/entity is intentionally scoped to
   admin/principal-assignment concerns, e.g. it carries `teacherId`/
   `teacherName` this screen doesn't need). The HTTP call is a plain
   unauthenticated-by-role GET (BE doc: "all authenticated") — no duplicate
   endpoint constant, just a new call site reusing `CLASS_EP.classSubjects`.
   Flag to `fe-tech-lead-reviewer` as a one-time duplication (2 read-only
   call sites hitting the same URL from two features) rather than a forced
   cross-feature import — acceptable per YAGNI (no shared abstraction until a
   3rd consumer needs it).
6. **i18n namespace: `courses.*`, not `courses.teacher.*` as the Design Notes
   literally say.** `course-timeline`/`course-header`/`timeline-row` already
   read `useTranslations("courses")` for `timeline.*`/`errors.*` — the
   teacher/readonly branches this US adds render inside the SAME component
   tree and must resolve through the SAME `t()` call already in scope, so new
   keys land at `courses.teacher.*` (a **sub-path** of the existing `courses`
   namespace, e.g. `t("teacher.addMenu.lesson")`), not a sibling top-level
   namespace. This satisfies the packet's literal string
   (`courses.teacher.*`) while staying consistent with the shared component's
   existing namespace — no fragmentation, no second `useTranslations()` call
   in the same file tree.

## 1. Domain (pure, no framework)

**New use-cases** (mirror the existing `SubmitAssignmentUseCase`/
`GetCourseUseCase` shape — thin orchestration over `ILmsRepository`, throw
`LmsFailure`, wrapped in `Result<T>` by the use-case's `execute`):

- `features/lms/domain/use-cases/reorder-items.use-case.ts`
- `features/lms/domain/use-cases/patch-item.use-case.ts`
- `features/lms/domain/use-cases/create-lesson.use-case.ts`
- `features/lms/domain/use-cases/create-assignment.use-case.ts` (already have
  `CreateAssignmentInput` type on the repo interface — reuse verbatim)
- `features/lms/domain/use-cases/add-document-item.use-case.ts`
- `features/lms/domain/use-cases/publish-course.use-case.ts`
- `features/lms/domain/use-cases/delete-item.use-case.ts`
- `features/lms/domain/use-cases/list-class-subjects.use-case.ts` (new read,
  §0.5 — depends on a new `IClassSubjectsReader`-shaped port, see §2)

**Pure helper fns** (no I/O, the actual TDD-first units for this lane):

- `features/lms/domain/use-cases/resolve-course-timeline-mode.ts`
  ```ts
  export type ResolvedCourseMode = "teacher" | "readonly";
  export function resolveCourseTimelineMode(
    teacherSubjectIds: string[], // TeacherClassSubject[].map(s => s.id), from cls.subjects
    courseSubjectId: string,
  ): ResolvedCourseMode {
    return teacherSubjectIds.includes(courseSubjectId) ? "teacher" : "readonly";
  }
  ```
  Test first (**red**): own-subject → `"teacher"`; empty `teacherSubjectIds`
  (pure GVCN, no subject assignment) → `"readonly"`; foreign subjectId while
  holding a DIFFERENT subject → `"readonly"`. This single fn covers both
  GVBM (`teacherSubjectIds` = their 1 subject) and GVCN (their subjects, which
  may be `[]`) — no role branch needed, the subject-set IS the role
  distinction already captured by `TeacherClass.subjects`.
- `features/lms/domain/use-cases/build-reordered-item-ids.ts`
  ```ts
  /** Pure array move: drag `sourceId` to just before/after `targetId`. Builds
   *  the COMPLETE ordering `reorderItems` requires — never a partial list. */
  export function buildReorderedItemIds(
    currentIds: string[],
    sourceId: string,
    targetId: string,
    position: "before" | "after",
  ): string[];
  ```
  Test first: move first→last, last→first, adjacent swap, `sourceId ===
  targetId` (no-op, same array reference semantics not required but same
  ORDER required), unknown id (throws — a programmer error, this fn is only
  ever called with ids from the current render).
- `features/lms/domain/use-cases/validate-item-window.ts` (client-side
  pre-check mirroring BE's `LMS_ITEM_INVALID_WINDOW`/`LMS_ITEM_URL_INVALID` —
  catches the obvious case before a round trip, BE remains the real gate):
  ```ts
  export function isDueAfterStart(startAt: string | null, dueAt: string | null): boolean; // dueAt > startAt when both set
  export function isHttpsUrl(url: string): boolean; // absolute https:// with a host
  ```
  Test first: both set + valid, `dueAt <= startAt` → false, either null →
  true (no constraint); URL: `http://` → false, `https://x` → true, `javascript:`
  → false, empty → false.

**Files**
- `features/lms/domain/use-cases/{reorder-items,patch-item,create-lesson,create-assignment,add-document-item,publish-course,delete-item,list-class-subjects}.use-case.ts`
- `features/lms/domain/use-cases/{resolve-course-timeline-mode,build-reordered-item-ids,validate-item-window}.ts`
- `features/lms/domain/use-cases/__tests__/{resolve-course-timeline-mode,build-reordered-item-ids,validate-item-window}.test.ts`
- `features/lms/domain/use-cases/__tests__/{reorder-items,patch-item,create-lesson,create-assignment,add-document-item,publish-course,delete-item}.use-case.test.ts`
  (mock `ILmsRepository`, assert `Result` shape on both success and each
  documented failure code)

**Done when**: all pure-fn + use-case unit tests green; zero framework import
in any file under `domain/`.

## 2. Domain/infrastructure — repository port additions

**Files**
- `features/lms/domain/repositories/i-lms.repository.ts` (edit): add
  ```ts
  /** POST .../publish — DRAFT → PUBLISHED, terminal. 409 on a second call. */
  publishCourse(courseId: string): Promise<Course>;
  /** DELETE .../items/{itemId} — DOCUMENT only. 409 `not-document` for
   *  LESSON/ASSIGNMENT, 404 `not-found` on a repeat delete. */
  deleteItem(courseId: string, itemId: string): Promise<void>;
  ```
- `features/lms/infrastructure/repositories/lms.repository.ts` (edit): two
  methods, `this.http.post(LMS_EP.publishCourse(courseId))` →
  `toCourse(...)`; `this.http.delete(LMS_EP.item(courseId, itemId))` → `void`
  (204, no body — matches the `submitAssignment`-family `call()` wrapper,
  just no mapper on the return).
- `features/lms/infrastructure/repositories/mocks/lms.mock.repository.ts`
  (edit): `publishCourse` flips `MOCK_COURSES` entry `status`
  `"DRAFT"→"PUBLISHED"` + sets `publishedAt`, rejects `"not-found"` if already
  `PUBLISHED`... **correction**: BE says a second publish is `409 Conflict`,
  not modeled in `LmsFailure` today (closest existing member: none maps 409
  generically for this case — reuse `"limit-exceeded"`? No, wrong semantics).
  **Decision**: add no new failure type; map the DRAFT-course branch to a
  guard in the USE-CASE instead (if `course.status === "PUBLISHED"` throw
  `{ type: "not-found" }`... also wrong). **Resolve at DI/reviewer stage**:
  this is a genuine catalogue gap — flag `[OPEN QUESTION]` below rather than
  inventing a mapping; the mock/real THROW path both surface whatever BE
  actually returns for that 409's `error.code` once ground-truthed against
  `ERROR_CODES.md`'s Courses section (not grepped in this planning pass — the
  9-line context window above only covered Course-Items/Lessons codes).
  `deleteItem` mock: `409 not-document` for non-DOCUMENT, `404 not-found` for
  unknown itemId, else splices `items` array (module-level mutable state, same
  pattern as `submissions`).
- New port for §0.5 (class-subjects read) — **do not** widen
  `ILmsRepository` with a `core`-service method (violates
  `.claude/rules/api-integration.md`'s "repository does not gộp nhiều
  service"). Two options:
  (a) new tiny `features/lms/domain/repositories/i-class-subjects.repository.ts`
  + `ClassSubjectsRepository` in `infrastructure/` calling `CLASS_EP.classSubjects`
  directly (duplicates the principal repo's one GET, ~15 lines, no DTO reuse
  needed since the shape this screen wants is narrower — just `{id, name}`
  pairs, not `PrincipalClassSubject`'s full teacher-assignment shape); or
  (b) reuse `features/principal/infrastructure/teachers/repositories/principal-teachers.repository.ts`
  as-is via its existing DI export, accepting the cross-feature import.
  **Recommendation: (a)** — smaller DTO (`ClassSubjectSummaryResponseDto:
  { id, subjectId, subjectName }`), single-purpose port, keeps `lms`'s feature
  boundary self-contained (this screen's ONLY reason to read `core` is the
  subject dropdown — a 15-line duplicate is cheaper than a permanent
  cross-feature dependency on `principal`'s teacher-assignment domain).
  `fe-component-architect`/`fe-tech-lead-reviewer` should confirm this trade
  before implementation.

**Test first**: `lms.repository.test.ts` (edit) — `publishCourse`/`deleteItem`
integration cases (envelope unwrap, 204-no-body handling, error-code mapping);
new `class-subjects.repository.test.ts`.

**Done when**: `ILmsRepository` fully implements the Design Notes' 7
mutations + the new read; both Real and Mock repos pass their test files.

## 3. Bootstrap — DI + endpoint

**Files**
- `bootstrap/di/lms.di.ts` (edit): add
  `makeReorderItemsUseCase`, `makePatchItemUseCase`,
  `makeCreateLessonUseCase`, `makeCreateAssignmentUseCase`,
  `makeAddDocumentItemUseCase`, `makePublishCourseUseCase`,
  `makeDeleteItemUseCase` — **plain `async () => new XUseCase(await makeRepo())`
  factories**, NOT the `{ useCase, authCtx }` tuple shape (`period-log.di.ts`),
  because — per §0.4 — the authorization re-derivation here is a
  `getMyClass`+`getCourse` double-read done ONCE per action (§4), not a
  per-call claim decode; threading it through the DI factory would duplicate
  the `getMyClass`/`getCourse` calls the action already needs for other
  reasons (building the response VM). Mirrors the `assertHomeroomOf()`
  precedent in `teacher/classes/[classId]/actions.ts` (boolean/data gate
  in the ACTION, not the DI factory) — chosen there for the identical reason
  ("no per-record authorization of its own on the repository").
- `bootstrap/di/lms.di.ts` (edit): `makeListClassSubjectsUseCase` (new port,
  §2) — plain factory, `USE_MOCK` gate reusing the SAME `USE_MOCK` flag (mock
  fixture: a fixed 4–5 subject list keyed by `MOCK_CLASS_ID`).
- `bootstrap/endpoint/lms.endpoint.ts`: no edit needed — `publishCourse`
  already present, `item()` reused for DELETE.
- No new `CLASS_EP` entry — `classSubjects` already exists.

**Done when**: every new use-case has a DI factory; `bunx tsc --noEmit` clean
(no dangling unused export, no missing wiring).

## 4. Route wiring — `teacher/classes/[classId]/` course tab

**Files**
- `app/[locale]/t/[tenant]/(app)/teacher/classes/[classId]/course-vm.ts` (new,
  sibling to `homeroom-vm.ts`/`timetable-vm.ts`): `buildCourseTabVm({ classId,
  teacherSubjects, subjectIdParam })` —
  1. Resolve target subject: `subjectIdParam` if present and valid, else the
     teacher's own subject (`teacherSubjects[0]?.id`) if any, else the first
     class-subject from `ListClassSubjectsUseCase` (pure-GVCN landing case —
     no subject param yet, no own subject to default to).
  2. `listCourses(classId, subjectId)` → pick `.find(c => c.isDefault) ??
     rows[0]`; if empty/404 → the design's "Không có quyền xem khoá học môn
     này" banner state (ask #7) — **not** `notFound()`, since the shell/class
     itself is fine, only this one subject's course is unreachable.
  3. `getCourse(courseId)` + `listItems(courseId)` (parallel, mirrors
     US-E24.3's degrade contract: item-read failure ≠ course-read failure).
  4. `resolveCourseTimelineMode(teacherSubjectIds, course.subjectId)` →
     `"teacher" | "readonly"`.
  5. Map to `CourseTimelineVm` (existing i-vm, `mode` field now populated with
     the real value) + a NEW `TeacherCourseTabVm` wrapper carrying
     `subjectOptions: {id,name,isMine}[]`, `selectedSubjectId`,
     `courseStatus: CourseStatus` (for the DRAFT banner).
- `app/[locale]/t/[tenant]/(app)/teacher/classes/[classId]/page.tsx` (edit):
  add `subjectId` to the destructured `searchParams` (parallel to `week`);
  `else if (activeTab === "course")` branch replaces `TabPlaceholder` with
  `<TeacherCourseTab vm={...} actions={COURSE_ACTIONS} />` (or `<CourseTimeline
  mode="readonly">` directly when the resolved mode is `readonly` — see §5 for
  which component owns the subject-picker chrome vs the timeline body).
- `.../actions.ts` (edit): 7 new Server Actions
  (`reorderItemsAction`, `patchItemAction`, `createLessonAction`,
  `createAssignmentAction`, `addDocumentItemAction`, `publishCourseAction`,
  `deleteItemAction`), each shaped:
  ```ts
  async function assertOwnCourseSubject(
    classId: string,
    courseId: string,
  ): Promise<{ ok: true; course: Course } | { ok: false }> {
    const [classResult, courseResult] = await Promise.all([
      (await makeGetMyClassUseCase()).execute(classId),
      (await makeGetCourseUseCase()).execute(courseId),
    ]);
    if (!classResult.ok || !courseResult.ok) return { ok: false };
    const course = courseResult.data;
    if (course.classId !== classId) return { ok: false }; // cross-class guard
    const owns = classResult.data.subjects.some((s) => s.id === course.subjectId);
    return owns ? { ok: true, course } : { ok: false };
  }

  export async function reorderItemsAction(
    classId: string,
    courseId: string,
    itemIds: string[],
  ): Promise<LmsActionResult<CourseItem[]>> {
    const gate = await assertOwnCourseSubject(classId, courseId);
    if (!gate.ok) return { ok: false, errorKey: "forbidden" };
    const result = await (await makeReorderItemsUseCase()).execute(courseId, itemIds);
    if (result.ok) revalidatePath(CLASS_HUB_PATH, "page");
    return result.ok
      ? { ok: true, data: result.data }
      : { ok: false, errorKey: result.error.type };
  }
  ```
  (the other 6 follow the same `assertOwnCourseSubject` → use-case → revalidate
  shape; `createAssignmentAction`/`createLessonAction`/`addDocumentItemAction`
  additionally re-derive `subjectId` from the gate's `course.subjectId` rather
  than trusting a client-submitted one, satisfying "no invented/trusted client
  identifiers for authorization").
- `.../page.test.ts` / `.../actions.test.ts` (edit): add `course` tab render
  case + the 7 new action tests (each: happy path, `forbidden` when
  `assertOwnCourseSubject` fails, each BE failure code passthrough).

**HIGH-RISK security proof (own gated phase, mirrors US-E24.9's NFR-008/009
precedent)**: a dedicated `actions.security.test.ts` (or a clearly-labelled
block in `actions.test.ts`) that calls each of the 7 actions DIRECTLY (no UI)
with a `classId`/`courseId` combination where `course.subjectId` is NOT in
`classResult.data.subjects` — asserts `{ ok: false, errorKey: "forbidden" }`
AND asserts the underlying `ILmsRepository` mutation method was **never
called** (mock repo call-count assertion, not just the return shape) — the
same "zero-HTTP-call" proof pattern used for pin/unpin in US-E19.1.

## 5. Presentation

### 5.1 `course-timeline` — extend `mode` (edit existing files)

- `course-timeline.tsx` (edit): replace the `throw` with
  `mode === "readonly" ? <ReadonlyTimeline .../> : <TeacherTimeline .../>`.
  `readonly` reuses almost all of `StudentTimeline`'s markup MINUS the
  click-to-navigate `<Link>` (readonly rows are inert, per design's "không
  grip, không chevron, không Sửa ngày/Thêm mục" — closer to a plain list than
  the student's clickable-to-player rows, since a GVCN reading another GVBM's
  course has no player route of their own here either). Concretely:
  `TimelineRow` gets a 4th caller shape via a NEW prop `interactive: boolean`
  (default `true` for student, `false` for readonly) — cheaper than a 3rd
  markup fork, since `readonly`'s row body is IDENTICAL to `locked`'s
  non-interactive card, just without the "opens at" banner.
- `course-header.tsx` (edit): add `subtitle?: string` prop (teacher-mode
  banner text / readonly-mode pill) OR — cleaner — keep `CourseHeader` a pure
  identity+legend component (unchanged) and let the NEW
  `teacher-course-tab.tsx` container render the mode banner / subject-picker
  / DRAFT-publish banner ABOVE `CourseHeader`, so the promoted-shared
  component's contract doesn't grow a teacher-only prop. **Recommendation:
  the latter** — keeps `course-header.tsx` mode-agnostic (only `CourseTimeline`
  branches on mode, per US-E24.3's Component Architecture §6 "mode branching
  lives ONLY at the root").
- `week-section.tsx` (edit): `mode === "teacher"` renders the "+ Thêm mục" pill
  (new `AddItemMenu` child) after the hairline; passes `onReorder`/drag
  handlers down to each `TimelineRow`.
- `timeline-row.tsx` (edit): `mode === "teacher"` adds the grip handle
  (`draggable`, `onDragStart`/`onDragOver`/`onDrop` — native HTML5 DnD, no
  library) + the inline "Sửa ngày" toggle button + (conditionally) a delete
  icon for DOCUMENT items. EXAM rows always render the disabled tooltip state
  regardless of mode (BE-enforced immutability, not a client choice).
- `course-timeline.i-vm.ts` (edit): `CourseTimelineActions` grows the 7
  mutation refs (typed as plain async functions bound in `page.tsx`, same
  "Server Action refs, never imported directly" contract already documented).

### 5.2 New `teacher-course-tab/` tree

**Files**
- `features/lms/presentation/teacher-course-tab/teacher-course-tab.tsx`
  (`'use client'`, container) — owns: selected-subject state (URL-synced via
  `useRouter`/`Link` `?subjectId=`, mirrors `week` param handling in
  `timetable-tab`), the DRAFT-course publish banner, the readonly pill, and
  wraps `<CourseTimeline mode={vm.mode} .../>` with a `QueryClientProvider`
  boundary is NOT needed here (root layout already provides one — confirm
  `bootstrap/lib/react-query-provider.tsx` wraps the whole app, not per-page).
- `.../subject-picker.tsx` — `<select>` (native, not a custom Radix combobox —
  matches design's literal `<select>`) of `subjectOptions`, "(môn của bạn)"
  suffix on the owned entry; `aria-label`; changing it triggers a client-side
  navigation (`router.push` with the new `?subjectId=`), NOT a client fetch —
  keeps this an RSC-driven tab like every other one in the hub.
- `.../add-item-menu.tsx` — `role="menu"`/`menuitem` popover (Radix
  `DropdownMenu` primitive — already in `components/ui/`, reuse, do not
  hand-roll ARIA), 4 entries (Bài giảng/Bài tập/Tài liệu/Kiểm tra); the last
  one is a `<Link href="/teacher/exam-bank">` with the note text, NOT a
  dialog trigger.
- `.../create-item-dialog.tsx` — one dialog component parameterized by
  `kind: "lesson" | "assignment" | "document"` (3 field sets per Design Notes,
  shares the Dialog/Form primitives already in `components/ui/`); client-side
  `isHttpsUrl`/`isDueAfterStart` pre-validation (domain fns from §1) before
  calling the bound action — BE remains the authority, this only avoids an
  obviously-wrong round trip.
- `.../edit-window-row.tsx` — the inline `datetime-local` × 2 + Huỷ/Lưu row
  (design's "editing" state), rendered by `timeline-row.tsx` when its
  "Sửa ngày" toggle is on; "Để trống = không giới hạn" caption;
  client-side `isDueAfterStart` pre-check.
- `.../reorder-keyboard-controls.tsx` (or inlined into `timeline-row.tsx`) —
  the "Lên/Xuống" button pair, visible when the row (or the row's grip handle)
  has focus, calling the SAME `onReorder` callback the drag handlers use
  (§1's `buildReorderedItemIds`, called with `position: "before"|"after"`
  the adjacent sibling) — one code path for both interaction modes, per
  `.claude/rules/accessibility.md` "mọi tương tác thao tác được bằng bàn
  phím".
- `.../teacher-course-tab.i-vm.ts` — `TeacherCourseTabVm`, `TeacherCourseTabActions`
  (7 mutation refs + `publishCourse`), story files per component.

**Component tree**
```
page.tsx (RSC)
└─ TeacherCourseTab                      'use client' (container — owns selected subject nav, DRAFT banner, TanStack Query)
   ├─ SubjectPicker                      presentational (GVCN only; GVBM sees none per design — single course, no dropdown)
   ├─ [banner] "Chưa xuất bản" + Xuất bản  presentational + 1 mutation
   ├─ [pill] "Chỉ đọc — ..."              presentational (readonly mode only)
   └─ CourseTimeline mode="teacher"|"readonly"   (existing, extended)
      └─ WeekSection[]
         ├─ AddItemMenu (teacher only)    presentational + opens CreateItemDialog
         └─ TimelineRow[]
            ├─ grip handle (teacher only) native draggable
            ├─ ReorderKeyboardControls (teacher only)  presentational
            ├─ EditWindowRow (teacher only, conditional)  presentational + 1 mutation
            └─ delete icon (teacher, DOCUMENT only)  presentational + 1 mutation (confirm dialog — reuse `DestructiveConfirmDialog`, decision precedent from US-E19.2/E19.1, NOT a new confirm component)
```

## 6. State management — TanStack Query (first use in this epic)

Every prior US-E24.8/9/11 write is RSC + Server Action +
`revalidatePath`/local `useState` — **this US is the first to need TanStack
Query**, per Design Notes, because reorder needs optimistic UI + rollback that
a full-page `revalidatePath` round trip cannot give the drag interaction
(would flash the pre-drop order back before the request resolves).

- Query key: `["lms", "course", courseId, "items"]`; `initialData` seeded from
  the RSC's already-fetched `listItems` result (passed down as a prop into
  `TeacherCourseTab`, hydrated into the query cache via
  `useQuery({ ..., initialData })` — no client-side re-fetch on mount).
- `useMutation` for `reorderItems`: `mutationFn` calls the bound
  `reorderItemsAction` Server Action; `onMutate` optimistically writes the new
  order via `queryClient.setQueryData`; `onError` rolls back to the snapshotted
  previous value; `onSettled` does NOT `invalidateQueries` for this one (the
  action's own `revalidatePath` already re-syncs the RSC shell on next
  navigation, and item ORDER doesn't need a full route round-trip — matches
  `course-timeline`'s existing "one-shot re-read, not a cache" philosophy for
  low-frequency writes, but reorder specifically needs a durable client cache
  because it's the one truly interactive/optimistic surface here).
- `useMutation` for the other 6 (`patchItem`, `createLesson`,
  `createAssignment`, `addDocumentItem`, `publishCourse`, `deleteItem`): no
  optimistic UI needed (these are dialog-submit / toggle-driven, a brief
  pending spinner is acceptable) — `onSuccess` → `queryClient.setQueryData`
  with the server response (already have the updated entity back from every
  action), no `invalidateQueries` round trip needed either.
- **Recommend dispatching `fe-state-engineer`** to firm up the exact
  query-key/mutation/rollback contract before `fe-nextjs-engineer` starts —
  this is genuinely new ground for the epic (TanStack + optimistic rollback +
  RSC-seeded `initialData`), not a copy of an existing pattern in this repo's
  `lms` feature. `fe-component-architect` should run IN PARALLEL (not
  sequentially) — the component tree (§5) and the state contract (§6) are
  largely orthogonal (props/callbacks vs. what's inside the callback), and
  serializing them would only slow the high-risk lane down further.

## 7. Accessibility

- Drag-drop: HTML5 native `draggable` is **not** keyboard-operable by itself —
  the "Lên/Xuống" buttons (§5.2) are the REQUIRED alternative, not a nice-to-
  have; must be reachable via Tab and operate identically to a drop (same
  `buildReorderedItemIds` call, same mutation).
- Add-item menu: Radix `DropdownMenu` (already accessible `menu`/`menuitem`
  roles + roving focus out of the box) — do not hand-roll the popover the
  mockup's raw `<div>` used.
- Grip handle: `aria-hidden` (decorative — the row itself is the drag source
  via `draggable` on the row, not a separate handle element, to keep ONE
  focusable/draggable target rather than a nested one) unless design review
  requires the handle to be the sole drag initiator; note as
  `[OPEN QUESTION]` for `fe-accessibility-auditor`.
- Inline date inputs: native `<input type="datetime-local">` + `<label>` per
  `.claude/rules/accessibility.md` form rule; validation errors via visible
  text + `aria-invalid`/`aria-describedby`, not colour alone.
- Delete confirm: reuse `DestructiveConfirmDialog` (US-E19.2 precedent) — do
  not fork a new confirm component (decision 0026).
- Subject `<select>`: native select is keyboard-operable by default; label via
  `aria-label` since there's no visible `<label>` element in the design.

## 8. i18n

`vi.json`/`en.json`, under the EXISTING `courses` namespace (§0.6):
```
courses.teacher.modeBanner            // "Chế độ giáo viên — kéo thả để sắp xếp, sửa ngày ngay trên dòng"
courses.teacher.readonlyBanner        // "Chỉ đọc — khoá học do GV bộ môn quản lý"
courses.teacher.readonlyPill          // "Chỉ đọc — khoá học của GV bộ môn khác"
courses.teacher.subjectPicker.label
courses.teacher.subjectPicker.mine    // " (môn của bạn)"
courses.teacher.forbiddenSubject      // "Không có quyền xem khoá học môn này" (ask #7 404 case)
courses.teacher.draftBanner.{title,publish}
courses.teacher.addMenu.{label,lesson,assignment,document,exam,examNote}
courses.teacher.editDates.{label,opensLabel,dueLabel,blankHint,cancel,save}
courses.teacher.reorder.{up,down}     // keyboard alternative button aria-labels
courses.teacher.delete.{label,confirmTitle,confirmBody}
courses.teacher.createDialog.{lessonTitle,assignmentTitle,documentTitle,titleField,contentField,descriptionField,urlField,save,cancel}
courses.teacher.errors.invalidUrl     // client pre-check (https only)
courses.teacher.errors.invalidWindow  // client pre-check (due > start)
```
`courses.errors.*` (existing `LmsFailure`-keyed catalogue) is reused verbatim
for every server-side failure surface (`not-document`, `exam-window-not-editable`,
`limit-exceeded`, etc.) — no duplicate error-message keys under `teacher.*`.

## 9. Test plan → Validation table

| Layer | File | Asserts |
| --- | --- | --- |
| Unit | `resolve-course-timeline-mode.test.ts` | own/foreign/empty-subjects cases |
| Unit | `build-reordered-item-ids.test.ts` | move-first/last/adjacent/unknown-id |
| Unit | `validate-item-window.test.ts` | window + URL branch cases |
| Unit | `{reorder,patch,create-lesson,create-assignment,add-document,publish,delete}-item.use-case.test.ts` | mock-repo success + every documented failure code |
| Integration | `lms.repository.test.ts` (edit) | `publishCourse`/`deleteItem` envelope + error mapping |
| Integration | `class-subjects.repository.test.ts` | GET mapping |
| Integration | `actions.test.ts` (edit) | 7 actions: happy path, `assertOwnCourseSubject` forbidden, BE failure passthrough |
| Integration (security) | `actions.security.test.ts` | forbidden case asserts ZERO underlying repo-mutation calls (mock call-count), for all 7 actions |
| E2E/Story | `course-timeline.stories.tsx` (edit) | `teacher-3-weeks`, `readonly`, `draft-course`, `exam-row-locked`, `add-menu`, `error-reorder` (per AC) |
| E2E/Story | `teacher-course-tab.stories.tsx` | subject-picker switch, forbidden-subject banner |
| E2E/Story | keyboard reorder interaction | Tab to row → "Lên/Xuống" → asserts mutation call + optimistic order change |
| E2E/Story | drag reorder interaction | pointer drag simulation → optimistic order → rollback-on-error variant |
| Platform | — | `tsc --noEmit`, `vitest run`, `bun build`, `vitest run --config vitest.storybook.mts` |
| Release | — | design-review gate + a11y audit (keyboard-drag alternative, menu semantics, colour-never-alone on reorder feedback) + security (this lane's own gated phase, §4) |

## 10. Component/state assessment — recommend BOTH, in parallel

- **`fe-component-architect`: recommended.** Extends a cross-consumer shared
  component (`course-timeline/`, US-E24.3's promoted contract) with a 3rd
  mode, plus a genuinely new 5-file presentation tree
  (`teacher-course-tab/`). Needs to confirm: the `TimelineRow` `interactive`
  prop split (§5.1) vs. a 3rd markup fork, and the `CourseHeader`
  mode-agnostic boundary (§5.1) before engineer starts, since both choices
  affect whether US-E24.3's existing Storybook stories still pass unmodified
  (regression risk).
- **`fe-state-engineer`: recommended.** First TanStack Query usage in the
  whole `E24` epic (§6) — query-key shape, optimistic-reorder rollback
  contract, and the RSC→client `initialData` hydration boundary need to be
  fixed before engineering, not discovered mid-implementation on a high-risk
  mutation surface.
- Dispatch **in parallel**, not sequentially — the component tree and the
  state contract are orthogonal enough (§6's closing note) that serializing
  them only costs time on an already high-risk lane.

## Risks / open questions

- **[OPEN QUESTION]** Second-publish 409's `error.code` is not confirmed
  (§2) — `ERROR_CODES.md`'s Courses section wasn't ground-truthed in this
  pass. `fe-nextjs-engineer` must grep it before writing `PublishCourseUseCase`
  and may need a genuinely new `LmsFailure` member (e.g. `already-published`)
  — flag to `fe-lead`/ADR-watch if so (new failure member is a type change,
  not a token/architecture ADR, but note it in Harness Delta).
- **[OPEN QUESTION]** Grip-handle a11y (§7): is the whole row the drag
  source (current recommendation) or must the visual grip icon itself be the
  sole `draggable` target? Defer to `fe-accessibility-auditor`.
- **[OPEN QUESTION]** GVBM teaching >1 subject in the SAME class (rare,
  schema allows it): no picker specified for GVBM in the design — this plan
  defaults to `teacherSubjects[0]`. Confirm with `fe-lead`/design if this
  needs its own picker or is accepted as an edge-case default.
- Client-side subject-ownership gate (§0.4, §4) is defense-in-depth, not the
  real security boundary — BE ask #7 (GVCN-vs-GVBM enforcement) is still
  open. Document this plainly in the story's Evidence section so a future
  reader doesn't mistake the `assertOwnCourseSubject` gate for BE parity.
- `ListClassSubjectsUseCase` duplicates one GET already served by
  `principal/`'s repository (§0.5/§2) — accepted YAGNI trade, revisit if a
  3rd consumer needs the exact same class-subjects read.
- Reorder's optimistic UI + `revalidatePath` interaction (§6) needs a
  `fe-state-engineer` sign-off that `onSettled` correctly leaves the RSC
  shell's NEXT navigation (e.g. switching tabs and back) picking up the
  server-confirmed order, not a stale client cache surviving a route change.
