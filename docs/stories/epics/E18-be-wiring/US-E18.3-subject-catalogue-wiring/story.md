# US-E18.3 Subject catalogue wiring — bộ môn/môn học real contract remap

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E18.0 (gateway smoke, proof-of-pattern — implemented), reuses
  the "BE-wiring remap" pattern from US-E18.1/US-E18.2 (fan-out for derived
  counts, per-code error matrix, `ensureFreshSession` DI wiring).
- Blocks: none
- Feature module(s) chạm: `src/features/admin/subject-catalogue/` (domain
  entities unchanged, infrastructure DTOs/mapper/repository/mock rewritten,
  no screen/layout change)
- Shared contract/file: `bootstrap/endpoint/subject-catalogue.endpoint.ts`
  (paths already match, no change needed), `bootstrap/di/subject-catalogue.di.ts`
  (wire `ensureFreshSession`), `messages/{vi,en}.json`
  (`subjectCatalogue.errors.*` namespace, additive keys only)

## Product Contract

`src/features/admin/subject-catalogue/infrastructure/repositories/subject-catalogue.repository.ts`
was written mock-first (US-E06.6) against a guessed shape of `core`'s subject
catalogue API. The epic audit labeled this cluster "MATCH−" (paths correct,
`restore` web-only). Re-reading `edu-api/services/core/docs/openapi.yaml`
(`SubjectParent`/`Subject` schemas, lines ~6190-6465 responses, ~7025-7664
request/response schemas) found real DTO-shape drift:

1. **Id field renames**: wire `subjectParentId`/`subjectId` vs web's flat `id`.
2. **`SubjectParent.conceptType` (single field) vs BE's two fields**:
   `conceptLabelSuggested` (enum `BO_MON|TO|KHOA`, nullable) +
   `conceptLabelCustom` (free text, nullable) — same split pattern as
   US-E18.2 staffing `Department`. BE also computes `effectiveConceptLabel`
   (custom-else-suggested display string) but web's `ConceptBadge` already
   computes the same locally from the two raw fields — **kept as-is**, we do
   not consume `effectiveConceptLabel` (avoids touching presentation).
3. **`SubjectParent.childCount`/`activeChildCount` — NOT on the wire.**
   `GET /subject-parents` returns no subject counts at all. Both counts are
   consumed directly off `listParents()` by `subject-departments` screen
   (which never calls `listSubjects`), so they must be derived **inside**
   `listParents()` itself: fan-out one paginated `GET /subjects` (both
   statuses) once, group by `subjectParentId`, compute `childCount` (all) /
   `activeChildCount` (status ACTIVE) per parent. Same derivation approach as
   US-E18.2's `activeAssignmentCount`.
4. **`Subject.parentId` → wire `subjectParentId`; master fields nested.**
   Wire nests `masterSyllabus`/`periodCount`/`learningOutcomes`(web:
   `outcomeTargets`)/`requiredExamCount`(web: `requiredAssessmentCount`)/
   `exerciseBankRef`/`examBankRef` under `master: MasterFields`, all optional
   (may be absent → map to entity's existing defaults: `null` for numbers,
   `""` for strings — **no entity/domain change**).
