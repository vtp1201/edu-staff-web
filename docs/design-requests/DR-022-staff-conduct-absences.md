# DR-022 — Staff Discipline (violations + conduct notes) + Student Absences (net-new)

## Status

- [ ] in progress

## Origin

US-E18.14 (`docs/stories/epics/E18-be-wiring/US-E18.14-discipline-conduct-wiring/story.md`)
ground-truthed `edu-api` core's `conduct` domain and found **three real, fully
shipped BE sub-resources with zero web screen** — a product/design gap, not a
BE gap (flagged explicitly to `/uiux`+`/ba`, mirrors how US-E18.9 flagged the
teaching-plan gap). Also logged as ask #22 in
`docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md`.

1. `staff-violations` — violations recorded against STAFF members.
2. `staff-conduct-notes` — periodic conduct/performance notes on STAFF members.
3. `student-absences` — per-date excused/unexcused absence flagging (distinct
   from the existing period-based `attendance` feature).

## Already-implemented check (uiux-lead, 2026-07-25, re-verified independently of the story's own check)

```
grep -rn -i "staff.violation|staffviolation|staff-violation|staffConductNote|staff-conduct-note|studentAbsence|student-absence" src/features/ src/app/
```
→ **zero hits**. `git branch -r` shows no in-flight `docs/dr-*`/`feat/us-*`/`fix/*`
touching this area. Confirmed genuinely net-new — normal authoring applies, not
reconcile.

## Lane

**Normal.** Zero new design-system token expected — every visual primitive
needed (severity badge, 2/3-tier status badge, approval-workflow card,
reject-reason inline panel, flag action) already exists and is reused
verbatim below. If `uiux-designer` finds a genuine gap, flag to `uiux-lead`
for an ADR — do not invent inline.

## BE contract (ground-truthed directly against `edu-api` Go source, not just prose — 2026-07-25)

### 1. `staff-violations` (`edu-api/services/core/internal/conduct/adapter/http/{routes.go,dto/staff_violation.go}`)

Routes: `POST /api/v1/conduct/staff-violations` create (**ADMIN**, DRAFT),
`GET ?staffMemberId=` list (role-scoped), `POST /:id/submit` (authoring ADMIN),
`POST /:id/approve` (distinct **ADMIN/MANAGER**), `POST /:id/reject` (ADMIN/MANAGER).

`StaffViolationResponse`: `recordId`, `staffMemberId`, `category`,
`description`, `severity` (`MINOR`/`MODERATE`/`SEVERE` — **identical enum** to
`student-violations`), `occurredAt`, `state`
(`DRAFT`/`SUBMITTED`/`APPROVED`/`REJECTED`), `authorMemberId`,
`approverMemberId?`, `selfApproved` (bool — single-admin-tenant fallback per
ADR 0073), `rejectionReason?`, `createdAt`, `updatedAt`. **Zero display
fields** (no `staffName`/`department`) — same gap class as the existing
student-violations screen already designs around (mock resolves display
fields client-side; production would need a roster lookup, ask #9/#22).

Reject body `rejectionReason` not server-required (empty triggers
`VIOLATION_REJECTION_REASON_REQUIRED` 422, same as student track) — design the
reject dialog exactly like `discipline.jsx`'s existing reject flow (inline
reason field, client-side min-length UX guard, not a hard server contract).

