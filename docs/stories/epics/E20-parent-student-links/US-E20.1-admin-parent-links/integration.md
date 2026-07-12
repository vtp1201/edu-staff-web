# US-E20.1 — Integration Map (Admin Parent–Student Link Management)

Per `.claude/rules/api-integration.md` (service map decision `0017`) + DR-014.
Actor: `admin` (route-gated `(app)/admin/parent-links`, decision `0022`/`0024`).
Lane: **high-risk** (ba-lead decision, FR-007 Unlink = authorization-adjacent
data-visibility mutation).

## 1. Integration Overview

- **Endpoints consumed by this screen: 6** (4 `core` + 2 lookup for the
  create-link comboboxes).
- **Services touched:** `core` (parent-student-links + consents display),
  `iam` (parent-member lookup).
- **Real vs mock-first:** **ALL 6 are MOCK-FIRST.** Confirmed by grepping
  existing `src/bootstrap/endpoint/*.ts` — every already-implemented `core`
  feature in this repo (`discipline.endpoint.ts`, `academic-records.endpoint.ts`,
  `audit-log.endpoint.ts`, `admin-roster.endpoint.ts`) carries a
  `mock-first until the core service ships` comment and routes through
  `/core/api/v1/...` paths that only exist as *planned* contracts, never a
  live edu-api service. There is no local edu-api checkout to cross-reference
  (`openapi.yaml` not found in this repo or a sibling path), which matches
  `.claude/rules/api-integration.md`'s explicit statement: "`core`/`lms`/`social`
  **chưa tồn tại**". No exception found for parent-student-links.
  `iam` IS built (auth/tenant/member endpoints are real, e.g.
  `IAM_MEMBER_EP.members(tenantId)`), but see INT-006 below — no endpoint
  variant with query/role-filter semantics for a search-as-you-type combobox
  exists yet, so it is ALSO treated as mock-first for this story pending an
  `iam` contract confirmation.
- **Risk notes:** Unlink (INT-003) is the highest-risk endpoint — it is a
  destructive authorization-adjacent mutation (removes another user's
  data-visibility grant). Per ba-lead's high-risk lane decision, its AC set
  must include a **server-side enforcement assertion** (role check + tenant
  scope check happen at the API boundary, not just the client confirm
  dialog) once `core` ships. Until then, the mock repository must still
  reject a simulated cross-tenant/non-admin call to make that assertion
  testable pre-BE.

## 2. Endpoint Catalogue

