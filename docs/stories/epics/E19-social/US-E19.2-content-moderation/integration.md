# US-E19.2 — Content Moderation — Integration Map

Service map per `.claude/rules/api-integration.md` (decision `0017`): report /
audit / moderate-delete endpoints belong to **`social`** (US-098, per
requirements.md `scope.externalDependencies`); the author-notification-on-removal
call belongs to **`noti`** (fan-out/delivery bounded context — confirmed
against the 5-service map, not `social`). Neither `social` nor a
notification-on-moderation contract has a published `openapi.yaml` yet — see
open questions. **High-risk lane**: the destructive Remove-content action
(FR-108) role-gate is resolved to `principal` only per the Ba-Lead Decision
already recorded in requirements.md (no new ADR needed, applies existing
decision `0022`) — this integration map uses `principal` throughout, not
"principal-or-admin".

## 1. Integration Overview

- **Endpoints consumed:** 6 (`social`: create/list/resolve report, audit log,
  moderate-delete (shared with US-E19.1); `noti`: notify-on-removal).
- **Services touched:** `social` (5 endpoints) + `noti` (1 endpoint).
- **Real vs mock-first:** all `social` endpoints = REAL per requirements.md
  (US-098 implemented) — same caveat as US-E19.1: no published `openapi.yaml`
  to cite directly, contract inferred from DR-013 + design-spec. The `noti`
  notify-on-removal call status is **unconfirmed** — `noti` service is live
  (per service map, `iam`+`noti` are the only confirmed-built services), but
  whether it already exposes a "moderation removal" notification template/
  event type is an open question (§5) — flag as **mock-first pending
  confirmation** if `noti` doesn't yet support this event type.
- **Risk notes:**
  - FR-108 (Remove-content) is THE high-risk item: destructive, irreversible,
    audit-logged, role-gated. No optimistic UI — content must not appear
    removed client-side until the server call succeeds (explicit requirement,
    NFR-101).
  - Authorization failures MUST be visually/semantically distinguishable
    from transient failures (explicit requirement, NFR-101 + FR-108
    errorConditions) — this drives the error-mapping table below; a generic
    "something went wrong" is NOT acceptable for a 403 here.
  - `moderate-delete` (INT-191-05) is the SAME endpoint US-E19.1 renders as a
    menu entry point — this document is the canonical contract for it; US-E19.1
    references, does not redefine.

## 2. Endpoint Catalogue

