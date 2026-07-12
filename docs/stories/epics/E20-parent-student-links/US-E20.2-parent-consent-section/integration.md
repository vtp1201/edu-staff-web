# US-E20.2 — Integration Map (Parent Notification Consent Section)

Per `.claude/rules/api-integration.md` (service map decision `0017`) + DR-014.
Actor: `parent` only, embedded into the existing Profile screen
(`src/features/user/presentation/profile/`, US-E08.5). Lane: normal (no
escalation raised for this story).

## 1. Integration Overview

- **Endpoints consumed by this screen: 2** (both `core`).
- **Services touched:** `core` only. No `iam`/`lms`/`social`/`noti` calls
  needed by this section.
- **Real vs mock-first:** **BOTH are MOCK-FIRST.** Same basis as US-E20.1:
  `.claude/rules/api-integration.md` states `core` is not built yet; no
  edu-api `openapi.yaml` exists locally to check against; every already
  -implemented `core`-backed feature in this repo (discipline, academic
  -records, audit-log, roster) is mock-first with the identical
  `/core/api/v1/...` path convention. Per this story's own handoff note, it
  shares the same underlying `ParentStudentLink`/consent entity as US-E20.1
  and should share a repository/entity shape even though the two stories
  build independently.
- **Risk notes:** low UI risk (self-service, own-data-only toggle), but the
  **security requirement is strict**: FR-004/NFR-007 both require server
  -side scoping by the authenticated parent's resolved `memberId` — the
  client must never be able to pass a different parent/child id and have the
  server honor it. This is a standard-but-non-negotiable multi-tenant/data
  -isolation requirement, not itself a lane escalation.

## 2. Endpoint Catalogue

```
INT-001  Get own linked students
Service: core    Method+Path: GET /api/v1/members/{memberId}/linked-students
Status: MOCK-FIRST (core service not built — decision 0014)
Protected: yes   Role required: parent
Request (outbound, camelCase):
  memberId — path param, but see [OPEN QUESTION] below: the requesting
  parent's OWN memberId should be resolved server-side from the
  authenticated session (Bearer token), never taken from a client-supplied
  path value at face value — the server must verify {memberId} in the path
  matches (or is derived from, e.g. "me") the authenticated principal, or
  reject with 403. This is the FR-004/NFR-007 hard requirement.
Response payload (inbound, after envelope unwrap):
  students[] —
    studentId — string | Confidential (PII, minor)
    fullName — string | Confidential
    avatarUrl — optional string | Confidential
    linkId — string (the underlying parent-student-links row this consent maps to) | Internal
Pagination: none expected (a parent's own linked-children count is small;
  no cursor needed, but confirm with core team if it should still carry
  meta.pagination for consistency with other list endpoints)
Errors → UI behavior:
  - FORBIDDEN_ACTION / 403 → should not be reachable given route role-gate,
    but if the memberId-scoping check fails server-side, treat as a hard
    section-scoped error (not a silent empty list) — a silent empty state
    here would incorrectly look identical to FR-005's "no linked children"
    and mask a security failure; UI copy/telemetry should distinguish them
  - NETWORK_ERROR / 5xx / timeout → section-scoped error state with retry
    (FR-006) — rest of Profile (personal/security/sessions tabs) unaffected
  - 200 with students: [] → empty state, "Chưa có con nào được liên kết" +
    contact-school guidance (FR-005) — distinct from the 403 case above
Empty / loading expectation: section-local skeleton (NFR-005/FR-008) while
  in flight; does not block the rest of Profile's tabs from being
  interactive.

INT-002  Get consent settings for own linked students
Service: core    Method+Path: GET /api/v1/parent-student-links/consents
Status: MOCK-FIRST (core service not built)
Protected: yes   Role required: parent
Request (outbound, camelCase): none required beyond auth — server resolves
  the authenticated parent's memberId and returns consent rows for every
  student in INT-001's result set (or this call can be inlined into INT-001's
  response instead of a second round-trip — [OPEN QUESTION] below, same
  N+1-avoidance consideration as US-E20.1's INT-004)
Response payload (inbound):
  consents[] —
    studentId — string | Confidential
    disciplineAlerts — boolean | Confidential
    absenceAlerts — boolean | Confidential
    gradeAlerts — boolean | Confidential
Pagination: none
Errors → UI behavior:
  - NETWORK_ERROR / 5xx → section-scoped error (shared error state with
    INT-001 — a parent doesn't need to distinguish "which fetch failed",
    just "the section failed", per FR-006)
Empty / loading expectation: rendered together with INT-001's child-cards;
  if consents haven't resolved yet, toggles render disabled/skeleton rather
  than a default-off/on guess (must never show an unconfirmed state as if
  persisted, echoing FR-003's "never show a toggle state that was not
  actually persisted").

INT-003  Update one consent toggle
Service: core    Method+Path: PUT /api/v1/parent-student-links/consents
Status: MOCK-FIRST (core service not built)
Protected: yes   Role required: parent
Request (outbound, camelCase) — RECOMMENDED shape (see [OPEN QUESTION],
  handoff explicitly asked this to be resolved and it is a BE contract call,
  not a web-team decision — this is a recommendation for whichever team
  authors the real `core` OpenAPI):
  studentId — which linked child | Confidential
  category — "discipline" | "absence" | "grades" | Internal
  enabled — boolean, the new value | Internal
  Rationale for one-category-at-a-time over a full-object PUT: FR-003 is an
  instant, single-toggle interaction with no batch/save-all step in the UI;
  a full-object PUT risks a stale-read-then-overwrite race if two toggles for
  the same child are flipped in quick succession (each optimistic UI update
  would need to know the other's in-flight value). A per-toggle PUT (or PATCH
  — verb choice is BE's call) avoids that class of bug entirely.
Response payload (inbound): the updated consent row (studentId +
  disciplineAlerts/absenceAlerts/gradeAlerts) — echoing the confirmed
  persisted state back lets the UI reconcile without re-fetching INT-002.
Pagination: none
Errors → UI behavior:
  - VALIDATION_ERROR / 422 or NETWORK_ERROR / 5xx → toggle reverts to its
    prior (last-confirmed) value; error surfaced via toast (or inline —
    [OPEN QUESTION], see below); FR-003 explicitly forbids ever showing an
    unconfirmed toggle state as if persisted
  - FORBIDDEN_ACTION / 403 → should not be reachable (own-data-only mutation,
    server resolves memberId) but if server rejects due to a scoping
    mismatch, treat identically to the generic failure path above — revert +
    error, never a silent no-op
Empty / loading expectation: toggle shows a brief pending/disabled state
  while the request is in flight (optimistic-with-rollback pattern); no
  confirm modal per FR-003 (explicit DR instruction — do not add one).
```

