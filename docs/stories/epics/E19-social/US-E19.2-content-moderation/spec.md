# Feature Spec — Content Moderation (US-E19.2)

Status: Draft   Lane: high-risk
Sources: `requirements.md` (TR-191, incl. Ba-Lead Decision 2026-07-12 on FR-108) ·
`integration.md` (INT-191-01…07) · `use-cases.md` (UC-1921…1930, AC-1921.1…AC-1930.2)
+ `docs/product/design-spec.jsonc` → `screens.moderation` (~line 3745, incl.
`reportDialog` sub-entry ~line 3916) + `design_src/edu/moderation.jsx`
(`ModerationScreen`) + `design_src/edu/ui.jsx` (`ReportContentDialog`) ·
DR-013-content-moderation.md

## 1. Scope & Objectives

**Purpose:** Own the single shared Report-content dialog contract, and deliver the
principal-facing Moderation screen (queue, detail, dismiss, the destructive Remove
action, and a read-only audit log) matching DR-013's approved design.

**In scope:**
- Shared `ReportContentDialog`: component contract, `moderation.reportDialog.*`
  i18n, reason list, quote preview, submit/cancel, "Khác" note validation.
- Moderation screen: stat row, view tabs (queue/audit), queue filter bar, report
  table + mobile card variant, detail sheet, confirm-remove dialog, audit timeline.
- Role-gating + confirm-dialog requirement for the destructive Remove action.
- 5 UI states incl. the empty-positive vs empty-filtered distinction.

**Out of scope:**
- Any BE Go implementation of `social` endpoints or the audit-log persistence
  mechanism.
- Messaging's own report entry point / message context menu (US-E10.6) —
  dependency-only consumer of this story's dialog, not built here.
- Feed's post/comment "…" menu and pin/unpin behavior — owned by US-E19.1.
- Fine-grained tenant-scoping of which principal can moderate which school/class
  (assume single-tenant principal scope until an ADR says otherwise).

**Definitions:**
- *Report* — a record `{ reporter, reported content ref, reason, optional note,
  status, timestamps }`, `status ∈ {pending, dismissed, removed}`.
- *Destructive* — irreversible + affects another user (the content author);
  applies to Remove-content only, NOT to Dismiss (non-destructive resolution).
- *Empty-positive* vs *empty-filtered* — the pending tab having zero total reports
  (a good outcome, positive tone) vs a filter/search narrowing a non-empty queue
  to zero matches (neutral tone) — see FR-107.

## 2. Actors & Roles

| Role | Capability | Route access |
| --- | --- | --- |
| Principal | View queue/stats, filter/search, open detail sheet, dismiss, remove (confirm-gated), view audit log | `(app)/principal/moderation` — sole actor |
| Teacher | Trigger the shared Report dialog only (consumer via feed, US-E19.1) | none (dialog only, no route access) |
| Student | Trigger the shared Report dialog only (consumer via feed) | none |
| Parent | Trigger the shared Report dialog only (consumer via feed) | none |
| ~~admin~~ | Not an actor for this route | N/A — see Ba-Lead Decision below |

**Ba-Lead Decision (2026-07-12, carried verbatim from requirements.md):** resolved,
no new ADR needed (applies existing decision `0022`, not a new authorization rule).
`docs/product/roles-permissions.md` was stale (4 roles only); decision `0022`
already added a real 5th role `admin`, but the Moderation screen's own route is
`(app)/principal/moderation` — there is no `(app)/admin/moderation` route.
**FR-108's destructive Remove-content action is role-gated to `principal` only.**
`roles-permissions.md` has been patched with an explicit row for this route. Use
`principal` (not "principal-or-admin") in all downstream implementation/AC. A
future need for `admin` to also moderate is a separate story/decision.

Role-gated visibility: the Remove entry point (FR-108) is rendered ONLY for
`principal` client-side, but the server IS the enforcement boundary (NFR-101) —
client hiding is a UX affordance, never the sole gate.

## 3. Functional Requirements

