# US-E18.1 Calendar wiring — academic-years/terms real contract remap

## Status

in-progress

## Lane

normal

## Dependencies

- Depends on: US-E18.0 (gateway smoke, proof-of-pattern — implemented)
- Blocks: none
- Feature module(s) chạm: `src/features/admin/calendar/` (domain entities,
  infrastructure DTOs/mapper/repository, presentation error i18n only — no
  screen/layout change)
- Shared contract/file: `bootstrap/endpoint/calendar.endpoint.ts`,
  `bootstrap/di/calendar.di.ts`, `messages/{vi,en}.json` (`calendar.errors.*`
  namespace, additive keys only)

## Product Contract

`src/features/admin/calendar/infrastructure/repositories/calendar.repository.ts`
was written **mock-first** (US-E06.5) against a *guessed* shape of the `core`
service's academic-calendar API, and was never validated against the real
`edu-api/services/core/docs/openapi.yaml`. The epic audit (2026-07-11) labeled
this cluster "MATCH 100%" at the **path** level only — re-reading the actual
`AcademicYearResponse`/`TermResponse` schemas during this US surfaced **real
DTO-shape and semantic drift** the audit missed:

1. **Field names**: BE returns `academicYearId`/`termId` (not `id`), `status`
   enum (not a nested `terms[]` + boolean `isActive`).
2. **No nested terms**: `GET /academic-years` and `GET /academic-years/{id}`
   return a *flat* `AcademicYearResponse` (no `terms` array) — BE keeps
   years/terms as separate resources (`GET .../terms` fetched per-year). The
   web's `AcademicYear` entity/UI (`calendar-screen.tsx`) is built around a
   **nested** shape (`year.terms`) and renders it in one page with no lazy
   per-year fetch. Fix stays at the repository layer: `listYears`/`getYear`/
   `getActiveYear`/`activateYear` fan out to `listTerms(yearId)` per year to
   reassemble the nested shape the domain/presentation already expect — no
   domain/UI change.
3. **`isActive: boolean` vs BE `status: DRAFT|ACTIVE|ARCHIVED`** — map
   `isActive = status === "ACTIVE"`. BE's `ARCHIVED` years are **not deleted**
   (unlike the mock, whose `archiveYear` deletes the year from its in-memory
   array) — to preserve the existing "archived year disappears from the list"
   UX with zero UI change, the real repository filters `status !== "ARCHIVED"`
   out of the years returned by `listYears`.
4. **`Term.hasGrades` does not exist on the wire.** BE's `TermResponse` has no
   such field — the only server-side signal is the `409 CALENDAR_TERM_IN_USE`
   error returned when actually attempting to archive a term with linked
   records (already mapped to failure `graded-term-delete`). Decision: the
   real repository always maps `hasGrades: false` from the wire (the
   client-side "already has grades, hide/disable" pre-check becomes
   inert/false for the real path — the *actual* protection is the `409` on
   archive, still enforced). `DeleteTermUseCase`/domain signature is
   unchanged; only the real repo's DTO mapping is affected. Flag as a known,
   accepted UX softening (delete button no longer preemptively disabled on
   real BE, but attempting delete on a graded term still fails safely) — not
   an ADR-level architecture change, single-feature mapping decision.
5. **`createYear` semantics differ**: BE's `CreateAcademicYearRequest` only
   accepts `label` — new years always start `DRAFT`, and there is NO way to
   create-as-active atomically. Worse: `POST .../activate` returns
   `409 CALENDAR_ACTIVE_YEAR_EXISTS` if **any other year is already ACTIVE**
   (BE does NOT auto-deactivate the previous active year, unlike the mock's
   silent swap `years.map(y => ({...y, isActive:false}))`). Decision: real
   `createYear({label, isActive:true})` becomes two calls — `POST years` then
   `POST .../activate` — and if the activate call fails with
   `active-year-exists`, that failure is surfaced to the UI (existing i18n
   key already present) rather than silently succeeding; the newly created
   `DRAFT` year is NOT rolled back (BE has no delete-year endpoint) and stays
   visible, inactive, in the list — admin can archive the conflicting year
   first, then activate manually. This is a genuine, BE-enforced behavior
   change from the mock (documented here, not silently absorbed).
