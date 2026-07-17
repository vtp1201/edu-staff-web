# Feature Spec — Teacher Lesson Plan Authoring (US-E11.8)

Status: Draft   Lane: normal
Sources: `requirements.md` (TR-118, FR-001…FR-012, NFR-001…005) + `integration.md`
(INT-118-01…06, `LessonPlanFailure` union, §4 pagination/filter resolution) +
`use-cases.md` (UC-001…UC-010, 62 AC, edge-case matrix) + `docs/product/design-spec.jsonc`
→ `screens.lessonPlan` + `design_src/edu/lesson-plan.jsx` (`LessonPlanScreen`,
`LessonPlanBuilderScreen`) + DR-021 (2026-07-17).

This is the single document `fe-lead`/`fe-nextjs-engineer` build from. It does not
re-derive layout (cite `design-spec.jsonc` → `screens.lessonPlan` for every visual
value) and does not re-open settled scope decisions from the prior BA passes.

---

## 1. Scope & Objectives

**Purpose.** Let a `teacher` author a structured lesson-plan document (title,
subject, grade level, tags, and exactly 4 document sections: objectives,
contentOutline, activities, assessmentMethod), save it as an editable `DRAFT`,
and irreversibly publish it to a read-only `PUBLISHED` state visible to other
teachers in the tenant by subject. Built against the ground-truthed `core`
service `lessonplan` sub-domain contract (6 real endpoints, no delete, no
unpublish).

**In scope**
- Create DRAFT (title, subjectId, gradeLevel, tags, optionally 0–4 sections).
- Edit DRAFT (all fields except `subjectId`, which is immutable post-create).
- Client-side publish-readiness gating (title + all 4 sections non-empty).
- One-way publish DRAFT → PUBLISHED behind an irreversible-confirm dialog.
- Locked/read-only rendering of any PUBLISHED plan (owner or non-owner).
- List own plans ("Của tôi" scope: DRAFT + PUBLISHED, client-side filters).
- Browse other teachers' PUBLISHED plans by subject ("Toàn trường" scope).
- Tag-chips input (max 10 tags, 50 chars each, no duplicates).
- Unsaved-changes indicator (Should, FR-010).

