# US-E24.7 Implementation Plan — Danh sách lớp theo vai trò + KPI draft

Owner: fe-planner. No code written here. See story packet
`US-E24.7-class-list-by-role.md` for AC/contract; this file is the phased
breakdown + the concrete grounding decisions made while reading BE contracts.

## 0. Ground-truth corrections vs the packet/epic text (read BE openapi first)

These change what gets implemented — recorded so the engineer doesn't
re-derive them:

1. **`teachingSubjectIds` is REAL and shipped today** (`core/openapi.yaml`
   `ClassResponse`, TEACHER branch only) — not draft. `homeroomTeacherId` /
   `homeroomTeacherName` are also real (now `required` on the schema, `null`
   when absent — current DTO already models `homeroomTeacherId` as optional,
   compatible).
2. **`absentToday`/`pendingGrading` (US-255) are fields ADDED DIRECTLY to
   `ClassResponse`'s TEACHER branch** (`core/openapi.draft.yaml`
   `ClassResponseTeacherOverlayDraft`) — **not** a separate per-class KPI
   endpoint. So GVBM's 2 tiles need **zero extra HTTP call** once BE ships;
   today (undeployed) the real repo simply never receives these keys
   (`undefined` → mapper leaves them unset → UI hides the tile, per AC). The
   mock repo is the only place these numbers exist right now.
3. **`attendanceRate` (US-245) genuinely needs a separate call**:
   `GET /core/api/v1/classes/{classId}/attendance/summary?termId=` (draft,
   `AttendanceSummary.rate` is a `"0.00".."1.00"` **string**, `""` when no
   data). `termId` is **required** and **there is no term-source anywhere in
   this repo today** (grep confirmed — no `academic-terms`/`activeTerm`
   helper exists). Real call is not wireable yet regardless of draft status.
   → Plan: attendanceRate stays **mock-only** in this story; the real
   repository method is written but returns `undefined` immediately with a
   comment citing the missing term-source (same "permanent stub until X"
   pattern as `discipline.repository.ts`), not a live call. Flagged as an
   open question below (needs an ask to BE or a term-source decision before
   US-245 can ever go real).
4. **`openViolations`/`pendingLeave` ARE independently callable REAL
   endpoints today** — the packet's "ask #8 xác nhận param" is resolved by
   reading `core/openapi.yaml` directly:
   - `GET /conduct/student-violations?classId=` returns **every** workflow
     state for the GVCN caller — **there is no `state` query param**. Count
     "chờ xử lý" by filtering the drained page client-side for
     `state === "SUBMITTED"` (same `fetchAllPages` cursor-drain pattern
     `teacher-class.repository.ts` already uses for classes/roster).
   - `GET /conduct/student-leave-requests?classId=` for a GVCN caller is
     **already server-filtered to `SUBMITTED` only** ("homeroom inbox") — no
     client filter needed, count = page length.
   - Both are reachable because the teacher already *knows* `classId` from
     the class list — this sidesteps the categorical blocker that force-mocks
     the rest of `discipline.repository.ts` (that blocker is about
     STUDENT/PARENT self-service having no way to *discover* a `classId`).
     Do **not** import `features/discipline` code (permanently stubbed real
     repo) — call `DISCIPLINE_EP.violations` / `DISCIPLINE_EP.leaveRequests`
     directly from the teacher-class infrastructure, same as how endpoint
     constants are meant to be shared.
5. **Subject names**: `teachingSubjectIds` on `ClassResponse` is id-only, no
   name. Reuse the already-shipped `GET /core/api/v1/subjects`
   (`ASSESSMENT_SCHEME_EP.subjects`, real, any authenticated tenant member —
   only `POST` is ADMIN-gated) — drain once with `fetchAllPages`, build an
   `id → name` map, same composition pattern the repo already uses for the
   IAM member-name batch resolve. No new endpoint constant needed for the
   read itself (reuse `ASSESSMENT_SCHEME_EP.subjects`); do **not** import
   `features/admin/subject-catalogue` (admin-scoped feature) — this is a
   plain HTTP read via the shared endpoint constant.