6. **Error-code coverage was incomplete** and one existing mapping was
   **wrong**: `CALENDAR_FORBIDDEN` (403) was mapped to `network-error` —
   misleading message. Full `ERROR_CODES.md` taxonomy (13 codes) must be
   mapped:
   - `CALENDAR_FORBIDDEN` → new failure type `forbidden` (was miscategorized).
   - `CALENDAR_INVALID_LABEL` (label missing/>32 chars) → new failure type
     `invalid-label` (UI has no client-side length guard today — real,
     reachable path).
   - `CALENDAR_INVALID_TERM_NAME` (name missing/>64 chars) → new failure type
     `invalid-term-name` (same reasoning).
   - `CALENDAR_INVALID_TENANT_ID`/`CALENDAR_INVALID_YEAR_ID`/
     `CALENDAR_INVALID_TERM_ID` → defensive mapping (`forbidden` /
     `not-found-year` / `not-found-term` respectively) — these paths use IDs
     sourced from prior API responses, not user input, so should not occur in
     normal use, but must not silently fall to `unknown`.
   - Already-correct: `CALENDAR_YEAR_NOT_FOUND`, `CALENDAR_TERM_NOT_FOUND`,
     `CALENDAR_YEAR_LABEL_EXISTS`, `CALENDAR_ACTIVE_YEAR_EXISTS`,
     `CALENDAR_YEAR_ARCHIVED`, `CALENDAR_INVALID_DATE_RANGE`,
     `CALENDAR_TERM_OVERLAP`, `CALENDAR_TERM_IN_USE`.
7. **Playbook step 6** (proactive refresh): `calendar.di.ts`'s `makeRepo()`
   real branch must call `await ensureFreshSession()` before
   `createServerHttpClient()` — same gap as US-E18.0 found in
   `admin-school-setup.di.ts`, never closed here.