5. **`exerciseBankRef`/`examBankRef` are `ResourceRef` objects** (`{type,
   ref}`, forward-compat placeholder per BE ADR 0037), not bare strings. Web
   entity keeps them as flat strings (UI just edits a ref string in a text
   field) — mapper reads `.ref ?? ""` on the way in; on write wraps
   `{ type: "OPAQUE", ref: value }` when non-empty, omits the field entirely
   when empty (avoids sending an empty `ResourceRef` the BE doesn't need).
6. **`GET /subjects` has NO `subjectParentId` query filter** (only
   `status`/`cursor`/`limit`) — unlike the mock's per-parent list. Real
   `listSubjects(parentId)` must fan-out the SAME full paginated subjects
   fetch as (3) and filter client-side by `subjectParentId`. **Cross-repo
   perf finding**: `subjects/page.tsx` calls `listSubjects(parent.id)` once
   per parent (N calls) on top of `listParents()`'s own fan-out — each call
   independently re-fetches the full tenant subject list. Functionally
   correct (zero regression) but O(N) full-list re-fetches for a page with N
   bộ môn. Recommend BE add a `subjectParentId` filter to `GET /subjects` (or
   web should hoist the fan-out to the page/composition layer in a follow-up
   perf story) — logged in EPIC-OVERVIEW.md cross-repo asks.
7. **`Subject.inUse` — NOT on the wire and NOT cheaply derivable.** The UI
   pre-emptively disables the archive button when `inUse` (client-side gate,
   `subjects-screen.tsx`). BE only exposes this as a live guard at archive
   time (`409 SUBJECT_IN_USE`, checked against active GVBM
   TeachingAssignments) — there is no list/count endpoint for "does subject X
   have an active GVBM assignment" (`TeachingAssignmentReader` is an
   internal-only port, no public listing). Decision: `inUse` defaults to
   `false` in real mode (archive button enabled); the real 409 is still
   correctly mapped to `archive-blocked-subject` so the write itself cannot
   succeed. **Known gap** (pre-existing, out of scope for this wiring US):
   `subjects-screen.tsx`'s `handleArchive` does not surface an error toast on
   `!result.ok` — a blocked archive silently no-ops (dialog closes, row
   unchanged). Not fixed here (UI behavior must not change per epic mandate);
   flagged as a follow-up UX story. Cross-repo ask: an `activeAssignmentCount`
   or `inUse` field on `SubjectResponse` would let web restore the pre-emptive
   UI gate cheaply (same shape as the staffing `activeAssignmentCount` ask).
