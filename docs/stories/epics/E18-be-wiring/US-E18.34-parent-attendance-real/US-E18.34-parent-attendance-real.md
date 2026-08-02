# US-E18.34 Parent attendance: mock → real (doc-drift resolved)

## Status

implemented

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

| Layer | Expected proof | Result |
| --- | --- | --- |
| Unit | new real-repository test (contract-correct DTO→mapper, error-code mapping) | ✅ `child-attendance.repository.test.ts` (13 cases) + `child-attendance.mapper.test.ts` (4, one new: full wire→domain enum table) |
| Integration | repository test against the real HTTP boundary shape (envelope, camelCase) | ✅ same file — unwrapped-payload cast (no `.data`), query params, path encoding; `parent-attendance.di.test.ts` (6) drives the chain through the real DI |
| E2E | Storybook: real-data story (or confirm existing mock-data stories still communicate the same UI states) | ✅ all 7 US-E20.5 stories unchanged and green — the UI reads the same VM, only its data source moved. `ErrorForbidden` re-documented (same assertions) |
| Platform | `bun build` clean both modes | ✅ `NEXT_PUBLIC_USE_MOCK=true` 34.3s, real (`.env.local` `false`) 30.7s |
| Release | design-review gate N/A if zero visual change; a11y N/A if zero visual change | Zero layout/markup change. One copy change (`parentAttendance.errors.forbidden`, vi+en) because the failure's MEANING changed |

## Harness Delta

Registered via `harness-cli story add --id US-E18.34`. Ask #45 → RESOLVED
(doc-drift, not a real gap) in `docs/reports/2026-08-01-fe-to-be-asks.md`.

## Evidence

### Ground truth (re-verified, not taken from this packet's restatement)

Read directly in `edu-api`, not from the openapi prose:

- `services/core/internal/attendance/core/application/usecase/get_student_attendance.go`
  → `authorize()`: admin → any; `ActorMemberID == MemberID` → student self;
  `hasRole(PARENT)` + `links.IsLinked(tenantID, actorMemberID, memberID)` →
  allowed, **fail-closed** (a LinkReader error propagates, never allows);
  otherwise `ErrAttendanceForbidden()`. **No "active link" sub-state** — the
  link either exists or it does not.
- `…/core/domain/error/errors.go` → `ErrAttendanceForbidden()` =
  `apperror.New(403, "attendance_forbidden")`.
- `pkg/kit/response/error.go` `codeFromKey()` = `strings.ToUpper(key)` →
  the wire code is **`ATTENDANCE_FORBIDDEN`, HTTP 403**. Same derivation gives
  `ATTENDANCE_INVALID_DATE_RANGE` / `ATTENDANCE_DATE_RANGE_TOO_LARGE` (both 400).
- `…/adapter/http/routes.go` → `members.Get("/:memberId/attendance", …)`;
  `…/adapter/http/dto/attendance.go` json tags `memberId`/`records`/`date`/
  `classId`/`status`.
- **Confirmed the openapi drift**: `services/core/docs/openapi.yaml` line ~2766
  still documents only "STUDENT" + "ADMIN / SUPER_ADMIN". Ask #45 is a
  documentation gap, not a capability gap.

### DTO/mapper contract-correctness claim — PARTLY FALSE

US-E20.5 claimed its DTO "mirrors `MemberAttendanceResponse` exactly". The
field names did; **the status enum did not**. The DTO typed `status` as the
DOMAIN `AttendanceStatus` (`present|absent|late|excusedAbsent`) while the wire
enum is UPPER_SNAKE (`PRESENT|ABSENT|LATE|EXCUSED_ABSENT` —
`valueobject/attributes.go`), and the mapper passed it through untouched. That
was invisible while only the mock produced the DTO (the mock generated
domain-cased fixtures), and would have put raw `"PRESENT"` strings into
`ATTENDANCE_STATUS_TONE[...]` (→ `undefined` tone) on the first real response.

Fixed by reusing `features/attendance`'s existing single wire↔domain table
(`mapStatusFromWire`) instead of declaring a second one — the same
cross-feature-infrastructure precedent as `tenant.repository.ts` importing
`features/auth`'s mapper. The mock fixtures were re-cast to the wire
vocabulary so the mock still exercises the real mapper.

### Failure mapping (code-first, per `.claude/rules/api-integration.md`)

| Wire | → `ParentAttendanceFailure` |
| --- | --- |
| `ATTENDANCE_FORBIDDEN` (403) — parent not linked to this child | `forbidden` |
| `ATTENDANCE_INVALID_DATE_RANGE` (400) | `invalid-date-range` |
| `ATTENDANCE_DATE_RANGE_TOO_LARGE` (400) | `date-range-too-large` |
| any other 403 | `forbidden` (status fallback, after the code branches) |
| `NETWORK_ERROR` / status ≥ 500 | `network-error` |
| everything else (incl. `ATTENDANCE_INVALID_MEMBER_ID` 400) | `unknown` |