### FR-101 — Shared Report-content dialog
Priority: Must · Source: TR-191/FR-101, UC-1921
The system SHALL provide ONE shared `ReportContentDialog` (i18n:
`moderation.reportDialog.*`) invokable with `{ kind: post|comment|message,
authorName, content preview }`, reused verbatim by US-E19.1 (feed) and messaging
(US-E10.6, dependency-only).
AC:
- Given a caller invokes the dialog with `kind="post"`, When it opens, Then it
  renders the reason radiogroup, a 3-line-clamped quoted preview matching the
  passed content, and a disabled Submit button (AC-1921.1).
- Given the dialog is invoked from feed or messaging, Then in both cases the SAME
  component instance/contract renders — no forked per-consumer copy exists in the
  codebase (AC-1921.6).
Dependencies: none (component owns its own contract).

### FR-102 — Submit a report
Priority: Must · Source: TR-191/FR-102, UC-1922
The system SHALL submit a report on confirm, creating a record with reporter,
content ref, reason, optional note, timestamp; reported content SHALL remain
visible to the reporter.
AC:
- Given a valid reason (+ note if "Khác") is selected, When Submit is clicked,
  Then on success the dialog closes with toast "Đã gửi báo cáo. BGH sẽ xem xét."
  (AC-1922.1).
- Given the server returns a retryable error, Then an inline error with retry
  appears inside the dialog, it stays open, and NO toast is shown (AC-1922.4).
Dependencies: INT-191-01.

### FR-103 — Moderation stat row
Priority: Must · Source: TR-191/FR-103, UC-1923
The system SHALL show three StatCards: Chờ xử lý, Đã xử lý tuần này, Đã gỡ nội dung.
AC:
- Given the queue fetch succeeds, Then all three StatCards render with correct
  values (AC-1923.1).
- Given the stat/queue fetch fails, Then the WHOLE screen (not just the stat row)
  falls back to the error state (AC-1923.2).
Dependencies: INT-191-02.

### FR-104 — Filter/search the report queue
Priority: Must · Source: TR-191/FR-104, UC-1924
The system SHALL provide status tabs, a content-type select, and free-text search,
combining as AND.
AC:
- Given status + type + search are all applied, Then results satisfy all three
  conditions (AC-1924.4).
- Given filters yield zero results while the queue is non-empty, Then the
  empty-filtered variant renders, never the positive-tone empty-pending copy
  (AC-1924.5).
Dependencies: INT-191-02.

### FR-105 — Report detail sheet
Priority: Must · Source: TR-191/FR-105, UC-1925
The system SHALL open a focus-trapped detail sheet on row click showing full
content, context, reporter/reason/note, duplicate list, and resolve-info when
resolved.
AC:
- Given the fetch succeeds for a pending report, Then the sheet shows both Dismiss
  and Gỡ nội dung action buttons (AC-1925.2).
- Given the fetch returns 404, Then the sheet shows inline error and does NOT
  render stale/cached data (AC-1925.4).
Dependencies: INT-191-03.

### FR-106 — Dismiss a report (non-destructive)
Priority: Must · Source: TR-191/FR-106, UC-1926
The system SHALL let a principal dismiss a pending report from the detail sheet
footer, only when `status === "pending"`.
AC:
- Given a pending report, When "Bỏ qua" is clicked, Then on success `status →
  "dismissed"`, toast "Đã bỏ qua báo cáo", audit entry recorded (AC-1926.1).
- Given `status !== "pending"`, Then the "Bỏ qua" button is not rendered at all
  (AC-1926.3).
Dependencies: INT-191-04.

### FR-107 — 4/5 required UI states w/ empty variants
Priority: Must · Source: TR-191/FR-107, UC-1927
The system SHALL render loading (`EduSkeleton`, 5 rows), empty-positive
("Không có báo cáo nào chờ xử lý"), empty-filtered ("Không tìm thấy báo cáo nào"),
error (`EduError` + retry), success — exactly one visible at a time.
AC:
- Given the pending tab is active and the unfiltered queue truly has zero reports,
  Then the positive-tone empty state renders (AC-1927.2).