Mock repository (`MockCalendarRepository`) + fixtures must be updated so the
`hasGrades`/`isActive`-swap behaviors it simulates don't lie about what the
real path now does where behavior diverges (mock can keep its own simplified
semantics for `NEXT_PUBLIC_USE_MOCK=true` dev convenience, but the DTO layer
the real repo emits must not resemble the old, wrong nested-with-hasGrades
assumption — mock stays on the `AcademicYear`/`Term` **domain entities**
directly, so it is unaffected by the DTO-level fix; no change needed there
except a comment noting the real-path semantic differences above so future
readers don't assume parity).

UI (`calendar-screen.tsx`) is NOT expected to change — the domain
entity/ViewModel contract (`AcademicYear { id, label, isActive, terms }`,
`Term { id, name, startDate, endDate, hasGrades }`) stays the same; only the
DTO shape + repository mapping + error taxonomy change underneath it.

## Relevant Product Docs

- `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` (playbook + Wave 1 entry
  for this US)
- `edu-api/services/core/docs/{openapi.yaml,INTEGRATION.md,ERROR_CODES.md}` —
  `AcademicCalendar` tag, `AcademicYearResponse`/`TermResponse` schemas, lines
  1271-1540 (paths) + 7882-7989 (schemas) of `openapi.yaml`; `ERROR_CODES.md`
  lines 140-153 (`CALENDAR_*`)
- `.claude/rules/api-integration.md` (envelope/error contract, decision `0008`)

## Acceptance Criteria

- `CALENDAR_EP` paths unchanged (already correct — audit confirmed path match).
- `AcademicYearResponseDto`/`TermResponseDto` (renamed from
  `AcademicYearDto`/`TermDto`) match the real BE field names
  (`academicYearId`/`termId`/`status`), flat (no nested `terms` on the wire).
- `CalendarRepository` reassembles the nested `AcademicYear.terms` shape via
  a per-year `listTerms` fan-out in `listYears`/`getYear`/`getActiveYear`/
  `activateYear`; `ARCHIVED` years are filtered out of `listYears` results.
- `Term.hasGrades` is always mapped `false` from the real wire; domain/
  presentation contract for `Term` is unchanged.
- `createYear` orchestrates create+activate (2 calls) when `isActive: true`
  requested; an `active-year-exists` conflict on the activate call is
  surfaced as a failure, not silently absorbed; the created `DRAFT` year is
  not rolled back.
- All 13 `CALENDAR_*` codes from `ERROR_CODES.md` are mapped to a
  `CalendarFailure` variant (branch on `error.code`, never message);
  `CALENDAR_FORBIDDEN` no longer maps to `network-error`.
- `calendar.di.ts`'s real branch calls `await ensureFreshSession()` before
  `createServerHttpClient()` (playbook step 6).
- New/changed failure variants (`forbidden`, `invalid-label`,
  `invalid-term-name`) have `vi`/`en` i18n keys under `calendar.errors.*`
  (typed, both files updated same commit).
- Zero regression: full `bun vitest run` + `tsc --noEmit` + `bun run build`
  stay green; existing `calendar-screen` Storybook/component tests unaffected
  (no UI/ViewModel contract change).
- New unit tests cover: DTO→entity mapping (flat→nested reassembly, `status`→
  `isActive`, `hasGrades` always false), every new/changed failure-code
  branch, and the create-year orchestration (both the plain-create and the
  create+activate-conflict paths).
- Smoke (best-effort, error-path only — no `SUPER_ADMIN` seed to test 200
  happy-path per US-E18.0 finding #5): at least one real 401/400-class
  `CALENDAR_*` error round-tripped through `:8000` if the BE stack is
  reachable during this US; if not run, state why in Evidence.

## Design Notes

- Commands: `POST /core/api/v1/academic-years`, `POST .../activate`,
  `POST .../archive`, `POST .../terms`, `PATCH .../terms/{termId}`,
  `POST .../terms/{termId}/archive`
- Queries: `GET /core/api/v1/academic-years` (cursor-paginated),
  `GET .../active`, `GET .../{yearId}`, `GET .../{yearId}/terms`,
  `GET .../{yearId}/terms/{termId}`
- API: `core` service, `AcademicCalendar` tag — see Relevant Product Docs
- Tables: none touched directly (BE-owned, consumed via API only)
- Domain rules: only one `ACTIVE` year per tenant (BE-enforced, no
  auto-swap); term `startDate < endDate`; term date ranges must not overlap
  within a year; archiving a term with linked grade records is blocked
- UI surfaces: none new — `calendar-screen.tsx` unchanged; only the failure
  messages surfaced to it gain new possible `errorKey` values already handled
  generically by the existing error-toast/message rendering (confirm no
  `switch` over `CalendarFailure["type"]` needs an explicit new case besides
  the i18n lookup — grep before assuming)

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `calendar.mapper.test.ts` (new — flat DTO → nested entity, status→isActive, hasGrades always false), `calendar.repository.test.ts` (extended — full `CALENDAR_*` error-code matrix, listYears ARCHIVED-filter + per-year terms fan-out, createYear orchestration incl. activate-conflict path) |
| Integration | Repository-level tests above ARE the integration proof (repo↔HTTP boundary, envelope/error mapping) per `docs/TEST_MATRIX.md` convention for this feature |
| E2E | None new — no UI change; existing `calendar-screen.stories.tsx` interaction tests must stay green unmodified |
| Platform | `tsc --noEmit` clean; `bun run build` green |
| Release | Full `bun vitest run` zero-regression; gateway error-path smoke via `:8000` if BE stack reachable (see Evidence) |

## Harness Delta

- `US-E18.1` → `status: implemented`, `unit: 1`, `integration: 1`, `e2e: 0`
  (no new UI/E2E — contract remap only), `platform: 1` once proof lands.
- `docs/TEST_MATRIX.md` row added/updated for the calendar cluster noting the
  contract-drift fix (supersedes the "MATCH 100%" audit note in
  `EPIC-OVERVIEW.md` Wave 1 table — add a footnote there too since the audit
  undersold the DTO-shape drift for this cluster).

## Evidence

(filled in after implementation)