```
INT-001  List parent-student links
Service: core    Method+Path: GET /api/v1/parent-student-links
Status: MOCK-FIRST (core service not built — decision 0014; no openapi.yaml found)
Protected: yes   Role required: admin
Request (outbound, camelCase):
  q — free-text search matched against student name or parent name | Internal
  classId — optional class filter ("all" omits the param) | Internal
  cursor — opaque pagination cursor | Internal
  limit — page size (client default, e.g. 20) | Internal
  (tenantId is NOT sent by the client — resolved server-side from the
   authenticated admin's session per NFR-008)
Response payload (inbound, after envelope unwrap):
  items[] —
    linkId — string, stable id | Internal
    student.memberId / student.fullName / student.avatarUrl / student.className — Confidential (PII, minor)
    parent.memberId / parent.fullName / parent.avatarUrl / parent.phone — Confidential (PII)
    relationship — "father" | "mother" | "guardian" | Internal
    consentStatus — "agreed" | "pending" | "declined" — aggregate of the 3
      category consents this link's parent has set (see [OPEN QUESTION] below
      on whether this aggregate is server-computed or client-derived) | Confidential
    note — optional free text | Confidential
    linkedOn — ISO-8601 date | Internal
Pagination: cursor (meta.pagination.nextCursor / hasMore)
Errors → UI behavior:
  - FORBIDDEN_ACTION / 403 → non-admin actor → redirect to actor's own workspace (server-side, NFR-007), not just hidden button
  - NETWORK_ERROR / 5xx / timeout → generic error state with retry button (FR-009)
  - empty items[], no active search/filter → per-class empty state + create-link CTA (FR-008 variant A)
  - empty items[], search/filter active → filtered-empty state + "clear filters" action (FR-008 variant B)
Empty / loading expectation: skeleton, 5 rows (NFR-005), while in flight; two
  distinct empty variants per FR-008 (server returning items:[] does not by
  itself distinguish them — the UI decides using its own active-filter state,
  not a server flag).

INT-002  Create parent-student link
Service: core    Method+Path: POST /api/v1/parent-student-links
Status: MOCK-FIRST (core service not built)
Protected: yes   Role required: admin
Request (outbound, camelCase):
  studentId — selected student memberId | Confidential
  parentId — selected parent memberId (must hold parent role in tenant, FR-010) | Confidential
  relationship — "father" | "mother" | "guardian" | Internal
  note — optional free text | Confidential
Response payload (inbound): the created link, same shape as one INT-001 item,
  with consentStatus = "pending" (a consent request is implicitly created —
  see US-E20.2 INT-002/003 for the record this seeds)
Pagination: none
Errors → UI behavior:
  - LINK_ALREADY_EXISTS (assumed code, [OPEN QUESTION] exact code TBD by core
    team) / 409 → inline dialog error "Liên kết đã tồn tại" (FR-004), dialog
    stays open, no new row
  - VALIDATION_ERROR / 422 → per-field inline error (error.fields[]) on the
    combobox/select that failed (e.g. parentId not parent-role)
  - FORBIDDEN_ACTION / 403 → dialog closes, redirect (should not normally be
    reachable — route already role-gated — but server must still enforce)
  - NETWORK_ERROR / 5xx → dialog stays open, inline/toast error, retry submit (FR-005)
Empty / loading expectation: submit button shows pending/disabled state while
  in flight; dialog does not close until success.

INT-003  Unlink (remove) a parent-student link
Service: core    Method+Path: DELETE /api/v1/parent-student-links/{linkId}
Status: MOCK-FIRST (core service not built)
Protected: yes   Role required: admin   ⚠ HIGH-RISK (data-visibility revocation for another user)
Request (outbound): path param linkId only; no body
Response payload (inbound): 204/empty on success (or `{ linkId }` echo — TBD by core team)
Pagination: none
Errors → UI behavior:
  - RESOURCE_NOT_FOUND / 404 → link already removed (race) → toast "already removed", row disappears anyway, table refetches
  - FORBIDDEN_ACTION / 403 → confirm dialog reopens with error; row NOT removed; this is the server-side half of the high-risk assertion (client confirm dialog is not sufficient authorization on its own)
  - NETWORK_ERROR / 5xx → confirm dialog stays open (or reopens) with error, link not removed (FR-007 errorConditions)
Empty / loading expectation: confirm button shows pending state; dialog is
  the ONLY path to trigger this call — no optimistic client-only removal
  before server confirms (high-risk lane requirement).

INT-004  Read consent status per link (detail dialog + table display)
Service: core    Method+Path: GET /api/v1/parent-student-links/consents
Status: MOCK-FIRST (core service not built)
Protected: yes   Role required: admin (read-only — FR-012, cannot write from this screen)
Request (outbound): linkId (or studentId+parentId pair) — [OPEN QUESTION]
  exact query shape; this story only ever needs read access scoped to the
  links already returned by INT-001, so it MAY be unnecessary as a separate
  call if INT-001's payload already inlines the aggregate `consentStatus`
  (recommended — avoids an N+1 fetch per row). Recommend: INT-001 inlines
  consentStatus directly; this endpoint is reserved for the detail dialog if
  it needs the 3 individual category booleans (discipline/absence/grades) —
  same underlying record edited in US-E20.2 (see that story's INT-002/003).
Response payload (inbound): consent record per (studentId, parentId) —
  disciplineAlerts / absenceAlerts / gradeAlerts — booleans | Confidential
Pagination: none
Errors → UI behavior:
  - NETWORK_ERROR / 5xx → detail dialog shows section-scoped error, dialog
    itself still opens (does not block viewing student/parent/relationship/note)
Empty / loading expectation: inline skeleton within the detail dialog while resolving.

INT-005  Student search (create-link dialog combobox)
Service: core    Method+Path: none confirmed — [OPEN QUESTION], see below
Status: MOCK-FIRST (no core endpoint exists at all, same posture as the
  already-implemented roster feature's `ROSTER_EP.searchPool` — TR-033,
  `src/bootstrap/endpoint/admin-roster.endpoint.ts` — which documents "Search
  pool ... is mock-first ... No core endpoint exists for this query yet")
Protected: yes   Role required: admin
Request (outbound, camelCase): q — free-text query (name); classId — optional narrow-by-class | Internal
Response payload (inbound): candidates[] — memberId, fullName, avatarUrl, className | Confidential (PII, minor)
Pagination: none (small typeahead result set, cap e.g. 20, no cursor)
Errors → UI behavior:
  - NETWORK_ERROR → combobox shows inline "không tải được danh sách" + retry, dialog stays open
Empty / loading expectation: combobox shows spinner while typing-debounced
  query in flight; "không tìm thấy" empty option row when 0 candidates.

INT-006  Parent search (create-link dialog combobox, restricted to parent role)
Service: iam    Method+Path: GET /iam/api/v1/tenants/{tenantId}/members (candidate anchor)
Status: MOCK-FIRST for THIS story's search-as-you-type UX — see rationale.
  `IAM_MEMBER_EP.members(tenantId)` (`src/bootstrap/endpoint/iam-member.endpoint.ts`)
  IS a real, already-wired `iam` endpoint (`IamMemberRepository` in
  `src/features/auth/infrastructure/repositories/iam-member.repository.ts`),
  but every current caller uses it as a full tenant-member list/add/remove
  surface (US-E06.4), not a `?q=&role=parent` query-filtered typeahead. No
  repository in this repo demonstrates a real search-by-name+role-filter
  call against `iam`. Grepped `src/features/messaging/**` for a reusable
  "contact search" pattern (create-group-modal, add-members-modal,
  new-conversation-modal all reference "search") — these are `social`
  service, mock-first (`MESSAGING_EP.contacts`), not `iam`, so NOT a reusable
  real-endpoint pattern either.
Protected: yes   Role required: admin
Request (outbound, camelCase): q — free-text query; role — fixed "parent" (server-enforced, FR-010/NFR-008 — tenant scope must be server-side, never client-filtered-only) | Internal
Response payload (inbound): candidates[] — memberId, fullName, avatarUrl, phone | Confidential (PII)
Pagination: none (typeahead, cap e.g. 20)
Errors → UI behavior:
  - NETWORK_ERROR → combobox inline error + retry, dialog stays open
  - (if real iam endpoint used later) 403 → should not occur post role-gate, but treat as forbidden state + redirect
Empty / loading expectation: same as INT-005 (spinner while debounced query in flight; empty-option row).
```

## 3. Auth & Security

- Every endpoint above requires `Authorization: Bearer` (httpOnly cookie,
  server-side hybrid refresh, decision `0018`) — no client-side token
  handling in this screen.
- Route + all mutating actions (INT-002 create, INT-003 unlink) are
  role-gated to `admin` (decision `0022`), enforced by the existing
  `(app)/admin/layout.tsx` RSC guard AND (once `core` ships) the API itself —
  ba-lead's high-risk-lane ruling means INT-003 specifically needs an AC that
  asserts server-side denial of a non-admin/cross-tenant call, not just a
  client redirect.
- PII fields: student `fullName`/`avatarUrl`/`className` (minor's data,
  Confidential), parent `fullName`/`avatarUrl`/`phone` (Confidential). Search
  results (INT-005/INT-006) must be server-scoped to the admin's own tenant —
  never client-side-only filtering of a broader list (NFR-008).
- INT-003 (Unlink) is flagged high-risk: it revokes another user's (the
  parent's) access to a third party's (the student's) data. Treat with the
  same rigor as an RBAC change per ba-lead's note — no optimistic UI removal
  before server 2xx.

## 4. Mock-first plan

All 6 endpoints need mocks in a `MockParentStudentLinkRepository` (interface
`IParentStudentLinkRepository`, shared conceptually with US-E20.2 per that
story's handoff note — same underlying `ParentStudentLink`/consent entity,
independent repositories are fine but should agree on entity shape to avoid
drift). Suggested stable entity (per handoff instruction):

```ts
interface ParentStudentLink {
  linkId: string;
  studentId: string;
  studentName: string;
  studentAvatarUrl?: string;
  studentClassName: string;
  parentId: string;
  parentName: string;
  parentAvatarUrl?: string;
  parentPhone: string;
  relationship: "father" | "mother" | "guardian";
  note?: string;
  consentStatus: "agreed" | "pending" | "declined"; // aggregate of 3 categories
  linkedOn: string; // ISO date
}

interface ParentStudentConsent {
  studentId: string;
  parentId: string;
  disciplineAlerts: boolean;
  absenceAlerts: boolean;
  gradeAlerts: boolean;
}
```

Mock behaviors needed: seeded list (mix of agreed/pending/declined, ≥2
classes, ≥1 with a note), duplicate-pair rejection (FR-004), delete-by-id,
in-memory member-search candidate pools for both comboboxes (students +
parent-role-only members), simulated forbidden-role response for the
high-risk unlink AC. Guard with `NEXT_PUBLIC_USE_MOCK` in the DI factory,
matching the discipline/roster/audit-log precedent.

## 5. Open Questions

- `[OPEN QUESTION]` Exact error `code` for the duplicate-link rejection
  (FR-004) — assumed `LINK_ALREADY_EXISTS`-style UPPER_SNAKE code; needs
  confirmation once `core`'s `ERROR_CODES.md` exists.
- `[OPEN QUESTION]` Is `consentStatus` on INT-001's list items computed
  server-side as an aggregate of the 3 category booleans, or does the web
  layer derive it client-side from a separate consents fetch (INT-004)? This
  affects whether INT-004 is even needed as a distinct call for this story
  (recommend inlining into INT-001 to avoid N+1; detail dialog can still lazy
  -fetch the 3 individual booleans if the aggregate alone isn't enough detail).
- `[OPEN QUESTION]` **Unlink reversibility / audit trail** (carried over from
  requirements.md, partially addressed): grepped the existing audit-log
  feature (`src/features/audit-log/domain/entities/audit-event.entity.ts`,
  US-E12.12) — it is a real, already-implemented **generic** audit pattern
  (`AuditEvent { action: CREATE|UPDATE|DELETE|APPROVE|LOCK|SEAL|UNSEAL,
  entityType: "grade"|"conduct"|"record"|"setting", entityId, beforeValue,
  afterValue }`) with its own mock-first `core` endpoint
  (`AUDIT_LOG_EP.list`, `/core/api/v1/audit-log`, cursor-paginated). This is a
  **plausible fit** for tracking link create/delete history WITHOUT requiring
  DELETE-vs-archive semantics on `parent-student-links` itself — i.e. Unlink
  can stay a hard DELETE (simpler `core` contract), and re-linking simply
  re-creates a fresh record with `consentStatus: "pending"` (no history
  carried on the link row), while the *audit trail* of who unlinked whom and
  when lives in the separate audit-log surface. **However this requires
  extending `AuditEntityType` with a new `"parent-student-link"` variant** —
  that union is a shared domain type outside this story's scope to change
  unilaterally. Flagging to `ba-lead` as a candidate ADR-worthy decision (not
  authored here): (a) confirm CREATE/DELETE on parent-student-links should
  emit into the existing generic audit-log rather than inventing a
  link-specific history endpoint, and (b) if so, register the
  `AuditEntityType` extension. Until decided, this story's own DELETE
  contract stays a plain hard-delete with no archive field.
- `[OPEN QUESTION]` Does DELETE `/parent-student-links/{linkId}` cascade-clear
  the associated consent record server-side, or must the web layer issue a
  separate consent-clear call? Recommend BE-side cascade (simpler contract,
  avoids an orphaned consent record referencing a deleted link) — needs core
  team confirmation, not decided here.
- `[OPEN QUESTION]` INT-006's real-endpoint anchor
  (`IAM_MEMBER_EP.members(tenantId)`) has no confirmed `q`/`role` query-param
  filtering contract today — needs `iam` team confirmation (or a documented
  extension) before this can move off mock-first independent of `core`.
- `[OPEN QUESTION]` `GET /api/v1/members/{memberId}/linked-parents` (listed in
  the DR-014 task brief) is NOT consumed by this screen (E20.1 reads the full
  links list, not a per-member reverse lookup) — likely relevant to a future
  student-facing or admin-detail "who else is linked to this child" view.
  Not mapped here; flagged for whichever future story needs it.