**Error taxonomy — reuses the EXACT SAME `VIOLATION_*` codes as
student-violations** (ground-truthed: `ERROR_CODES.md` explicitly says
"Reuses `VIOLATION_FORBIDDEN`, `VIOLATION_NOT_FOUND`,
`VIOLATION_INVALID_TRANSITION`, `VIOLATION_REJECTION_REASON_REQUIRED`,
`VIOLATION_INVALID_ID`, `VIOLATION_INVALID_SEVERITY`, `VIOLATION_INVALID_STATE`,
`VIOLATION_INVALID_INPUT`" + `VIOLATION_SAME_ACTOR`). **Reuse the existing
`discipline.errors.*` i18n keys verbatim** — do not create parallel error copy.

### 2. `staff-conduct-notes` (`.../dto/staff_conduct_note.go`)

Routes: `POST /api/v1/conduct/staff-conduct-notes` set (**ADMIN only**,
create/overwrite DRAFT, natural key `(termId, staffMemberId)`),
`GET ?staffMemberId=&termId=` list (self or ADMIN/MANAGER oversight),
`POST /:staffMemberId/submit?termId=` (authoring ADMIN),
`.../approve?termId=` (distinct ADMIN/MANAGER), `.../reject?termId=` (ADMIN/MANAGER).

`StaffConductNoteResponse`: `termId`, `staffMemberId`, `rating`
(`SATISFACTORY`/`NEEDS_IMPROVEMENT`/`UNSATISFACTORY`), `note` (free text, max
5000), `state` (same DRAFT/SUBMITTED/APPROVED/REJECTED), `authorMemberId`,
`approverMemberId?`, `selfApproved`, `rejectionReason?`, timestamps.
`academicYearId` is validation-only on POST (resolves the term), not stored.

**No color precedent for `rating`** — reuse the EXISTING GPA/difficulty
3-tier convention (`.claude/rules/design-system.md` §Score/performance màu,
also just reused by DR-021's `difficulty`): `SATISFACTORY→success`,
`NEEDS_IMPROVEMENT→warning`, `UNSATISFACTORY→error`. This is applying an
existing token mapping, not inventing one.

Error taxonomy: reuses `VIOLATION_SAME_ACTOR`/`VIOLATION_INVALID_TRANSITION`/
`VIOLATION_REJECTION_REASON_REQUIRED` (reuse `discipline.errors.*`) **plus 5
genuinely new codes** (no existing key covers these): `STAFF_CONDUCT_NOTE_FORBIDDEN`,
`STAFF_CONDUCT_NOTE_NOT_FOUND`, `STAFF_CONDUCT_NOTE_TERM_NOT_FOUND` (422/404 —
term doesn't resolve), `STAFF_CONDUCT_NOTE_LOCKED` (409 — re-set attempted
after APPROVED, ADR 0074, same *shape* as existing `discipline.errors.locked`
but staff-specific wording since that key's text is grade-specific — see i18n
below), `STAFF_CONDUCT_NOTE_INVALID_RATING` (422).

### 3. `student-absences` (`.../dto/student_absence.go`, `valueobject/absence_state.go`)

Routes: `POST /api/v1/conduct/student-absences` record (**GVCN/teacher**,
initial state `RECORDED`), `GET ?classId=&from=&to=` list (role-scoped),
`PATCH /:date?classId=&studentMemberId=` edit (GVCN — `reason`/`excused`
optional, PATCH semantics), `POST /:date/flag?classId=&studentMemberId=` flag
(**ADMIN/MANAGER only** — one-way `RECORDED → FLAGGED_UNEXCUSED`, terminal,
no unflag).

`StudentAbsenceResponse`: `classId`, `studentMemberId`, `date` (bare
`YYYY-MM-DD` string, NOT a datetime), `reason` (optional, max 5000),
`excused` (bool), `state` (`RECORDED`/`FLAGGED_UNEXCUSED`),
`recordedByMemberId`, `flaggedByMemberId?`, `createdAt`, `updatedAt`.

**No approval workflow here** — this is NOT the shared `ApprovalTransition`
state machine (confirmed: `absence_state.go` has its own 2-value
`AbsenceState` with a one-way `Flag()`, no submit/approve/reject). Design it
as record → optional one-way admin flag, NOT a 3rd instance of the
DRAFT/SUBMITTED/APPROVED/REJECTED card pattern. Two independent signals on
each row: `excused` (boolean, set by GVCN at record/edit time) and `state`
(whether ADMIN/MANAGER has flagged it for follow-up) — do not conflate them
into one badge.

Error taxonomy (all genuinely new, no shared reuse — different domain):
`ABSENCE_FORBIDDEN` (403), `ABSENCE_NOT_FOUND` (404 — natural key
`classId+studentMemberId+date`), `ABSENCE_DUPLICATE_DATE` (409 — create
conflict), `ABSENCE_INVALID_DATE` (422 — **future date rejected**; note this
is the OPPOSITE direction of the existing `discipline.errors.invalid-date`
key, which guards leave-request dates — do NOT reuse that key, the copy means
something different here), `ABSENCE_INVALID_STATE` (400, backstop),
`ABSENCE_INVALID_ID` (400, backstop), `ABSENCE_INVALID_INPUT` (422, backstop).

## Scope decisions (uiux-lead, documented per the task's request)

### Roles who see/act on each surface

| Surface | Author/submit | Approve/reject or flag | List/view |
| --- | --- | --- | --- |
| staff-violations | `admin` (create DRAFT, submit) | `principal` (BE `MANAGER` = our `principal`/BGH — confirmed by the existing precedent comment `design_src/edu/staff-leave.jsx:2` `"Role: ADMIN / MANAGER (BGH)"`) — **or** `admin` itself in the single-admin-tenant fallback (`selfApproved`) | both roles, role-scoped |
| staff-conduct-notes | `admin` (set/submit) | `principal` (approve/reject) | both roles, plus the staff member's own read-only self-view (oversight parity with student's own conduct-grade self-view in `discipline.jsx`) |
| student-absences | `teacher` (record/edit, GVCN = homeroom teacher only, own class) | `admin`/`principal` (flag — BE says ADMIN/MANAGER, both admin-tier roles get the action; principal already has schoolwide Discipline oversight so gets it in their existing surface) | teacher (own class), admin/principal (schoolwide) |

### IA placement — reuse existing route groups, no new top-level nav item

- **Staff Discipline** (violations + conduct notes, tabbed) → new screen at
  `(app)/admin/staff-discipline`, sibling of the existing
  `(app)/admin/staff-leave` (`docs/product/screens.md` row "Staff Leave
  Management"). **Why one screen with 2 tabs, not 2 screens**: mirrors
  `discipline.jsx`'s own precedent of tabbing closely-related
  conduct-adjacent workflows (Violations / Conduct / Leave) for the student
  track — staff-violations and staff-conduct-notes share the identical
  actor pair (ADMIN authors, ADMIN/MANAGER approves) and the identical
  ApprovalTransition card UI, so one screen with a tab switcher avoids
  duplicating the list/filter/card chrome twice. `staff-leave.jsx` chose
  "standalone, not a Discipline tab" for a DIFFERENT reason (it already had a
  convenience entry point from `discipline.jsx`'s existing "Nhân sự" tab and
  a distinct actor —STAFF self-submits, no author/approver split); that
  reasoning doesn't apply here since violations/notes share one actor model
  with each other, not with staff-leave.
  - Route: `/admin/staff-discipline` (admin: author + submit + own list +
    principal-side approve/reject rendered role-conditionally in the SAME
    screen, exactly like `staff-leave.jsx` already does for ADMIN/MANAGER in
    one file — proven pattern, do not fork two files).
- **Student Absences** → new **standalone** screen (mirrors `staff-leave.jsx`'s
  "standalone screen" precedent, since this does NOT share an actor model or
  card shape with the existing Discipline tabs — no approval workflow, just
  record→optional-flag): `(app)/teacher/absences` for the teacher/GVCN
  record+edit view, with the ADMIN/MANAGER flag action rendered
  role-conditionally in the SAME file when opened by `admin`/`principal`
  (route alias `(app)/principal/absences` and `(app)/admin/absences` render
  the same component in flag-mode — same one-file-multi-role pattern as
  `staff-leave.jsx`/`discipline.jsx` already establish). Do NOT add a 4th tab
  to the already-implemented `discipline.jsx` (1506 lines, 3 roles already) —
  keeps one-component-one-home clean per `component-organization.md`, matches
  why staff-leave stayed standalone instead of becoming a tab.

### Mock-first note (per US-E18.14 + decision `0014`)

Every real endpoint keys on a real `staffMemberId`/`studentMemberId` UUID the
web roster cannot resolve today (cross-repo asks #9/#15/#22 — same
roster-UUID gap that force-mocked `staff-leave` US-E18.8 and the existing
student-discipline track). **Design must not depend on unresolvable fields**:
no `staffName`/`department`/`studentName`/`className` display field exists on
any of the three wire responses — design the mock data with those display
fields (exactly like `discipline.jsx`/`staff-leave.jsx` already do for their
own mocked screens) but do NOT design a UI affordance that assumes a live
roster-search/autocomplete-by-name lookup is available server-side yet (e.g.
the "record violation" author flow should let admin type a name only against
the CURRENT mocked roster list, not a live search-as-you-type against a real
endpoint) — flag this explicitly to `/ba` so it scopes the create form as
mock-roster-select, not live search, until the roster gap resolves.

## Design scope (what to build)

### Screen A — Staff Discipline (`design_src/edu/staff-discipline.jsx`)

- Component names: `StaffDisciplineScreen` (tab shell), reusing the existing
  `ApprovalTransition` card visual language 1:1 from `discipline.jsx`'s
  Violations tab (DRAFT/SUBMITTED/APPROVED/REJECTED `StatusBadge`, severity
  badge Nhẹ/Vừa/Nặng → warning/error/destructive, submit/approve/reject
  buttons, inline reject-reason panel — same component shapes, new data).
- Tab 1 — **Violations**: list (filter by state, staff member, severity),
  create form (ADMIN: staffMember select from mock roster, category,
  description, severity, occurredAt), submit/approve/reject actions
  role-gated (admin sees submit on own DRAFTs; principal sees approve/reject
  on SUBMITTED). `selfApproved` badge/note shown when the single-admin
  fallback applied (small "tự duyệt" annotation, not hidden — audit
  transparency).
- Tab 2 — **Conduct Notes**: list scoped by term + staff member, rating
  3-tier badge (success/warning/error per the reuse above), note textarea,
  same submit/approve/reject actions. Staff member's own self-view is
  read-only (mirrors parent/student read-only conduct view pattern in
  `discipline.jsx`).
- States: loading (skeleton list), empty (no records — CTA to create for
  admin, "chưa có ghi nhận" for principal/self-view), error (banner +
  retry), validation errors (reject reason min-length client guard, mandatory
  fields on create/set).
- Output: `design_src/edu/staff-discipline.jsx`, `docs/product/design-spec.jsonc`
  entry `screens.staffDiscipline`, i18n namespace `staffDiscipline` (NEW,
  reusing `discipline.errors.*` for the 8 shared VIOLATION_* codes — do not
  duplicate those into the new namespace, just reference/import the same
  key path in the mockup's inline annotations).

### Screen B — Student Absences (`design_src/edu/student-absences.jsx`)

- Component name: `StudentAbsencesScreen` (single file, role-conditional:
  teacher record/edit mode vs admin/principal flag-only mode).
- Teacher view: per-class date-range list/calendar-ish table (date, student,
  excused toggle, reason, state), record form (date picker — cannot pick a
  future date, client-side guard mirroring `ABSENCE_INVALID_DATE`), inline
  edit (reason/excused only, PATCH semantics — date/class/student read-only
  once created, matches the immutable-identity contract).
- Admin/principal view: schoolwide/class-filtered read list with a "Gắn cờ"
  (flag) action per RECORDED row — one-way, confirm dialog (irreversible,
  mirror the lesson-plan "publish is one-way" confirm pattern from DR-021),
  no unflag affordance (contract has none).
- Two independent badges per row (do not conflate): excused/unexcused pill
  (`excused` boolean — reuse the existing 2-value success/warning-style
  convention) and a separate small "Đã gắn cờ" flagged indicator (icon +
  label, `--edu-error`) shown only when `state === FLAGGED_UNEXCUSED`.
- States: loading, empty ("chưa ghi nhận nghỉ học kỳ này"), error+retry,
  duplicate-date validation (creating a 2nd record for the same
  class+student+date), future-date validation.
- Output: `design_src/edu/student-absences.jsx`, `docs/product/design-spec.jsonc`
  entry `screens.studentAbsences`, i18n namespace `studentAbsences` (NEW,
  fully independent — zero shared codes with the violation/conduct-note
  taxonomy, confirmed above).

## i18n plan (uiux-ux-writer — follow exactly, avoid the DR-001 i18n-drift mistake)

- **Two new namespaces**: `staffDiscipline` (violations + conductNotes
  sub-keys) and `studentAbsences`. Confirmed zero collision (grepped
  `vi.json`/`design-spec.jsonc` for both — no hits).
- **Reuse verbatim** (do NOT duplicate text, reference the same key path in
  the mockup + design-spec `i18nKey` annotations):
  - `discipline.errors.same-actor`, `.forbidden`, `.not-found`,
    `.already-processed`, `.invalid-transition`, `.invalid-severity`,
    `.invalid-state`, `.invalid-input`, `.network-error`,
    `.missing-reject-reason` (confirmed: `VIOLATION_REJECTION_REASON_REQUIRED`
    422 maps to `missing-reject-reason` in
    `src/features/discipline/infrastructure/repositories/discipline.repository.ts:63,110`
    — use this key, not `.reason-too-short` which is a different LEAVE-specific
    client min-length guard) for `staffDiscipline` (both tabs).
  - `discipline.leave.rejectDialog.*` shape (title/description/cancel/confirm/
    reasonPlaceholder/reasonMinLength) for the reject panel UI text —
    same interaction, staff subject instead of student.
- **New keys needed** (add under the new namespaces, NOT into `discipline.*`
  — these are staff/absence-specific wording, not shape-identical to any
  existing key):
  - `staffDiscipline.errors.term-not-found`, `.locked` (staff-specific
    wording — "Ghi chú đã được duyệt, không thể chỉnh sửa", distinct from
    `discipline.errors.locked`'s conduct-grade wording), `.invalid-rating`.
  - `staffDiscipline.conductNotes.rating.{satisfactory,needsImprovement,unsatisfactory}`,
    `.selfApprovedNote` (audit-transparency annotation).
  - `studentAbsences.errors.{forbidden,not-found,duplicate-date,invalid-date-future,invalid-state,invalid-id,invalid-input}`
    — **do NOT reuse `discipline.errors.invalid-date`**, the direction is
    opposite (documented above).
  - `studentAbsences.excused` / `.unexcused` / `.flagged` / `.flagAction` /
    `.flagConfirm.*` (irreversible-confirm dialog, mirror
    `lessonPlan.publishConfirm.*` shape from DR-021 if useful as a reference,
    do not import it directly — different namespace).
- Add to **both** `vi.json` (source) and `en.json` (mirror) in the same edit,
  same path, per `.claude/rules/i18n.md`.

## Design-system supremacy reminder

Tokens-only. Zero new tokens expected: severity reuses the existing
Nhẹ/Vừa/Nặng warning/error/destructive mapping verbatim; rating reuses the
existing GPA/difficulty 3-tier success/warning/error mapping; excused/flagged
uses existing 2-value success/warning-family badges. If `uiux-designer` finds
a genuine gap, flag it to `uiux-lead` — do not invent inline.

## Design-review gate

Before marking delivered: self-audit (or `/impeccable audit`+`critique` if
session allows) against `.claude/rules/accessibility.md` +
`.claude/rules/design-system.md` on both mockups — contrast (rating/severity/
excused/flagged badges), status never color-only (icon+label on every
badge), keyboard/focus on all forms + tab switcher, motion-safe transitions,
loading/empty/error/validation state coverage, mobile-first (320–375px).

## Handoff

On delivery: hand off to `/ba` (write TR-XXX + AC against the ground-truthed
BE contract above — route confirmation, exact role-gate AC, mock-roster-select
scoping per the note above) → `/fe` (implement `src/features/staff-discipline`
and `src/features/student-absences`, mock-first per decision `0014` since the
roster-UUID gap blocks real wiring exactly like `staff-leave`/`discipline`
today).

## Dependencies

- Depends on: none (BE contracts already exist and are stable, ground-truthed
  above).
- Blocks: none known.
- Shared files touched: `docs/product/design-spec.jsonc` (2 new top-level
  screen entries: `staffDiscipline`, `studentAbsences`),
  `src/bootstrap/i18n/messages/{vi,en}.json` (2 new namespaces, reusing
  `discipline.errors.*`/`discipline.leave.rejectDialog.*` where noted —
  no edits to those existing keys), `docs/product/screens.md`,
  `docs/design-requests/README.md`, `docs/design-changelog.md`. No
  `tokens.css`/`globals.css` edits expected.
