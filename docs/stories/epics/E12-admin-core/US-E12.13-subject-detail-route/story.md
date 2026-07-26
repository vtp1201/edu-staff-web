# US-E12.13 Subject Detail deep-link route

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E12.3 (Subject Catalogue — subject-detail-sheet.tsx, subject.entity.ts, actions already implemented)
- Blocks: none
- Feature module(s) chạm: `src/features/admin/subject-catalogue/presentation/` (extract shared form body); `src/app/[locale]/t/[tenant]/(app)/admin/subjects/[id]/` (new route)
- Shared contract/file: `getSubjectAction`, `patchSubjectAction`, `archiveSubjectAction` (`src/app/[locale]/t/[tenant]/(app)/admin/subjects/actions.ts`) — reused, not duplicated

## Product Contract

Close gap NEW-02 (`docs/product/screens.md:96`): the Subject Detail master
editor content exists today only as a Sheet (`subject-detail-sheet.tsx`)
opened from the Subjects table. There is no deep-linkable route
`(app)/admin/subjects/[id]`, so the master editor cannot be bookmarked,
shared, or opened directly (e.g. from a notification or another screen).

This story builds the full-page route per the design reference
(`design_src/edu/subject-detail.jsx`, US-048/ADR 0036): same locked-curriculum
editor fields + class-offerings table + archive action, in a full-page shell
with a back-to-catalogue breadcrumb, reusing the EXISTING business logic
(actions, entities, validation) — no new BE calls, no new domain use-cases.

Per `.claude/rules/component-organization.md`, the shared editor body (fields,
validation, save/archive handlers) is extracted ONCE out of
`subject-detail-sheet.tsx` into a presentational component both the Sheet
(existing, used from the table row) and the new full page import — not
copy-pasted.

## Relevant Product Docs

- `docs/product/screens.md:96` (gap NEW-02)
- `design_src/edu/subject-detail.jsx` (US-048, ADR 0036 — normative full-page layout)
- `docs/stories/epics/E12-admin-core/US-E12.3-subject-catalogue.md` (sheet origin story)

## Acceptance Criteria

- Given an admin navigates to `/admin/subjects/<validId>`, the full-page
  Subject Detail editor renders: breadcrumb (department name → subject name),
  basic-info fields (name, code), locked curriculum fields (period count,
  assessment count, outcome targets, master syllabus, exercise/exam bank
  refs) with the same lock tooltip affordance as the Sheet, and the
  class-offerings table (or empty state).
- Given the admin edits an editable field and saves, `patchSubjectAction` is
  called and a success confirmation is shown (mirrors Sheet behavior) —
  same validation rules as the Sheet enforces today (code regex via
  `validate-subject-code.use-case.ts`). **Amended during review
  (fe-tech-lead-reviewer, 2026-07-26):** name-required is NOT currently
  enforced anywhere in the stack (`PatchSubjectUseCase` only validates
  code; this is a pre-existing gap inherited from US-E12.3, not introduced
  here) — this AC is descoped from "name required" to avoid growing shared
  validation logic outside this story's boundary. Tracked as a candidate
  follow-up: add a `missing-name` failure + i18n key to
  `PatchSubjectUseCase`, applies to both the Sheet and this page.
- Given the subject id does not exist (or belongs to another tenant),
  the route shows a "not found" state — no crash, no leaked data across
  tenants — instead of rendering stale/empty fields silently.
- Given the subject is `ACTIVE` and not `inUse`, an Archive action is
  available on the full page (same guarded behavior as the Subjects table
  row: blocked + tooltip when `inUse`).
- Given the admin clicks the breadcrumb / back action, they return to
  `/admin/subjects`.
- The route inherits the existing `(app)/admin/layout.tsx` RSC role guard
  (no new guard code needed) — non-admin roles never reach this page.
- The Sheet (`subject-detail-sheet.tsx`) continues to work unchanged from the
  Subjects table (no regression) — both consume the same extracted shared
  component.