**Out of scope** (do not build, do not silently add)
- Delete — no BE endpoint (FR-011, Won't).
- Unpublish/revert to DRAFT — not modeled by BE (FR-012, Won't).
- `lesson-bank` (file-sharing repository feature) — unrelated domain.
- Per-lesson Q&A comment thread (`LMS_EP.questions`) — unrelated.
- Principal/admin aggregate read screen — BE already supports the read
  server-side (see §8 Constraints), but no UI is designed or scoped for v1;
  this is a **backlog item**, not silently dropped, not built here.
- Question Bank screen — same DR-021 origin, separate US/packet.

**Definitions**
- *DRAFT* — editable status; owner-only write access.
- *PUBLISHED* — terminal, read-only status; visible to any tenant teacher.
- *Document section* — one of exactly 4 named plain-text fields (`objectives`,
  `contentOutline`, `activities`, `assessmentMethod`); no richer/nested schema.
- *Owner-toggle scope* — UI concept, not a BE param: "Của tôi" (`me`, hits
  `GET ""`) vs. "Toàn trường" (`all`, hits `GET /subject/:subjectId`).

---

## 2. Actors & Roles

| Actor | Access |
| --- | --- |
| `teacher` (owner) | Create; edit own DRAFT; publish own DRAFT (one-way); view own plan (DRAFT rw / PUBLISHED ro); list own plans; browse others' PUBLISHED plans by subject. |
| `teacher` (non-owner, same tenant) | View another teacher's PUBLISHED plan read-only (single-GET or browse); **denied** access to another teacher's DRAFT plan (distinct access-denied state, not styled as not-found). |
| `principal`/`manager`/`admin` | **Not in scope for v1 UI.** BE's `get_lesson_plan.go` visibility matrix already allows unconditional MANAGER/ADMIN/SUPER_ADMIN read server-side, but `design-spec.jsonc` locks `roles: ["teacher"]` and no admin screen is designed. Treat as backlog (§8), not a role this spec's routes gate for. |
| `student`/`parent` | No access; not modeled. |

Role-gated visibility: the entire `/teacher/lesson-plans*` route family is
gated to `teacher` per the existing route-group convention
(`(app)/teacher/**`, `docs/product/roles-permissions.md`) — same pattern as
exam-bank/lesson-bank. No new RBAC mechanism.

---

## 3. Functional Requirements

Each FR: priority, source, "The system SHALL…", AC (Given/When/Then — numbered
against `use-cases.md`'s AC coverage list §7), dependencies.

### FR-001 — Create DRAFT lesson plan
**Priority:** Must · **Source:** TR-118/FR-001, UC-001, INT-118-01

The system SHALL allow a teacher to create a new lesson plan in `DRAFT` status
by submitting `title` (4–200 chars), `subjectId` (required, immutable after
create), `gradeLevel` (required, max 20 chars), and optional `tags`; the 4
document sections may be empty at creation time.

- **AC-001.1 (Given/When/Then).** Given an authenticated teacher on
  `/teacher/lesson-plans/create`, when they submit a valid title/subject/grade
  with 0/4 sections filled, then `POST /lms/lesson-plans` succeeds and the
  teacher lands on the edit builder for the new `planId` with `status=DRAFT`.
- **AC-001.2.** Given the title field is empty/whitespace, when Save Draft is
  clicked, then `LESSON_PLAN_TITLE_REQUIRED` renders an inline error under
  title and the request is blocked/fails without navigating away.
- **AC-001.3.** Given a title >200 chars is submitted (e.g. via paste, since
  `maxLength=200` blocks typing), when Save Draft is clicked, then
  `LESSON_PLAN_TITLE_TOO_LONG` renders inline, save blocked.
- **AC-001.4.** Given a `subjectId` deleted server-side after the picker
  loaded, when Save Draft is clicked, then `SUBJECT_NOT_FOUND` renders inline
  on the subject picker with a re-selection affordance.
- **AC-001.5.** Given a malformed `subjectId`, when submitted, then
  `LESSON_PLAN_INVALID_SUBJECT_ID` renders inline on the subject picker
  (defensive; should not occur from a validated dropdown).
- **AC-001.6.** Given tag validation fails (see FR-009), when submitted, then
  the same inline tag error as UC-009 applies as a defense-in-depth re-check.
- **AC-001.7.** Given the caller is not a `teacher` (should be route-guarded),
  when the request reaches the server anyway, then `FORBIDDEN_ACTION` renders
  a generic error banner.
- **AC-001.8.** Given a network/5xx failure, when Save Draft is clicked, then
  a generic error banner appears, form state is fully preserved, and a Retry
  action resubmits the same payload.
- **AC-001.9.** Given the teacher clicks "Về danh sách" before saving, when no
  submit has occurred, then no request fires and no draft object is created.

**Dependencies:** subject reference-data source ([OPEN QUESTION], §8).

### FR-002 — Edit DRAFT lesson plan
**Priority:** Must · **Source:** TR-118/FR-002, UC-002, INT-118-05

The system SHALL allow a teacher to edit any field of their own DRAFT plan
(`title`, `gradeLevel`, `tags`, 4 sections — **not** `subjectId`, immutable)
and persist via Save Draft (`PUT /:id`).

- **AC-002.1.** Given an owned DRAFT plan, when opened at
  `/teacher/lesson-plans/:id/edit`, then a skeleton renders while `GET /:id`
  resolves, then all editable fields populate; the subject field renders as a
  disabled/read-only display (never an editable `<select>`).
- **AC-002.2.** Given a field is edited, when Save Draft is clicked and
  succeeds, then `updatedAt` refreshes, the "unsaved changes" indicator
  clears, and the builder stays open (no navigation).
- **AC-002.3.** Given a field-length violation (title 4–200,
  objectives/assessmentMethod ≤5000, contentOutline/activities ≤20000), when
  Save Draft is clicked, then the matching inline error renders, save
  blocked, form state preserved.
- **AC-002.4 (race).** Given the plan was published elsewhere between load
  and save, when Save Draft is clicked, then `LESSON_PLAN_ALREADY_PUBLISHED`
  shows an error banner, the form **auto-locks to read-only**, and the plan
  refetches to sync the now-PUBLISHED state (unsaved edits in this tab are
  surfaced as discarded via the banner, never silently dropped).
- **AC-002.5.** Given the plan no longer exists, when `PUT` is attempted, then
  `LESSON_PLAN_NOT_FOUND` shows a distinct "not found" error and redirects to
  the list.
- **AC-002.6.** Given the caller is not the owner (should be route-guarded),
  when `PUT` reaches the server, then `LESSON_PLAN_NOT_VISIBLE`/
  `FORBIDDEN_ACTION` shows an error banner and redirects to the list.
- **AC-002.7.** Given a network/5xx failure, when Save Draft is clicked, then
  an error banner appears, form state preserved, retry available.
- **AC-002.8.** Given the subject field, when the builder renders on the edit
  route, then it is never rendered as an editable control (confirms
  immutability — this is a UI omission by design, not a bug).

**Dependencies:** FR-009 (tag rules), FR-010 (unsaved indicator).

### FR-003 — Client-side publish-readiness gating
**Priority:** Must · **Source:** TR-118/FR-003, UC-003 (client-only, no BE call)

The system SHALL require all 4 document sections and a valid title (4–200
chars, trimmed) to be non-empty before the Publish CTA is enabled.

- **AC-003.1.** Given a DRAFT plan open in the builder, when title and all 4
  sections are non-empty (trimmed), then the Publish CTA becomes enabled
  (success-tone fill).
- **AC-003.2.** Given any of title/4 sections is empty, when the teacher
  attempts to click Publish, then all unmet required fields are marked
  "touched" with simultaneous inline errors, plus a flash-message summary; the
  confirm dialog never opens.
- **AC-003.3.** Given the Publish CTA is disabled, when inspected by
  assistive tech, then the disabled reason is exposed via `aria-disabled` +
  a visible helper (not visual dimming alone).

**Dependencies:** none (pure client logic; BE re-validates at publish time
per FR-004).

### FR-004 — One-way publish DRAFT → PUBLISHED
**Priority:** Must · **Source:** TR-118/FR-004, UC-004, INT-118-06

The system SHALL publish a DRAFT plan to PUBLISHED only after the teacher
confirms an irreversible-action dialog; this action is one-way and SHALL NOT
be reversible from the UI (no unpublish/revert control exists anywhere).

- **AC-004.1.** Given FR-003's gate is satisfied, when Publish is clicked,
  then a `role="dialog" aria-modal="true"` confirm dialog opens stating the
  action is one-way and the plan becomes visible to other teachers.
- **AC-004.2.** Given the confirm dialog, when the teacher confirms, then
  `PUT /:id/publish` fires (no body), the confirm button shows an inline
  spinner (`aria-busy`) while in flight.
- **AC-004.3.** Given the publish call succeeds, then `status` becomes
  `PUBLISHED`, `publishedAt` is set, the dialog closes, the builder
  immediately re-renders locked (all fields disabled, PUBLISHED chip, locked
  banner per `lessonPlan.lockedNotice.*`), and a success toast confirms.
- **AC-004.4.** Given the teacher cancels the dialog (or presses Escape),
  when no confirm occurs, then no request fires, plan remains DRAFT/editable.
- **AC-004.5 (race).** Given the plan was already published elsewhere, when
  Publish is confirmed, then `LESSON_PLAN_ALREADY_PUBLISHED` closes the
  dialog, shows an error banner, and the UI refetches to the locked view
  (idempotent end state).
- **AC-004.6.** Given BE re-validation fails (title/section still invalid —
  e.g. a stale bundle bypassing FR-003), when Publish is confirmed, then the
  dialog closes, inline field error(s) render on the offending field(s), and
  the plan remains DRAFT.
- **AC-004.7.** Given `LESSON_PLAN_NOT_FOUND` or `LESSON_PLAN_NOT_VISIBLE`/
  `FORBIDDEN_ACTION`, when Publish is attempted, then an error banner shows
  and the teacher is redirected to the list.
- **AC-004.8.** Given a network/5xx failure mid-publish, when the request
  fails, then an error banner shows, a "Retry publish" CTA is available, and
  the plan remains DRAFT (no ambiguous partial-publish UI state; reconcile via
  refetch on retry/mount if the write actually landed).

**Dependencies:** FR-003 (client gate must run first).

### FR-005 — Locked/read-only PUBLISHED rendering
**Priority:** Must · **Source:** TR-118/FR-005, UC-005, INT-118-04

The system SHALL render any PUBLISHED plan (own or another teacher's) as
fully read-only: all fields disabled, no Save Draft/Publish CTA rendered at
all (absent, not merely disabled), a locked banner shown.

- **AC-005.1.** Given a PUBLISHED plan is opened, then all fields render
  disabled/greyed (title, subject, grade, tags, 4 sections), a locked banner
  with lock icon + text appears, `publishedAt` shows in the meta panel.
- **AC-005.2.** Given the viewer is a non-owner, then the same locked
  rendering applies, plus the owner's name is visible (card-level attribution
  from FR-007).
- **AC-005.3.** Given disabled fields, when inspected by a screen reader, then
  content remains legible (uses `disabled`/`aria-disabled` semantics, never
  `display:none`); the locked banner is `role="status"`.
- **AC-005.4.** Given a PUBLISHED plan, then no reachable Save/Publish control
  exists anywhere in the rendered UI (defense-in-depth; BE's DRAFT-only PUT
  gate is authoritative per NFR-005).

**Dependencies:** FR-004 (transition), FR-008 (visibility gate that decides
whether this view is even reachable).

### FR-006 — List own plans ("Của tôi" scope)
**Priority:** Must · **Source:** TR-118/FR-006, UC-006, INT-118-02

The system SHALL list the caller's own plans (DRAFT + PUBLISHED) when the
owner-toggle is "Của tôi", with **client-side** filters for subject, grade,
status, and free-text search over the already-fetched page(s) (server only
accepts `cursor`/`limit` — see §6).

- **AC-006.1.** Given the default scope on `/teacher/lesson-plans`, then a
  skeleton card grid renders while `GET ""` resolves, then own plans (both
  statuses) render with a status-filter dropdown visible (mine-scope only).
- **AC-006.2.** Given subject/grade/status/search filters are applied, then
  filtering happens over the in-memory fetched page(s); no new request fires
  for these fields.
- **AC-006.3.** Given "load more"/scroll triggers the next cursor page, then
  it is fetched and appended, and client filters re-apply over the larger set.
- **AC-006.4.** Given "Bỏ lọc"/Clear filters is clicked, then all filter state
  resets and the full current page(s) show again.
- **AC-006.5.** Given the fetch fails, then an `EduError` banner + Retry
  shows, no card grid underneath.
- **AC-006.6.** Given `LESSON_PLAN_INVALID_CURSOR`, then the stale cursor is
  silently dropped and the first page refetches — **not** user-visible as an
  error.
- **AC-006.7.** Given no plans exist at all (no filters active), then the
  "Chưa có giáo án nào." empty state shows with a "Soạn giáo án mới" CTA;
  given filters are active but no client-side match, a **distinct**
  filtered-empty state ("Không có giáo án nào phù hợp." + "Bỏ lọc") shows
  instead (no create CTA).

**Dependencies:** §6 pagination/filter caveat (must be surfaced to the user
per NFR wording, not silently treated as true server search).

### FR-007 — Browse PUBLISHED plans by subject ("Toàn trường" scope)
**Priority:** Must · **Source:** TR-118/FR-007, UC-007, INT-118-03

The system SHALL let a teacher browse other teachers' PUBLISHED plans scoped
to a selected subject when owner-toggle = "Toàn trường"; this scope SHALL NOT
expose a status filter (implicitly PUBLISHED-only) and SHALL require an
explicit subject selection before any request fires.

- **AC-007.1.** Given owner-toggle switches to "Toàn trường" with no subject
  selected, then **no fetch fires**; a distinct prompt state ("Chọn một môn
  học để xem giáo án") renders — not a generic empty state.
- **AC-007.2.** Given a subject is selected, then a skeleton card grid renders
  while `GET /subject/:subjectId` (`cursor`/`limit`) resolves.
- **AC-007.3.** Given the fetch succeeds, then cards render PUBLISHED plans
  for that subject only, each showing the owning teacher's display name
  ("GV: <name>"), no status filter, no "create new plan" CTA anywhere in this
  scope.
- **AC-007.4.** Given a tag filter is applied (if exposed), then it drives a
  real server-side `?tag=` query param request (the one true server-side
  filter beyond cursor/limit) — distinct from the grade filter in the same
  scope, which is client-side only.
- **AC-007.5.** Given the subject is changed while results are showing, then
  a fresh fetch fires (skeleton again) and the previous subject's results are
  discarded, not merged.
- **AC-007.6.** Given the fetch fails, then an `EduError` banner + Retry
  shows; given `LESSON_PLAN_INVALID_CURSOR`, the stale cursor drops silently
  and the first page refetches.
- **AC-007.7.** Given `LESSON_PLAN_INVALID_SUBJECT_ID` is somehow reached
  (programming-error path), then a generic error banner shows.
- **AC-007.8.** Given no PUBLISHED plans exist for the selected subject, then
  an empty state ("Chưa có giáo án nào được phát hành cho môn này") shows
  with **no create CTA** — distinct from FR-006's owner-scope empty state.

**Dependencies:** teacherId→displayName resolution ([OPEN QUESTION], §8).

### FR-008 — Single-plan visibility gating
**Priority:** Must · **Source:** TR-118/FR-008, UC-008, INT-118-04

The system SHALL enforce single-plan visibility: an owner may view their own
plan in any status; any other teacher in the tenant may view a plan only when
its status is PUBLISHED.

- **AC-008.1.** Given the owner navigates to their own plan (any status),
  then full data returns; DRAFT renders editable (FR-002), PUBLISHED renders
  locked (FR-005).
- **AC-008.2.** Given a non-owner navigates to another teacher's PUBLISHED
  plan, then full data returns, rendered read-only (FR-005), no
  ownership-specific error.
- **AC-008.3 (access denied).** Given a non-owner requests another teacher's
  DRAFT plan (e.g. guessed/shared URL), then `LESSON_PLAN_NOT_VISIBLE` (403)
  renders a **distinct "access denied" state** — explicitly not styled as
  "not found" — and redirects to the list.
- **AC-008.4 (not found).** Given the plan does not exist, then
  `LESSON_PLAN_NOT_FOUND` (404) renders a distinct "not found" state (different
  copy/icon from AC-008.3) and redirects to the list.
- **AC-008.5.** Given a malformed id in the URL, then
  `LESSON_PLAN_INVALID_ID` (400) is treated as the not-found-style redirect
  (defensive; should not occur from in-app navigation).
- **AC-008.6.** Given a network/5xx failure, then an `EduError` banner +
  retry shows and the teacher **stays on the route** (no redirect on
  transient failure, unlike AC-008.3/.4/.5).

**Dependencies:** none beyond the BE contract; this UC does not branch by
product role (see §8 principal/admin note).

### FR-009 — Tag-chips input
**Priority:** Must · **Source:** TR-118/FR-009, UC-009, INT-118-01/05

The system SHALL provide a tag-chips input (add/remove) on the builder,
enforcing max 10 tags per plan, each tag max 50 chars, client-validated
before submit.

- **AC-009.1.** Given a non-empty, non-duplicate trimmed value, when Enter/
  comma/blur confirms it, then it renders as a removable chip and the input
  clears.
- **AC-009.2.** Given a duplicate tag is entered, then it is silently
  ignored (no second chip, no error) — matches the mockup's guard, not a
  validation failure.
- **AC-009.3.** Given 10 tags already exist, when an 11th is attempted, then
  the input is blocked at add-time with an inline helper ("Tối đa 10 thẻ"),
  not only a submit-time error.
- **AC-009.4.** Given a tag exceeds 50 chars, when confirmed, then an inline
  error shows and the tag is not added.
- **AC-009.5.** Given a submit somehow reaches the server with a tag
  violation (race/defense-in-depth), then `LESSON_PLAN_TAG_LIMIT_EXCEEDED`/
  `LESSON_PLAN_TAG_TOO_LONG` renders the same inline error surface.
- **AC-009.6.** Given a chip's remove ("x") control, then it carries an
  `aria-label` naming the specific tag (e.g. "Xoá thẻ Chương 5") and is
  independently keyboard-operable; on a locked (PUBLISHED) plan, remove
  controls are hidden entirely and the input area greys out.

**Dependencies:** FR-001/FR-002 (submit-time re-validation).

### FR-010 — Unsaved-changes indicator
**Priority:** Should · **Source:** TR-118/FR-010, UC-010

The system SHALL surface an "unsaved changes" indicator on the builder
whenever local field state diverges from the last-saved plan state.

- **AC-010.1.** Given any field is edited without saving, then a warning-tone
  "Chưa lưu" dot + text indicator appears below the top bar (matches
  exam-bank's dot pattern).
- **AC-010.2.** Given Save Draft succeeds, then the indicator clears
  immediately (does not wait for a subsequent refetch).
- **AC-010.3.** Given the teacher navigates away with unsaved changes — see
  **[OPEN QUESTION]** in §8 on whether a leave-confirmation guard is reused
  from exam-bank or whether this ships dot-only — implement per whichever
  answer is confirmed before merge; absent an answer, ship the dot-only
  passive indicator (no navigation guard), which satisfies the "Should"
  priority without inventing new confirm-dialog UX.

**Dependencies:** FR-002 (save-clears-indicator hook).

### FR-011 — No delete action
**Priority:** Won't · **Source:** TR-118/FR-011

The system SHALL NOT provide a delete action for lesson plans (no BE endpoint
exists). No AC — negative requirement, verified by absence: no delete
button/menu-item/route anywhere in `src/features/lesson-plan`.

### FR-012 — No unpublish/revert action
**Priority:** Won't · **Source:** TR-118/FR-012

The system SHALL NOT provide an unpublish/revert-to-DRAFT action (publish is
modeled one-way by the BE contract). No AC — negative requirement, verified
by absence: no unpublish control anywhere in the locked view.

---

## 4. Non-Functional Requirements

| ID | Category | Requirement | Measurable target | QA verification |
| --- | --- | --- | --- | --- |
| NFR-001 | Accessibility (AA) | All interactive controls (builder fields, tag-chip add/remove, owner-toggle, filter dropdowns, publish confirm dialog) keyboard-operable with visible focus ring; status badges pair icon + text; inline errors wired `id` + `role="alert"` + `aria-describedby` + `aria-invalid`. | WCAG 2.1 AA; text contrast ≥4.5:1, UI/icon ≥3:1; 0 color-only status indicators. | `fe-accessibility-auditor` audit + keyboard-only manual pass on create/edit/publish/list/browse flows; Storybook a11y addon. |
| NFR-002 | Responsive | List card grid + builder 2-column layout adapt without horizontal scroll or clipped controls. | No layout break at 320px; builder stacks 2-col→1-col below 860px (design-spec); verified at 375/768/1280. | Playwright viewport matrix (320/375/768/1280) + Storybook viewport addon. |
| NFR-003 | Perceived performance | List/builder show a skeleton while fetching, no layout shift on data arrival. | Skeleton shown within ≤320ms perceived-delay threshold; 0 CLS from skeleton→content swap. | Storybook loading-state story + Playwright visual/CLS check on list and builder routes. |
| NFR-004 | i18n | All UI copy from the existing `lessonPlan` namespace (~80 keys, DR-021); any genuinely new key confirmed missing (see §8) added to both `vi.json`/`en.json` before use. | 0 hardcoded UI strings; vi/en key parity 100%; typed `t()` calls compile clean (`bunx tsc --noEmit`). | Hardcoded-string grep (Vietnamese diacritics) in `.tsx`; `tsc --noEmit` in CI/pre-commit. |
| NFR-005 | Security | Write actions (create/update/publish) enforced server-side as TEACHER + ownership; UI never exposes edit controls for non-owned or PUBLISHED plans. | 0 reachable write controls on read-only/non-owned states; BE 403/404 mapped to a11y-safe error UI, no raw stack/console leak. | `fe-tech-lead-reviewer` review checklist; manual non-owner/PUBLISHED route probe in Playwright. |

---

## 5. UI States & Flows

Every async surface needs loading/empty/error/success (repo convention);
lesson-plan adds two feature-specific states (locked/read-only, browse-no-subject
prompt).

| Surface | Loading | Empty | Error | Success |
| --- | --- | --- | --- | --- |
| List — mine (FR-006) | `EduSkeleton variant="cards" count=6` | "Chưa có giáo án nào" + create CTA (no filters) **vs.** "Không có giáo án nào phù hợp" + clear-filters CTA (filters active) — 2 distinct states | `EduError` + retry (fetch); silent cursor-drop-and-refetch (invalid cursor, not user-visible) | Card grid, status filter visible |
| List — browse (FR-007) | `EduSkeleton variant="cards" count=6` (only once a subject is chosen) | "Chọn một môn học để xem giáo án" (no subject chosen, **no fetch fires**) **vs.** "Chưa có giáo án nào được phát hành cho môn này" (subject chosen, 0 results, no create CTA) — 2 distinct states, neither the same as mine-scope's empty states | `EduError` + retry; silent cursor-drop | Card grid with owner name per card, no status filter |
| Builder — create (FR-001) | none (no data fetch on this action) | n/a | Inline field errors (title/subject/tags) or generic banner (forbidden/network) | Navigate to edit builder for new `planId` |
| Builder — edit, DRAFT (FR-002) | Skeleton builder layout while `GET /:id` resolves | n/a (editing an existing resource) | Inline field errors; error banner + redirect (not-found/forbidden); auto-lock (already-published race) | "Saving…" → indicator clears, stays open |
| Builder — locked, PUBLISHED (FR-005) | Skeleton builder layout while `GET /:id` resolves | n/a | n/a (no write path reachable) | Read-only render, locked banner, `publishedAt` shown |
| Publish confirm (FR-004) | Inline spinner on confirm button | n/a | Dialog closes + inline/banner error per code; plan stays DRAFT except on genuine already-published race (locks) | Dialog closes, locked view, success toast |
| Single-GET visibility (FR-008) | Skeleton builder/detail layout | n/a (404 IS the empty signal) | Distinct access-denied vs. not-found states + redirect; network error stays on route | Renders per FR-002/FR-005 depending on owner+status |

**Key flows** (reference `use-cases.md` UC-001…UC-010 narratives; do not
re-derive — this table is the state inventory, the UC prose is the flow spec):
create→save-draft→edit→publish→locked-view is the canonical E2E path
(`docs/TEST_MATRIX.md` E2E row).

---

## 6. Data & Integration

Restated concisely from `integration.md` (source of truth for exact error
lists — this section is the implementer's quick-reference, not a replacement).

**Service:** `core`, `lessonplan` sub-domain. **Status: REAL**, ground-truthed
against Go handler/routes/error taxonomy (not `openapi.yaml`) this session.
**Dev posture:** `NEXT_PUBLIC_USE_MOCK`-gated repository swap (mock repo for
local/Storybook/Playwright; real repo wired from day one) — mirrors
`moderation.di.ts`/`feed.di.ts`, **not** decision-0014 permanent-mock.

### Endpoint group — `LESSON_PLAN_EP` (new file, additive)

New file `src/bootstrap/endpoint/lesson-plan.endpoint.ts` — **do NOT** add to
`lms.endpoint.ts` (that file is reserved for the still-unbuilt `lms` service
prefix; lesson-plan is `core`):

```ts
export const LESSON_PLAN_EP = {
  list: "/core/api/v1/lms/lesson-plans",
  create: "/core/api/v1/lms/lesson-plans",
  detail: (id: string) => `/core/api/v1/lms/lesson-plans/${id}`,
  update: (id: string) => `/core/api/v1/lms/lesson-plans/${id}`,
  publish: (id: string) => `/core/api/v1/lms/lesson-plans/${id}/publish`,
  bySubject: (subjectId: string) => `/core/api/v1/lms/lesson-plans/subject/${subjectId}`,
} as const;
```

### Endpoints (INT-118-01…06)

| INT ID | Method + path | Role | Request (camelCase) | Response | Pagination |
| --- | --- | --- | --- | --- | --- |
| INT-118-01 | `POST LESSON_PLAN_EP.create` | TEACHER | `subjectId`, `gradeLevel`, `title`, `objectives?`, `contentOutline?`, `activities?`, `assessmentMethod?`, `tags?` | `LessonPlanResponse` | none |
| INT-118-02 | `GET LESSON_PLAN_EP.list` | TEACHER (own) | query: `cursor?`, `limit?` **only** | `{ items: LessonPlanResponse[] }` | cursor |
| INT-118-03 | `GET LESSON_PLAN_EP.bySubject(subjectId)` | TEACHER (any, cross-teacher) | path `subjectId`; query `tag?`, `cursor?`, `limit?` | `{ items: LessonPlanResponse[] }` (PUBLISHED only) | cursor |
| INT-118-04 | `GET LESSON_PLAN_EP.detail(id)` | TEACHER (visibility-gated) | path `id` | `LessonPlanResponse` | none |
| INT-118-05 | `PUT LESSON_PLAN_EP.update(id)` | TEACHER, owner, DRAFT-only | `gradeLevel`, `title`, `objectives?`, `contentOutline?`, `activities?`, `assessmentMethod?`, `tags?` (**no** `subjectId`) | `LessonPlanResponse` | none |
| INT-118-06 | `PUT LESSON_PLAN_EP.publish(id)` | TEACHER, owner, DRAFT-only | none (no body) | `LessonPlanResponse` (`status=PUBLISHED`, `publishedAt` set) | none |

### `LessonPlanResponse` shape (all 6 endpoints)

`planId`, `teacherId`, `subjectId` (immutable post-create), `gradeLevel`,
`title`, `objectives`, `contentOutline`, `activities`, `assessmentMethod`,
`status: "DRAFT" | "PUBLISHED"`, `tags: string[]` (`[]` not `null`),
`publishedAt?` (RFC3339, **key absent** for DRAFT — treat missing key as "not
published", not an error), `createdAt`, `updatedAt` (always present).

### Pagination & filtering (settled, do not re-litigate)

Both list endpoints are cursor-paginated: call with `{ raw: true }`, read
`meta.pagination.nextCursor`/`hasMore` via `parseEnvelope()` (sibling of
`params`, not nested inside it — prior regression class, US-E18.2/19). Wire
via TanStack Query `useInfiniteQuery`.

- **`GET ""` (list mine):** server accepts `cursor`/`limit` only.
- **`GET /subject/:subjectId` (browse):** server accepts `tag` (real
  server-side filter), `cursor`, `limit`.
- **NOT server-side, anywhere:** `subjectId`/`gradeLevel`/`status`/free-text
  `search` on "list mine"; `gradeLevel` on "browse". These are **client-side
  filters over the fetched page(s)** — the FR-006/FR-007 filter dropdowns
  narrow what's already paginated in; they never become new query params
  (except browse's `tag`, which IS a query param). AC/QA must treat "a filter
  can appear to return few/no results even though more matches exist on a
  later cursor page" as expected behavior, not a bug.

### Failure union — `LessonPlanFailure`

```ts
export type LessonPlanFailure =
  | { type: "not-found" }              // LESSON_PLAN_NOT_FOUND
  | { type: "not-visible" }            // LESSON_PLAN_NOT_VISIBLE
  | { type: "already-published" }      // LESSON_PLAN_ALREADY_PUBLISHED
  | { type: "tag-limit-exceeded" }     // LESSON_PLAN_TAG_LIMIT_EXCEEDED
  | { type: "title-required" }         // LESSON_PLAN_TITLE_REQUIRED
  | { type: "title-too-long" }         // LESSON_PLAN_TITLE_TOO_LONG
  | { type: "tag-too-long" }           // LESSON_PLAN_TAG_TOO_LONG
  | { type: "subject-not-found" }      // SUBJECT_NOT_FOUND
  | { type: "invalid-id" }             // LESSON_PLAN_INVALID_ID / _TENANT_ID / _SUBJECT_ID / _MEMBER_ID
  | { type: "invalid-cursor" }         // LESSON_PLAN_INVALID_CURSOR
  | { type: "forbidden" }              // FORBIDDEN_ACTION
  | { type: "network-error" }
  | { type: "unknown"; message?: string };
```

Mapper `map-lesson-plan-error.ts` branches on `error.code` (UPPER_SNAKE),
never `message`, per `.claude/rules/api-integration.md` — same shape as
`map-exam-bank-error.ts`. Generic status fallback: 403→`forbidden`,
404→`not-found`, `retryable===true`→`network-error`, else `unknown`. See §8
for the one unverified transform detail (casing round-trip).

### Auth/role

All 6 routes sit under Kong's `edu-edge-auth`-protected `/core/api/v1` prefix
— use `createServerHttpClient()` from a Server Action/DI factory (Clean
Architecture: all calls originate server-side). Role gate: TEACHER only.
Ownership (`teacherId === caller`) is enforced **server-side authoritative**
on `Update`/`Publish` — UI disabled-state gating is defense-in-depth only
(NFR-005), never the source of truth.

### Mock-first plan

`bootstrap/di/lesson-plan.di.ts`:

```ts
async function makeRepo(): Promise<ILessonPlanRepository> {
  if (USE_MOCK) return new MockLessonPlanRepository();
  return new LessonPlanRepository(await createServerHttpClient());
}
```

Seed data must: mix DRAFT (seeded "current teacher") + PUBLISHED (own + other
teacher) across 2–3 subjects; simulate `publishedAt` key-absence for DRAFT;
support in-memory cursor pagination sufficient for `useInfiniteQuery`
wiring; include one plan at the 10-tag boundary and one title at exactly 200
chars (boundary demo cases). Mock mutate-in-place on create/update/publish,
same field names/types as real handler responses, so toggling
`NEXT_PUBLIC_USE_MOCK` off requires zero UI change.

---

## 7. Use Case Summary

| UC ID | Title | FR coverage | AC count |
| --- | --- | --- | --- |
| UC-001 | Create a new lesson plan (DRAFT) | FR-001, FR-009 (defense-in-depth) | 9 |
| UC-002 | Edit an owned DRAFT lesson plan | FR-002, FR-009, FR-010 | 8 |
| UC-003 | Client-side publish-readiness gating | FR-003 | 3 |
| UC-004 | One-way publish DRAFT → PUBLISHED | FR-004 | 8 |
| UC-005 | View a PUBLISHED lesson plan (locked/read-only) | FR-005 | 4 |
| UC-006 | List own lesson plans ("Của tôi" scope) | FR-006 | 7 |
| UC-007 | Browse PUBLISHED lesson plans by subject ("Toàn trường") | FR-007 | 8 |
| UC-008 | Single-plan visibility gating (`GET /:id`) | FR-008 | 6 |
| UC-009 | Tag-chips input (add/remove, limits) | FR-009 | 6 |
| UC-010 | Unsaved-changes indicator | FR-010 | 3 |
| **Total** | | | **62** |

---

## 8. Constraints & Assumptions

**Technical constraints**
- Exactly 4 named document sections, plain textareas (`rows=4`), no
  richer/nested schema — BE stores them as free-text strings; do not invent
  structured-list/rich-text editing.
- `subjectId` immutable after create (Update DTO omits it) — never rendered
  editable on the edit route.
- No delete, no unpublish anywhere in this UI (FR-011/FR-012, confirmed
  absent at the routes.go level — 6 routes total).
- Client-side filters, not server search, for everything except browse's
  `tag` param (§6) — must be communicated in UI copy/behavior, not presented
  as a true search.

**Confirmed [ASSUMPTION]s (carried forward, not re-opened)**
- `subjectId` is immutable after creation — edit builder never renders it
  editable.
- "Toàn trường" browse requires an explicit subject selection before any
  fetch fires — this is a **UX choice** (mirrors question-bank's
  mandatory-filter pattern), **not** a BE-enforced 422 gate.
- PUBLISHED plans are read-only for the owner too (no BE unpublish path).
- `gradeLevel`/`subjectId` reuse existing reference/lookup data already
  available to other teacher features (exam-bank/lesson-bank); this US does
  not introduce new reference-data endpoints.
- **Teacher-only in v1 is settled, not an open question.** BE's
  `get_lesson_plan.go` visibility matrix already allows unconditional
  MANAGER/ADMIN/SUPER_ADMIN read server-side, but `design-spec.jsonc` locks
  `roles: ["teacher"]` and no admin screen is designed. **This is a backlog
  item for a future principal/admin aggregate view** (BE already supports
  it), explicitly not a gap in this spec and not to be silently dropped —
  flag to `ba-lead`/product for a future US if/when prioritized.

**[GAP] / [CONFLICT] / [OPEN QUESTION]** (carried forward verbatim from
`use-cases.md`§6/`integration.md`§8 — these are real pre-implementation
clarifications, not decorative)

1. `[OPEN QUESTION]` **Subject reference-data source** for the create-form/
   browse subject picker: `SUBJECT_CATALOGUE_EP.subjects` (existing,
   currently mock-first) vs. a different existing subject-list dependency
   already consumed by exam-bank/lesson-bank. Blocks finalizing the subject
   picker's own loading/error sub-states precisely. **Action for `/fe`:**
   confirm the exact endpoint before wiring FR-001's subject `<select>`; if
   unresolved at implementation start, raise with `ba-lead`/user rather than
   inventing a second subject-list integration.
2. `[OPEN QUESTION]` **`teacherId` → display-name resolution** for
   browse-by-subject cards (FR-007's "GV: <name>" attribution) — no endpoint
   in this contract returns a name, only a uuid. Needs an existing
   member/staff-directory lookup. **Action for `/fe`:** if no existing lookup
   covers this for the teacher-facing screens, use a documented placeholder
   (see §9 i18n gap — `lessonPlan.card.unknownOwner`) until a lookup is wired
   — do not invent a new name-resolution endpoint for this US.
3. `[OPEN QUESTION]` **FR-010's leave-confirmation scope** — is exam-bank's
   actual leave-confirmation dialog reused, or does this US ship only the
   passive "Chưa lưu" dot without a navigation guard? Affects whether UC-010/
   AC-010.3 needs a guard-dialog. **Default if unresolved by implementation
   start:** ship dot-only (satisfies "Should" without inventing new confirm
   UX); revisit if `ba-lead`/user confirms reuse is expected.
4. `[OPEN QUESTION]` **HTTP-boundary error-code casing transform**
   (snake_case domain key → UPPER_SNAKE wire code) was not independently
   re-verified for `lessonplan` specifically (only confirmed by analogy to
   exam-bank's `codeFromKey` pattern). **Action for `fe-nextjs-engineer`:**
   do one real integration-test round-trip against a running `core` instance
   (or ask `/be`) before finalizing `map-lesson-plan-error.ts` — same caution
   ADR 0056 raised for exam-bank's write-path drift.

No `[CONFLICT]`s were found between `requirements.md`/`integration.md`/
`use-cases.md`/`design-spec.jsonc` this pass — all four inputs agree on
scope, contract shape, and layout.

---

## 9. i18n gap check (NFR-004)

Existing `lessonPlan` namespace (`src/bootstrap/i18n/messages/{vi,en}.json`,
~80 keys, DR-021) covers title/subtitle/toggle/filter/card/status/loading/
empty/error/builder/publishDialog/lockedNotice/toast, plus a partial
`errors{}` map (`title-required`, `title-too-long`, `subject-required`,
`grade-level-required`, `objectives-required`, `content-outline-required`,
`activities-required`, `assessment-method-required`, `not-editable`,
`not-found`, `forbidden`, `network-error`, `unknown`).

Cross-checked against the `LessonPlanFailure` union (§6) and UC-007/UC-008's
distinct states, the following are **genuinely missing** — `/fe` must add
these (both `vi.json` and `en.json`, same path, per `.claude/rules/i18n.md`)
before wiring the corresponding failure branches. Do not invent additional
keys beyond this list without re-confirming against the shipped namespace.

| Key path | vi | en |
| --- | --- | --- |
| `lessonPlan.errors.not-visible` | "Bạn không có quyền xem giáo án này." | "You don't have permission to view this lesson plan." |
| `lessonPlan.errors.already-published` | "Giáo án này đã được phát hành ở nơi khác." | "This lesson plan was already published elsewhere." |
| `lessonPlan.errors.tag-limit-exceeded` | "Tối đa 10 thẻ cho mỗi giáo án." | "Maximum 10 tags per lesson plan." |
| `lessonPlan.errors.tag-too-long` | "Thẻ không được vượt quá 50 ký tự." | "Tag must not exceed 50 characters." |
| `lessonPlan.errors.subject-not-found` | "Môn học không còn tồn tại, vui lòng chọn môn khác." | "This subject no longer exists, please pick another." |
| `lessonPlan.errors.invalid-id` | "Đường dẫn không hợp lệ." | "Invalid link." |
| `lessonPlan.browse.promptTitle` | "Chọn một môn học để xem giáo án" | "Choose a subject to browse lesson plans" |
| `lessonPlan.browse.promptBody` | "Chọn môn học ở bộ lọc phía trên để xem các giáo án đã phát hành." | "Select a subject in the filter above to view published lesson plans." |
| `lessonPlan.browse.emptyTitle` | "Chưa có giáo án nào được phát hành cho môn này" | "No published lesson plans for this subject yet" |
| `lessonPlan.card.unknownOwner` | "Giáo viên khác" | "Another teacher" |
| `lessonPlan.errors.accessDenied.title` | "Không có quyền truy cập" | "Access denied" |
| `lessonPlan.errors.accessDenied.body` | "Bạn không có quyền xem giáo án này. Giáo án có thể vẫn ở trạng thái nháp." | "You don't have permission to view this lesson plan. It may still be in draft." |

Note: `LESSON_PLAN_INVALID_CURSOR` is handled silently (drop cursor, refetch
first page, per §6/AC-006.6/AC-007.6) — **no new key needed**, it must never
surface to the user. The existing `not-found`/`errors.not-found` key is
reused as-is for AC-008.4; the new `accessDenied.*` pair above is for the
**distinct** AC-008.3 state only (do not reuse generic `not-found` copy
there — that would violate FR-008's explicit distinction requirement).

---

## 10. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | Priority |
| --- | --- | --- | --- | --- |
| FR-001 Create DRAFT | TR-118/FR-001 | UC-001 | INT-118-01 | Must |
| FR-002 Edit DRAFT | TR-118/FR-002 | UC-002 | INT-118-05, INT-118-04 (initial load) | Must |
| FR-003 Publish-readiness gating | TR-118/FR-003 | UC-003 | none (client-only) | Must |
| FR-004 One-way publish | TR-118/FR-004 | UC-004 | INT-118-06 | Must |
| FR-005 Locked/read-only view | TR-118/FR-005 | UC-005 | INT-118-04 | Must |
| FR-006 List own plans | TR-118/FR-006 | UC-006 | INT-118-02 | Must |
| FR-007 Browse by subject | TR-118/FR-007 | UC-007 | INT-118-03 | Must |
| FR-008 Visibility gating | TR-118/FR-008 | UC-008 | INT-118-04 | Must |
| FR-009 Tag-chips input | TR-118/FR-009 | UC-009 | INT-118-01, INT-118-05 (submit-time re-check) | Must |
| FR-010 Unsaved-changes indicator | TR-118/FR-010 | UC-010 | none (client-only) | Should |
| FR-011 No delete | TR-118/FR-011 | none (negative requirement) | none — confirmed absent at routes.go | Won't |
| FR-012 No unpublish | TR-118/FR-012 | none (negative requirement) | none — confirmed absent at routes.go | Won't |
| NFR-001 Accessibility | TR-118 NFR-001 | all UC (cross-cutting) | n/a | Must |
| NFR-002 Responsive | TR-118 NFR-002 | UC-006, UC-007 (grids), UC-001/002 (builder) | n/a | Must |
| NFR-003 Perceived performance | TR-118 NFR-003 | UC-002, UC-006, UC-007 | n/a | Must |
| NFR-004 i18n | TR-118 NFR-004 | all UC (cross-cutting) | n/a | Must |
| NFR-005 Security | TR-118 NFR-005 | UC-002, UC-004, UC-005, UC-008 | INT-118-04/05/06 (server-authoritative ownership) | Must |

**Uncovered check:** every FR-001…FR-010 has ≥1 UC and ≥2 AC (see §3, §7);
FR-011/FR-012 are negative requirements with no positive AC by design (verify
by absence, per §3). All 6 `INT-118-*` endpoints map to at least one FR. No
UC or INT is orphaned; no FR lacks a source. Nothing flagged UNCOVERED.

---

## 11. Handoff to FE

**What `fe-lead` should build:** net-new feature folder `src/features/lesson-plan`
(Clean Architecture layers per `.claude/CLAUDE.md`):

- `domain/entities/lesson-plan.entity.ts` — `LessonPlanEntity` mapped from
  `LessonPlanResponse` (§6); `domain/failures/lesson-plan.failure.ts` —
  `LessonPlanFailure` union (§6); `domain/repositories/i-lesson-plan.repository.ts`;
  `domain/use-cases/` — `create-lesson-plan`, `update-lesson-plan`,
  `publish-lesson-plan`, `get-lesson-plan`, `list-my-lesson-plans`,
  `list-lesson-plans-by-subject.use-case.ts` (6, one per INT-118-0x, plus any
  pure-client ones for FR-003/FR-009/FR-010 as needed by the FE team's own
  component/state design — not prescribed here, that's `fe-component-architect`/
  `fe-state-engineer`'s call).
- `infrastructure/dtos/lesson-plan-response.dto.ts`,
  `infrastructure/mappers/lesson-plan.mapper.ts`,
  `infrastructure/repositories/lesson-plan.repository.ts` (+
  `mock-lesson-plan.repository.ts` per §6's mock-first plan).
- `bootstrap/endpoint/lesson-plan.endpoint.ts` (`LESSON_PLAN_EP`, §6 — new
  file, additive, do not touch `lms.endpoint.ts`).
- `bootstrap/di/lesson-plan.di.ts` (`NEXT_PUBLIC_USE_MOCK` swap, §6).
- `presentation/` — `LessonPlanListScreen`/`LessonPlanBuilderScreen`
  (naming/decomposition is FE's call; **cite, do not re-derive**,
  `design_src/edu/lesson-plan.jsx` `LessonPlanScreen`/`LessonPlanBuilderScreen`
  + `docs/product/design-spec.jsonc` → `screens.lessonPlan` for every layout
  value — spacing, card grid, builder 2-column/mobile-stack, field order,
  icons, status-chip colors).
- Routes: `app/[locale]/(dashboard)/(app)/teacher/lesson-plans/{page.tsx,
  create/page.tsx, [id]/edit/page.tsx}` + `actions.ts` per route (Server
  Actions calling `bootstrap/di/lesson-plan.di.ts` factories only).
- i18n: reuse the existing `lessonPlan` namespace; add the §9 gap keys (and
  only those) to `vi.json`/`en.json` before wiring the corresponding branches.

**Suggested lane:** `normal` (per `story.md`'s hard-gate check — no
auth/RBAC change beyond existing teacher-role gating, no token/session
change, no new PII, no new design-system token, no delete/data-loss risk).

**Proof owed (maps to `docs/TEST_MATRIX.md` row for US-E11.8):**
- **Unit (Vitest):** all 6 use-cases (create/update/publish/get/list-mine/
  list-by-subject) + mapper (including `publishedAt`-key-absence handling) +
  failure-mapping (`map-lesson-plan-error.ts` covering all 13
  `LessonPlanFailure` variants) — written red-first per `.claude/rules/tdd.md`.
- **Integration:** repository↔HTTP boundary against the real `LESSON_PLAN_EP`
  contract (mock-first dev default via `NEXT_PUBLIC_USE_MOCK`); one real
  round-trip verifying the error-code casing transform (§8, open question 4)
  before marking that mapper branch done.
- **E2E (Storybook interaction + Playwright):** create → save draft → edit →
  publish (confirm dialog) → locked view, plus loading/empty/error states for
  both list scopes (mine + browse) and the two visibility-gate error states
  (access-denied vs. not-found, AC-008.3/.4).
- **Platform:** `bun build` green; `fe-accessibility-auditor` WCAG 2.1 AA
  pass (NFR-001); responsive check at 320/375/768/1280 (NFR-002).

**Pre-implementation clarifications to raise** (if not already resolved by
the time `/fe` starts — see §8): the 4 `[OPEN QUESTION]`s, especially #1
(subject reference-data source) since it blocks FR-001's picker, and #2
(teacherId→displayName) since it blocks FR-007's card attribution. Raise
with `ba-lead`/the user rather than guessing a new endpoint into existence.