The existing `forbidden` union member was the right target — no new member
needed. Code branches are ordered BEFORE the status fallbacks (a 403 carrying a
recognised code must not be swallowed by the bare-403 rule, and a 400 the
client cannot interpret must not masquerade as a range failure — both asserted).

### `UnavailableChildAttendanceRepository` — DELETED

Not kept as a fallback. Its premise (PARENT permanently absent from the ACL)
was simply false, and keeping it would mean a client-side hard-coded 403
shadowing the BE's real authorization answer — exactly the class of lying-green
behaviour it was written to prevent. Every case it covered is now covered by
the real 403 → `forbidden` path, which is strictly more accurate (it can also
say "linked, here are the records"). Precedent: US-E18.28/E18.30 deleted their
placeholders on un-mock rather than layering them. The **mock** stays and stays
`USE_MOCK`-gated — the US-E20.5 reasoning that fabricated attendance for a
parent's real child is actionable data is untouched by this story.

### Client-validation-first (AC 4) — confirmed, still holds

`GetChildAttendanceUseCase` validates before touching the repository, so an
inverted or >366-day range costs no round-trip. Proved twice: the pre-existing
use-case test (`expect(spy).not.toHaveBeenCalled()`), and a new DI-level test
that asserts the stubbed `http.get` is never called for an inverted range with
the REAL repository wired. The two rules match the BE exactly — FE rejects
`daysInclusive > 366`, BE rejects `(end - start) >= 366 days`; both accept
`2024-01-01..2024-12-31` and reject one day more.

### Commands run (all on `feat/us-e18.34-parent-attendance-real`)

| Command | Result |
| --- | --- |
| `bun vitest run` (baseline, before changes) | 471 files / **3448** passed |
| `bun vitest run` (after) | 471 files / **3460** passed — +12 net, zero regressions |
| `bunx vitest run --config vitest.storybook.mts` | 157 files / **1199** passed |
| `bunx tsc --noEmit` | clean |
| `bun lint:fix` | clean (1 pre-existing unrelated warning in `messaging/message-context-menu.tsx`) |
| `NEXT_PUBLIC_USE_MOCK=true bun run build` | ✓ compiled 34.3s |
| `bun run build` (real, `.env.local` `NEXT_PUBLIC_USE_MOCK=false`) | ✓ compiled 30.7s |

File count is unchanged because the deleted
`unavailable-child-attendance.repository.test.ts` was replaced by
`child-attendance.repository.test.ts`.

### Files

| Layer | File | Change |
| --- | --- | --- |
| domain | `features/parent-attendance/domain/failures/parent-attendance.failure.ts` | doc only — `forbidden` now means a real 403 |
| infrastructure | `.../infrastructure/repositories/child-attendance.repository.ts` | **new** — `'server-only'`, real GET + code-first failure mapping |
| infrastructure | `.../infrastructure/repositories/child-attendance.repository.test.ts` | **new** — 13 cases |
| infrastructure | `.../infrastructure/repositories/unavailable-child-attendance.repository{,.test}.ts` | **deleted** |
| infrastructure | `.../infrastructure/dtos/child-attendance-response.dto.ts` | `status: WireAttendanceStatus` (was the domain enum) |
| infrastructure | `.../infrastructure/mappers/child-attendance.mapper.ts` | translates via `mapStatusFromWire` |
| infrastructure | `.../infrastructure/repositories/mocks/child-attendance-fixtures.ts` | `STATUS_CYCLE` → wire casing |
| bootstrap | `bootstrap/endpoint/parent-attendance.endpoint.ts` (+ `index.ts`) | **new** — `memberAttendance(memberId)` |
| bootstrap | `bootstrap/di/parent-attendance.di.ts` | `USE_MOCK ? Mock : ChildAttendanceRepository` + `ensureFreshSession` |
| app | `app/[locale]/t/[tenant]/(app)/parent/attendance/page{.tsx,.test.ts}` | doc + real-attendance assertions |
| presentation | `.../presentation/parent-attendance-screen/{build-parent-attendance-vm.ts,*.stories.tsx}` | doc only |
| i18n | `messages/{vi,en}.json` | `parentAttendance.errors.forbidden` re-worded (vi source + en mirror) |

### Flags for `fe-lead`

- **No ADR needed** — no new token, no new contract, no architecture change.
- Ask #45 can be closed as RESOLVED / doc-drift. Worth telling the BE team the
  openapi summary for `getMemberAttendance` still omits PARENT — the next reader
  will make the same wrong call US-E20.5 did.
- Follow-up worth considering (NOT done here, out of scope): other features
  that read `AttendanceStatus` off a wire DTO should be audited for the same
  domain-vs-wire casing confusion. `features/attendance` is correct;
  `parent-attendance` was the one that drifted.