```
INT-191-01  Create Report
Service: social    Method+Path: POST /api/v1/reports
Status: REAL (DR-013, social US-098 — no openapi.yaml published, contract inferred)
Protected: yes   Role required: any authenticated role except the content's own author (FR-101 precondition)
Request (outbound, camelCase): kind — "post"|"comment"|"message" | none
  contentId — id of the reported post/comment/message | Internal
  reason — one of "spam"|"inappropriate-language"|"bullying"|"misinformation"|"other" | Internal
  note — optional free text, REQUIRED when reason="other" (FR-101/FR-102) | Confidential (may contain reporter's own commentary)
Response payload (inbound): reportId — created report id | Confidential
  status — "pending" (initial) | Internal
  createdAt — ISO timestamp | none
Pagination: none
Errors → UI behavior:
  - 422 VALIDATION_ERROR (missing reason, or missing note when reason=other) → error.fields[] → inline field error, dialog stays open (FR-102)
  - retryable transient (429/502/503/504) → inline error in dialog, no toast, dialog stays open (FR-102 errorConditions — explicit: "no toast" on failure)
  - 409 CONFLICT (ALREADY_REPORTED — same user, same content) → ReportFailure "already-reported" → inline info message (not blocking retry), dialog may still close per product decision — confirm with ba-use-case-modeler whether duplicate self-report is silently accepted or surfaced
Empty / loading expectation: submit button shows pending state; on success dialog closes + toast "Đã gửi báo cáo. BGH sẽ xem xét." (FR-102); on failure dialog stays open, no toast

INT-191-02  List Reports (queue)
Service: social    Method+Path: GET /api/v1/reports
Status: REAL (DR-013, social US-098)
Protected: yes   Role required: principal only
Request (outbound, camelCase): status — "pending"|"resolved"|"all" (tab filter, FR-104) | none
  contentType — "all"|"post"|"comment"|"message" (FR-104) | none
  search — free-text query across content/author/reporter (FR-104) | none
  cursor — pagination cursor | none
Response payload (inbound): reports[] — list of:
  reportId — Confidential
  kind — "post"|"comment"|"message" | Internal
  contentPreview — quoted snippet of reported content | Internal
  authorId, authorName — content author identity | Internal
  reporterId, reporterName — reporter identity | Confidential
  reason, note — Confidential
  status — "pending"|"dismissed"|"removed" | Internal
  createdAt — ISO timestamp | none
  duplicateCount — number of other reports on the same content (FR-110) | Internal
  resolvedBy, resolvedAt, resolveNote — present only when status≠pending | Internal
Response payload also includes stats — { pendingCount, resolvedThisWeekCount, removedCount } (FR-103) — confirm with BE whether this is a separate summary field on this response or a distinct endpoint (open question)
Pagination: cursor (meta.pagination.nextCursor / hasMore)
Errors → UI behavior:
  - retryable transient → ModerationFailure "fetch-failed" → EduError with retry (FR-103 errorConditions: "stat fetch fails → screen falls back to error state")
  - 403 FORBIDDEN (non-principal reaching this screen — defense in depth; route itself is role-gated at `(app)/principal/moderation`) → ModerationFailure "forbidden" → distinct "không có quyền truy cập" message, no retry
  - empty result → two DISTINCT variants per FR-107: true-empty (pending tab, zero total pending reports) → positive-tone EduEmpty "Không có báo cáo nào chờ xử lý"; filtered-empty (some filter/search applied, zero matches within a non-empty queue) → neutral EduEmpty "Không tìm thấy báo cáo nào". FE must distinguish these from the response (e.g. compare filtered result count vs. an unfiltered pendingCount from stats) since the API alone returns an empty array either way
Empty / loading expectation: EduSkeleton (5 rows, FR-107); see the two empty variants above; success = populated table/card list with working filters

INT-191-03  Get Report Detail
Service: social    Method+Path: GET /api/v1/reports/{reportId}  [inferred — not explicitly listed in requirements.md externalDependencies but required by FR-105; confirm exact path with BE]
Status: REAL — inferred, needs confirmation (open question)
Protected: yes   Role required: principal only
Request (outbound, camelCase): reportId — path param | Confidential
Response payload (inbound): full report object (all INT-191-02 fields) plus:
  fullContent — complete reported content (not truncated preview) | Internal
  context — for comment reports: the original post; for message reports: nearby messages with the reported one flagged (FR-105) | Internal/Confidential
  duplicateReports[] — list of other reportId/reporterName/createdAt for the same content (FR-110) | Confidential
Pagination: none
Errors → UI behavior:
  - 404 REPORT_NOT_FOUND → ModerationFailure "not-found" → sheet shows inline error, does NOT silently show stale data (explicit FR-105 errorCondition)
  - retryable transient → inline error in sheet, retry affordance
Empty / loading expectation: sheet opens with skeleton/spinner while detail loads; sections (context/duplicates/resolve-info) render conditionally per report status

INT-191-04  Resolve/Dismiss Report
Service: social    Method+Path: POST /api/v1/reports/{reportId}/resolve
Status: REAL (DR-013, social US-098)
Protected: yes   Role required: principal only, and report.status must === "pending" (FR-106 precondition)
Request (outbound, camelCase): reportId — path param | Confidential
  action — "dismiss" (this endpoint only handles non-destructive dismiss per FR-106; destructive remove is INT-191-05) | none
  resolveNote — optional free text (open question — FR-110 assumptions flag this as possibly mock/seed-only; confirm required/optional with BE) | Confidential
Response payload (inbound): updated report — status: "dismissed", resolvedBy, resolvedAt, resolveNote | Confidential
Pagination: none
Errors → UI behavior:
  - 409 CONFLICT (status no longer pending — race with another principal action) → ModerationFailure "already-resolved" → inline error, refetch report to show current state, no silent overwrite
  - 403 FORBIDDEN → ModerationFailure "forbidden" → distinct message, no retry
  - retryable transient → inline error, retry, status unchanged (FR-106 explicit: "dismiss call fails → inline error, status unchanged")
Empty / loading expectation: button shows pending state on click; success → toast "Đã bỏ qua báo cáo" + audit log entry recorded server-side (no separate FE call needed for the audit write)

INT-191-05  Moderate-Delete (Remove Content) — DESTRUCTIVE, canonical contract (shared with US-E19.1)
Service: social    Method+Path: DELETE /api/v1/feeds/posts/{postId}/moderate-delete | DELETE /api/v1/feeds/posts/{postId}/comments/{commentId}/moderate-delete
Status: REAL (DR-013, social US-098) — THIS story owns the canonical contract; US-E19.1 renders only the menu entry point that opens this confirm flow
Protected: yes   Role required: principal ONLY (Ba-Lead Decision, FR-108 — resolved via existing decision `0022`, no "admin"), and report.status must === "pending"
Request (outbound, camelCase): postId or commentId — path param | Internal
  reportId — the report being acted on (so BE can transition report.status → "removed" atomically) | Confidential
  reason — moderator's resolution reason/note (confirm optional vs required — open question, FR-110 assumptions) | Confidential
Response payload (inbound): updated report — status: "removed", resolvedBy, resolvedAt, resolveNote | Confidential
  contentRemoved — boolean confirmation the underlying post/comment was removed | Internal
Pagination: none
Errors → UI behavior:
  - 403 FORBIDDEN / NOT_PRINCIPAL (authorization rejected server-side) → ModerationFailure "forbidden" → confirm dialog shows a DISTINCT inline error (explicit copy indicating a permissions problem, e.g. "Bạn không có quyền thực hiện hành động này"), content NOT marked removed client-side (NO optimistic remove — explicit FR-108 errorCondition), dialog stays open, no retry button
  - 409 CONFLICT (report already resolved by another principal concurrently) → ModerationFailure "already-resolved" → distinct message, dialog closes, queue refetches
  - retryable transient (429/502/503/504) → confirm dialog shows inline error WITH retry button (this is the one case retryable=true applies), content not marked removed until success
  - This 403-vs-transient distinction is the crux of NFR-101's "zero client-only trust" requirement — the failure-union type ("forbidden" vs "fetch-failed"/"transient") must branch on `error.code`, never on `error.message`, per the standing error-mapping convention (see `.claude/agent-memory/ba-integration-analyst/error-mapping-conventions.md`)
Empty / loading expectation: confirm dialog (role=alertdialog) shows pending state on submit; success → dialog closes, toast "Đã gỡ nội dung và thông báo cho người đăng", queue row updates to removed status, audit log entry appended server-side

INT-191-06  Notify Author on Removal
Service: noti    Method+Path: NOT CALLED DIRECTLY BY FE — triggered server-side as a side effect of INT-191-05's moderate-delete call (FR-108 postcondition: "author notified"). No separate FE-initiated HTTP call.
Status: REAL service (`noti` is a confirmed-live BE service per the 5-service map) but UNCONFIRMED whether it already has a "content removed" notification template/event type wired to `social`'s moderate-delete flow — flag as [OPEN QUESTION], see §5. If not yet wired, this is effectively mock-first from the FE's perspective (nothing to build — FE has no direct integration point here at all, just displays the toast copy stating the author will be notified per FR-108's confirm-dialog wording)
Protected: n/a — server-to-server (social → noti), not an FE-facing endpoint
Request/Response: n/a from FE's perspective
Pagination: n/a
Errors → UI behavior: n/a — FE does not observe or handle noti delivery failures; if social's moderate-delete succeeds, FE proceeds regardless of downstream noti delivery outcome (fire-and-forget from FE's view)
Empty / loading expectation: n/a
```