- Given any of the 5 states is showing, Then no other primary state is
  simultaneously visible (AC-1927.6).
Dependencies: INT-191-02.

### FR-108 — Remove-content (destructive, confirm-gated, HIGH-RISK)
Priority: Must · Source: TR-191/FR-108, UC-1928
The system SHALL role-gate the destructive Remove-content action to `principal`
ONLY (Ba-Lead Decision) and require an explicit confirm dialog
(`role="alertdialog"`, focus-trapped) stating irreversibility + author-notification,
before executing.
AC:
- Given the current user is `principal`, When viewing a pending report's detail
  sheet, Then "Gỡ nội dung" renders; given any other role reaches this screen by
  any means, Then the entry point is not rendered (AC-1928.1).
- Given the DELETE call returns 403 FORBIDDEN/NOT_PRINCIPAL, When the response
  returns, Then the confirm dialog shows a DISTINCT inline error with explicit
  permissions-problem copy, content remains NOT removed anywhere in the UI, the
  dialog stays open, and NO retry button is shown — this MUST be visibly/
  semantically different from the transient-error path (AC-1928.6, the central
  high-risk AC).
- Given a retryable transient failure, Then the confirm dialog shows an inline
  error WITH a retry button, content stays not-removed until success (AC-1928.7).
- Given any failure, Then the failure-union mapping branches strictly on
  `error.code`, never `error.message` — code-review-verifiable, not just runtime-
  observable (AC-1928.9).
Dependencies: INT-191-05.

### FR-109 — Read-only audit log
Priority: Must · Source: TR-191/FR-109, UC-1929
The system SHALL provide a "Nhật ký kiểm duyệt" tab showing a reverse-chronological
timeline of moderation actions (actor, action badge, content ref, timestamp, reason).
AC:
- Given the fetch succeeds, Then entries render reverse-chronological with
  icon+text action badges, never color-only (AC-1929.2).
- Given any entry, Then no action control (edit/delete/undo) is rendered anywhere
  in this tab (AC-1929.6).
Dependencies: INT-191-07.

### FR-110 — Duplicate-report visibility
Priority: Should · Source: TR-191/FR-110, UC-1930
The system SHALL show a duplicate-report count/list in the detail sheet when a
content item has >1 report.
AC:
- Given `contentId` has ≥2 reporters, When the sheet opens, Then a duplicate
  section renders with a header count and a reporterName/createdAt list
  (AC-1930.1).
- Given exactly 1 report, Then the section is omitted or shows a "0" state without
  an empty-list placeholder (AC-1930.2).
Dependencies: bundled in INT-191-03 response (no separate fetch).

## 4. Non-Functional Requirements

| NFR | Requirement | Measurable target | QA verification |
| --- | --- | --- | --- |
| NFR-101 Security | Remove-content is destructive, audit-logged; role-gated server-side (not just UI-hidden); requires explicit confirmation; writes an immutable audit entry on every remove/dismiss | 100% of remove/dismiss actions produce a retrievable audit-log entry via `GET /api/v1/rooms/{roomId}/moderation-audit`; zero client-only trust — server rejects unauthorized calls with a distinct error code | Integration test asserting audit entry exists post-action + 403 branches on `error.code` |
| NFR-102 Accessibility | Detail sheet + confirm dialog correctly focus-trapped (Tab loop, Escape, return-focus-on-close); status badges icon+text not color-only; destructive button visually/semantically distinct | WCAG 2.1 AA; axe/impeccable zero critical violations on both dialogs | `fe-accessibility-auditor` audit on both dialogs |
| NFR-103 Responsive | Report table collapses to stacked cards on narrow viewports; detail sheet usable at 375px | No layout break at 320px; table→card switch verified ≤760px | Storybook viewport addon + manual check |
| NFR-104 i18n | All static copy from `moderation.*` namespace; `reportDialog.*` is the SINGLE source — no duplicate keys under `feed.*`/`messaging.*` | 0 hardcoded strings; 0 duplicate report-dialog key sets across namespaces | grep check before merge + `bunx tsc --noEmit` |
| NFR-105 Performance | Queue loading state appears promptly; filter/search feels immediate | Skeleton visible ≤320ms; filter re-render ≤150ms perceived (client-side filtering) | Manual/perf trace |

