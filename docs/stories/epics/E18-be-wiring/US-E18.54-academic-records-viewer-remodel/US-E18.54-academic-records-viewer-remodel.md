# US-E18.54 Academic-records viewer remodel via member-read + client-side year grouping (BE, confirms US-064)

## Status

implemented

## Lane

normal

> Genuinely large model remap (same class as US-E18.7/ADR 0053, US-E18.12/ADR
> 0054) — normal lane per this epic's own precedent for big-drift-but-no-new-
> mutation stories, but budget engineer + reviewer time accordingly.

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/academic-records/` (read-only viewer slice only — the seal/unseal slice from US-E18.13/24/43 is UNTOUCHED, separate repository)
- Shared contract/file: none new — this closes a standing gap (`academic-records.di.ts`'s viewer factory has been PERMANENTLY force-mocked since US-E18.21)

## Ground truth (fe-lead, verified against local `edu-api` checkout, US-064 confirms; BE's 2026-08-07 response §2)

BE's answer to the "viewer học bạ year-grouping" question this epic has
carried as an open item since US-E18.13/US-E18.21:

- **`classId`+`termId` is the FINAL aggregate model** — seal/unseal/approval
  semantics are permanently keyed on the `(class, term)` tuple (ADR 0047,
  BE-side). There will be **no year-grouping on the wire, ever** — do not
  design around a future denormalization landing.
- **BUT** a per-student READ-ACROSS-EVERYTHING endpoint already exists (not
  new — US-064, just never consumed by this viewer):
  `GET /api/v1/members/{memberId}/academic-records` →
  `ListStudentAcademicRecordsResponse { studentMemberId, records:
  AcademicRecordResponse[] }`. Each `AcademicRecordResponse`:
  `{classId, termId, studentMemberId, status (PENDING|SEALED|UNSEALED),
  gradeSnapshot: GradeSnapshotItemResponse[], termAverage, sealedAt,
  sealedBy, resealCount}`. `gradeSnapshot` items:
  `{subjectId, columnId, columnName, columnType, coefficient, value}` — a
  DYNAMIC per-subject column array (same "no fixed tx1/tx2/giuaKy/cuoiKy
  slots" model already handled by US-E18.7's assessment-scheme wiring, ADR
  0053 — reuse that pattern's mental model, don't re-derive it).
  - RBAC: ADMIN/MANAGER any student, STUDENT self, PARENT linked-child — same
    role gate already established for the single-record endpoint.
- **No `academicYearLabel` on the record row.** Year-grouping is explicitly a
  CLIENT-SIDE join: resolve each record's `classId` against the class's own
  `academicYearLabel` (already a real, required field on `ClassResponse`
  since US-E18.30 — `GET /classes/{classId}` is real). No student-name/DOB
  fields either (same "no identity fields" gap class as every other roster/
  directory endpoint in this epic — degrade gracefully, don't invent one).
- BE explicitly offered: if the client-side join proves too costly/awkward,
  file a NEW ask for a small denormalization (`academicYear` column added to
  the record row + backfill) — "làm được nhanh nhưng cần story riêng". If
  you hit real pain implementing the join (e.g. N+1 class-detail fetches for
  a student with many years of records), FLAG THIS as a new ask rather than
  building an elaborate workaround — a simple bounded fan-out (dedupe
  classIds, one call per distinct class, cached per-request) is fine; if it
  needs a batch class-lookup endpoint that doesn't exist, that's the ask.

## Current state (read before designing anything)

`src/features/academic-records/domain/repositories/i-academic-records.repository.ts`:
`getRecord(studentId, yearId?)` / `listYears(studentId)` — this whole
interface's SHAPE assumes a year-keyed model (`yearId` param, a `listYears`
enumeration call) that has NEVER matched the real contract and now provably
never will. This interface needs a REAL REDESIGN, not a patch:
- `AcademicRecord`/`AcademicYear`/`TermRecord`/`SubjectScore` entities
  (`academic-record.entity.ts`) all assume fixed `tx1`/`tx2`/`giuaKy`/
  `cuoiKy` slots + year-grouping AS the primary read shape. These need to
  become derived/computed CLIENT-SIDE views over a flatter
  `classId+termId`-keyed record list, not the wire shape itself.
- `bootstrap/di/academic-records.di.ts`'s `makeRepository()` is
  UNCONDITIONALLY `MockAcademicRecordsRepository` (permanent, since
  US-E18.21 — "flipping `NEXT_PUBLIC_USE_MOCK=false` app-wide would
  otherwise silently break this screen"). This story is what finally
  removes that permanent block — but ONLY for this viewer slice; the
  SEPARATE seal/unseal repository (`makeSealRepository()`, same DI file)
  is UNTOUCHED, already real for its own operations since US-E18.13/24/43 —
  do not conflate the two repositories or their DI factories.
- 4 consumer routes: `student/academic-record`, `parent/children/[id]/academic-record`,
  `admin/students/[id]/academic-record`, `teacher/students/[id]/academic-record`
  (per grep — confirm this list is complete before starting, there may be
  more). All share `academic-record-screen.tsx`/`.i-vm.ts` — check whether
  ALL four need the SAME remodeled VM shape or whether role-specific
  differences already exist (e.g. does admin see something student doesn't?).

## Scope

1. Redesign `IAcademicRecordsRepository`'s interface to match the real
   member-read shape: something like `getRecords(memberId): Promise<Result<
   AcademicRecordRow[]>>` returning the FLAT `classId+termId`-keyed list (no
   `yearId` param, no separate `listYears` call — the single member-read
   returns everything).
2. Redesign the domain entities to be a CLIENT-SIDE VIEW built from the flat
   record list: group by resolved `academicYearLabel` (from the classId→class
   join), then by `termId`, deriving `SubjectScore`-equivalent rows from each
   record's dynamic `gradeSnapshot` (mirror how US-E18.7's assessment-scheme
   or the seal feature already derive a per-subject rollup from a dynamic
   column array — reuse that derivation logic's SHAPE if not the literal
   code, don't invent a third convention for "dynamic columns → per-subject
   average" in this codebase).
3. Wire the real repository: `GET /members/{memberId}/academic-records` (one
   call, no pagination per the schema) + a bounded, deduped class-detail
   fan-out (`GET /classes/{classId}` per distinct classId in the result) to
   resolve `academicYearLabel`/`className`/`gradeLevel` — compose this in
   `bootstrap/di` per decision 0017 (cross-feature composition), reusing
   whatever real class-read client this app already has (check
   `class-management` feature's real repository before adding a new HTTP
   client for this).
4. Remove the permanent mock-force in `academic-records.di.ts`'s
   `makeRepository()` — flip to the standard `USE_MOCK ? Mock : Real` gate.
   Leave `makeSealRepository()` completely untouched.
5. Update `MockAcademicRecordsRepository` to emit data in the NEW shape
   (flat records, not pre-grouped years) so mock and real share one mapper/
   grouping function — same "mock produces wire-shaped data, one grouping
   function serves both" principle used elsewhere in this epic.
6. Update all 4 consumer routes' VM-building code for the new entity shape.
   Missing student-identity fields (name/DOB) — degrade gracefully (omit or
   placeholder, never fabricate).
7. Error-code mapping: reuse whatever `AcademicRecordsFailure` codes already
   exist for the RBAC gate (self/linked-child/admin) — this is the SAME gate
   already ground-truthed for the single-record endpoint, don't re-derive.
8. If the classId→year join proves genuinely painful (N+1 without a batch
   endpoint), STOP and write the new ask in Evidence rather than building
   something elaborate — this is an explicit escape hatch the coordinator
   authorized.

## NOT in scope

- Seal/unseal repository and its 6 real methods (US-E18.13/24/43) — completely
  separate, untouched.
- `sealed-students` listing, audit-trail (#21, still open, unrelated).
- Any new UI visual design — this is a data-shape remap under the EXISTING
  screen, not a redesign (design-review gate only needed if the actual
  rendered layout changes, not just the data source).

## Acceptance Criteria

- Real mode: a STUDENT can view their own academic record, grouped by year
  (client-derived), showing every class-term they've had a record for.
- Real mode: a PARENT can view a linked child's record the same way.
- Real mode: ADMIN/MANAGER/teacher-with-access can view any student's record.
- No fabricated year-grouping — if the classId→year join can't resolve a
  year for some record, degrade that entry clearly (don't silently drop it,
  don't fabricate a year).
- `USE_MOCK=true` unchanged in outward behavior (same demoable states).
- `makeSealRepository()`/seal-unseal flows: zero behavior change (regression
  guard).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | mapper/grouping-function tests (dynamic gradeSnapshot → per-subject rollup, multi-year grouping, missing-year degrade), repository test (member-read + class-fan-out, dedup proof via call-count) |
| Integration | real interceptor pipeline test |
| E2E | Storybook interaction for all 4 consumer routes' updated states (loading/empty/error/multi-year) |
| Platform | `bun vitest run` zero-regression (including zero regression to seal/unseal's own test suite), `bun run build` mock+real |
| Release | merged to main, branch deleted |

## Harness Delta

- TEST_MATRIX row for academic-records viewer real-mode.
- Answer the "viewer học bạ" open item in the FE→BE report (mark answered, note any new ask filed if the join proved painful).
- EPIC-OVERVIEW.md Wave 8 row.
- `docs/product/screens.md` note for the 4 consumer routes if behavior changed materially.

## Evidence

### The classId→year join: PARTIALLY viable — a new ask WAS filed (#47)

Not straightforward, and not for the reason the packet anticipated (N+1 cost).
The blocker is **RBAC**, ground-truthed in `edu-api/services/core`'s Go source:

| Read carrying `academicYearLabel` | Allow-list | Usable? |
| --- | --- | --- |
| `GET /classes/{classId}` (`get_class.go`) — the read the packet suggested | ADMIN/SUPER_ADMIN/MANAGER, TEACHER **assigned** | ❌ 403 for STUDENT **and** PARENT — i.e. for the two primary AC roles |
| `GET /classes/{classId}/students/{studentMemberId}` (`get_student_enrollment.go`) | ADMIN/SUPER_ADMIN/MANAGER, TEACHER assigned, **STUDENT-self** | ✅ chosen — strictly dominates the above on role coverage |
| `GET /members/{memberId}/enrollment` (`get_member_enrollment.go`) | + **linked PARENT** | ❌ keyed BY yearLabel (year→class), the INVERSE of the needed join, and the year set cannot be enumerated |

Implemented: ONE collaborator — the enrollment point read — deduped per distinct
`classId`, capped at 24 calls, fail-soft per class. It covers ADMIN/MANAGER,
STUDENT-self and assigned TEACHERs with a single call shape (no per-role
strategy zoo). It costs `className`/`gradeLevel` (absent from
`EnrollmentResponse`), so the viewer no longer prints a class label rather than
printing a uuid.

**PARENT cannot resolve any year** — no class-context read in `core` admits the
PARENT role at all. Rather than build a per-role workaround, the escape hatch
was taken for that residue: **ask #47** (denormalize `academicYear` onto
`AcademicRecordResponse` — the denorm BE pre-offered) was filed in
`docs/reports/2026-08-07-fe-to-be-academic-record-viewer-asks.md`. Until it
lands, a parent's records render in the "Chưa xác định năm học" bucket with its
own `role="status"` notice: shown, never dropped, never given an invented year
(AC-4 satisfied, AC-2 partially).

### Second finding → ask #48: TEACHER is not allowed to read at all

`ListStudentAcademicRecordsUseCase` gates ADMIN/MANAGER/SUPER_ADMIN,
STUDENT-self, PARENT-linked-child, `default: forbidden` — **TEACHER is absent**.
The 4th consumer route (`/teacher/students/[id]/academic-record`, which exists
since US-E14.5) therefore always shows the `forbidden` state in real mode. The
route was NOT hidden and no data is simulated; BE is asked to either grant
TEACHER (assigned-class scoped) or declare it out of scope so the route can be
removed.

### Un-force-mock + seal regression

`makeRepository()` is the standard `USE_MOCK ? Mock : Real` gate again;
`makeSealRepository()` in the same file was not modified (verified by
`git diff` — the only change to that function's block is zero lines).
`academic-records.di.test.ts` (renamed from `academic-records-force-mock.di.test.ts`)
keeps BOTH seal cases (mock mode → `MockAcademicRecordsSealRepository`, real
mode → `HybridAcademicRecordsSealRepository` with `ensureFreshSession` called)
and the whole seal test suite (`academic-records-seal.repository.test.ts`,
`academic-records-seal-hybrid.repository.test.ts`,
`academic-records-seal.mock.repository.test.ts`, `seal-batch.mapper.test.ts`,
the 5 seal use-case suites, `academic-record-seal-container.test.tsx`) is
untouched and green.

### Consumer routes (grep-confirmed complete: exactly 4)

`student/academic-record`, `parent/children/[studentId]/academic-record`,
`admin/students/[studentId]/academic-record`,
`teacher/students/[studentId]/academic-record` — all four share
`buildAcademicRecordVM` and needed no per-role VM difference. Only the student
route changed shape: it now passes `SELF_MEMBER_ID` and the real memberId is
resolved server-side from the token `sub` claim (a literal `"me"` on the wire
would 400/403), failing closed to `forbidden` when unresolvable.

### Proof

- `bun vitest run` — **500 files / 3879 tests green** (a first cold-cache run
  showed 9 unrelated 5s-timeout flakes in RSC page tests; a warm re-run is fully
  green, and the same files pass in isolation).
- `bunx tsc --noEmit` — clean. `bun lint` — clean (1 pre-existing warning +
  1 info elsewhere in the repo). `bun run build` — green.
- Storybook: `bunx vitest run --config vitest.storybook.mts` — 157 files /
  1239 green; the academic-record file is 12 stories including the two new
  degrade states.

### UI note for the design-review gate

This is a data-source remap, but the rendered layout DID change (unavoidably):
the student identity block and the conduct column/footer are gone (no wire
source), and the fixed 4-column score table became a dynamic column axis derived
from `gradeSnapshot`. Flagged to `fe-lead` for the gate.

### A11y audit (2026-08-07)

**Scope:** `academic-record-screen.tsx`, `year-timeline.tsx`,
`academic-record-table.tsx`, `seal-status-badge.tsx`,
`academic-record-skeleton.tsx`, `academic-record-container.tsx` — the year-
grouped viewer rendered on all 4 consumer routes (student/parent/admin/
teacher `academic-record`). Criteria: contrast (resolved against
`src/app/tokens.css`), keyboard/focus (ARIA APG tabs), heading hierarchy, ARIA
validity, status-not-by-color-alone, motion, forms/labels (n/a — read-only
viewer, no inputs), touch targets.

**Overall: FAIL (gate-blocking) — 1 Blocking/Major-class content-correctness
finding (A11Y-001), 1 Major (A11Y-002), 2 Minor (A11Y-003/004). No contrast
failures found — every token used here (`text-edu-error-text`,
`text-edu-warning-foreground`, `text-edu-success-text`, `StatusBadge`
success/muted tones) resolves to an already-AA-verified pair per
`.claude/agent-memory/fe-accessibility-auditor/token-contrast-ratios.md`.**

#### WCAG 2.1 AA coverage

| Criterion | Description | PASS/FAIL | Finding |
| --- | --- | --- | --- |
| 1.3.1 Info and Relationships | Status conveyed accurately in markup/label | FAIL | A11Y-001 |
| 1.3.1 / 4.1.1(2.1) | ARIA references resolve to real elements | FAIL | A11Y-005 |
| 1.4.1 Use of Color | Status not color-only | PASS | icon+text on every badge (`Lock`/`LockOpen`, `Unlock`, `AlertTriangle`, `Info`) |
| 1.4.3 Contrast (Minimum) | Text ≥4.5:1, large/UI ≥3:1 | PASS | verified against tokens.css (see below) |
| 2.1.1 Keyboard | All interactive elements operable | PASS (print button conditionally, see A11Y-002) | year tabs: full arrow/Home/End roving-tabindex; table has no interactive cells |
| 2.4.3 Focus Order | Tab order = reading order | PASS | title → print btn → header → year tabs → tabpanel → term sections |
| 2.4.6 Headings and Labels | No skipped heading levels | FAIL | A11Y-003 |
| 2.4.7 Focus Visible | Visible focus ring | PASS | year tabs use `focus-visible:ring-2 ring-ring ring-offset-2`; print button inherits shadcn default ring |
| 2.5.5 Target Size (AAA, tracked as house baseline) | ≥44×44 | PASS | Button `min-h-11`; year-tab buttons two-line ~56px |
| 3.3.2 Labels or Instructions | Disabled-control reason perceivable to all input modes | FAIL | A11Y-002 |
| 4.1.2 Name, Role, Value | Programmatic state matches visual state | FAIL | A11Y-001, A11Y-002 |
| Motion (prefers-reduced-motion) | Gated | PASS | `Skeleton` already `motion-safe:animate-pulse` (pre-existing primitive) |

#### Findings

```
A11Y-001
Severity: Major (WCAG 1.3.1 Info and Relationships, 4.1.2 Name/Role/Value)
Component: src/features/academic-records/presentation/academic-record-screen/academic-record-screen.tsx (TermSection, ~L98) + seal-status-badge.tsx
Issue: A term with status PENDING is rendered with a "Chưa niêm phong"
  (unsealed) badge — both the visible label and its `aria-label` — even
  though PENDING and UNSEALED are semantically distinct states (never-graded
  vs previously-sealed-then-reopened). This misleads sighted AND
  screen-reader users identically (not a contrast/color-only issue — the
  wrong word is announced). `SealStatusBadge` only accepts a boolean
  `sealed`, so `TermSection` calls it unconditionally as
  `<SealStatusBadge sealed={term.status === "SEALED"} />` for every term
  regardless of PENDING/UNSEALED. The dedicated tri-state copy already
  exists and is unused: `messages/{vi,en}.json` → `academicRecord.termStatus.
  {PENDING,SEALED,UNSEALED}` = "Chưa ký"/"Đã ký"/"Đã mở" (grep-confirmed: zero
  usages of `termStatus` in `src/features/**/presentation`). The same
  boolean-collapse pattern also exists one level up in `RecordHeader`
  (`SealStatusBadge sealed={record.sealed}`), which is lower severity because
  `record.sealed` is an explicit "all terms sealed" aggregate, not a mismatch
  against an unused tri-state key.