## 3. Auth & Security

- All 5 FE-facing `social` endpoints (INT-191-01 through 05) require
  `Authorization: Bearer <accessToken>` via the httpOnly-cookie hybrid flow
  (decision `0018`); the UI never handles tokens client-side.
- **Role gate, resolved (Ba-Lead Decision in requirements.md):** INT-191-02
  through 05 (queue, detail, resolve, remove) are **principal-only**. The
  route itself lives at `(app)/principal/moderation` — no `(app)/admin/...`
  route exists, so there is no server-side "admin" actor to additionally gate
  for in this story. INT-191-01 (create report) is open to any authenticated
  role except the content's own author.
- **NFR-101 hard requirement:** role-gating for INT-191-05 (Remove-content)
  MUST be enforced server-side — client-side menu-item hiding (US-E19.1
  FR-006) is a UX affordance only. FE's job is to correctly surface the
  403 case distinctly (see INT-191-05 error table) — this is the auditable
  security boundary, not the menu visibility.
- PII/Confidential fields: `reporterId`/`reporterName` (who filed the report),
  `reason`/`note`/`resolveNote` (report content, potentially sensitive
  allegations) are **Confidential** — must not be exposed to any role except
  principal, and must not leak into client-side caches accessible to
  non-principal sessions (defense: TanStack Query cache is per-session,
  route itself is principal-gated at the layout level).
- Audit log (INT-191-03-adjacent `GET /api/v1/rooms/{roomId}/moderation-audit`
  — see requirements.md's `scope.externalDependencies`, distinct from
  INT-191-03 above) is also principal-only, read-only, Confidential (actor +
  target + reason per entry). **This endpoint was named in requirements.md
  but not yet cataloged above — added here:**