## 5. UI States & Flows

| Surface | Loading | Empty | Error | Success |
| --- | --- | --- | --- | --- |
| Queue | `EduSkeleton` 5 rows | positive (pending, truly zero) vs filtered (narrowed to zero) — two DISTINCT variants, never conflated | `EduError` + retry (whole-screen fallback if stat/base fetch fails) | table (or stacked cards ≤760px) with working filters |
| Detail sheet | skeleton/spinner while INT-191-03 loads | n/a | inline error, no stale render (404); inline error + retry (transient) | full content/context/reporter/reason/duplicates; resolve-info section instead of footer when resolved |
| Dismiss | button `aria-busy` | n/a | 409 → inline error + refetch; 403 → distinct message, no retry; transient → inline error + retry, status unchanged | toast "Đã bỏ qua báo cáo", audit entry, stat/queue refetch |
| Remove (confirm dialog) | confirm button `aria-busy`, content NEVER shown removed until success | n/a | 403 → distinct permissions copy, no retry, dialog stays open; 409 → distinct message, dialog closes, refetch; transient → inline error WITH retry | toast "Đã gỡ nội dung và thông báo cho người đăng", row → removed, audit entry |
| Audit log tab | `EduSkeleton` | simple empty (no positive/filtered split needed) | `EduError` + retry (transient); distinct "không có quyền" (403, defense-in-depth) | reverse-chronological timeline, read-only |
| Report dialog (shared) | submit `aria-busy` | n/a (always has content passed in) | 422 → inline field error, no toast; transient → inline error + retry, no toast; 409 → inline informational message | toast "Đã gửi báo cáo. BGH sẽ xem xét.", dialog closes, content stays visible |

**Role variants:** the entire Moderation screen (stat row, queue, detail sheet,
dismiss, remove, audit log) is principal-only — no other role variant exists for
this surface. The shared `ReportContentDialog` has no role variant of its own
beyond "not the content's own author" (any authenticated role else).

## 6. Data & Integration

Full endpoint catalogue: `integration.md` INT-191-01…07 (this section summarizes).
Services: `social` (6 FE-facing endpoints) + `noti` (server-side side effect only,
no direct FE call). Auth: Bearer token via httpOnly-cookie hybrid flow (decision
`0018`).

| INT ID | Endpoint | Role required | Error → UI mapping |
| --- | --- | --- | --- |
| INT-191-01 | `POST /api/v1/reports` | any role except content's own author | 422→inline field error; transient→inline error+retry, no toast; 409 ALREADY_REPORTED→inline info message |
| INT-191-02 | `GET /api/v1/reports` | principal only | transient→`EduError`+retry; 403→distinct "không có quyền", no retry; empty→positive vs filtered variant (compare against `stats.pendingCount`) |
| INT-191-03 | `GET /api/v1/reports/{reportId}` (inferred, unconfirmed) | principal only | 404→sheet inline error, no stale render; transient→inline error+retry |
| INT-191-04 | `POST /api/v1/reports/{reportId}/resolve` (`action:"dismiss"`) | principal only, `status===pending` | 409→inline error+refetch, no overwrite; 403→distinct message, no retry; transient→inline error+retry, status unchanged |
| INT-191-05 | `DELETE .../moderate-delete` (canonical, shared w/ US-E19.1) | **principal ONLY**, `status===pending` | 403/NOT_PRINCIPAL→distinct permissions error, NO optimistic remove, no retry; 409→distinct message, dialog closes, refetch; transient→inline error WITH retry |
| INT-191-06 | Notify author on removal (`noti`, server-side side effect) | n/a — no direct FE call | n/a — fire-and-forget from FE's view |
| INT-191-07 | `GET /api/v1/rooms/{roomId}/moderation-audit` | principal only | transient→`EduError`+retry; 403→distinct "không có quyền", no retry |

