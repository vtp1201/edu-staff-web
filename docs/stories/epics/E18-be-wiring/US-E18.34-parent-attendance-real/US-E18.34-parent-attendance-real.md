# US-E18.34 Parent attendance: mock → real (doc-drift resolved)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E20.5 (the mock-first screen this un-mocks)
- Blocks: none
- Feature module(s) chạm: `src/features/parent-attendance/` (US-E20.5)
- Shared contract/file: `GET /members/{memberId}/attendance` (core)

## Product Contract

**Doc-drift correction (ask #45 was inaccurate — recorded here for the
record):** `services/core/docs/openapi.yaml`'s summary for
`GET /members/{memberId}/attendance` says "STUDENT-self or ADMIN" but the
actual Go source (`get_student_attendance.go`, US-047) has authorized a
PARENT calling with a LINKED child's `memberId` since US-047 — the openapi
prose was simply never updated. Re-ground-truth this yourself against the Go
source before wiring (do not just trust this packet's restatement — confirm
the exact authorization branch, e.g. does it require an ACTIVE parent-link,
what error code does a non-linked/unlinked parent get).

This un-mocks US-E20.5's `parent-attendance` feature: replace
`UnavailableChildAttendanceRepository` with a real repository calling
`GET /members/{memberId}/attendance?startDate=&endDate=` (range ≤366 days,
`endDate >= startDate`, matching the validation already implemented
client-side in `get-child-attendance.use-case.ts`).

## Relevant Product Docs

- `docs/reports/2026-08-01-fe-to-be-asks.md` ask #45 — mark RESOLVED, note the
  doc-drift finding explicitly (openapi prose wrong, code was already correct
  since US-047).

## Acceptance Criteria

- `bootstrap/di/parent-attendance.di.ts` flips from
  `USE_MOCK ? Mock : UnavailableChildAttendanceRepository` (US-E20.5's honest
  degrade) to `USE_MOCK ? Mock : RealChildAttendanceRepository`.
- Real mode: parent sees genuine attendance history for a linked child, date
  range validated client + server side.
- A non-linked/forbidden child id is mapped to a typed failure (grep the exact
  error code the BE returns for this case — do not assume it matches the
  existing `forbidden` type without checking).
- `UnavailableChildAttendanceRepository` — decide: delete it (dead code once
  real works) or keep as a documented fallback for a still-possible edge case;
  your call, justify whichever.
- Zero regression to existing parent-attendance screen tests/stories built in
  US-E20.5 (they were written against the mock repository — confirm they
  still make sense/pass against the real repository's contract, adjusting
  test doubles as needed, not the production behavior).

## Design Notes

- Commands: none (read-only).
- Queries: `GET /members/{memberId}/attendance?startDate=&endDate=`.
- API: `core` service.
- Domain rules: same range validation already implemented client-side
  (`endDate >= startDate`, ≤366 days) — now also genuinely enforced
  server-side; confirm the client validation still fires FIRST (avoid an
  avoidable round-trip for an obviously-invalid range).
- UI surfaces: none new — this un-mocks the existing US-E20.5 screen only.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | new real-repository test (contract-correct DTO→mapper, error-code mapping) |
| Integration | repository test against the real HTTP boundary shape (envelope, camelCase) |
| E2E | Storybook: real-data story (or confirm existing mock-data stories still communicate the same UI states) |
| Platform | `bun build` clean both modes |
| Release | design-review gate N/A if zero visual change; a11y N/A if zero visual change |

## Harness Delta

Registered via `harness-cli story add --id US-E18.34`. Ask #45 → RESOLVED
(doc-drift, not a real gap) in `docs/reports/2026-08-01-fe-to-be-asks.md`.

## Evidence

(fill after implementation)