Evidence:
  academic-record-screen.tsx:
    <SealStatusBadge sealed={term.status === "SEALED"} />   // no PENDING branch
  seal-status-badge.tsx:
    export function SealStatusBadge({ sealed, className }: SealStatusBadgeProps)
  messages/vi.json → academicRecord.termStatus.PENDING = "Chưa ký"  (unused)
Fix: give SealStatusBadge a tri-state `status: TermStatus` prop (or a
  sibling `TermStatusBadge`) that maps PENDING→muted/dashed icon+"Chưa ký",
  SEALED→success/Lock+"Đã ký", UNSEALED→warning/LockOpen+"Đã mở", using the
  already-present `academicRecord.termStatus.*` keys, e.g.:
  ```tsx
  const STATUS_TONE: Record<TermStatus, StatusTone> = {
    PENDING: "muted", SEALED: "success", UNSEALED: "warning",
  };
  const STATUS_ICON: Record<TermStatus, LucideIcon> = {
    PENDING: Clock, SEALED: Lock, UNSEALED: LockOpen,
  };
  export function TermStatusBadge({ status }: { status: TermStatus }) {
    const t = useTranslations("academicRecord.termStatus");
    const Icon = STATUS_ICON[status];
    return (
      <StatusBadge tone={STATUS_TONE[status]} aria-label={t(status)}>
        <Icon aria-hidden className="size-3" />
        {t(status)}
      </StatusBadge>
    );
  }
  ```
  Then in `TermSection`: `<TermStatusBadge status={term.status} />` (drop
  the PENDING-vs-not conditional, the badge itself now expresses PENDING
  correctly, so keep it rendered for all three states — no branching around
  it needed). Add matching `ariaPending` copy if a distinct aria phrase is
  desired (existing `sealStatus.ariaSealed/ariaUnsealed` can stay for
  `RecordHeader`'s aggregate use, or migrate that call site too for
  consistency).