```
INT-191-07  Moderation Audit Log
Service: social    Method+Path: GET /api/v1/rooms/{roomId}/moderation-audit
Status: REAL (DR-013, social US-098; NFR-101 explicitly requires this endpoint for the audit trail)
Protected: yes   Role required: principal only
Request (outbound, camelCase): roomId — [OPEN QUESTION: "room" terminology suggests this endpoint may be shared/reused from a messaging-room concept — confirm whether "roomId" here means classId/schoolId/tenantId in the feed/moderation context, or whether audit is actually queried without a roomId scope (e.g. per-tenant) — the path shape looks copy-pasted from a messaging contract]
  cursor — pagination cursor for the timeline (FR-109) | none
Response payload (inbound): entries[] — { entryId, actorId, actorName, action ("removed"|"dismissed"), contentRef (kind + contentId), reason, timestamp } | Confidential
Pagination: cursor (meta.pagination.nextCursor / hasMore) — reverse-chronological (FR-109)
Errors → UI behavior:
  - retryable transient → EduError with retry (FR-109: "fetch fails → error state consistent with FR-107 pattern")
  - 403 FORBIDDEN → distinct "không có quyền" message, no retry
Empty / loading expectation: EduSkeleton while loading; empty timeline → simple empty state (no positive/filtered distinction specified for audit, unlike the queue)
```

## 4. Mock-first plan

No `social` endpoint in this story requires mock-first treatment per
requirements.md (all listed as US-098 implemented). The ONLY genuinely
uncertain integration is **INT-191-06 (notify-on-removal via `noti`)** — but
since FE has no direct call to make (it's a server-side side effect of
INT-191-05), there is nothing to add to `bootstrap/lib/mock.ts` for it. If
`ba-lead`/BE confirms `noti` does NOT yet support this event, that is purely
a BE-side gap with no FE mock surface — FE's confirm-dialog copy ("...và
thông báo cho người đăng") should still ship, since it describes intended
behavior regardless of current notify-delivery completeness.

If, during BE confirmation, any of INT-191-02/03/04/05/07 turn out to not
actually be reachable yet (contract drift from requirements.md's "US-098
implemented" claim), fall back to mock-first per decision `0014` using the
same pattern as `MockMessagingRepository` (see
`.claude/agent-memory/ba-integration-analyst/social-service-status.md`) — a
`MockModerationRepository` implementing `IModerationRepository` with seeded
report/audit fixtures, swappable via the DI factory.

## 5. Open Questions

- `[OPEN QUESTION]` No `openapi.yaml`/`INTEGRATION.md` for `social` exists —
  all REAL-status endpoints inferred from DR-013 + design-spec field names.
  Confirm with BE before implementation, especially: report `reason` enum
  values, whether `resolveNote` is required or optional on both dismiss
  (INT-191-04) and remove (INT-191-05), and the exact stats delivery
  mechanism (embedded in INT-191-02's response vs. a separate stats
  endpoint for FR-103's three StatCards).
- `[OPEN QUESTION]` INT-191-03 (report detail) path was not explicitly listed
  in requirements.md's `scope.externalDependencies` (only list/create/resolve/
  audit/moderate-delete were named) but FR-105 clearly requires fetching full
  detail + context + duplicates — confirm whether this is a real distinct
  endpoint or whether detail is derived client-side from the already-fetched
  list item (unlikely, given `fullContent`/`context`/`duplicateReports` need
  more data than the list row) — flag to BE.
- `[OPEN QUESTION]` INT-191-07's `roomId` path parameter naming strongly
  suggests this audit endpoint was originally scoped for messaging
  (`social`'s room/chat context) and may need clarification on what value
  FE should pass for feed/moderation audit — classId, schoolId (tenant), or
  a dedicated moderation-scope id. This could also mean the endpoint doesn't
  cleanly cover cross-scope (school + all classes) audit in one call — may
  need multiple calls or a different aggregate endpoint. Escalate to BE/
  `ba-lead` before `fe-state-engineer` designs the query key.
- `[OPEN QUESTION]` Whether `noti`'s existing templates already cover
  "content removed by moderator, you are the author" — if not, this is a BE
  gap that blocks FR-108's full postcondition ("author notified") even
  though the FE-visible remove call itself can still succeed. Flag to
  `ba-lead` to confirm with the `noti` BE team; does not block FE
  implementation of INT-191-05 itself (fire-and-forget from FE's view) but
  should be tracked so the confirm-dialog's notification promise isn't false.
- `[OPEN QUESTION]` Duplicate self-report handling (INT-191-01, 409 case) —
  whether resubmitting a report on the same content by the same reporter is
  rejected, silently deduped, or allowed to create a second entry — affects
  the exact failure-union entry and UI copy; raise to `ba-use-case-modeler`.
