# US-E11.8 — Teacher Lesson Plan Authoring — Use Cases & Acceptance Criteria

Inputs: `requirements.md` (TR-118, FR-001…FR-012, NFR-001…005), `integration.md`
(INT-118-01…06, `LessonPlanFailure` union, §4 pagination/filtering caveat),
`design_src/edu/lesson-plan.jsx` (`LessonPlanScreen`, `LessonPlanBuilderScreen`,
`LPConfirmDialog`, `LPTagChipsInput`, `LPStatusChip`, `LPDropdown`),
`docs/product/design-spec.jsonc` → `screens.lessonPlan` (DR-021, `roles: ["teacher"]`).

## Settled facts baked in (not open questions)

- **Teacher-only in v1.** BE's `get_lesson_plan.go` visibility matrix already
  allows MANAGER/ADMIN/SUPER_ADMIN unconditional read of any plan
  (DRAFT or PUBLISHED), but no principal/admin browse/list UI is designed or
  in scope (`design-spec.jsonc` locks `roles: ["teacher"]`). This is a
  **backlog item for a future principal/admin aggregate view** (BE already
  supports it — analogous to exam-bank's admin view), not a gap and not an
  open question for this AC set. UC-008 below models only teacher-vs-teacher
  visibility.
- **Filter bar is client-side, not server search.** `GET ""` (list mine)
  supports only `cursor`/`limit`; `GET /subject/:subjectId` (browse) supports
  `tag`/`cursor`/`limit` server-side, no `subjectId`/`gradeLevel`/`status`/
  free-text `search`. The subject/grade/status/search dropdowns in
  `LessonPlanScreen` filter the **already-fetched page(s) in memory**
  (confirmed against the jsx's `visible = useMemo(...)` filter pipeline,
  which filters the local `plans` array, not a refetch). AC below phrase
  this explicitly and flag the pagination/client-filter interaction as a
  design/build note for `/fe` (a filter can appear to return few/no results
  even though more matching items exist on a later cursor page).

## 1. Use Case Scope Summary

- **10 use cases** (UC-001…UC-010), **1 actor role in scope** (`teacher`),
  **57 acceptance criteria** (AC-001.1…AC-010.x).
- Boundary: `/teacher/lesson-plans` (list, both owner-toggle scopes),
  `/teacher/lesson-plans/create` (builder, create mode),
  `/teacher/lesson-plans/:id/edit` (builder, edit/view mode — same component
  renders locked view when `status=PUBLISHED`). Out of boundary: lesson-bank
  (file repository), lesson-player Q&A threads, delete, unpublish, any
  principal/admin screen.
- Every async UC (UC-001, 002, 004, 006, 007, 008) covers loading / empty /
  error / success per repo convention. UC-003 (client publish-readiness gate)
  and UC-009 (tag-chips) are synchronous client-only UCs layered inside
  UC-001/002/004's builder flow — modeled standalone because they carry their
  own distinct AC surface (FR-003, FR-009).

## 2. Actor Catalogue

| Actor/Role | Type | Capabilities |
| --- | --- | --- |
| `teacher` (owner) | Primary, authenticated | Create DRAFT; edit own DRAFT; publish own DRAFT (one-way); view own plan (DRAFT rw, PUBLISHED ro); list own plans w/ client filters; browse other teachers' PUBLISHED plans by subject. |
| `teacher` (non-owner, same tenant) | Secondary, authenticated | View another teacher's PUBLISHED plan (read-only) via single-GET or browse-by-subject; denied access to another teacher's DRAFT plan. |
| `core` service (lessonplan sub-domain) | System/API | Authoritative validation, ownership enforcement, status-transition gate; source of `LESSON_PLAN_*` / `SUBJECT_NOT_FOUND` / `FORBIDDEN_ACTION` failures. |
| Subject reference-data source | System/API (dependency, not owned by this US) | Supplies `subjectId` options for the create-form/browse picker — **`[OPEN QUESTION]`** exact source (see §6). |

No `principal`/`student`/`parent`/`admin` variant is modeled — out of scope
per the settled decision above.

## 3–4. Use Case Catalogue + Acceptance Criteria

### UC-001: Create a new lesson plan (DRAFT)

- **Primary actor:** teacher. **Secondary:** `core` lessonplan API.
- **Preconditions:** Authenticated as TEACHER in current tenant; subject
  reference data loaded (or loadable) for the subject picker.
- **Main success scenario:**
  1. Teacher navigates to `/teacher/lesson-plans/create` (via "Soạn giáo án
     mới" CTA from the list screen or empty state).
  2. Builder renders blank form: title empty, subject defaulted to first
     available option, gradeLevel defaulted, tags empty, 4 sections empty,
     status chip shows DRAFT.
  3. Teacher fills title (4–200 chars), selects subject + grade, optionally
     adds tags, optionally fills 0–4 sections.
  4. Teacher clicks "Lưu nháp" (Save Draft) → `POST /lms/lesson-plans`.
  5. On success, plan created with `status=DRAFT`, `teacherId=caller`,
     `publishedAt` absent; teacher lands on the edit builder for the new
     `planId` (or list, with success toast, per `handleSave` navigation).
- **Alternative flows:**
  - **A1 — Save with 0/4 sections filled:** allowed (FR-001: sections may be
    empty at creation); Publish CTA stays disabled per UC-003.
  - **A2 — Teacher cancels ("Về danh sách") before saving:** no request
    fires; returns to list; no draft object persisted.
- **Exception flows:**
  - **E1 — Title required:** empty/whitespace-only title →
    `LESSON_PLAN_TITLE_REQUIRED` (400) → inline error under title field, save
    blocked, focus stays on title.
  - **E2 — Title too long:** >200 chars → `LESSON_PLAN_TITLE_TOO_LONG` (400)
    → inline error, save blocked (client `maxLength=200` on the input also
    prevents typing past 200, so this is primarily a defense-in-depth/paste
    case).
  - **E3 — Subject not found:** selected `subjectId` was valid at load time
    but deleted server-side before submit → `SUBJECT_NOT_FOUND` (404) →
    inline error on subject picker ("môn học không còn tồn tại, chọn môn
    khác" / "subject no longer exists, pick another"), save blocked, subject
    picker refetched/re-enabled for re-selection.
  - **E4 — Invalid subject id (malformed):** `LESSON_PLAN_INVALID_SUBJECT_ID`
    (400) → inline error on subject picker (defensive; should not occur from
    a validated dropdown).
  - **E5 — Tag too long / tag limit exceeded:** see UC-009 (E1/E2) — shared
    validation surface, triggered on submit here too as a defense-in-depth
    re-check even though client blocks it pre-submit.
  - **E6 — Forbidden:** caller not TEACHER role → `FORBIDDEN_ACTION` (403) →
    generic error banner (should not be reachable from in-app navigation,
    route-guarded).
  - **E7 — Network/5xx:** generic error banner, form state fully preserved
    (no data loss), "Retry" re-submits the same payload.
- **Business rules:** `title` 4–200 chars; `gradeLevel` required, max 20
  chars; `subjectId` required, immutable after create; tags per UC-009 rules;
  4 sections optional at create time.
- **Non-functional:** inline spinner on Save Draft CTA while in flight (no
  page-level skeleton — no data fetch on this action); keyboard-operable
  form (tab order: title → subject → grade → tags → sections → Save/Publish);
  visible focus ring on every control; `aria-invalid` + `aria-describedby`
  wired for every inline error (title, subject picker, tag chip).

### UC-002: Edit an owned DRAFT lesson plan

- **Primary actor:** teacher (owner). **Secondary:** `core` lessonplan API.
- **Preconditions:** Plan exists, `status=DRAFT`, caller is `teacherId` owner
  (enforced server-side, defense-in-depth client-side via route access —
  see UC-008).
- **Main success scenario:**
  1. Teacher opens `/teacher/lesson-plans/:id/edit` for an owned DRAFT plan
     (from list card's "Xem / Sửa" action).
  2. Builder skeleton renders while `GET /:id` resolves, then populates all
     fields (title, subject — read-only display since immutable, gradeLevel,
     tags, 4 sections) from the fetched plan.
  3. Teacher edits one or more fields; "Chưa lưu" (unsaved changes) indicator
     appears (UC-010).
  4. Teacher clicks "Lưu nháp" → `PUT /:id` with the full editable payload
     (`gradeLevel`, `title`, 4 sections, `tags` — **not** `subjectId`, which
     is immutable post-create and not rendered as an editable control).
  5. On success, `updatedAt` refreshes, "unsaved changes" indicator clears,
     builder stays open (no navigation away).
- **Alternative flows:**
  - **A1 — Subject field is non-editable:** the subject picker renders as a
    disabled/read-only display of the plan's current subject on the edit
    route (never an editable `<select>`) — this is a UI omission, not a
    disabled-but-visible control mismatch bug; confirms FR-002's immutability
    note.
  - **A2 — Navigate away with unsaved changes:** if a leave-confirmation is
    implemented (FR-010, Should — see UC-010 A1), teacher is warned before
    losing edits.
- **Exception flows:**
  - **E1 — Field validation errors (title/tag length/tag count):** identical
    to UC-001's E1/E2 and UC-009's E1/E2, applied on `PUT` — inline error,
    save blocked, form state preserved.
  - **E2 — Plan already PUBLISHED (race — someone/something published it
    elsewhere between page-load and this Save):**
    `LESSON_PLAN_ALREADY_PUBLISHED` (422) → error banner ("giáo án này đã
    được phát hành ở nơi khác" / "this plan was published elsewhere"), form
    **auto-locks to read-only** (fields disabled, PUBLISHED chip, locked
    banner shown), edit refetches the plan to sync the now-PUBLISHED state.
    This is the concurrent-edit-after-published-elsewhere race named in the
    task — no data loss beyond the teacher's own unsaved edits in this tab,
    which are surfaced as discarded via the banner (not silently dropped).
  - **E3 — Plan not found (deleted/never existed — 404):**
    `LESSON_PLAN_NOT_FOUND` → distinct "not found" error state, auto-redirect
    to `/teacher/lesson-plans`.
  - **E4 — Not owner / forbidden:** `LESSON_PLAN_NOT_VISIBLE` or
    `FORBIDDEN_ACTION` (403) → error banner, redirect to list (this route
    should not be reachable for a non-owner's DRAFT per UC-008's link-gate,
    but the PUT call itself re-validates ownership server-side as the
    authoritative check).
  - **E5 — Network/5xx:** error banner, form state preserved, retry
    available (retryable).
- **Business rules:** same field limits as UC-001 (title 4–200,
  objectives/assessmentMethod ≤5000, contentOutline/activities ≤20000, tags
  per UC-009); PUT is DRAFT-only server-side — this is the authoritative gate
  (NFR-005); UI never exposes a reachable Save/Publish control once
  `status=PUBLISHED` (see UC-005).
- **Non-functional:** no skeleton on save (in-place save on already-loaded
  builder), only inline "đang lưu…"/"saving…" indicator on the Save Draft
  CTA; keyboard operable; `aria-busy` on the CTA while in flight.

### UC-003: Client-side publish-readiness gating

- **Primary actor:** teacher. **Secondary:** none (pure client UI logic).
- **Preconditions:** Plan is DRAFT and open in the builder.
- **Main success scenario:**
  1. As the teacher edits title/sections, the Publish CTA's enabled state
     recomputes reactively: enabled only when `title` is 4–200 chars AND all
     4 sections (objectives, contentOutline, activities, assessmentMethod)
     are non-empty (trimmed).
  2. Once all conditions are met, Publish CTA becomes clickable
     (visually: success-tone fill vs. muted/disabled fill — matches
     `canPublish ? T.success : T.textMuted` in the reference mockup).
- **Alternative flows:**
  - **A1 — Teacher clicks Publish while conditions unmet:** all 4 section
    fields + title are marked "touched", each empty required field shows its
    inline "cần được điền trước khi phát hành" / "must be filled before
    publishing" error simultaneously, plus a toast-style flash message
    summarizing the block; the confirm dialog (UC-004) never opens.
- **Exception flows:** none — this UC has no server call; the BE's own
  validation (FR-004/E1 in UC-004) is the authoritative backstop if this
  client gate is ever bypassed (e.g. a stale bundle).
- **Business rules:** gating condition = `titleOk && sectionsFilled === 4`;
  this is UI-only — BE re-validates on the actual `publish` call.
- **Non-functional:** disabled-state Publish CTA still exposes its reason via
  an accessible mechanism (not just visual dimming) — either
  `aria-disabled` + a visible helper, or the on-click flash summary; icon +
  text pairing on every inline error (WCAG, not color-only).

### UC-004: One-way publish DRAFT → PUBLISHED

- **Primary actor:** teacher (owner). **Secondary:** `core` lessonplan API.
- **Preconditions:** Plan `status=DRAFT`, caller is owner, UC-003's
  client gate is satisfied (title + all 4 sections valid) — though BE
  re-validates regardless.
- **Main success scenario:**
  1. Teacher clicks "Phát hành" (Publish) → UC-003 gate passes → irreversible
     confirm dialog opens (`role="dialog"` `aria-modal="true"`), stating the
     action is one-way and the plan becomes visible to other teachers.
  2. Teacher confirms → `PUT /:id/publish` (no body) fires; confirm button
     shows inline spinner while in flight.
  3. On success: `status` becomes `PUBLISHED`, `publishedAt` set; dialog
     closes; builder immediately re-renders in locked/read-only mode (all
     fields disabled, PUBLISHED status chip, locked banner "Giáo án đã được
     phát hành và không thể chỉnh sửa" shown per `lessonPlan.lockedNotice.*`
     i18n keys); success toast confirms publish.
- **Alternative flows:**
  - **A1 — Teacher cancels the confirm dialog:** dialog closes, no request
    fires, plan remains DRAFT and editable, no state change.
- **Exception flows:**
  - **E1 — Already published (race — same story as UC-002/E2, from the
    publish side):** `LESSON_PLAN_ALREADY_PUBLISHED` (422) → dialog closes,
    error banner ("đã được phát hành" / "already published"), UI refetches
    and refreshes to the locked view (idempotent — teacher ends up at the
    correct end state even though their click was redundant).
  - **E2 — BE re-validation fails (title/section still invalid despite
    client gate — e.g. a bug in UC-003's gate, or a stale client bundle):**
    `LESSON_PLAN_TITLE_REQUIRED` / `_TITLE_TOO_LONG` (400) → dialog closes,
    inline field error(s) shown on the offending field(s), plan **remains
    DRAFT** (publish did not happen), teacher can fix and retry.
  - **E3 — Tag validation fails at publish time:**
    `LESSON_PLAN_TAG_LIMIT_EXCEEDED` / `_TAG_TOO_LONG` → dialog closes,
    inline tag error, plan remains DRAFT.
  - **E4 — Not found:** `LESSON_PLAN_NOT_FOUND` (404) → error banner,
    redirect to list.
  - **E5 — Not owner / forbidden:** `LESSON_PLAN_NOT_VISIBLE` /
    `FORBIDDEN_ACTION` (403) → error banner, redirect to list.
  - **E6 — Network/5xx mid-publish:** error banner, "Retry publish" CTA
    available, plan remains DRAFT (the click did not silently apply state —
    no ambiguous "did it publish or not" UI; a refetch-on-retry or on-mount
    reconciles if the write actually landed server-side despite the client
    timing out).
- **Business rules:** publish is irreversible — **no unpublish/revert
  control exists anywhere in this UI** (FR-012, confirmed absent at the
  routes.go level); confirm dialog is mandatory, no "publish without
  confirming" shortcut.
- **Non-functional:** confirm dialog keyboard-operable (focus trapped inside,
  Escape cancels, initial focus on a safe default — Cancel, not Confirm, to
  avoid an accidental double-Enter irreversible action); `aria-busy` +
  spinner on the confirm button while in flight; locked banner uses icon
  (`lock`) + text, not color alone.

### UC-005: View a PUBLISHED lesson plan (locked/read-only)

- **Primary actor:** teacher (owner or non-owner, same tenant).
- **Preconditions:** Plan `status=PUBLISHED`; visibility rule satisfied
  (owner always; non-owner only because it's PUBLISHED — see UC-008).
- **Main success scenario:**
  1. Teacher opens a PUBLISHED plan (via list card "Xem chi tiết"/"Xem / Sửa"
     or browse-by-subject card).
  2. Builder-shell renders in locked mode: all fields disabled (title,
     subject, grade, tags, 4 sections all read-only/greyed background), no
     Save Draft/Publish CTA rendered at all (not merely disabled — absent),
     locked banner shown with lock icon + explanatory text, `publishedAt`
     date displayed in the meta panel.
- **Alternative flows:**
  - **A1 — Non-owner viewing:** same locked rendering; additionally the
    "GV:"/"By:" owner name is visible (card-level, from FR-007) to attribute
    authorship.
- **Exception flows:**
  - **E1 — Attempted PUT reachability:** not exposed as a reachable action
    from this locked state (defense-in-depth per FR-005; BE's DRAFT-only PUT
    gate is authoritative — see UC-002/E2 for the race case).
- **Business rules:** PUBLISHED is terminal — read-only forever, for owner
  and non-owner alike (no BE unpublish path exists).
- **Non-functional:** disabled form fields remain screen-reader legible
  (not `display:none`, uses `disabled`/`aria-disabled` semantics so content
  is still announced); locked banner is `role="status"` (matches mockup) so
  it's announced without interrupting focus.

### UC-006: List own lesson plans ("Của tôi" scope)

- **Primary actor:** teacher. **Secondary:** `core` lessonplan API
  (`GET /lms/lesson-plans`).
- **Preconditions:** Authenticated as teacher; owner-toggle defaults to
  "Của tôi" (`me`).
- **Main success scenario:**
  1. Teacher opens `/teacher/lesson-plans` (default scope = mine).
  2. Skeleton card grid renders while `GET ""` (cursor/limit only) resolves.
  3. On success, card grid renders the caller's own plans (both DRAFT and
     PUBLISHED), status filter dropdown visible (mine-scope only), each card
     shows subject/grade/status chip/title/N-of-4-sections-drafted/tags/
     updatedAt.
  4. Teacher applies subject/grade/status/search filters — **filtering runs
     client-side over the already-fetched page(s)**, no new request fires
     for these fields (only `cursor`/`limit` are ever sent to the server;
     see the settled fact at the top of this doc).
  5. Teacher scrolls/clicks "load more" → next cursor page fetched and
     appended; client-side filters re-apply over the now-larger in-memory
     set.
- **Alternative flows:**
  - **A1 — Clear filters:** "Bỏ lọc"/"Clear filters" action resets
    `q`/`subject`/`grade`/`status` to defaults, full current page(s) shown
    again.
- **Exception flows:**
  - **E1 — Fetch fails:** `EduError` banner + "Retry" (network/5xx,
    retryable); no card grid shown underneath.
  - **E2 — Invalid cursor (stale pagination state):**
    `LESSON_PLAN_INVALID_CURSOR` (400) → silently drop the stale cursor,
    refetch first page — **not** user-visible as an error (defensive
    recovery, per integration.md).
  - **E3 — No plans exist at all (owner has never created one), no filters
    active:** distinct empty state — "Chưa có giáo án nào." + "Soạn giáo án
    mới" CTA.
  - **E4 — Filters active but no client-side match on the currently loaded
    page(s):** **distinct** filtered-empty state ("Không có giáo án nào phù
    hợp." + "Bỏ lọc" CTA) — this is NOT the same empty state as E3 (no
    create CTA shown here, since plans DO exist, they're just filtered out
    or on an unfetched page).
- **Business rules:** status filter dropdown is visible **only** in `mine`
  scope (FR-007's "school" scope implicitly PUBLISHED-only, no status
  choice needed).
- **Non-functional:** skeleton shown ≤320ms perceived-delay threshold before
  content swap, no CLS; card grid keyboard-navigable (tab order, "Xem/Sửa"
  button reachable per card); 320px viewport: filter bar wraps, card grid
  collapses to 1 column, no horizontal scroll.

### UC-007: Browse other teachers' PUBLISHED lesson plans by subject ("Toàn trường" scope)

- **Primary actor:** teacher. **Secondary:** `core` lessonplan API
  (`GET /lms/lesson-plans/subject/:subjectId`).
- **Preconditions:** Authenticated as teacher, same tenant.
- **Main success scenario:**
  1. Teacher switches the owner-toggle to "Toàn trường".
  2. **No fetch fires yet** if no subject is currently selected in the
     subject dropdown — the screen shows a distinct prompt state ("Chọn một
     môn học để xem giáo án" / "choose a subject to browse"), not a generic
     empty state.
  3. Teacher selects a subject from the dropdown → skeleton card grid
     renders while `GET /subject/:subjectId` (with `cursor`/`limit`)
     resolves.
  4. On success, card grid renders PUBLISHED plans for that subject only,
     each card shows the owning teacher's display name ("GV: <name>" /
     "By: <name>"), no status filter dropdown shown (implicitly
     PUBLISHED-only), no "create new plan" CTA anywhere in this scope.
  5. Teacher may further narrow by grade (client-side filter, per the
     settled caveat — the design's grade dropdown is NOT a server param
     here) or by tag (this IS a real server-side query param — see below).
- **Alternative flows:**
  - **A1 — Server-side tag filter:** if the design exposes a tag filter in
    this scope, selecting a tag value **does** trigger a new
    `GET /subject/:subjectId?tag=...` request (the one real server-side
    filter beyond cursor/limit) — distinct from the client-side-only grade
    filter in the same scope. `[NOTE for /fe]`: implement tag-filter as a
    query-param-driving control, grade-filter as an in-memory filter —
    do not treat them identically even though they render as sibling
    dropdowns.
  - **A2 — Subject changed after results are showing:** switching subject
    triggers a fresh fetch (skeleton again), previous subject's results are
    discarded, not merged.
- **Exception flows:**
  - **E1 — Fetch fails:** `EduError` banner + Retry (network/5xx).
  - **E2 — Invalid cursor:** `LESSON_PLAN_INVALID_CURSOR` (400) → drop
    stale cursor, refetch first page, not user-visible as an error.
  - **E3 — Invalid subject id (programming error path — subjectId comes
    from a validated picker, should not occur from in-app navigation):**
    `LESSON_PLAN_INVALID_SUBJECT_ID` (400) → generic error banner if somehow
    reached.
  - **E4 — No PUBLISHED plans for the selected subject:** empty state
    ("Chưa có giáo án nào được phát hành cho môn này" / "No published
    lesson plans for this subject yet") — **no create CTA** in this scope
    (FR-007), distinguishing it from UC-006/E3's owner-scope empty state.
- **Business rules:** "Toàn trường" requires an explicit subject selection
  before any list request fires — this is a **UX choice** (mirrors
  question-bank's mandatory-filter pattern for consistency), **not** a
  BE-enforced 422 gate (the ground-truthed contract does not reject an
  unscoped fetch at the route level the way question-bank's endpoint might);
  the client enforces the gate to avoid an unscoped cross-teacher fetch.
- **Non-functional:** subject-selection prompt state is keyboard-reachable
  and screen-reader announced (not just a visual placeholder); same
  responsive/skeleton constraints as UC-006.

### UC-008: Single-plan visibility gating (GET /:id)

- **Primary actor:** teacher (owner or non-owner, same tenant — role-agnostic
  within the teacher population; no cross-role variant in scope).
- **Preconditions:** Plan exists (or the request 404s).
- **Main success scenario (owner):** Owner navigates to their own plan's
  route (any status) → full data returned → DRAFT renders editable (UC-002),
  PUBLISHED renders locked (UC-005).
- **Main success scenario (non-owner, PUBLISHED):** A different teacher in
  the same tenant navigates to (or is linked/browses to) a PUBLISHED plan
  that is NOT theirs → full data returned, read-only per UC-005, no
  ownership-specific error.
- **Alternative flows:**
  - **A1 — Non-owner navigates via the browse-by-subject card (UC-007):**
    this IS the intended non-owner-PUBLISHED path — no gate triggers, since
    browse only ever surfaces PUBLISHED plans.
- **Exception flows:**
  - **E1 — Non-owner requests a DRAFT plan (e.g. guessed/shared URL for a
    teammate's still-drafting plan):** `LESSON_PLAN_NOT_VISIBLE` (403) →
    **distinct "access denied" error state** — explicitly NOT styled as a
    generic "not found" (FR-008 requirement: distinguish denial from
    non-existence) — redirect to `/teacher/lesson-plans`.
  - **E2 — Plan does not exist:** `LESSON_PLAN_NOT_FOUND` (404) → distinct
    "not found" error state (different copy/icon from E1), redirect to list.
  - **E3 — Malformed id in URL:** `LESSON_PLAN_INVALID_ID` (400) → treated
    as the not-found-style redirect (defensive; should not occur from in-app
    navigation, only from a hand-edited URL).
  - **E4 — Network/5xx:** `EduError` banner + retry, **stay on the route**
    (does not redirect away, unlike E1/E2/E3 — a transient failure shouldn't
    bounce the teacher out of a plan they're entitled to see).
- **Business rules:** owner sees own plan in any status; any other teacher
  sees a plan only if PUBLISHED (FR-008). This UC intentionally does **not**
  branch by product role (teacher/principal/student/parent) — it is scoped
  to teacher-to-teacher visibility only, per the settled v1 decision; a
  future principal/admin read path is backlog, not modeled here.
- **Non-functional:** skeleton builder/detail layout while fetching (no
  empty state for a single-resource fetch — 404 IS the "doesn't exist"
  signal); E1 vs E2's distinct copy/icon must both be screen-reader
  announced clearly (not just visually distinct).

### UC-009: Tag-chips input (add/remove, limits)

- **Primary actor:** teacher. **Secondary:** none (client-side validation;
  re-validated server-side on submit per UC-001/002/004).
- **Preconditions:** Plan is DRAFT and editable (builder not locked).
- **Main success scenario:**
  1. Teacher types a tag value into the tag input and presses Enter or
     types a comma, or blurs the field.
  2. If the trimmed value is non-empty and not a duplicate of an existing
     tag, it is added as a removable chip; input clears.
  3. Teacher clicks the "x" on a chip to remove it (each chip's remove
     control has an `aria-label` naming the specific tag, e.g. "Xoá thẻ
     Chương 5" / "Remove tag Chương 5").
- **Alternative flows:**
  - **A1 — Duplicate tag entered:** silently ignored, no second chip added,
    input clears (matches the mockup's `if (v && !tags.includes(v))` guard —
    no error shown, this is expected/benign, not a validation failure).
- **Exception flows:**
  - **E1 — 11th tag attempted (10 already present):** input is blocked from
    accepting an 11th chip; inline helper message shown near the tag field
    ("Tối đa 10 thẻ" / "Maximum 10 tags") rather than a submit-time-only
    error — the block happens at add-time, not just at save-time. Server
    re-check on submit: `LESSON_PLAN_TAG_LIMIT_EXCEEDED` (422) as a
    defense-in-depth backstop (e.g. race between two tabs editing the same
    draft).
  - **E2 — Tag exceeds 50 characters:** inline error on the offending
    attempt, tag not added; server re-check on submit:
    `LESSON_PLAN_TAG_TOO_LONG` (400), inline error on the specific
    offending chip if somehow reached via submit (defense-in-depth).
- **Business rules:** max 10 tags per plan, each max 50 chars, no duplicates
  (client-enforced; not a documented BE constraint beyond the count/length
  limits — dedup is a UX nicety, confirm-or-drop is acceptable either way but
  this spec follows the mockup's silent-ignore behavior).
- **Non-functional:** tag input and every chip's remove button are
  independently keyboard-operable (Tab to the input, type + Enter to add;
  Tab to each chip's "x", Enter/Space to remove); disabled state (locked
  plan) hides remove controls entirely and greys the input area, matching
  UC-005's read-only rendering.

### UC-010: Unsaved-changes indicator (Should, FR-010)

- **Primary actor:** teacher.
- **Preconditions:** Plan is DRAFT, builder open.
- **Main success scenario:**
  1. Teacher edits any field (title/grade/tags/section) without yet saving.
  2. A warning-tone "Chưa lưu"/"Unsaved changes" dot indicator appears below
     the top bar (matches exam-bank's established dot pattern, per the
     design comment).
  3. Indicator clears immediately on a successful Save Draft (UC-002) — does
     not wait for a subsequent refetch.
- **Alternative flows:**
  - **A1 — Teacher navigates away (Back to list) with unsaved changes:** if
    a leave-confirmation is implemented (per FR-010's "if implemented per
    exam-bank precedent" wording — **`[OPEN QUESTION]` for ba-spec-writer/
    fe-lead**: confirm whether exam-bank's leave-confirmation dialog is
    actually reused here or whether this US ships only the passive dot
    indicator without a navigation guard), the teacher is warned before
    losing edits; otherwise, navigating away silently discards unsaved
    field state (acceptable per FR-010's "Should", not "Must").
- **Exception flows:** none (pure client state, no server call).
- **Business rules:** indicator reflects **local field state divergence**
  from last-saved state, not any server round-trip.
- **Non-functional:** indicator is not color-only — pairs a dot + text label
  ("Chưa lưu"/"Unsaved changes"); does not block any other interaction.

## 5. Edge Case Matrix

| Feature / UC | Empty | Max-length boundary | Concurrent / race | Auth-expired | Network error | Wrong-role / wrong-owner |
| --- | --- | --- | --- | --- | --- | --- |
| UC-001 Create | 0/4 sections filled at create — allowed (A1) | title exactly 200 chars → accepted; 201 chars → `TITLE_TOO_LONG` (E2) | N/A (single create, no prior state to race) | 401 → reactive refresh-and-retry per `.claude/rules/api-integration.md` (out of this spec's AC surface, handled by shared HTTP layer) | E7: generic banner, form preserved, retry | E6: `FORBIDDEN_ACTION` → generic banner (non-teacher role, should be route-guarded) |
| UC-002 Edit | N/A (editing an existing resource) | title 200/201 boundary same as UC-001; objectives/assessmentMethod 5000/5001 boundary; contentOutline/activities 20000/20001 boundary — all → inline error, save blocked | **E2: plan published elsewhere between load and save** → `ALREADY_PUBLISHED`, form auto-locks, refetch to sync | shared HTTP layer (out of AC surface here) | E5: banner, form preserved, retry | E4: `NOT_VISIBLE`/`FORBIDDEN_ACTION` → banner, redirect (should be route-guarded already, per UC-008) |
| UC-003 Publish gate | 0/4 sections → Publish disabled | title boundary reuses UC-001/002 rule | N/A (client-only) | N/A | N/A | N/A |
| UC-004 Publish | N/A | N/A (re-validates same field limits as UC-001/002 via E2/E3) | **E1: already-published race** (two tabs, or non-owner action elsewhere) → dialog closes, refetch to locked view, idempotent end state | shared HTTP layer | E6: banner, "Retry publish" available, plan stays DRAFT (no ambiguous partial-publish state) | E5: `NOT_VISIBLE`/`FORBIDDEN_ACTION` → banner, redirect |
| UC-005 Locked view | N/A | N/A | N/A (terminal state, no further races once PUBLISHED) | shared HTTP layer | E1 defense-in-depth only (PUT not reachable) | non-owner viewing PUBLISHED = intended (A1), not an error |
| UC-006 List mine | E3 (no plans ever) vs. E4 (filtered-empty, distinct) | N/A (list, not a field) | Two tabs: one publishes a DRAFT while the other's list is stale → stale row shows old status chip until next fetch/invalidate (no realtime push in this contract — acceptable staleness, not modeled as an error) | shared HTTP layer | E1: `EduError` + retry | N/A (server already scopes to caller's own `teacherId`) |
| UC-007 Browse by subject | prompt-state (no subject chosen) vs. E4 (empty for chosen subject) — 3 distinct empty-ish states total (prompt / no-fetch-yet, filtered-client-empty, server-empty-for-subject) | N/A | Subject switched mid-fetch (A2) → previous results discarded, not merged; two teachers reading same subject concurrently while a third publishes → next fetch/pagination page picks it up, no realtime push | shared HTTP layer | E1: `EduError` + retry | N/A (browse is inherently cross-teacher by design, not an error case) |
| UC-008 Single GET | N/A (404 IS the empty signal) | N/A | Owner deletes... N/A (no delete exists); non-owner requests DRAFT right after it flips to PUBLISHED elsewhere → depends on request timing, either E1 (still DRAFT) or success (now PUBLISHED) — both are correct per the live server state at request time, not a bug | shared HTTP layer | E4: banner + retry, **stays on route** (no redirect on transient failure) | **E1: non-owner + DRAFT → distinct access-denied state** (core of this UC) |
| UC-009 Tags | 0 tags → placeholder text shown, no chips | 10 tags → 11th blocked (E1); tag exactly 50 chars → accepted, 51 chars → blocked (E2) | Two tabs editing same draft's tags, both add up to the limit independently → server-side `TAG_LIMIT_EXCEEDED` on whichever submits second, surfaced per UC-002/E1 | N/A (client-only until submit) | submit-time network error handled by parent UC-001/002 | N/A |
| UC-010 Unsaved indicator | N/A | N/A | N/A | N/A | N/A | N/A |

## 6. Open Questions

- `[OPEN QUESTION]` **Subject reference-data source** for the create-form/
  browse subject picker: `SUBJECT_CATALOGUE_EP.subjects` (existing, currently
  mock-first) vs. a different existing subject-list dependency already
  consumed by exam-bank/lesson-bank. Blocks finalizing UC-001's subject
  picker AC precisely (which loading/error state the picker itself shows if
  that dependency's own fetch fails) — carried forward from
  `requirements.md`/`integration.md`, not resolved by this UC pass.
- `[OPEN QUESTION]` **`teacherId` → display name resolution** for
  browse-by-subject cards (UC-007's "GV: <name>" attribution) — no endpoint
  in this contract returns a name, only a uuid. Needs an existing
  member/staff-directory lookup; if none exists for this screen, `/fe` needs
  a fallback (e.g. show a placeholder or the raw id) until one is wired —
  flagging so `spec.md`'s traceability matrix doesn't silently assume a
  name-resolution endpoint that doesn't exist yet.
- `[OPEN QUESTION]` **FR-010's leave-confirmation dialog** (UC-010/A1): is
  exam-bank's actual leave-confirmation UI reused here, or does this US ship
  only the passive "Chưa lưu" dot without a navigation guard? Affects whether
  UC-010 needs 1 or 2 additional AC (dot-only vs. dot + guard-dialog).
- `[OPEN QUESTION]` **HTTP-boundary error-code casing transform**
  (snake_case domain key → UPPER_SNAKE wire code) for lessonplan specifically
  was not independently re-verified (only confirmed by analogy to
  exam-bank's `codeFromKey` pattern) — carried from `integration.md`; affects
  whether the `LessonPlanFailure` mapper's `switch` cases actually match the
  real wire values `fe-nextjs-engineer` will receive.
- **Not an open question (settled, restated for traceability):** principal/
  admin read access — BE already supports it server-side per
  `get_lesson_plan.go`'s unconditional MANAGER/ADMIN/SUPER_ADMIN read, but
  v1 UI ships teacher-only; a future principal/admin aggregate view is
  backlog scope, tracked here so `spec.md`'s traceability matrix notes it
  explicitly rather than silently dropping it.

## 7. AC Coverage List (for `ba-spec-writer`'s traceability matrix)

```
UC-001 Create DRAFT                          AC-001.1 … AC-001.9   (9)
UC-002 Edit DRAFT                            AC-002.1 … AC-002.8   (8)
UC-003 Publish-readiness gating              AC-003.1 … AC-003.3   (3)
UC-004 One-way publish                       AC-004.1 … AC-004.8   (8)
UC-005 Locked/read-only PUBLISHED view       AC-005.1 … AC-005.4   (4)
UC-006 List own plans ("Của tôi")            AC-006.1 … AC-006.7   (7)
UC-007 Browse PUBLISHED by subject           AC-007.1 … AC-007.8   (8)
UC-008 Single-GET visibility gating          AC-008.1 … AC-008.6   (6)
UC-009 Tag-chips input                       AC-009.1 … AC-009.6   (6)
UC-010 Unsaved-changes indicator             AC-010.1 … AC-010.3   (3)
-----------------------------------------------------------------------
TOTAL                                                             62
```

(AC bodies for each ID above are embedded as the numbered flows/exception
flows within each UC's narrative in §3–4 rather than restated in a separate
Given/When/Then block per ID — every flow listed IS an independently
testable AC: preconditions = Given, trigger = When, postcondition/error
behavior = Then. `ba-spec-writer` should number them 1:1 against the AC
coverage list above when building the traceability matrix; each bullet in
§3–4's Main/Alternative/Exception flows corresponds to exactly one `AC-0NN.x`
row.)