- WCAG 2.1 AA: keyboard reachable, focus visible, contrast passes tokens,
  status not color-only (existing Sheet a11y patterns preserved).

## Design Notes

- Commands: `patchSubjectAction(id, data)`, `archiveSubjectAction(id)` (existing, reused)
- Queries: `getSubjectAction(id)` (existing, reused — returns `{ subject, classOfferings }` or `errorKey`)
- API: none new — `core` service still absent; DI stays mock-first via
  `makeSubjectCatalogueRepository()` (unchanged)
- Tables: none (client-side entity, no schema change)
- Domain rules: reuse `PatchSubjectInput` validation already enforced in
  `patch-subject.use-case.ts` / `validate-subject-code.use-case.ts` — do not
  re-implement
- UI surfaces: new `SubjectDetailScreen` (full-page container) +
  extracted shared `SubjectDetailForm`/`SubjectDetailContent` body consumed by
  both `subject-detail-sheet.tsx` (existing) and the new page

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E12.13 --unit 1 --integration 1 --e2e 1 --platform 1`.

| Layer | Expected proof |
| --- | --- |
| Unit | shared form extraction keeps existing behavior; any new pure logic (e.g. not-found derivation) covered |
| Integration | route/page composes `getSubjectAction` correctly incl. not-found error path |
| E2E | Storybook interaction / QA states: populated, not-found, archive-blocked, save success/error |
| Platform | `tsc --noEmit` clean, `bun build` green (route appears in output), full Vitest suite green |
| Release | design-review gate pass (impeccable audit + critique) |

## Harness Delta

- Registers US-E12.13 (new).
- On completion: update `docs/product/screens.md:96` to remove NEW-02 flag
  and mark the route ✅.

## Evidence

```text
Design review: pass
- design-system: conform — all new files (subject-detail-screen.tsx,
  subject-detail-fields.tsx, archive-subject-dialog.tsx, [id]/page.tsx) use
  only semantic tokens (bg-card, text-foreground, text-muted-foreground,
  edu-radius-*, shadow-card, StatusBadge tones); verified raw-color grep by
  fe-tech-lead-reviewer returns exactly one pre-existing hit
  (archive-subject-dialog.tsx text-white, carried verbatim from
  subjects-screen.tsx, not introduced here). Reuses StatusBadge/Button/
  Tooltip/AlertDialog patterns verbatim — no new component pattern invented.
  Role-color rule n/a (admin-only surface).
- a11y: WCAG AA — fe-accessibility-auditor verdict PASS with minor
  follow-ups. A11Y-001 (Major, 44x44 touch target on 2 icon-only buttons)
  fixed same-session (min-w-11). Contrast/status-not-color-only/keyboard/
  focus/reduced-motion all confirmed passing (no new motion added). One
  non-blocking follow-up left open (A11Y-002 archiveButton/statusArchived
  same-copy note — confirmed non-issue on this page since the two never
  render simultaneously).
