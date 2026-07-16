# US-E18.10 Class-log wiring + `revise` workflow state

## Status

in-progress

## Lane

normal (touches UI — a real action button is mis-routed to the wrong BE
endpoint for one status; adding the correct action + relabeling is a UI
behavior change, not just an internal remap. No hard-gate flag trips: no
auth/RBAC/token/session/tenant-isolation/data-loss/PII/validation-weakening/
new-design-token change.)

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/class-log/`,
  `src/bootstrap/{endpoint,di}/class-log.*`,
  `src/app/[locale]/t/[tenant]/(app)/{teacher,principal}/class-log/`
- Shared contract/file: `src/bootstrap/i18n/messages/{vi,en}.json` (`classLog`
  namespace only — no other in-flight US touches this key path)

## Product Contract

Ground-truth the real `core` (`school` bounded context) "HomeroomBook" contract
(`edu-api/services/core/docs/openapi.yaml` tag `HomeroomBook` +
`internal/school/{adapter/http,core/application,core/domain}`) against the
already-implemented web `class-log` feature (US-E13.3) and close two gaps:

1. **Missing `revise` transition.** BE state machine is
   `DRAFT → SUBMITTED → APPROVED (terminal)` / `→ REJECTED → SUBMITTED (revise)`.
   `submit` only accepts a `DRAFT` entry (`HomeroomEntry.Submit()` guards
   `!e.status.IsDraft()`); a `REJECTED` entry must go through the **separate**
   `POST .../revise` endpoint (`HomeroomEntry.Revise()` guards
   `!e.status.IsRejected()`). The web screen's detail component currently
   computes `canTeacherSubmit = !isPrincipal && (status === "DRAFT" ||
   status === "REJECTED")` and routes BOTH cases through `submitEntryAction`
   → for a REJECTED entry this call would 409 in real mode (mock never caught
   it because the mock's own `submitEntry` also wrongly accepted any non-
   terminal status). Fix: a distinct "Revise & resubmit" action wired to the
   real `revise` endpoint, used only for REJECTED.
2. **Guessed error-code taxonomy never matches the real wire.** Ground-truthed
   from `internal/school/core/domain/error/homeroom.go` (BE uppercases the i18n
   key via `codeFromKey`, confirming decision `0008`'s UPPER_SNAKE holds for
   `core`, same pattern as US-E18.6/E18.7/E18.8/E18.9):

   | Real wire code | HTTP | Web (old, guessed) | Web (new) |
   | --- | --- | --- | --- |
   | `HOMEROOM_ENTRY_NOT_FOUND` | 404 | `HOMEROOM_ENTRY_NOT_FOUND` (matched) | `not-found` (kept) |
   | `HOMEROOM_ENTRY_ALREADY_EXISTS` | 409 (create, duplicate `(class,date)`) | `HOMEROOM_ENTRY_DUPLICATE_DATE` (never matches) | `already-exists` |
   | `HOMEROOM_INVALID_TRANSITION` | 409 (submit/approve/reject/revise on wrong status) | `HOMEROOM_ENTRY_ALREADY_SUBMITTED` / `HOMEROOM_ENTRY_NOT_SUBMITTED` (never match; BE has ONE transition-error code, not two) | `invalid-transition` |
   | `HOMEROOM_SUMMARY_REQUIRED` | 400 (empty summary) | unmapped → fell to `unknown` | `summary-required` |
   | `HOMEROOM_FORBIDDEN` | 403 (non-GVCN write / non-BGH approve-reject) | unmapped → fell to `unknown` (generic `FORBIDDEN`/`UNAUTHORIZED` mapped to `unauthorized`) | `forbidden` (403); `unauthorized` reserved for generic 401 |

   `already-submitted` / `not-submitted` / `duplicate-date` are removed
   (renamed) — they never corresponded to a real BE code; every "generic
   drift" precedent in this epic (E18.1/E18.2/E18.6/E18.7/E18.8/E18.9) confirms
   renaming a wrong-guess failure type is the correct fix, not keeping it as a
   dead alias.

### What did NOT need fixing (rare in this epic)

- **Path prefix already correct.** `CLASS_LOG_EP` already uses
  `/core/api/v1/classes/{classId}/homeroom-entries...`, matching
  `POST /api/v1/classes/{classId}/homeroom-entries` behind Kong's `/core`
  route. No remap needed (unlike every other Wave-1/2 cluster).
- **DTO shape already correct.** `HomeroomEntryResponseDto` /
  `HomeroomEntry` entity fields (`entryId, classId, entryDate, summary,
  notableEvents, status, authorMemberId, decidedBy, decidedAt, reason,
  createdAt, updatedAt`) match `HomeroomEntryResponse`'s wire JSON tags
  1:1 (`internal/school/adapter/http/dto/homeroom.go`) — the only cluster in
  the whole epic with zero DTO drift. No mapper/entity change needed.
- **`raw: true` placement** already fixed for this repo by US-E18.19 (sibling
  top-level of `params` in `listEntries`) — verified still correct, not
  reintroduced.
- **`GET .../homeroom-entries/{entryId}` (single-entry read) exists on the
  real API but is intentionally NOT wired.** The screen already holds the full
  entry list client-side (`ClassLogScreen`'s `localEntries`) and every mutating
  action (create/submit/approve/reject/revise) returns the fresh entry from
  its own POST response — there is no code path that needs a standalone GET-by-id
  fetch. Adding an unused repository method + use-case with no UI consumer
  would violate the TDD rule (no untested/unconsumed surface) for zero benefit.
  Decision: **not implemented**, revisit if a future screen needs deep-linking
  to a single entry.

### Fix while touching the same transition surface (parity, not scope creep)

`approveEntryAction`/`rejectEntryAction` currently discard the repository's
returned (mapped) `HomeroomEntry` and have the client fabricate a patched
object (`{ ...entry, status: "APPROVED" }`) instead — unlike
`createEntryAction`/`submitEntryAction`, which already return the real entry.
The repository methods already return the full mapped entity from the real
BE response (`decidedBy`/`decidedAt`/`reason` included); the action layer is
the only place the value gets thrown away. Fix: `approveEntryAction`/
`rejectEntryAction` (and the new `reviseEntryAction`) return `{ ok: true;
entry }` like their siblings, and the screen's `handleApprove`/`handleReject`
use the server response instead of a client-side guess.

## Design Notes

- **Commands**: `reviseEntry(classId, entryId)` on `IClassLogRepository` →
  `POST .../homeroom-entries/{entryId}/revise` (no body). New
  `ReviseEntryUseCase`. New `makeReviseEntryUseCase()` DI factory (mirrors
  `makeSubmitEntryUseCase`).
- **Queries**: unchanged (`listEntries` already correct).
- **API**: `CLASS_LOG_EP.revise(classId, entryId)` added.
  `ensureFreshSession()` wired into `class-log.di.ts`'s `!USE_MOCK` branch
  (playbook step 6 — first time for this DI factory, per the epic's recurring
  finding that no feature DI factory besides `auth.di.ts` had this until each
  US closes it for its own cluster).
- **Tables**: n/a (no schema/entity shape change).
- **Domain rules**: `ClassLogFailure` union renamed to the ground-truthed
  taxonomy (`not-found`, `already-exists`, `invalid-transition`,
  `summary-required`, `forbidden`, `unauthorized`, `network-error`, `unknown`).
  `CreateEntryUseCase`'s client-side empty-summary guard now throws the real
  `summary-required` type (was piggy-backing on `unknown` + a free-text
  `message`).
- **UI surfaces**: `ClassLogEntryDetail` gets a distinct revise action for
  REJECTED entries (`t("form.revise")` label, `onRevise` handler) instead of
  reusing the submit button/label — the entry's REJECTED banner (with
  rejection reason) stays visible so the teacher sees why before resubmitting.
  `ClassLogScreen` adds `handleRevise` (mirrors `handleSubmit`) and updates
  `handleApprove`/`handleReject` to consume the server-returned entry.
  Design-review + a11y gate apply (new interactive state on an existing
  screen, per `.claude/rules/impeccable.md`); no new tokens, reuses the
  existing `Button`/`StatusBadge` primitives and `edu-*` tokens already on the
  screen.

## Acceptance Criteria

- `IClassLogRepository.reviseEntry` posts to
  `/core/api/v1/classes/{classId}/homeroom-entries/{entryId}/revise` with no
  body and returns the mapped entry.
- `toFailure()` (real repo) maps the 5 ground-truthed codes above + falls back
  to `unknown` for anything else; `not-found`/`network-error` unchanged.
- `CreateEntryUseCase` throws `{ type: "summary-required" }` for a
  whitespace-only summary (was `{ type: "unknown", message: "summary-required" }`).
- `MockClassLogRepository` models the real state machine truthfully:
  `submitEntry` only accepts `DRAFT` (else `invalid-transition`); `reviseEntry`
  only accepts `REJECTED` (else `invalid-transition`); `approveEntry`/
  `rejectEntry` only accept `SUBMITTED` (else `invalid-transition`, replacing
  the old `not-submitted`); `createEntry` throws `already-exists` for a
  duplicate `(classId, entryDate)` (previously unmodeled).
- Teacher detail screen: a REJECTED entry shows a "Revise & resubmit" action
  (not "Submit for approval") that calls `reviseEntryAction`; a DRAFT entry
  still shows "Submit for approval" calling `submitEntryAction`. Both keep the
  REJECTED banner + reason visible while the action is available.
- Principal cannot revise (stub returns `unauthorized`, mirroring the existing
  create/submit stubs on the principal action file).
- `approveEntryAction`/`rejectEntryAction`/`reviseEntryAction` all return
  `{ ok: true; entry }` on success; the screen updates local state from the
  returned entry (no client-fabricated status patch).
- i18n: `classLog.errors.{already-exists,invalid-transition,summary-required,
  forbidden}` added (vi + en); `already-submitted`/`not-submitted`/
  `duplicate-date` removed; `classLog.detail.revise`/`revising` added.
- Zero regression on existing statuses/flows (create draft, create+submit,
  approve, reject) — same visible behavior, only the REJECTED→resubmit path
  and error copy change.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `class-log.failure.ts` type shape; `create-entry.use-case.test.ts` updated for `summary-required`; new `revise-entry.use-case.test.ts`; `class-log.repository.test.ts` extended error-mapping table (5 real codes) + new `reviseEntry` happy-path test |
| Integration | Mock repository behavior (submit/revise/approve/reject transition guards, duplicate-date on create) — either a new `class-log.mock.repository.test.ts` or covered via screen/Storybook interaction |
| E2E / Story | Storybook: REJECTED entry detail shows "Revise & resubmit" (not "Submit"), clicking it transitions to SUBMITTED; DRAFT entry still shows "Submit for approval"; approve/reject flows use the returned entry (existing stories updated, no behavior regression) |
| Platform | `bunx tsc --noEmit`, `bun run build` |
| Release | full `bun vitest run` zero-regression vs baseline (290 files / 1777 tests before this US), pre-push gate green, auto-merge to `main` |

## Evidence

- Implementation (`fe-nextjs-engineer`, commit `5dc4e69`): `ClassLogFailure`
  renamed to the ground-truthed taxonomy (`not-found`, `already-exists`,
  `invalid-transition`, `summary-required`, `forbidden`, `unauthorized`,
  `network-error`, `unknown`); `toFailure()` rewritten to the 5 real
  `HOMEROOM_*` codes; new `reviseEntry` on the repository (posts to
  `.../revise`, no body) + `ReviseEntryUseCase` + `makeReviseEntryUseCase()`;
  `ensureFreshSession()` wired into `class-log.di.ts`'s `!USE_MOCK` branch
  (first time for this factory); `MockClassLogRepository` now models the real
  state machine (duplicate-date create guard, submit-only-DRAFT,
  revise-only-REJECTED clearing `decidedBy`/`decidedAt`/`reason`,
  approve/reject-only-SUBMITTED); teacher `reviseEntryAction` (real) +
  principal `reviseEntryAction` (unauthorized stub); approve/reject actions
  now return `{ ok: true; entry }`; `ClassLogEntryDetail` splits
  `canTeacherSubmit`(DRAFT)/`canTeacherRevise`(REJECTED) with a distinct
  "Revise & resubmit" action; vi/en `classLog` i18n updated (4 new error
  keys, 2 removed, 2 new `detail` keys).
- Test proof: 292 files / 1790 tests pass (baseline before this US: 290/1777
  — zero regression, +13 new tests: `revise-entry.use-case.test.ts`,
  `class-log.mock.repository.test.ts` (9 tests), extended
  `class-log.repository.test.ts` error matrix + `reviseEntry` happy path,
  updated `create-entry.use-case.test.ts`); `bunx tsc --noEmit` clean;
  `bun run build` green; `bun lint` clean for class-log files.
- `fe-tech-lead-reviewer` verdict: **Approved**. Independently re-opened
  `edu-api/services/core/internal/school/core/domain/error/homeroom.go` +
  `.../entity/homeroom_entry.go` and confirmed the 5-code error map and state
  machine 1:1 against Go source (not taken on the story packet's word);
  independently re-ran `tsc`/`vitest`/`build`/`lint`; confirmed scope
  discipline (mapper/DTOs/entities untouched, no `getEntry` added, only
  class-log files + `classLog` i18n namespace + `TEST_MATRIX.md` touched).
  One non-blocking `[CONSIDER]`: mock `approveEntry` doesn't clear `reason`
  the way the real `Approve()` does — currently unobservable (no path reaches
  SUBMITTED with a stale reason) but noted for full mock fidelity.
- `fe-accessibility-auditor` verdict: **PASS** (0 blocking/critical/major).
  1 minor, non-blocking, pre-existing-pattern finding (A11Y-001: no explicit
  `aria-live`/`aria-busy` on the pending-state button label swap — identical
  pattern already shipped on the sibling submit/approve/reject buttons under
  US-E13.3, not a new regression; optional follow-up, not scoped to this US).
  Touch target ≥44px confirmed (`min-h-11` on the shared `Button` primitive);
  rejection-reason text confirmed using the correct `text-edu-error-text`
  token per ADR 0049; status still paired with icon+label, not color-only.
- Design review gate (`fe-lead`, `docs/DESIGN_REVIEW.md` checklist):
  - Design-system conformance: **pass** — no raw color, no new token;
    100% reuse of the existing `Button`/`StatusBadge` primitives and `edu-*`
    tokens already on this screen; role/tone mapping unchanged.
  - Accessibility: **pass** — see auditor verdict above.
  - impeccable critique: **pass, no findings requiring action** — this is a
    small, contained addition (one new button + a relabeled/split conditional)
    reusing an already-shipped, already-audited interaction pattern 1:1;
    nothing to redesign, no anti-pattern introduced.
  - States & responsive: **pass** — loading (`isPending`/"Đang gửi lại..."),
    the REJECTED banner+reason state, and the post-action success/error toast
    all covered; no layout/breakpoint change (same detail-view shell as
    US-E13.3, already verified at 320px).
- QA (`fe-qa-playwright`): see below.

## Harness Delta

- `harness-cli story add --id US-E18.10 --lane normal` (this packet).
- `harness-cli story update --id US-E18.10 --status implemented --unit 1 --integration 1 --e2e 1 --platform 1` after gate green.
- `docs/TEST_MATRIX.md` — add US-E18.10 row.