PII/Confidential: `reporterId`/`reporterName`, `reason`/`note`/`resolveNote` are
**Confidential** — principal-only, must not leak to non-principal client caches.
`authorId`/`authorName` on the reported-content reference are Internal.

## 7. Use Case Summary

| UC ID | Title | FR coverage | AC count |
| --- | --- | --- | --- |
| UC-1921 | Open the shared Report dialog | FR-101 | 6 |
| UC-1922 | Submit a report | FR-102 | 7 |
| UC-1923 | View moderation stat row | FR-103 | 3 |
| UC-1924 | Filter/search the report queue | FR-104 | 5 |
| UC-1925 | Open report detail sheet | FR-105 | 7 |
| UC-1926 | Dismiss a report | FR-106 | 6 |
| UC-1927 | Queue UI states | FR-107 | 6 |
| UC-1928 | Remove reported content (HIGH-RISK) | FR-108 | 9 |
| UC-1929 | View moderation audit log | FR-109 | 6 |
| UC-1930 | View duplicate-report list | FR-110 | 2 |

## 8. Constraints & Assumptions

**Technical constraints:**
- No published `openapi.yaml` for `social` — all REAL-status endpoints inferred
  from DR-013 + design-spec field names; confirm `reason` enum values, `resolveNote`
  required/optional (both dismiss and remove), and the stats delivery mechanism
  (embedded vs separate endpoint) with BE before implementation.
- `INT-191-07`'s `roomId` path param naming suggests a messaging-originated
  contract — confirm what value FE passes for feed/moderation audit scope before
  `fe-state-engineer` designs the query key.

**Confirmed assumptions:**
- [ASSUMPTION] "resolved this week" is server-calculated; exact boundary (rolling
  7 days vs calendar week) left to BE contract.
- [ASSUMPTION] Only one principal-moderation workflow per tenant — no multi-level
  escalation in this story.
- **Resolved (not an open assumption anymore):** `admin` is NOT an actor for this
  route — see Ba-Lead Decision in §2.

**[GAP]/[CONFLICT]/[OPEN QUESTION] (carried forward, not resolved here):**
- `[OPEN QUESTION]` Does Remove-content need a moderator resolution note distinct
  from the original report's reason, and is it required or optional? `resolveNote`
  currently appears mock/seed-only in design-spec — affects AC-1928.2's confirm-
  dialog fields.
- `[OPEN QUESTION]` Duplicate self-report handling (409 CONFLICT on INT-191-01) —
  whether the dialog auto-closes with the informational message or requires
  explicit dismissal; recommend explicit dismissal (consistent with "no toast on
  non-success paths") but this is a product-UX call, not decided here.
- `[OPEN QUESTION]` INT-191-03 (report detail) path/existence is unconfirmed
  against a published contract — if BE confirms detail is derivable client-side
  from the list response instead, UC-1925's loading AC may collapse to
  instant-render.
- `[OPEN QUESTION]` `INT-191-07`'s `roomId` naming/scope-value ambiguity (see
  Technical constraints above) — escalate to BE/`ba-lead` before query-key design.
- `[OPEN QUESTION]` Whether "resolved this week" is rolling 7-day or calendar
  week — needs an ADR per lane rules if it changes anything observable.