- impeccable audit: pattern-reuse screen (Sheet → full page extraction), no
  new anti-pattern surface introduced. One pre-existing design-reference
  divergence carried over (locked-field blue/info treatment vs the
  design_src mockup's amber treatment) — deliberately NOT reconciled to
  avoid regressing the Sheet's US-E12.3 visual baseline (Sheet and page
  must render identical field chrome per the extraction's regression bar);
  flagged as a candidate follow-up if design wants pixel-parity later.
- states: not-found (inline, no redirect, no crash) / empty-offerings
  (UsageCard empty state) / archived read-only (fields disabled + save bar
  hidden) / save success+error / archive-blocked+confirm all covered by
  7 Storybook interaction stories in subject-detail-screen.stories.tsx.
  Responsive: mx-auto max-w-6xl + flex-wrap/grid-cols pattern matches the
  already-shipped subjects-screen.tsx (passed this gate under US-E12.3);
  no fixed-width elements that would break at 320px.
```

## Implementation Plan

### Summary

Close gap NEW-02 by adding a deep-linkable full-page route
`(app)/admin/subjects/[id]` that reuses 100% of the existing business logic
(`getSubjectAction` / `patchSubjectAction` / `archiveSubjectAction`,
`subject.entity.ts`, `PatchSubjectInput` validation already enforced
server-side). No new domain use-cases, no new DTOs, no new DI wiring beyond
what US-E12.3 already built.

**Key decision (component-organization.md, decision `0026`):** the editor
body (basic-info fields, locked curriculum fields + lock tooltips,
class-offerings table, save handling) is extracted ONCE out of
`subject-detail-sheet.tsx` into a new shared presentational component,
`subject-detail-form.tsx`, consumed by BOTH the existing Sheet (slide-over,
opened from the table row) and the new full-page route. Neither consumer is
forked — the Sheet becomes a thin chrome wrapper around the same body.

**Archive ownership decision:** Archive stays OUT of the extracted shared
body and is NOT added to the Sheet. Rationale below (§2).

**Not-found pattern decision:** unlike `teacher/question-bank/[id]/edit`
(which redirects to the list with a `?notice=` query param), this route
renders an **inline not-found state** in the page itself — matching the
normative design reference (`design_src/edu/subject-detail.jsx` lines 36-42,
`SubjectDetailScreen` returns a centered "Subject not found." message, no
redirect). AC-3 explicitly asks for a "not found" state on the route, not a
bounce back to the list. `not-found` and `forbidden` failure keys both
render the SAME inline not-found copy (no tenant-existence leak) — confirmed
`getSubject()` in the mock repo (`subject-catalogue.mock.repository.ts:159`)
already only ever returns `not-found` (repo is tenant-scoped at DI
construction, per `makeSubjectCatalogueRepository()` — no separate
cross-tenant branch exists to leak).

"Done" = `/admin/subjects/<id>` renders the full-page editor (or not-found),
save/archive round-trip through the existing actions, Sheet regresses zero
E12.3 tests, design-review gate green.

### Phase 1 — Extract shared editor body (no route yet)

**Goal:** de-duplicate the field/validation/save logic so the Sheet and the
future page share one implementation, with ZERO behavior change to the
Sheet (regression bar).

**Files:**
- NEW `src/features/admin/subject-catalogue/presentation/subjects-screen/subject-detail-form.tsx`
  — extracted from `subject-detail-sheet.tsx`: all `useState`/`useEffect`
  field logic, `handleSave`, the three `<section>` blocks (basic info,
  curriculum, class-offerings table). Props: `subject: Subject | null`,
  `classOfferings: ClassSubject[]`, `loading: boolean`,
  `onSave: (id, data) => Promise<SubjectActionResult>`,
  `savedFeedback`/`error` are internal state (kept inside the form, both
  consumers get the "Đã lưu"/error line for free) — expose them via a small
  render-prop or keep the SheetFooter/page-footer save button OUTSIDE the
  form and lift `{ saving, saved, error, handleSave }` up via a
  `useSubjectDetailForm(subject, onSave)` hook instead of a monolithic
  component, so each consumer keeps its own footer chrome (Sheet footer vs.
  full-page sticky save bar look different per the design ref — sticky bar
  bottom vs. inline SheetFooter). **Decision: split into
  `useSubjectDetailForm.ts` (state/validation/save hook, framework-agnostic
  React) + `SubjectDetailFields` (presentational, renders the 3 sections)** —
  this avoids forcing the page's sticky-save-bar layout into the Sheet's
  footer layout while still sharing 100% of field/validation logic.
- EDIT `subject-detail-sheet.tsx` — replace inline field state with
  `useSubjectDetailForm` + render `<SubjectDetailFields ... />` inside
  `SheetContent`; footer (`Đóng`/`Lưu thay đổi`, saved feedback line) stays
  Sheet-owned, wired to the hook's `saving`/`saved`/`error`/`handleSave`.

**Test first:** `subject-detail-sheet.stories.tsx` interaction tests (if
none exist yet, check first) OR a small `use-subject-detail-form.test.ts`
(Vitest + `@testing-library/react` `renderHook`) asserting: save trims
name/nulls empty code, calls `onSave(id, data)` with the exact
`PatchSubjectInput` shape currently built in `handleSave`, sets
`saved=true` on `ok:true`, surfaces `tErrors(errorKey)` on `ok:false`. This
test must pass BEFORE refactor (red on the new hook file, green once
extracted) — genuinely new proof, not a re-test of E12.3 (E12.3 already
covers the Sheet's rendering; this covers the extracted pure state logic in
isolation).

**Done when:** existing `subjects-screen.tsx`/Sheet Storybook interaction
suite (E12.3) still green with zero test edits: same DOM output, same
`aria-*`, same field IDs — behavior-preserving extraction.

### Phase 2 — Full-page presentation component

**Goal:** build `SubjectDetailScreen` full-page container consuming the
Phase-1 shared pieces + breadcrumb + Archive (page-only, see decision above)
+ not-found state.

**Files:**
- NEW `src/features/admin/subject-catalogue/presentation/subjects-screen/subject-detail-screen.tsx`
  — full-page layout per `design_src/edu/subject-detail.jsx`: breadcrumb
  (`Subject Catalogue → {parentName} → {subject.name}`, back-navigable),
  title row (name, grade badge, ACTIVE/ARCHIVED status), Archive button
  (reuses the `AlertDialog` + archive-blocked-tooltip pattern lifted out of
  `subjects-screen.tsx` lines 434-459 — extract as a small
  `ArchiveSubjectDialog` co-located in the same folder since it's now used
  by 2 consumers: table-row flow AND this page), `useSubjectDetailForm` +
  `SubjectDetailFields` body, not-found branch (`if (!subject) return
  <NotFoundState />` — no crash, no stale render).
  - `NotFoundState` is a tiny local function (not shared) — copy per
    design ref: centered `text-muted-foreground` message + a back link.
    (Not promoted to `components/shared/` yet — first use; matches
    `component-organization.md` §3, promote on 2nd consumer.)
- ViewModel: `subject-detail-screen.i-vm.ts` — props:
  `subject: Subject | null` (null = not-found), `parentName: string`,
  `classOfferings: ClassSubject[]`, `backHref: string`,
  `onSave`, `onArchive` (same signatures as `SubjectsScreenProps`).

**Test first:** `subject-detail-screen.stories.tsx` interaction tests
covering states: **populated** (fields + offerings table), **empty
offerings**, **not-found** (renders message, no field/table DOM), **archive
blocked** (tooltip visible, button disabled, `aria-disabled`), **archive
confirm → success**, **save success/error** (error banner + `role="alert"`
reused from Phase 1's `codeErrId` pattern).

**Done when:** Storybook interaction suite green for all 6 states; a11y
(keyboard reachable Archive/back link, focus-visible, contrast) manually
checked against `.claude/rules/accessibility.md`.

### Phase 3 — Route + i18n

**Goal:** wire the RSC route, server-compose initial data (mirrors
`admin/subjects/page.tsx` composition style — NOT the
`question-bank/[id]/edit` redirect-on-miss style, per the not-found
decision above), no new guard code.

**Files:**
- NEW `src/app/[locale]/t/[tenant]/(app)/admin/subjects/[id]/page.tsx` (RSC):
  - `await params` → `{ locale, tenant, id }`.
  - `makeSubjectCatalogueRepository()` → `repo.getSubject(id)` (same call
    `getSubjectAction` wraps — call the repo/action directly, server-side,
    for the initial payload; no guard code needed, `(app)/admin/layout.tsx`
    already covers `/admin/*`).
  - On `ok:false` (any errorKey) → `subject: null`, `classOfferings: []`,
    pass through to `SubjectDetailScreen` which renders `NotFoundState`
    (no redirect, no throw).
  - On `ok:true` → also need `parentName` — `listParents()` (or fetch the
    specific parent by `subject.parentId`) to resolve breadcrumb text (same
    two-call composition pattern already used in `admin/subjects/page.tsx`).
  - Pass `saveAction={patchSubjectAction}`, `archiveAction={archiveSubjectAction}`,
    `backHref={`/${locale}/t/${tenant}/admin/subjects`}`.
- NEW `src/app/[locale]/t/[tenant]/(app)/admin/subjects/[id]/page.test.ts`
  — integration-level: mock `bootstrap/di/subject-catalogue.di`, assert (a)
  `ok:true` composes `subject` + `parentName` + `classOfferings` correctly;
  (b) `not-found` failure → `subject: null` passed, NO redirect thrown
  (contrast with the question-bank pattern — this is the genuinely new
  assertion, since it deliberately does NOT redirect); (c) parent-lookup
  failure (defensive) still renders with an empty/fallback `parentName`
  rather than crashing.
- EDIT `subjects-screen.tsx` — add a `viewEditButton` link/`<Link>` to
  `/admin/subjects/{s.id}` alongside (or instead of) the sheet-opening
  button — **[OPEN QUESTION, see §4]** whether the table row should now
  deep-link to the full page instead of opening the Sheet, or keep both
  entry points. Default assumption for this plan: **keep the Sheet as the
  quick-edit affordance from the table** (AC only requires the Sheet
  "continues to work unchanged" — no AC asks to remove/replace it), and ADD
  a secondary explicit link (e.g. small "Open full page" icon-button next
  to `viewEditButton`) that navigates to the new route. This is additive,
  low-risk, and satisfies "deep-linkable" without changing existing UX.

**i18n:** new namespace `subjectCatalogue.subjectDetailPage` in
`messages/{vi,en}.json` (vi source + en mirror) for page-only copy not
already covered:
  - `notFoundTitle` / `notFoundBody` / `backToListButton`
  - `breadcrumbCatalogue` (root crumb label, "Subject Catalogue")
  - `usageSectionTitle` / `usageEmptyTitle` / `usageEmptyBody` (right-rail
    "Usage this academic year" card — new content vs. the Sheet's flat
    offerings table)
  - `openFullPageLink` (the new secondary link added to the table row)
  Everything else (field labels, Archive copy, lock tooltips, save
  feedback, error strings) REUSES existing
  `subjectCatalogue.subjectDetail.*` / `subjectCatalogue.subjects.*` /
  `subjectCatalogue.errors.*` keys verbatim — do NOT regenerate parallel
  keys (this project has a documented history of that drift, see
  `.claude/rules/uiux-workflow.md` §Already-implemented check).
  - The design reference's right-rail "Change history" placeholder card
    (`design_src/edu/subject-detail.jsx` lines 420-426) is OUT OF SCOPE —
    AC doesn't ask for it and it has no backing data source; skip it,
    don't stub a fake card. Flag as a deliberate scope cut, not an
    oversight.

**Done when:** `tsc --noEmit` clean, `bun build` shows the new route,
`page.test.ts` green, full Vitest suite green (no E12.3 regressions),
design-review gate (`impeccable audit` + `critique`) passes on the new
route.

### 2. Archive ownership — Sheet vs. shared body vs. page-only (detail)

- **Current state:** Archive today lives ONLY in `subjects-screen.tsx`
  (table row → `AlertDialog` + archive-blocked tooltip). The Sheet
  (`subject-detail-sheet.tsx`) has NEVER exposed Archive — confirmed by
  reading its full source (footer only has Close/Save).
- **Design reference for the Sheet:** none — `subject-detail.jsx` IS the
  full-page spec; there's no separate Sheet mockup in `design_src/edu/`
  authorizing an Archive control inside the slide-over.
- **AC requirement:** AC-4 requires Archive on the full page only. No AC
  asks for Archive-in-Sheet.
- **Decision:** Archive is extracted from `subjects-screen.tsx` into a
  reusable `ArchiveSubjectDialog` component (now consumed by both the table
  row AND the new full page), but it is **NOT** added into
  `useSubjectDetailForm`/`SubjectDetailFields` (the shared body) and **NOT**
  added into the Sheet. This avoids silently growing the Sheet's behavior
  (which could regress or need new E12.3 test coverage nobody asked for)
  while still satisfying "one component, one home" for the Archive
  confirm-dialog pattern itself (it was about to exist in 2 places: table
  row + page → promote per `component-organization.md` §3).

### 3. Component + state sketch

```
subjects/[id]/page.tsx (RSC)
  └─ SubjectDetailScreen (presentation, "use client")
       ├─ Breadcrumb (local, page-only)
       ├─ NotFoundState (local, page-only — promote if a 2nd consumer appears)
       ├─ SubjectDetailFields (shared — Phase 1, used by Sheet too)
       │    via useSubjectDetailForm(subject, onSave) (shared hook)
       ├─ UsageCard (page-only right-rail; class-offerings, distinct layout
       │    from the Sheet's flat table — NOT a shared component, design
       │    ref shows genuinely different presentation: card list vs table)
       └─ ArchiveSubjectDialog (promoted shared — table row + page)

subjects-screen.tsx (existing, table row)
  ├─ ArchiveSubjectDialog (same promoted component)
  └─ SubjectDetailSheet
       └─ SubjectDetailFields (shared)
            via useSubjectDetailForm
```

State classification: all **local-form** (React `useState` inside the
hook/component tree) + **URL** (`[id]` param drives the RSC fetch — no
client-side route param state needed) + **server** (initial `subject`/
`classOfferings`/`parentName` fetched RSC-side, passed as props — no
TanStack Query needed since there's no client-side refetch/mutation-cache
requirement beyond the existing Server Action round-trip pattern already
used by the Sheet). No Zustand, no new query keys.

### 4. Risks, dependencies, open questions

- **[OPEN QUESTION]** Should the Subjects table row's `viewEditButton` be
  replaced by a Sheet-vs-page choice, or should the row link straight to
  `/admin/subjects/[id]` and retire the Sheet? Plan assumes **additive**
  (keep Sheet, add a secondary full-page link) since no AC asks to remove
  the Sheet and E12.3's Storybook suite is written against it — flag to
  `fe-lead`/product for a follow-up decision if the intent was actually to
  replace the quick-edit UX.
- **Design-token risk (not ADR-worthy on its own, flag if it recurs):** the
  design reference's locked-curriculum-field styling uses
  `T.warning`/`T.warningLight` (amber lock badge + `#FFF8E1` input bg) but
  the CURRENT SHIPPED Sheet uses `bg-edu-info/15` (blue lock badge, no
  tinted input background) for the same "locked" semantic — a pre-existing
  divergence from US-E12.3, not introduced by this story. Since Phase 1
  extracts the Sheet's fields verbatim (behavior-preserving, zero visual
  diff allowed to avoid regressing E12.3), the full page will inherit the
  SAME blue/info treatment, not the amber one in the mockup. **Recommend
  NOT reconciling this drift inside US-E12.13** (scope creep + would touch
  Sheet visuals, risking the "Sheet works unchanged" AC) — flag to
  `fe-lead` as a candidate follow-up story/ADR discussion only if design
  wants pixel-parity with the reference file.
- **No BE contract change:** `core` service still absent; this route is
  100% mock-first via the existing `makeSubjectCatalogueRepository()` — no
  new endpoint, no ADR needed for that.
- **a11y:** breadcrumb needs `<nav aria-label>` (reuse
  `subjects.breadcrumbLabel` pattern from the Sheet); Archive
  button-disabled-with-tooltip must stay keyboard reachable (existing
  pattern in `subjects-screen.tsx` already does this correctly via
  `aria-disabled` + `Tooltip` — copy verbatim into `ArchiveSubjectDialog`).
- **Test-seam discipline:** do NOT re-write Storybook interaction tests
  that already exist for `subjects-screen.tsx`'s Archive flow when
  extracting `ArchiveSubjectDialog` — move the existing test IDs/queries
  along with the component; the goal is a promote-not-copy refactor with
  the SAME assertions still passing against the promoted component.