6. **The current `class-card.tsx`/`teacher-classes-screen.i-vm.ts` are a
   simpler pre-existing US** (single `isHomeroom` boolean badge, icon box,
   3 action buttons incl. 2 "coming soon" tooltips). Bundle-v3 design has
   none of that — no icon box, no coming-soon buttons, single "Mở lớp" CTA,
   accent stripe, multi-role badges, KPI tile grid. This is a **rewrite of
   the card + VM**, not an additive extension. `studentsHref`/routing to
   `/teacher/classes/[classId]/students` is kept (E24.8's `[classId]` shell
   route doesn't exist yet — "Mở lớp" points at `/students` until then, per
   packet's own "tới khi đó → `/students`").

## 1. Domain (`src/features/teacher/domain/`)

**Files**
- `entities/teacher-class.entity.ts` — extend `TeacherClass`:
  - `roles: ClassRole[]` (`type ClassRole = "homeroom" | "subject"`) — derived,
    replaces bare `isHomeroom` (keep `isHomeroom` too, existing roster-tab code
    reads it — additive, don't break `getClassStudents`/roster consumers).
  - `subjects: TeacherClassSubject[]` (`{ id: string; name: string }[]`) — empty
    when no subject assignment in this class.
  - `kpi?: TeacherClassKpi`:
    ```
    interface TeacherClassKpi {
      absentToday?: number;
      pendingGrading?: number;
      attendanceRate?: number;   // 0..1
      openViolations?: number;
      pendingLeave?: number;
      /** Which of the above came from the draft/mock path (ADR 0076) — drives
       *  the "demo" badge. Only ever non-empty when USE_MOCK. */
      demoFields: ("absentToday" | "pendingGrading" | "attendanceRate")[];
    }
    ```
- `use-cases/list-my-classes.use-case.ts` — unchanged signature (still returns
  `TeacherClass[]`); the repo now fills `roles`/`subjects`/GVBM's slice of
  `kpi` in one pass (no fan-out needed for those, see §0.2).
- **New** `use-cases/get-homeroom-kpi.use-case.ts` — `GetHomeroomKpiUseCase`,
  `execute(classId: string): Promise<HomeroomKpiResult>` wrapping the repo's
  `getHomeroomKpi(classId)`. Only called for classes where `roles` includes
  `"homeroom"`.
- Reuse `failures/teacher-class.failure.ts` — no new failure variants; a
  homeroom-KPI partial failure degrades to `undefined` fields, never a
  screen-level failure (AC: "Nếu endpoint trả lỗi → ẩn ô, không crash").

**Test first**
- `teacher-class.mapper.test.ts` (extend, see Phase 2) actually carries the
  domain-shape assertions since `TeacherClass` itself has no logic — the pure
  logic to unit-test is in the mapper. Add a small pure fn if the
  `demoFields`/`state==="SUBMITTED"` filtering logic grows non-trivial —
  candidate: `deriveClassRoles(isHomeroom, teachingSubjectIds)` as a pure
  domain helper, unit-tested directly (mirrors `deriveSelfApproved` precedent
  from US-E09.5).

**Done when**: `deriveClassRoles`/entity types compile; use-case unit tests
green (mock repo returning partial-failure homeroom KPI → use-case just
forwards the result, no logic to hide).

## 2. Infrastructure (`src/features/teacher/infrastructure/`) — `'server-only'`

**Files**
- `dtos/teacher-class-response.dto.ts` — add:
  - `teachingSubjectIds?: string[]` (real, shipped).
  - `absentToday?: number` / `pendingGrading?: number` — comment `// draft
    US-255 — ClassResponseTeacherOverlayDraft, not deployed; undefined until
    BE ships`.
- **New** `dtos/attendance-summary-response.dto.ts` — mirrors
  `AttendanceSummary` (draft): `presentDays/absentDays/lateDays/excusedDays/
  recordedDays: number; rate: string`. Comment `// draft US-245`.
- **New (narrow, local)** `dtos/violation-count-response.dto.ts` /
  `leave-count-response.dto.ts` — do NOT reuse `features/discipline` DTOs
  (that repo is permanently force-mock-stubbed and its DTOs assume a fuller
  shape). Only need `{ state: string }[]` (violations, to filter
  `"SUBMITTED"`) and the leave list length. Keep minimal.
- `mappers/teacher-class.mapper.ts` (or `teacher-dashboard.mapper.ts` where
  `toTeacherClass` currently lives — keep in place, don't relocate):
  - Extend `toTeacherClass(dto, studentCount, currentUserId, subjectNames:
    Map<string,string>)`:
    - `roles`: `isHomeroom` (existing calc) → `"homeroom"`; `teachingSubjectIds`
      non-empty → `"subject"`. Both possible (10A1 example, AC).
    - `subjects`: map `teachingSubjectIds` through `subjectNames`, fall back to
      the raw id if a name is missing (same graceful-degrade convention as the
      roster's `displayName?.trim() || memberId`).
    - `kpi`: only set `absentToday`/`pendingGrading` from `dto.absentToday`/
      `dto.pendingGrading` when present (real path — currently never present).
      `demoFields` stays empty here (mock repo sets it separately, see below).
  - **New** `toHomeroomKpi(attendance?: AttendanceSummaryResponseDto,
    violations?: ViolationCountDto[], leaveCount?: number):
    Partial<TeacherClassKpi>` — pure, unit-test-first: `rate: ""` → `undefined`
    attendanceRate; `parseFloat(rate)` otherwise; violations filtered to
    `state === "SUBMITTED"` length; leaveCount passed straight through
    (already server-filtered).
- `repositories/teacher-class.repository.ts`:
  - `listMyClasses()`: after draining `classes`, also drain
    `ASSESSMENT_SCHEME_EP.subjects` **once** (not per class) into an
    `id → name` map (only if any class has `teachingSubjectIds` — skip the
    call otherwise), pass into `toTeacherClass`.
  - **New** `getHomeroomKpi(classId): Promise<ClassResult<Partial<TeacherClassKpi>>>`:
    `Promise.allSettled([attendanceSummary call (returns undefined — no
    termId source, see §0.3, comment explaining why not wired), violations
    drain + filter, leaveRequests drain])`, merge settled values, swallow
    individual rejections into `undefined` fields (never throws — matches AC
    "ẩn ô, không crash"). Interface addition: `ITeacherClassRepository.getHomeroomKpi`.
- `repositories/mock-teacher-class.repository.ts`:
  - Seed `roles`/`subjects` per the AC fixture (10A1: homeroom+subject Toán;
    11B2/12C1/10A3: subject only, varying subject names).
  - `listMyClasses()` sets GVBM classes' `kpi = { absentToday, pendingGrading,
    demoFields: ["absentToday","pendingGrading"] }` (mix zero and >0 values to
    exercise the error/warning-tint AC).
  - `getHomeroomKpi(classId)` returns `{ attendanceRate, openViolations,
    pendingLeave, demoFields: ["attendanceRate"] }` for the homeroom class
    (`openViolations`/`pendingLeave` NOT flagged demo — they're modeled as the
    normal mock/real DI switch, not draft-only, per §0.4).

**Test first**
- `teacher-class.mapper.test.ts`: `deriveClassRoles`/`toTeacherClass` roles
  cases from the AC table (homeroom+subject / subject-only), `sub` NOT read
  (forge test asserting only `memberId` claim drives `isHomeroom`, existing
  pattern already in this file — extend it), missing subject name falls back
  to id.
- **New** `to-homeroom-kpi.test.ts` (or co-located): rate `""` → undefined;
  `"0.87"` → `0.87`; violations mixed states → only `SUBMITTED` counted;
  `Promise.allSettled` partial-failure → repo test (integration layer) asserts
  one rejected sub-call still yields the other two fields.
- `teacher-class.repository.test.ts` (extend): subjects-lookup call skipped
  when no `teachingSubjectIds` present anywhere in the page (avoid the extra
  HTTP round-trip on pure-homeroom teachers); `getHomeroomKpi` partial-failure
  integration case (one of the 3 calls 500s → other 2 populate, no throw).

**Done when**: mapper + repository unit/integration tests green; `tsc` clean
on the new DTO/entity shapes.

## 3. Bootstrap (`src/bootstrap/`)

**Files**
- `endpoint/teacher.endpoint.ts` — add:
  - `classAttendanceSummary: (classId: string) =>
    \`/core/api/v1/classes/${classId}/attendance/summary\`` (comment: draft
    US-245, `termId` query — real call not wired yet, see §0.3).
  - Import `ASSESSMENT_SCHEME_EP.subjects` and `DISCIPLINE_EP.violations`/
    `DISCIPLINE_EP.leaveRequests` directly in the repository — no new
    constants needed for those (already exist, shared by design).
- `di/teacher-class.di.ts`:
  - `makeRepo()` unchanged shape; `TeacherClassRepository` constructor gains
    an injected subject-name resolver (`ResolveSubjectNames`, same shape as
    the existing `ResolveMemberNames` param) — wired only in the real branch,
    `undefined` in mock (mock already knows subject names statically).
  - **New** `makeGetHomeroomKpiUseCase()` factory (mirrors
    `makeListMyTeacherClassesUseCase`), reusing `makeRepo()`.

**Test first**: none new (DI factories aren't unit-tested per convention —
covered transitively by repository/integration tests + the page-level
`Promise.allSettled` composition below).

**Done when**: `bun build` resolves the new imports; no `'server-only'`
leakage into `presentation/`.

## 4. Presentation (`src/features/teacher/presentation/teacher-classes-screen/`)

**Files**
- `teacher-classes-screen.i-vm.ts` — extend `TeacherClassVM`:
  - `roles: ("homeroom" | "subject")[]`, `subjects: {id,string}[]` → derived
    `subjectLabel?: string` (joined, e.g. "Toán" or "Toán, Vật lý" if >1 —
    flagged as an assumption, no AC/mockup example for >1 subject in one
    class) computed in `page.tsx`, not in the component (VM stays a plain
    data contract).
  - `kpi?: { tiles: KpiTileVM[] }` where `KpiTileVM = { key: string; value:
    number; label: string; tone: "neutral" | "warning" | "error"; isDemo:
    boolean }` — tone computed server-side (page.tsx) from the raw numbers per
    the design-spec rule (`> 0` → warning/error tint, else muted), so the
    presentational component stays a pure renderer (no business logic in
    `.tsx`, matches existing `mapScheduleStatusTone` pattern).
  - drop `studentsHref`-only CTA semantics comment — keep `studentsHref`
    field as-is (still the "Mở lớp" target for now).
- `components/class-card.tsx` — **rewrite**: accent stripe (top, 6px,
  `bg-edu-role-parent` when `roles.includes("homeroom")` else `bg-primary`),
  role badges row (delegates to new shared component below), title +
  subtitle, KPI tile grid (`flex flex-wrap`, 2–3 items, each tile a
  `<div>` not a button — static display), CTA "Mở lớp" bottom-right
  (`ChevronRight` + link, replaces the old 3-button footer). Drop the icon
  box + `ComingSoonAction` (not in v3 design).
- **New**, `src/features/teacher/presentation/shared/role-badges.tsx` —
  placed in `presentation/shared/` (not `teacher-classes-screen/components/`)
  **per the packet's own Design Note**: E24.8's class-detail identity header
  reuses it. Props: `{ roles, subjects }` → renders `StatusBadge` tone
  `"purple"`/`"primary"` per role, `"GVCN"` / `"GVBM · <subject>"` copy from
  i18n. (`StatusBadge` shared component already supports arbitrary tone via
  existing token classes — verify `purple` tone exists before assuming; if
  not, extend `StatusBadge`'s tone union — a **variant addition to an
  existing primitive**, not a new component, per
  `component-organization.md` rule 1.)
- **New**, `components/kpi-tile.tsx` — pure presentational, `{ value, label,
  tone, isDemo }` → tabular-nums value, tone bg/text classes, small "demo"
  `StatusBadge`/pill with `aria-label={t("kpi.demoLabel")}` when `isDemo`.
  Local to `teacher-classes-screen/components/` (single-screen use today; E24.8
  doesn't reuse KPI tiles per the packet).
- `teacher-classes-screen.tsx` — swap `ClassCard` import, no structural
  change to the loading/empty/error states (already correct pattern); grid
  gap/columns unchanged (`minmax(280px,1fr)` vs spec's `minmax(300px,1fr)` —
  minor value, align to spec's 300px while touching this file).
- `app/[locale]/t/[tenant]/(app)/teacher/classes/page.tsx` — extend VM
  assembly:
  - Map `roles`/`subjects` from `TeacherClass` → VM directly.
  - Compute GVBM tiles from `cls.kpi` (already resolved list-side, no extra
    call).
  - For classes where `roles.includes("homeroom")`: `Promise.allSettled` one
    `GetHomeroomKpiUseCase.execute(classId)` per homeroom class (in practice
    usually 0–1 per teacher, so this is not a large fan-out) *in the RSC page*
    — no TanStack Query needed (static per page load, no client refetch/
    interactivity on this screen; "Mở lớp" navigates away). Merge into the
    same class's `kpi.tiles`.
  - Tone mapping (`> 0` → warning/error, else neutral) computed here, per
    design-spec rule, not duplicated in the component.

**Test first (Storybook interaction, `.stories.tsx`)** — the 6 states the
packet's AC explicitly names:
1. `HomeroomAndSubject` (10A1: 2 badges, GVCN kpi tiles incl. "Đơn nghỉ chờ"
   only when >0).
2. `SubjectOnly` (1 badge "GVBM · Toán", 2 GVBM tiles).
3. `NoKpi` (kpi undefined → grid shows title/badges only, no empty gap —
   assert via DOM query that the tile container isn't rendered at all, not
   rendered-empty).
4. `Loading` (existing skeleton, unchanged).
5. `Empty` (existing, unchanged).
6. `Error` (existing, unchanged).
   Interaction assertions: badge text present (a11y — role not color-only),
   `tabular-nums` class present on KPI numbers, demo badge `aria-label`.

**Done when**: all 6 stories pass interaction tests; visual matches
`design_src/edu/class-hub.jsx` `ChClassList`/`ChRoleBadges` structurally
(spacing/tokens only — ready for design-review gate).

## 5. i18n (`src/bootstrap/i18n/messages/{vi,en}.json`, namespace `teacherClasses`)

Add under `teacherClasses.card.*` (per packet's Design Notes naming):
- `card.roleBadge.homeroom` = "GVCN" / "Homeroom" (**reuse** existing
  top-level `homeroomBadge` key instead of duplicating — same string, same
  namespace; do not create a second key for the same copy).
- `card.roleBadge.subject` = "GVBM · {subject}" / "Subject · {subject}".
- `card.kpi.absentToday`, `card.kpi.pendingGrading`, `card.kpi.attendanceRate`,
  `card.kpi.openViolations`, `card.kpi.pendingLeave`.
- `card.kpi.demoLabel` = "Số liệu minh hoạ" / "Illustrative data" (used as
  `aria-label`, per AC).
- `card.cta` = "Mở lớp" / "Open class".

**Remove**: `actions.attendance`, `actions.classLog`, `actions.comingSoon`,
`actions.viewStudents` (the old 3-button footer copy) — grep for other
consumers of these exact keys first (expected: none outside this screen) —
this is the "xoá key progress cũ" AC line (no literal "progress" key exists
today; the closest analog — dead footer-button copy — is what actually needs
removing here).

## 6. fe-component-architect / fe-state-engineer — needed?

- **fe-component-architect: recommend spawning.** Two genuinely new composed
  components (`role-badges` — shared, cross-screen contract with E24.8;
  `kpi-tile` — conditional grid with 3 tone variants) plus a `StatusBadge`
  tone-union extension are enough surface area (and enough downstream impact
  on E24.8) to warrant an explicit prop-contract pass before
  `fe-nextjs-engineer` starts, especially the `role-badges` API since E24.8
  will consume it from a different layout context (identity header vs. card).
- **fe-state-engineer: skip.** No TanStack Query / client-state — KPI
  fan-out is a server-side `Promise.allSettled` inside the RSC `page.tsx`,
  same shape as the existing roster name-resolution composition. No
  interactivity on this screen beyond navigation.

## 7. Risks, dependencies, open questions

- **[OPEN QUESTION]** No term-source exists anywhere in the repo for
  `attendanceRate`'s required `termId`. Real wiring of US-245 is blocked
  until either BE adds a default-current-term behavior or FE gets an
  `activeTerm` lookup (candidate: extend the already-shipped
  `GET /core/api/v1/academic-years/active` family, or a new ask to BE). Not
  blocking for this story (mock-only), but flag to `fe-lead`/BE-asks before
  anyone tries to flip `attendanceRate` off mock.
- **[OPEN QUESTION]** Dual-role card (10A1, homeroom + subject) KPI-tile
  behavior isn't specified in design-spec beyond badge count — plan assumes
  GVCN's tile set takes precedence over GVBM's when both roles are present
  (homeroom is the higher-stakes duty). Flag to design for confirmation; not
  blocking (AC's dual-role example only asserts badge count, not tiles).
- **[OPEN QUESTION]** Multi-subject-in-one-class badge copy (`subjectLabel`
  join) has no mockup example — plan joins with ", ". Low risk, cosmetic.
- **Risk**: extending `StatusBadge`'s tone union for `"purple"` (GVCN badge +
  accent stripe reuse `--edu-role-parent`, an existing token — no ADR
  needed) — verify the tone doesn't already exist under a different name
  before adding (grep `StatusBadge` tone map first, in Phase 4).
- **Dependency**: this story **blocks** US-E24.8 on `roles`/`subjects` being
  on `TeacherClass` and on `role-badges.tsx` existing in `presentation/shared/`
  — both delivered here.
- **BE-contract gap, not this story's problem**: US-251's exact
  `pendingGrading` source ("cross-type pending-approval aggregation... TBD
  until US-251 ships") means once BE ships US-255, the field may arrive
  computed differently than the mock's number — no action needed now (mapper
  already treats it as an opaque optional int).