8. **`classOfferings` (subject detail sheet's "which classes teach this
   subject" section) has NO BE equivalent at all.** BE only exposes the
   forward direction (`GET /classes/{classId}/subjects` — subjects for one
   class) and single-record `GET /class-subjects/{id}`; there is no reverse
   "classes teaching subject X" listing, so assembling `classOfferings`
   (className/academicYear/teacherName/studentCount) would require fetching
   every class then every class's subjects and filtering client-side — a much
   larger cost than this wiring story's scope justifies for a JSON detail
   panel enrichment section that is not itself part of the epic's Wave 1
   "MATCH−" note (`restore`). Decision: real `getSubject()` returns the real
   `Subject` + `classOfferings: []` always (UI already renders the
   `classOfferingsEmpty` empty state — zero UI change). Logged as a
   cross-repo ask in EPIC-OVERVIEW.md (§Không thuộc wave này candidate, or a
   future `GET /subjects/{id}/classes` endpoint).
9. **`restoreParent` stays mock/WEB-ONLY** (per epic table) — BE only exposes
   `POST /subject-parents/{id}/archive` (ACTIVE→ARCHIVED), no restore/
   unarchive endpoint anywhere in `SubjectParents`. Real repo's
   `restoreParent` throws a clear `not-implemented`-style guard is NOT an
   option (it's wired into a real screen action) — instead the DI factory
   keeps `MockSubjectCatalogueRepository`'s `restoreParent` behavior
   reachable by delegating this ONE method to an always-present mock-backed
   fallback while every other method goes through the real repository. See
   §Design Notes for the exact composition.
10. **Error code corrections** (branch on `error.code`, never message): fixed
    `INVALID_SUBJECT_CODE` → real `SUBJECT_INVALID_CODE`; added
    `SUBJECT_ARCHIVED`/`CLASS_SUBJECT_ARCHIVED` (409, modify-while-archived) →
    new `subject-archived` failure (new i18n key, both entities share the
    "already archived, cannot modify" concept but keep an entity-accurate
    message); `CLASS_SUBJECT_FORBIDDEN` falls through to the existing generic
    `status === 403 → forbidden` branch (no dedicated key needed — no UI path
    exercises class-subject-scoped actions in this screen set).
    `SUBJECT_PARENT_INVALID_CONCEPT_LABEL` (400, malformed enum) is
    unreachable via the UI (a `<select>` with the 3 valid options) — left
    unmapped, falls to `unknown` (acceptable, matches prior epic precedent
    for devtools-only edge cases).

## Relevant Product Docs

- `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` (playbook + Wave 1)
- `edu-api/services/core/docs/openapi.yaml` (`SubjectParents`/`Subjects`/
  `ClassSubjects` tags)
- `edu-api/services/core/docs/ERROR_CODES.md` (`SubjectParent`/`Subject`/
  `ClassSubject` sections)

## Acceptance Criteria

- `SUBJECT_CATALOGUE_EP` paths unchanged (already match `/core/api/v1/...`).
- `SubjectParentResponseDto`/`SubjectResponseDto` match the real wire shape
  (id renames, split concept fields, nested `master`, `ResourceRef` objects);
  DTOs are camelCase and 1:1 with `openapi.yaml`.
- `SubjectCatalogueMapper` derives `childCount`/`activeChildCount` from a
  fan-out subjects fetch (not from the wire), derives `inUse: false` (real
  mode) with an explanatory comment, and round-trips `ResourceRef` string↔
  object for `exerciseBankRef`/`examBankRef`.
- `listParents()` and `listSubjects(parentId)` are correct against the actual
  `GET /subjects` contract (no `subjectParentId` filter on the wire) via a
  shared full-list-fetch + client-side filter/group helper.
- `getSubject()` returns the real subject + `classOfferings: []` in real mode
  (mock mode keeps the existing fixture-backed classOfferings, unchanged).
- `restoreParent` remains reachable end-to-end from the UI in real mode
  (delegates to the mock-backed fallback — see Design Notes) since BE has no
  restore endpoint.
- Full ~20-code `SubjectParent`/`Subject`/`ClassSubject` error matrix mapped
  correctly by `error.code` (not message); `SUBJECT_INVALID_CODE` fixed;
  `subject-archived` added (new i18n key vi+en).
- `ensureFreshSession()` wired into the `!USE_MOCK` branch of
  `subject-catalogue.di.ts`'s `makeRepo()` before `createServerHttpClient()`
  (playbook step 6).
- Mock repository/fixtures unchanged in behavior (still the `USE_MOCK=true`
  fallback covering `restoreParent` + `classOfferings` + all other flows).
- Zero UI/ViewModel/behavior change — `subjects-screen`/`subject-departments-
  screen`/`subject-detail-sheet` untouched.
- Zero regression: full `bun vitest run` + `bunx tsc --noEmit` +
  `bun run build` all green.

## Design Notes

- Commands: `createParent`, `patchParent`, `archiveParent`, `createSubject`,
  `patchSubject`, `archiveSubject` — all thin real-HTTP calls, no new domain
  behavior.
- Queries: `listParents` (+ fan-out subjects for counts), `listSubjects`
  (fan-out + filter), `getSubject` (real detail + empty classOfferings).
- API: `/core/api/v1/subject-parents(/{id}(/archive))`,
  `/core/api/v1/subjects(/{id}(/archive))` — paths unchanged from current
  `SUBJECT_CATALOGUE_EP`. No restore endpoint exists on the wire.
- Tables: n/a (web has no local DB).
- Domain rules: `Subject`/`SubjectParent` entities and their `Create*`/
  `Patch*` input shapes are UNCHANGED — all drift absorbed in
  `infrastructure/` (DTOs + mapper + repository), per Clean Architecture
  layering (domain stays pure, doesn't know about wire shape).
- UI surfaces: none changed. `restoreParent` composition: since
  `ISubjectCatalogueRepository` is one interface and the real repo has no
  backing endpoint for this one method, the DI factory (`subject-catalogue.di.ts`)
  should compose `SubjectCatalogueRepository` (real, for every method) with a
  fallback that only intercepts `restoreParent` — e.g. a thin decorator/wrapper
  object created in `!USE_MOCK` mode that spreads the real repo's methods and
  overrides just `restoreParent` to delegate to a fresh
  `MockSubjectCatalogueRepository`'s `restoreParent` (in-memory, tenant-scoped
  to this one call — a restore is idempotent-ish UI-visible toggle back to
  ACTIVE; since there is no source of truth for it server-side, keep the
  existing mock's naive "flip status locally" contract, documented inline as
  WEB-ONLY/BE-gap). Engineer: pick the cleanest composition (decorator
  function over class inheritance) and document the choice with a code
  comment + a one-line note in this story's Evidence section.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `subject-catalogue.mapper.test.ts` (new/rewritten — id renames, concept split, master nesting, ResourceRef round-trip, count derivation, inUse default) |
| Integration | `subject-catalogue.repository.test.ts` (rewritten — full error matrix incl. new `subject-archived`, fan-out list/filter behavior, real-interceptor raw-flag regression guard per US-E18.19 pattern, restoreParent fallback composition) |
| E2E | n/a (no UI/flow change — lane normal, wiring-only) |
| Platform | `bunx tsc --noEmit`, `bun run build` green |
| Release | full `bun vitest run` zero-regression, pre-push gate green, auto-merge to `main` |

## Harness Delta

- `docs/TEST_MATRIX.md` — add US-E18.3 row on completion (unit/integration
  proof, zero-regression full-suite count, tsc/build status).
- `scripts/bin/harness-cli story update --id US-E18.3 --status implemented
  --unit 1 --integration 1 --e2e 0 --platform 1` once proof exists.
- No ADR needed (no auth/RBAC/token/tenant/data-loss/PII/design-token gate
  tripped — pure infrastructure DTO/error-map remap, same pattern as
  US-E18.1/US-E18.2, no new architectural decision beyond what those ADRs/
  precedents already cover).

## Evidence

- **DTOs** rewritten to the real wire shape: `subject-parent-response.dto.ts`
  (`subjectParentId`/`tenantId`, `conceptLabelSuggested`+`conceptLabelCustom`+
  `effectiveConceptLabel`, plus `CreateSubjectParentRequestDto`/
  `UpdateSubjectParentRequestDto`); `subject-response.dto.ts` (`subjectId`/
  `subjectParentId`, nested `MasterFieldsDto`, `ResourceRefDto`, plus
  `CreateSubjectRequestDto`/`UpdateSubjectRequestDto`).
- **Mapper** (`subject-catalogue.mapper.ts`) rewritten: `toSubjectParent(dto,
  counts)` (counts injected), `toSubject` (unnests master, `inUse:false`,
  `ResourceRef.ref` → flat string), `toClassSubject` (unchanged), plus request
  builders `toCreateParentBody`/`toUpdateParentBody`/`toCreateSubjectBody`/
  `toUpdateSubjectBody` (concept split, master nesting, ResourceRef wrap/omit).
- **Repository** rewritten: `fetchAllParentDtos`/`fetchAllSubjectDtos` cursor
  fan-outs (top-level `raw:true`, no `status` filter so ARCHIVED subjects are
  included for counts + the subjects screen); `listParents` derives per-parent
  `childCount`/`activeChildCount`; `listSubjects` filters the fan-out client-
  side; `getSubject` returns `classOfferings: []`; `patchParent` recomputes
  counts; full ~20-code error matrix (fixed `SUBJECT_INVALID_CODE`, added
  `subject-archived`, dropped guessed `SUBJECT_PARENT_HAS_ACTIVE_CHILDREN`/
  `ROSTER_ACCESS_FORBIDDEN` branches).
- **`restoreParent` composition choice**: implemented as a **WEB-ONLY optimistic
  no-op** inside `SubjectCatalogueRepository` — `return ok(undefined)` with no
  HTTP call. This DEVIATES from the story's "delegate to a fresh
  MockSubjectCatalogueRepository" suggestion: the mock's `restoreParent` looks
  the parent up in its fixture seed and returns `{type:"not-found"}` for real
  (non-fixture) tenant UUIDs, which would BREAK the "keeps working end-to-end"
  requirement. An optimistic success lets the screen's existing optimistic
  flip-to-ACTIVE apply; there is no server persistence (reload shows ARCHIVED).
  Chosen over a DI decorator (class instances can't be spread; verbose forward-
  ing) — it keeps DI minimal and satisfies the interface. Cross-repo ask logged:
  BE `POST /subject-parents/{id}/restore`.
- **DI**: `ensureFreshSession()` wired into the `!USE_MOCK` branch of
  `subject-catalogue.di.ts`'s `makeRepo()` before `createServerHttpClient()`.
- **i18n**: added `subjectCatalogue.errors.subject-archived` to vi + en.
- **Proof**: `subject-catalogue.mapper.test.ts` (12, new) +
  `subject-catalogue.repository.test.ts` (32, rewritten, incl. the US-E18.19
  real-interceptor raw-flag regression guard); full suite **286 files / 1680
  tests pass** (baseline 285/1650 — zero regression); `bunx tsc --noEmit` clean;
  `bun run build` green; `bun lint` clean.
- **Untouched** (as mandated): domain entities, all presentation, endpoint
  constants (paths verified correct; the unused `restoreParent` endpoint const
  is left in place, harmless), mock repository + fixtures.