- `[OPEN QUESTION]` Search input max-length for the queue free-text search — not
  specified anywhere; low-risk if it exists, flag to BE if a hard limit is enforced.

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | Priority |
| --- | --- | --- | --- | --- |
| FR-101 Shared Report dialog | TR-191/FR-101 | UC-1921 | none (component contract) | Must |
| FR-102 Submit a report | TR-191/FR-102 | UC-1922 | INT-191-01 | Must |
| FR-103 Stat row | TR-191/FR-103 | UC-1923 | INT-191-02 | Must |
| FR-104 Filter/search queue | TR-191/FR-104 | UC-1924 | INT-191-02 | Must |
| FR-105 Detail sheet | TR-191/FR-105 | UC-1925 | INT-191-03 | Must |
| FR-106 Dismiss | TR-191/FR-106 | UC-1926 | INT-191-04 | Must |
| FR-107 4/5 UI states | TR-191/FR-107 | UC-1927 | INT-191-02 | Must |
| FR-108 Remove-content (HIGH-RISK) | TR-191/FR-108 (Ba-Lead Decision, decision `0022`) | UC-1928 | INT-191-05 | Must |
| FR-109 Audit log | TR-191/FR-109 | UC-1929 | INT-191-07 | Must |
| FR-110 Duplicate-report | TR-191/FR-110 | UC-1930 | INT-191-03 (bundled) | Should |
| NFR-101 Security (audit + server-gate) | TR-191/NFR-101 | UC-1928 | INT-191-05, INT-191-07 | Must |
| NFR-102 Accessibility | TR-191/NFR-102 | UC-1921, UC-1925, UC-1928 | none | Must |
| NFR-103 Responsive | TR-191/NFR-103 | UC-1924, UC-1925 | none | Must |
| NFR-104 i18n | TR-191/NFR-104 | all UCs | none | Must |
| NFR-105 Performance | TR-191/NFR-105 | UC-1924, UC-1927 | INT-191-02 | Should |

## 10. Handoff to FE

**What `fe-lead` should build:** the shared `ReportContentDialog` at
`src/components/shared/report-content-dialog/` (composed component, ≥2 consumers
per `component-organization.md`) with `moderation.reportDialog.*` i18n, PLUS a
net-new `src/features/moderation/` module (Clean Architecture: domain use-cases
for submit-report/dismiss/remove-content; infrastructure repository against
`social` INT-191-01…05/07; presentation `ModerationScreen` per
`design_src/edu/moderation.jsx`) wired at `(app)/principal/moderation`. Land this
story FIRST (or, if run in parallel, build the shared dialog + `moderation`
namespace ONLY on this branch) so US-E19.1 can import an already-existing contract.

**Suggested lane:** high-risk (already assigned) — Remove-content is destructive/
irreversible/audit-critical and role-gate-sensitive; any authorization-rule change
here (beyond the Ba-Lead Decision already applied) needs an ADR (`docs/decisions/NNNN-*.md`,
next ≥ `0023`) before `/fe` implements it.

**Build from:** `design_src/edu/moderation.jsx` (`ModerationScreen`) +
`design_src/edu/ui.jsx` (`ReportContentDialog`, `REPORT_REASONS`),
`docs/product/design-spec.jsonc` → `screens.moderation` (incl. `reportDialog`
sub-entry), this spec (`spec.md`).

**Proof owed (maps to TEST_MATRIX rows):**

| Layer | Expected proof |
| --- | --- |
| Unit | Domain use-cases (submit-report, dismiss, remove-content) + failure-union mapping (forbidden/already-resolved/transient), mock repository |
| Integration | Repository↔HTTP contract tests for INT-191-01…07; an EXPLICIT test proving the 403-vs-transient failure branch reads `error.code`, never `error.message` (NFR-101 — this is the story's single most important proof point) |
| E2E | Storybook interaction stories: dialog open/reason-select/"Khác"-note/submit/cancel/focus-trap; stat row success + whole-screen error fallback; filter/search combinations + both empty variants distinctly; detail sheet pending/resolved/404/transient; dismiss happy/conflict/forbidden/transient; remove happy/forbidden(non-retryable)/conflict/transient(retryable) with an explicit assertion that content is never shown removed before server success; audit log read-only + empty; duplicate list present/absent |
| Platform | Manual keyboard-only pass: both dialogs' Tab loop, Escape, focus-return-on-close |
| Release | High-risk gate: confirm an audit-log entry is retrievable end-to-end for every remove/dismiss performed during QA, before sign-off |