Reference: WCAG 1.3.1 https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html ; 4.1.2 https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html

A11Y-002
Severity: Major (WCAG 4.1.2 Name/Role/Value, 3.3.2 Labels or Instructions)
Component: src/features/academic-records/presentation/academic-record-screen/academic-record-screen.tsx (print Button, ~L203-212)
Issue: The "In học bạ" (print) button uses `aria-disabled="true"` (not the
  native `disabled` attribute) with `onClick={(e) => e.preventDefault()}` and
  a `title` tooltip explaining it's coming soon. `components/ui/button`'s
  variant classes only style `disabled:opacity-50 disabled:pointer-events-none`
  (keyed off the native attribute) — there is no `aria-disabled:` rule — so
  the button renders visually identical to a fully enabled outline button.
  A sighted mouse user only discovers it's inert via the `title` hover
  tooltip (delayed, and invisible on touch devices); a sighted keyboard-only
  user gets ZERO visual or textual cue before or after activating it — Tab
  lands on it, it looks pressable, Enter/Space does nothing silently. Only a
  screen-reader user gets any signal (AT announces "dimmed"/"unavailable"
  from `aria-disabled`), and even then with no reason given (the `title`
  text is not exposed via `aria-describedby`, so most screen readers won't
  read it either).
Evidence:
  className (Button primitive): "... disabled:pointer-events-none disabled:opacity-50 ..."
  academic-record-screen.tsx:
    <Button type="button" variant="outline" aria-disabled="true"
      title={t("printButtonComingSoon")} onClick={(e) => e.preventDefault()}>
