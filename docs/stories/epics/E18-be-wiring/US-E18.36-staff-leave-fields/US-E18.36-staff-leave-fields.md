# US-E18.36 Staff-leave: department + leaveType fields (closes ask #41)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/staff-leave/`
- Shared contract/file: `StaffLeaveRequestResponse` (core)

## Product Contract

BE US-170 adds `department` + `leaveType` to `StaffLeaveRequestResponse`
(already persisted server-side, migration 046; NULLABLE per-user — closes ask
#41's open question: confirmed nullable, not required). This completes the
admin staff-leave screen's last missing field set.

**CORRECTED ground truth (fe-lead, 2026-08-03).** `src/bootstrap/di/staff-leave.di.ts`'s
existing doc comment already documents this precisely: staff-leave is
PERMANENTLY mock-first (US-E18.8), and its own revised rationale (US-E18.23)
says the ORIGINAL two blockers (no tenant-wide list; no IAM name lookup) are
BOTH ALREADY FALSE (closed by core US-149 + IAM US-144/`iam-directory`,
already reused elsewhere e.g. `staffing.di.ts`) — the ONLY remaining blocker
was `department`/`leaveType` having no wire source at all, while being
REQUIRED (non-nullable) on the FE entity/DTO
(`src/features/staff-leave/domain/entities/*.ts`,
`src/features/staff-leave/infrastructure/dtos/*.ts` both currently declare
`department: string; leaveType: StaffLeaveType` as REQUIRED).

Ground-truthed the exact nullability against `services/core/docs/openapi.yaml`
`StaffLeaveRequestResponse` (~line 10399-10419):
- `leaveType: string, enum: [ANNUAL, SICK, PERSONAL, FAMILY], nullable: true`
  — "`null` only for requests submitted BEFORE this field existed —
  pre-existing rows have no truthful value and are not backfilled. Every
  request submitted after this migration carries a non-null value (required
  at submit time)." So null is a LEGACY-ROW-ONLY state, expected to become
  rare over time.
- `department: string, nullable: true` — "the staff member's CURRENT
  department name... `null` whenever the staff member holds no ACTIVE
  department-scoped position assignment; this is a genuine, ONGOING business
  state (not every staff member is assigned to a department) and can occur
  INDEFINITELY, not only for legacy rows." Distinct nullability reason from
  `leaveType` — do not conflate "legacy gap, will disappear" with "ongoing
  valid state, will persist" in the UI/copy.

So this story: (1) widen BOTH fields to nullable on the FE
entity/DTO/mapper, (2) flip `bootstrap/di/staff-leave.di.ts` from permanent
mock to `USE_MOCK ? Mock : Real` (reusing whatever tenant-wide-list +
iam-directory-name-resolution composition `staffing.di.ts` already
established as precedent — check that file), (3) render each null case with
the CORRECT distinct copy (leaveType-null ≈ "loại nghỉ chưa ghi nhận" /
department-null ≈ "chưa có phòng ban" — not identical placeholder text for
two semantically different null-reasons).

## Relevant Product Docs

- Ask #41 in `docs/reports/2026-08-01-fe-to-be-asks.md` — mark RESOLVED.
- `src/bootstrap/di/staff-leave.di.ts`'s existing doc comment — the most
  valuable ground-truth artifact for this story, read it first.
- `src/bootstrap/di/staffing.di.ts` — precedent for composing the tenant-wide
  list + iam-directory name resolution this story reuses.

## Acceptance Criteria

- Admin staff-leave screen shows real `department`/`leaveType` per request in
  real mode; a null value renders an honest placeholder, not a crash/blank.
- `bootstrap/di/staff-leave.di.ts` flips whatever portion was blocked on these
  fields to `USE_MOCK ? Mock : Real` (confirm exact prior blocking scope —
  the packet may have been PARTIALLY real already per prior session notes
  ["staff-leave partial-unblock decision"] — read that precedent before
  assuming this is a full unblock).
- Zero regression to existing staff-leave screen tests/stories.

## Design Notes

- Commands: none affected.
- Queries: whatever staff-leave already calls — add the 2 new fields to the
  DTO/mapper/VM.
- API: `core` service.
- Domain rules: nullable fields render a placeholder, never crash.
- UI surfaces: `src/features/staff-leave/presentation/` (existing).

## Validation

| Layer | Expected proof | Actual |
| --- | --- | --- |
| Unit | mapper test (both fields present + null cases) | `staff-leave.mapper.test.ts` — 16 tests; each null asserted INDEPENDENTLY (the other field stays populated), absent-key ≡ explicit null, unknown enum → null |
| Integration | repository test against the real DTO shape | `staff-leave.repository.test.ts` — 22 tests: 3-state fan-out by call COUNT + `staffMemberId` absent from every list call, cursor paging, newest-first merge, ONE batch IAM call for staff+approver, IAM failure degrades to raw ids, approve/reject param+body shape, error matrix |
| DI | env matrix for the un-mock | `staff-leave.di.test.ts` — 6 tests: `true`→Mock, `false`/unset→Real, `ensureFreshSession` before the client, no http client in mock mode, mock seed carries exactly one both-nulls row |
| E2E | Storybook: populated + null-placeholder stories | `NullableFields` story asserts BOTH placeholder strings are present AND `not.toBe` each other, and that no role badge is invented |
| Platform | `bun build` clean both modes | green with `.env.local` (`NEXT_PUBLIC_USE_MOCK=false`) and with `NEXT_PUBLIC_USE_MOCK=true` |
| Release | a11y spot-check placeholder contrast | placeholders use `text-muted-foreground` (5.48:1, ADR 0049-safe); null state is conveyed by TEXT, not colour; role badge omitted rather than mislabelled |

## Harness Delta

Registered via `harness-cli story add --id US-E18.36`. Ask #41 → RESOLVED.

## Evidence

Branch `feat/us-e18.36-staff-leave-fields`. Full un-mock — the DI factory is
now `USE_MOCK ? Mock : Real` and BOTH the read and the write side are real.

### Proof commands (all run on the branch)

| Command | Result |
| --- | --- |
| `bun vitest run` (baseline before changes) | 474 files / 3502 tests passed |
| `bun vitest run` (after) | **476 files / 3534 tests passed** — +2 files, +32 tests, zero regressions |
| `bunx vitest run --config vitest.storybook.mts` | 158 files / 1206 tests passed |
| `bunx tsc --noEmit` | clean |
| `bun lint:fix` | clean (5 files auto-formatted; 1 pre-existing unrelated warning) |
| `bun run build` with `.env.local` (`NEXT_PUBLIC_USE_MOCK=false`) | success |
| `NEXT_PUBLIC_USE_MOCK=true bun run build` | `✓ Compiled successfully` |

### Contract deltas found while implementing (beyond the brief)

1. **The pre-existing DTO was anticipatory, not real.** `StaffLeaveResponseDto`
   declared an already-display-shaped row (`staffName`, `days`, `initials`,
   `DD/MM/YYYY` dates) that BE has never produced — only the mock did. Merely
   widening two of its fields would have kept a fictional contract, so it was
   replaced with the real `StaffLeaveRequestResponse` shape (ids, ISO dates,
   UPPERCASE enums) and the mapper now derives the display fields.
2. **`approve` / `reject` require a MANDATORY `staffMemberId` query param**
   (`StaffLeaveStaffMemberId` in core's openapi — it completes the storage key
   `(tenantId, staffMemberId, requestId)`). `id` alone does not address a row,
   so `staffId` was threaded through repository → use-case → Server Action →
   VM → screen. This is a real signature change, not cosmetic.
3. **An unfiltered list must fan out over three states.** The tenant-wide
   branch is `status`-sliced and DEFAULTS to `SUBMITTED`; the screen loads
   everything once and filters client-side, so omitting `status` would have
   left the "Đã duyệt" / "Từ chối" tabs permanently and silently empty. The
   repository issues one paged call per state and merges newest-first.
4. **`staffRole` also has no wire source.** It is derived from the IAM
   directory role (`TEACHER` → teacher, any other resolved role → staff) and
   is `null` when unresolvable — the badge is then OMITTED. Defaulting it
   would have labelled a person "Giáo viên"/"Nhân viên" on a guess.
5. **Mutations went real in the same step.** They were never independently
   blocked — the whole feature was force-mocked because of the read side.
   Leaving them mocked behind real reads would be a fake approve/reject.

### The two null reasons render DIFFERENT copy (AC)

| Field | Null reason | vi copy | en copy |
| --- | --- | --- | --- |
| `leaveType` | legacy row submitted before core US-170; not backfilled — diminishing over time | `staffLeave.card.leaveTypeUnrecorded` = "Chưa ghi nhận loại nghỉ" | "Leave type not recorded" |
| `department` | staff member holds no ACTIVE department-scoped assignment — a valid, ONGOING state | `staffLeave.card.noDepartment` = "Chưa có phòng ban" | "No department" |

Enforced by the `NullableFields` Storybook story, which asserts both strings
are present and `expect(a).not.toBe(b)`.

### Ask #41 → RESOLVED

`department` + `leaveType` are on the wire (core US-170) and consumed. The
`staff-leave.di.ts` / `staff-leave.repository.ts` doc comments that recorded
the permanent-mock rationale were rewritten to record the un-mock instead.