## 3. Auth & Security

- All 3 endpoints require `Authorization: Bearer` (httpOnly cookie, hybrid
  refresh, decision `0018`); no client-side token handling.
- Section + INT-003's mutation are gated to `parent` role only (NFR-007).
  Per this story's assumption, on the shared `(app)/(shared)/profile` route
  the section must not render at all for teacher/principal/student sessions
  — server-driven (ViewModel only populates `parentConsent` when
  `role === "parent"`), not a client-side `if` that still ships the data.
- **PII / data isolation is the core security requirement here**: every
  read/write must be scoped server-side to the authenticated parent's own
  resolved `memberId` — client-supplied ids (if any leak into a future
  implementation detail) must never be trusted. This mirrors the identical
  concern already called out for US-E20.1's INT-005/INT-006 (server-side
  tenant scoping) — same posture, narrower scope (own-record-only vs
  own-tenant-only).
- Fields flagged Confidential: `studentId`/`fullName`/`avatarUrl` (minor PII),
  the 3 consent booleans (Confidential — reveal a family's notification
  preferences, which is sensitive in aggregate even though individually
  simple booleans).

## 4. Mock-first plan

Shares the `ParentStudentConsent` shape defined in US-E20.1's integration.md
(`docs/stories/epics/E20-parent-student-links/US-E20.1-admin-parent-links/integration.md`,
§4) — reuse rather than redefine:

```ts
interface ParentStudentConsent {
  studentId: string;
  parentId: string; // resolved server-side; mock can hardcode "self"
  disciplineAlerts: boolean;
  absenceAlerts: boolean;
  gradeAlerts: boolean;
}

interface LinkedStudentSummary {
  studentId: string;
  fullName: string;
  avatarUrl?: string;
  linkId: string;
}
```

Mock behaviors needed: seeded 0-children case (empty state), 1–3 children
case (typical), a simulated save failure on one toggle to exercise the
revert+error path (FR-003 errorConditions), independent of US-E20.1's mock
(these are 2 separate mock repositories per the handoff — "independent to
build" — but SHOULD agree on field names to avoid drift if/when a shared
`core` service eventually backs both). Guard with `NEXT_PUBLIC_USE_MOCK`,
matching existing precedent (discipline/roster/academic-records/audit-log).

## 5. Open Questions

- `[OPEN QUESTION]` (carried from requirements.md, unresolved here —
  genuinely a BE-contract decision) Does `PUT /parent-student-links/consents`
  take one category at a time or a full per-child consent object? Section 2
  above documents a **recommendation** (per-toggle, to avoid a race between
  near-simultaneous toggles) but this must be confirmed against the actual
  `core` OpenAPI once authored — not decided unilaterally by this analysis.
- `[OPEN QUESTION]` Should INT-002 (read consents) be a separate call from
  INT-001 (linked students), or should `core` inline the 3 consent booleans
  directly into each item of the linked-students response? Recommend
  inlining (avoids a second round-trip + avoids a race between the two
  fetches resolving at different times) — flagging to whichever team designs
  the real `core` contract.
- `[OPEN QUESTION]` (from requirements.md, left for `ba-use-case-modeler` per
  that story's own handoff) Does a save failure on toggle need a distinct
  retry affordance beyond revert+toast, or is revert+toast alone sufficient?
  Not resolved here — explicitly deferred to AC-modeling per the
  requirements doc itself.
- `[OPEN QUESTION]` Exact error code(s) `core` will use for a consent-update
  failure (e.g. `VALIDATION_ERROR` vs a bespoke `CONSENT_UPDATE_FAILED`) —
  unknown until `core`'s `ERROR_CODES.md` exists; document as generic
  "failure → revert + error" in the meantime (any error code maps to the same
  UI behavior here, so this does not block AC-writing).
- `[OPEN QUESTION]` `GET /api/v1/members/{memberId}/linked-parents` (from the
  DR-014 task brief) is NOT consumed by this screen either (a parent views
  their OWN linked children, not a reverse "who are this child's parents"
  lookup) — not mapped here, same note as in US-E20.1's integration.md.