Fix: add an `aria-disabled` visual variant and expose the reason via
  `aria-describedby` instead of (or in addition to) `title`:
  ```tsx
  <Button
    type="button"
    variant="outline"
    aria-disabled="true"
    aria-describedby="print-record-note"
    className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
    onClick={(e) => e.preventDefault()}
  >
    <Printer aria-hidden className="size-4" />
    {t("printButton")}
  </Button>
  <span id="print-record-note" className="sr-only">
    {t("printButtonComingSoon")}
  </span>
  ```
  (If this "aria-disabled but focusable + tooltip" pattern recurs elsewhere,
  consider adding the `aria-disabled:opacity-50 aria-disabled:pointer-events-none`
  pair directly to the shared Button primitive's base class so every
  aria-disabled button in the app gets the visual state for free.)
Reference: ARIA APG disabled controls — https://www.w3.org/WAI/ARIA/apg/practices/programmatically-disabled-controls/ ; WCAG 3.3.2 https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html

A11Y-003
Severity: Minor (WCAG 2.4.6 Headings and Labels — heading-hierarchy best practice)
Component: src/features/academic-records/presentation/academic-record-screen/academic-record-screen.tsx
Issue: Heading levels skip from `<h1>` (page title, "Học bạ học sinh") directly
  to `<h3>` (`TermSection`'s "Học kỳ 1"/"Học kỳ 2") with no `<h2>` anywhere.
  The year grouping itself (`YearTimeline`, the active year's label) is
  conveyed only via a `role="tablist"` of buttons, never a heading — a
  screen-reader user navigating by heading (a common strategy, e.g. NVDA "H"
  key) gets `h1` then jumps straight to term headings with no structural cue
  that a year boundary exists in between.
Evidence:
  academic-record-screen.tsx: <h1 className="font-extrabold text-2xl ...">{t("pageTitle")}</h1>
  academic-record-screen.tsx (TermSection): <h3 className="font-bold text-base ...">{title}</h3>
Fix: add a (visually-hidden if the visual design shouldn't change per "NOT in
  scope") `<h2>` for the active year inside the tabpanel, above the term
  list:
  ```tsx
  <div id={`tabpanel-${activeYear.yearId}`} role="tabpanel" ...>
    <h2 className="sr-only">
      {t("yearHeading", { year: activeYear.yearLabel ?? t("yearTimeline.unresolvedLabel") })}
    </h2>
    {activeYear.terms.map((term) => (...))}
  </div>
  ```
  (add the `academicRecord.yearHeading` key to `messages/{vi,en}.json`).
Reference: WCAG 2.4.6 https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels.html

A11Y-004
Severity: Minor (WCAG 4.1.1 (2.1) / axe `aria-valid-attr-value` — ARIA reference validity)
Component: src/features/academic-records/presentation/academic-record-screen/year-timeline.tsx
Issue: Every tab button sets `aria-controls={`tabpanel-${year.yearId}`}`
  unconditionally, but `academic-record-screen.tsx` only ever renders ONE
  tabpanel in the DOM at a time — the one for the currently active year
  (`id={`tabpanel-${activeYear.yearId}`}`). For every non-active tab, its
  `aria-controls` therefore points to an element ID that does not exist
  anywhere in the document. This is flagged by axe-core's
  `aria-valid-attr-value` rule (Storybook's `@storybook/addon-a11y` should
  surface it once a story exercises >1 year) and is technically invalid per
  the ARIA spec (`aria-controls` must reference an existing element).
Evidence:
  year-timeline.tsx: aria-controls={`tabpanel-${year.yearId}`}  (set on every tab, all years)
  academic-record-screen.tsx: <div id={`tabpanel-${activeYear.yearId}`} role="tabpanel" ...>  (only the active year's panel exists)
Fix: only expose `aria-controls` on the currently-selected tab (cheapest,
  matches what's actually true in the DOM at any moment):
  ```tsx
  aria-controls={active ? `tabpanel-${year.yearId}` : undefined}
  ```
Reference: ARIA APG Tabs pattern — https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ ; axe rule `aria-valid-attr-value`
```

#### Keyboard navigation map

1. `Tab` → page title (not focusable, skip) → **Print button** (Button,
   focusable even though inert — see A11Y-002) → **RecordHeader** (no
   focusable content) → **YearTimeline** first tab (roving tabindex: only
   the active tab has `tabIndex={0}`, others `-1`) → **tabpanel** (itself
   `tabIndex={0}` per ARIA APG so `Tab` from the tablist lands on the
   panel's content, not skips it) → term section content (table has no
   focusable cells; this viewer is read-only).
2. On the tablist: `ArrowRight`/`ArrowLeft` move + select (wrap-around),
   `Home`/`End` jump to first/last — matches ARIA APG "automatic activation"
   tabs pattern. Verified in `year-timeline.tsx`'s `handleKeyDown`.
3. `Enter`/`Space` on a year tab: native `<button>` activation — fires
   `onClick` (redundant with roving-tabindex arrow selection, correct as a
   fallback for click/touch and for landing via `Home`/`End` without
   Enter).
4. Print button `Enter`/`Space`: fires `onClick`, which is a no-op
   (`preventDefault`) — see A11Y-002 for the missing feedback.

#### Screen-reader script (NVDA-style, before → after fixes)

- **Year tab (PENDING-adjacent term), before:** "tab, Năm học 2024-2025, not
  selected" → (arrow to activate) → "Học kỳ 1, heading level 3" → "Chưa niêm
  phong" [WRONG — the term is PENDING, never sealed, not "unsealed"] → "Học
  kỳ chưa được ký, Bản ghi học bạ sẽ xuất hiện ở đây sau khi điểm được khoá
  và ký."
  **After A11Y-001 fix:** "... Học kỳ 1, heading level 3" → "Chưa ký" [correct] → same pending-body text.
- **Print button, before:** "In học bạ, button, dimmed" (title text never
  reached) — user has no idea WHY it's dimmed.
  **After A11Y-002 fix:** "In học bạ, button, dimmed, Tính năng in sẽ sớm ra
  mắt" (via `aria-describedby`).
- **Heading navigation, before:** "heading level 1, Học bạ học sinh" → next
  heading jumps straight to "heading level 3, Học kỳ 1" (no year context).
  **After A11Y-003 fix:** "... level 1 ..." → "heading level 2, Năm học
  2024-2025" → "heading level 3, Học kỳ 1".

#### Quick wins (< 30 min each, sorted by severity)

1. A11Y-002 — add `aria-disabled:pointer-events-none aria-disabled:opacity-50`
   to the print Button's className + move the tooltip text into an
   `aria-describedby`'d `sr-only` span.
2. A11Y-001 — swap `SealStatusBadge sealed={boolean}` for a tri-state
   `TermStatusBadge status={term.status}` using the already-existing
   `academicRecord.termStatus.*` i18n keys (no new keys needed for the
   label; only a new `ariaPending` key if a distinct aria phrase is wanted).
3. A11Y-004 — one-line change: `aria-controls={active ? ... : undefined}`
   in `year-timeline.tsx`.
4. A11Y-003 — add one `sr-only` `<h2>` inside the tabpanel + one new i18n
   key (`academicRecord.yearHeading`).

### Tech-lead review (2026-08-07)

**Verdict: APPROVED** (no blocking findings; 4 SHOULD FIX / 3 CONSIDER
follow-ups below). The design-review gate is still MANDATORY before close — see
the §UI note assessment.

Checks actually run in this worktree (not taken on trust):
`bunx tsc --noEmit` clean · `bun vitest run` **500 files / 3879 tests green**
(warm run, no flakes — matches the claim) · `bunx vitest run --config
vitest.storybook.mts src/features/academic-records` 2 files / 39 green ·
`bun lint` clean (1 pre-existing warning in `messaging`, 1 info) ·
`NEXT_PUBLIC_USE_MOCK=false bun run build` green.

Ground truth re-verified against the local `edu-api` checkout, not the packet's
summary: `ListStudentAcademicRecordsUseCase.Execute` gates
`SUPER_ADMIN | isAdminOrManager | STUDENT-self | PARENT-linked`, `default:
forbidden` → **TEACHER really is absent** (ask #48 justified);
`GetStudentEnrollmentUseCase.authorize` admits ADMIN/SUPER_ADMIN/MANAGER +
assigned TEACHER + STUDENT-self and **not** PARENT (ask #47 justified, and
choosing it over `GET /classes/{id}` is correct);
`/api/v1/members/{memberId}/academic-records` exists in `openapi.yaml`;
`AcademicRecordResponse` matches the new DTO field-by-field incl. the decimal
STRING `coefficient`/`value`/`termAverage` and the five `omitempty` pointers;
`ErrAcademicRecordForbidden` is `academic_record_forbidden`, which
`pkg/kit/response/error.go` upper-cases on the wire — so `toFailure`'s
UPPER_SNAKE `_FORBIDDEN`/`_NOT_FOUND` branching is right, with status as backstop.

**Architecture — PASS.** Repository + resolver carry `server-only`; the pure
mapper correctly does not (repo-wide convention). `bootstrap/di` owns BOTH
cross-aggregate joins (decision 0017) — the repository never composes a foreign
feature itself, it takes narrow function ports (`ResolveYearByClassId`,
`ResolveSubjectNames`). Endpoint constants only; the two fictional constants
were deleted rather than kept as documentation, correctly, since they modelled a
contract no server ever had. `presentation/` imports no infrastructure.
`build-academic-record-vm.ts` importing `bootstrap/di` is pre-existing (it is an
RSC loader with no `'use client'`) — unchanged here, not flagged. The un-force-mock
is exactly `USE_MOCK ? Mock : Real` with `ensureFreshSession()` before
`createServerHttpClient()` (playbook step 6, required now that a `!USE_MOCK`
branch exists). `makeSealRepository()` is byte-identical and env-matrix
regression-guarded in BOTH modes.

**Code quality — Excellent.** No `any`, no unexplained `!`. The "mock fixture is
WIRE-SHAPED so both branches run one mapper + one grouping" decision is the right
call and is what keeps the stories non-fictional. `parseDecimal` returning `null`
(never `0`) for an absent score, and the server's frozen `termAverage` winning
over the client re-derivation, are correct học-bạ semantics. `deriveColumnAxis`
keying on `columnName` (not the per-subject `columnId`) is a real trap avoided.

**Data & contract — PASS.** Payload consumed directly (no `.data` read); no
`raw:true` because the endpoint is genuinely unpaginated (asserted by a test that
the GET carries no config object at all); failures branch on `error.code`/status,
never on message; both collaborators are fail-soft so a decoration 403 can never
take the record read down. `resolveYears` receives DISTINCT classIds and the
SERVER-echoed `studentMemberId`, not the caller's argument.

**Design system & i18n — PASS.** Zero raw colors in the diff (grep-verified);
`bg-edu-warning/10 + border-edu-warning/40 + text-edu-warning-foreground` and
`text-edu-error-text` are the sanctioned combos. vi/en parity verified
programmatically over the whole catalogue: **0 vi-only, 0 en-only keys**; every
`AcademicRecordsFailure["type"]` has an `error.<type>` entry in both files;
removed keys (`conduct.*`, `table.tx1/tx2/midterm/final/conduct`,
`student.code|dob|currentClass|currentYear`, `termSection.signedBy`) have no
remaining referents. Placeholder-instead-of-uuid for an unresolved subject and
the honest "Chưa xác định năm học" bucket are the right degrades.

**Security — PASS.** `SELF_MEMBER_ID` is resolved server-side from the token
`sub` claim and fails CLOSED to `forbidden` when unresolvable (unit-tested); a
literal `"me"` can never reach the wire. No PII added to the client beyond the
memberId already in the URL; refusing to print `sealedBy`/`subjectId` uuids is a
quality decision, not a gap. The non-self routes are authorized server-side by
`core`'s own use-case gate.

**Test coverage — PASS.** ~59 new/updated cases: mapper 10, grouping 9, weighted
average 7, repository 17, resolver 5, VM loader 8, DI env-matrix + dedupe/403
degrade 7, plus 12 Storybook stories including the two new degrade states and
loading/empty/error. The DI dedupe test (4 records → 2 enrollment reads with one
class 403ing) is the right integration-level proof.

#### Required changes

- **[SHOULD FIX]** `docs/decisions/0055-academic-records-seal-wiring-contract.md`
  §Follow-Up (~lines 199-215) — this US REVERSES the "Closed (2026-07-26,
  US-E18.21)" item (the permanent viewer force-mock and the "permanent blocked
  stub" status of `AcademicRecordsRepository`), yet
  `git diff main...HEAD -- docs/decisions/` is EMPTY. Precedent US-E18.24 added a
  dated in-place supersession note for exactly this. Add
  `## Supersession note (2026-08-07, US-E18.54)` (or amend the Closed item in
  place) — the ADR currently states the opposite of the code.
- **[SHOULD FIX]** `src/features/admin/subject-catalogue/infrastructure/repositories/subject-catalogue.repository.ts:297`
  and `.../mocks/subject-catalogue.mock.repository.ts:117` — `listAllSubjects()`
  is a new port method with a real HTTP path and ZERO direct test (`grep` finds
  only the two impls, the interface and the DI call site); it is exercised only
  indirectly via the DI test's `/subjects → []` stub. Add one case to the
  existing `subject-catalogue.repository.test.ts` (single page + two-page cursor
  drain, asserting `raw:true` stays a CONFIG-level sibling) and one to the mock's
  suite.
- **[SHOULD FIX]** `docs/product/screens.md` — the Harness Delta lists a screens
  note "if behavior changed materially", and it did: the four viewer routes lost
  the student identity block and the conduct column, and
  `(app)/teacher/students/[studentId]/academic-record` now renders `forbidden`
  in real mode for EVERY teacher (ask #48). Rows 127/137 (and the teacher row 75)
  should say so, so the next reader doesn't take the teacher route as working.
- **[SHOULD FIX]** §UI note for the design-review gate — accurate and correctly
  routed to `fe-lead`, but under-specified in two ways the gate needs: (a) it
  omits that the term header ALSO lost "Người ký" (`termSection.signedBy`,
  deleted) and the class label, so that header is now date + badge only, and
  that `termSection.class` is left dead in messages; (b) it does not name the
  artefact that now diverges — `design_src/edu/academic-record-view.jsx`, the
  handoff mockup specifying the identity block, the conduct column and the fixed
  TX1/TX2/Giữa-kỳ/Cuối-kỳ axis. Name that file so the gate is a spec-drift
  review rather than a screenshot review. Per decision 0011 a wire-shape
  constraint may legitimately override the handoff, but the override must be
  recorded.
- **[CONSIDER]** `src/bootstrap/di/academic-records.di.ts:60-67` +
  `academic-records.repository.ts:70-75` — the subject-catalogue drain runs on
  EVERY viewer render, including for a student with zero records (the year
  resolver is short-circuited on an empty record set; the subject lookup is not).
  Move `resolveSubjectNames()` below the `rows.length > 0` check and pass
  `limit: 200` into `fetchAllSubjectDtos` (core's `subjListDefaultLimit = 50`,
  `subjListMaxLimit = 200`) so a large tenant costs one round trip instead of
  several sequential ones inside an RSC render. That helper also has no
  `MAX_PAGES` cap — pre-existing, but this US puts it on a student-facing path.
- **[CONSIDER]** `messages/{vi,en}.json` — `academicRecord.termSection.class` is
  now dead (the only remaining `t("class")` is `academicRecordSeal.selector.class`,
  a different namespace). Delete it in both files alongside the other pruned keys.
- **[CONSIDER]** `build-academic-record.ts:51-53` — terms are ordered by
  `termId.localeCompare`, meaningful for `"HK1"/"HK2"` and arbitrary for the uuid
  termIds the DTO comment says are equally legal. The doc comment explains the
  YEAR ordering but not this one; add a line (or sort uuid terms by `sealedAt`).

No security, data-loss or contract-correctness defect was found. Approved to
proceed to the design-review gate.
