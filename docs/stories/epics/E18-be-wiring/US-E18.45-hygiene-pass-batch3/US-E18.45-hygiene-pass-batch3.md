# US-E18.45 Hygiene pass: memberId claim re-verify, 422 field casing, #40iii doc sync

## Status

implemented (no-op — verification only, zero `src/` change)

## Lane

tiny

## Dependencies

- Depends on: run LAST in this batch (after US-E18.38..44 land) so the memberId-claim sweep reflects their fixes, not a stale snapshot
- Blocks: none
- Feature module(s) chạm: cross-cutting grep/doc sweep, no single feature module
- Shared contract/file: none structural

## Ground truth (fe-lead, verified before delegating)

Coordinator's batch-3 instruction, item 8 (hygiene pass), three sub-items:

**(a) US-174 — JWT now carries `memberId` claim.** BE's root-cause fix
(`docs/reports/2026-08-04-be-to-fe-response.md` §"🔴 Bug..."): every
tenant-scoped token now carries `memberId` (== `userId`). Tokens issued BEFORE
the fix deployed do NOT have it — client must refresh/re-signin once. This is
an OPERATIONAL note, not a code change. Task: grep the codebase for
doc-comments/stories that cited "missing memberId claim" / "ActorMemberID ==
''" as a blocking reason for force-mocking or degrading a path, and confirm
each one is either (i) already fixed by this batch's sibling stories
(US-E18.38 already updated `timetable-view.di.ts`'s comment), or (ii) still
blocked for a DIFFERENT, unrelated reason (e.g. `staff-leave`/`teaching-plan`
are blocked because no BE endpoint capability exists at all, not because of
the memberId claim) — in which case leave them alone, just confirm the
blocking reason cited is still the accurate one and not a leftover
memberId-claim mention that's now misleading.

**(b) US-180 — notification 422 field-name casing.**
`docs/reports/2026-08-05-be-to-fe-response.md` §"Fix 422 field-name trên
notification": `GET /noti/api/v1/notifications`'s 422 `fields[].field` now
returns lowercase wire names (`limit`/`type`/`read`/`cursor`) instead of the
old leaked Go field names (`Limit`/`Type`/`Read`/`Cursor`). fe-lead already
grepped `src/features/notification/` and found NO code anywhere in the repo
that matches a field-error `field` string against
`"Limit"`/`"Type"`/`"Read"`/`"Cursor"` (or any PascalCase variant) for ANY
feature, not just notification — the app never had client-side logic that
depended on the old (wrong) casing. Task: CONFIRM this with your own grep
(don't just trust fe-lead's finding — re-verify), across the WHOLE repo, not
just notification (a shared validation-error-rendering component elsewhere
could theoretically reference these names generically). If truly nothing
matches, document the confirmation in Evidence — no code change expected. If
you DO find a match fe-lead missed, fix it (branch on lowercase wire field
names) and add a regression test.

**(c) #40(iii) doc sync.** `docs/reports/2026-08-04-be-to-fe-response.md`
§"#40(iii)": BE confirms this is FULLY RESOLVED since US-166 — all 3
`targetType` (MESSAGE/POST/COMMENT) are wired on `POST /reports/{id}/resolve`
(delete action), the `REPORT_RESOLVE_DELETE_NOT_IMPLEMENTED` 501 in
`ERROR_CODES.md` is a defensive branch, unreachable from the public surface —
NOT a live drift. `docs/reports/2026-08-03-fe-to-be-open-asks.md` item 15
(#40(iii)) currently lists this as still-open doc-drift needing
reconciliation. Task: this line item should be marked RESOLVED in the batch-3
closing report (see §Harness Delta) — no code change, doc-only.

## Scope

1. Grep sweep for (a) — report findings, fix only truly-stale comments (not
   already touched by US-E18.38..44).
2. Grep sweep for (b) — report confirmation or fix if a real gap is found.
3. Note (c) for the closing report (fe-lead will do the actual report-file
   edit as part of the batch close-out — this story's job is to confirm the
   BE claim is accurate by re-reading `ERROR_CODES.md`'s current
   `REPORT_RESOLVE_DELETE_NOT_IMPLEMENTED` entry if the edu-api docs are
   available, or trust the BE report if not).

## NOT in scope

- Any functional/behavioral code change beyond what (a)/(b) uncover.
- Re-running the whole epic's memberId-claim sweep from scratch — only check
  paths already flagged in existing story/EPIC-OVERVIEW doc comments.

## Acceptance Criteria

- No doc-comment in the repo cites a resolved memberId-claim gap as a current
  blocker.
- Confirmed (with evidence) that no code branches on the old PascalCase
  notification validation field names.
- Zero production code change unless a genuine gap is found (in which case,
  document why this moved from "hygiene" to "real fix").

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | none expected unless a real gap is found |
| Integration | none expected |
| E2E | none expected |
| Platform | `bun vitest run` zero-regression (should be a no-op diff if no real gap found), `bunx tsc --noEmit` |
| Release | merged to main, branch deleted |

## Harness Delta

- TEST_MATRIX: no new row expected unless a real gap surfaces.
- Batch-3 closing report: mark #40(iii) RESOLVED (doc-drift closed).
- EPIC-OVERVIEW.md Wave 6 row (hygiene note only).

## Evidence

**Outcome: TRUE NO-OP on production code.** All three sub-items re-verified
independently; nothing stale, nothing missed. Only this Evidence section changed.

### (a) memberId-claim sweep — no stale blocker comment exists

Greps run (all from the repo root, whole tree, not just the batch-3 paths):

| Grep | Scope | Result |
| --- | --- | --- |
| `memberId claim\|memberid-claim\|ActorMemberID` | `src/` + `docs/` | **`src/` = 0 hits.** `docs/` = 5 files, all accurate (below). |
| `memberId` ∩ `claim` | `src/**/*.ts(x)` | 21 hits, ALL ordinary `sub`-claim plumbing (`decodeSubClaim`, `claimMemberId`, `grades.di.ts` self-view docs). None describes an ABSENT claim. |
| `memberId` ∩ (`missing\|empty\|absent\|blocked\|gap\|force-mock`) | `src/**/*.ts(x)` | 0 hits blaming the claim; the matches are field NAMES (`studentMemberId`, `authorMemberId`) and mock fixtures. |
| `force-mock\|forced mock\|BE gap\|no BE (endpoint\|capability)` | `src/bootstrap/di/` | 19 hits — every remaining force-mock / hybrid reason read in full (below). |
| `missing-memberid\|2026-08-02-fe-to-be` | `src/` + `docs/` | 0 hits — no code or story doc back-references the original ask report. |

Every surviving force-mock / honest-degrade reason read in full and classified —
**not one cites the memberId claim**, so there is nothing to un-blame:

| Path | Cited blocker | Still accurate? |
| --- | --- | --- |
| `teaching-plan.di.ts` | No BE capability at all: key mismatch `(subjectId, classId, term)` vs `(classSubjectId, academicYear, planId)`, no period axis on the wire, no update endpoint | YES — unrelated to the claim (as fe-lead predicted) |
| `academic-records.di.ts` (viewer) | Domain-model gap: `AcademicRecordResponse` keyed `(classId, termId, studentMemberId)`, no year grouping / fixed term slots | YES — model redesign, unrelated |
| `academic-records.di.ts` (seal, 3 of 9 methods) | No endpoint for `listAvailableClasses` / `getSealAuditTrail`; IAM `MemberListItem.roles` has no `SUPER_ADMIN` for `listTenantAdmins` | YES — unrelated |
| `grades.di.ts` (approval pipeline, ADR 0054) | No `batchId` resolution source + no tenant-wide pending rollup (ask #18 OPEN); already correctly notes US-E18.44's per-cell reject closed only ONE of the two | YES — unrelated |
| `messaging.di.ts` (ADR 0060) | Group lifecycle / pin / contacts have no real contract | YES — unrelated |
| `feed.di.ts` / `moderation.di.ts` | Reaction taxonomy + attachment capability (mutations only) | YES — unrelated |
| `staff-leave.di.ts` | **Already un-mocked** (US-E18.36) — all 3 blockers struck through | n/a |
| `timetable-view.di.ts` (principal) | Was `MANAGER` matching no `authorize()` branch → fixed by BE US-175; comment already rewritten by US-E18.38 | n/a — already current |
| `principal-classes.di.ts` | Was `MANAGER` → `ErrClassForbidden()`; already rewritten to "NO LONGER TRUE" after BE US-164 (US-E18.30) | n/a — already current |
| `parent-attendance.di.ts` | US-E20.5's honest degrade already retired by US-E18.34; the remaining 403 note is the REAL unlinked-child path | n/a — already current |

Note the two role-based grants (`principal-classes`, `timetable-view`) were
blocked by *role* branches, NOT by `ActorMemberID == ""` — so they were correctly
fixed by BE US-164/US-175, independently of US-174.

The 3 `docs/` files mentioning `ActorMemberID` are all accurate historical
records, deliberately left alone: `US-E18.38`'s packet + its `TEST_MATRIX` row
state that `roleManager` is granted *before* the `ActorMemberID == ""` guard (the
reason a MANAGER token never needed the claim — still true), and `US-E18.34`'s
packet transcribes `get_student_attendance.go`'s `authorize()` verbatim.

**Operational residual (not code, flagged to `fe-lead`):** tokens minted before
the IAM deploy carry no `memberId`, so a live-BE demo must refresh/re-signin
once. The session memory note `live-be-demo-setup` still lists the claim as a
live BLOCKER for every TEACHER screen — now stale, but it lives in the user's
own memory store, not this repo.

### (b) notification 422 field casing — CONFIRMED, no code depends on the old casing

fe-lead's finding independently reproduced with three orthogonal greps over the
WHOLE `src/` tree (not just `features/notification/`):

1. `['"](Limit|Type|Read|Cursor|PageSize|Offset)['"]` → **0 hits.** No
   PascalCase field-name literal exists anywhere in the app.
2. `\.field\b` → 12 hits. The only *comparisons* against a field name are
   `"code"` (subject-catalogue), `"parentId"` / `"studentId"` / `"relationship"`
   / `"note"` (parent-links), `"severity"` / `"description"` / `"rating"`
   (staff-discipline), and `"gradeLevel"` (assessment-scheme's shared
   `VALIDATION_FAILED` disambiguation). All lowercase camelCase wire names, none
   of them a notification query param.
3. `src/features/notification/` for `fields` → **0 hits in non-test code.**
   `notification.repository.ts`'s `toFailure()` branches only on
   `NETWORK_ERROR` / 401 / 404 `NOTIFICATION_NOT_FOUND`, else `unknown` — a 422
   never reaches `error.fields` at all on this path. Nothing to regress.

Also confirmed the fix on the BE side (edu-api available locally):
`services/notification/internal/center/adapter/http/dto/notification.go` now
carries lowercase `json:"type"|"read"|"cursor"|"limit"` tags, and
`notification_handler_test.go:459` pins `"field":"read"`. No FE change needed —
the app never had client logic keyed on the old (wrong) casing, so it neither
broke before nor changes now.

### (c) #40(iii) — BE claim verified against the live `ERROR_CODES.md`

edu-api is checked out locally, so this was verified rather than trusted:
`services/social/docs/ERROR_CODES.md:357` now reads
`REPORT_RESOLVE_DELETE_NOT_IMPLEMENTED` … "**As of US-166 this is a defensive,
publicly UNREACHABLE `default:` belt**" — all three `targetType`s (MESSAGE /
POST / COMMENT) have a wired moderator primitive in `cmd/server/container`, and
`REACTION` is rejected by `NewTargetType` before a report can exist. The branch
is retained only because `dispatchDelete` switches on a string-backed value
object (no compiler exhaustiveness — OQ-166-06). `INTEGRATION.md:1451` says the
same. **Not live drift** — BE's claim is exact.

FE side: `grep REPORT_RESOLVE_DELETE_NOT_IMPLEMENTED|NOT_IMPLEMENTED src/` → 0
hits, so no FE failure mapping ever anticipated this 501 either. Report-file edit
belongs to `fe-lead`'s batch close-out (per §Scope); this story touched no report.

### Files changed

- `docs/stories/epics/E18-be-wiring/US-E18.45-hygiene-pass-batch3/US-E18.45-hygiene-pass-batch3.md`
  (this Evidence section + status)

Zero `src/` changes. No `docs/TEST_MATRIX.md` row added — per §Harness Delta, a
row is only warranted if a real gap surfaced, and none did.

### Proof

- `bun vitest run` — **487 files / 3700 tests passed, 0 failed** (identical to
  the pre-branch baseline; the diff touches no code).
- `bunx tsc --noEmit` — clean.
