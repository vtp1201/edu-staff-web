# Feature Spec — Parent–Student Link Audit Trail (US-E20.3)

Status: Draft   Lane: normal
Sources: `requirements.md` (TR-E20.3, FR-101..109, NFR-101..105) ·
`integration.md` (INT-101..109) · `use-cases.md` (UC-101..107, AC-101.x..
AC-107.x, AC Coverage Summary) · `docs/product/design-spec.jsonc` →
`screens.parentLinks.detailDialog.auditTrailSection` ·
`design_src/edu/parent-links.jsx` (`PLAuditTrailSection`) · ADR
`docs/decisions/0064-audit-trail-emission-policy.md` (**binding**) ·
`docs/design-requests/DR-023-parent-link-audit-trail.md` (delivered) ·
existing implementation `src/features/admin/parent-links/**` (US-E20.1)

## 1. Scope & Objectives

**Purpose:** Show, inside the existing admin Parent–Student Link detail
dialog, a read-only, reverse-chronological history of Create/Unlink events
for that link — closing the outstanding open item from US-E20.1 (resolved by
ADR `0064`) with the exact feature-scoped shape the ADR mandates.

**In-scope:** `PLAuditTrailSection` sub-component inside the existing
`PLDetailDialog`; `LinkAuditEntry` entity + `getLinkAuditTrail` query
use-case, both feature-scoped to `src/features/admin/parent-links/`; mock
repository emission wiring inside the existing `createLink`/`unlinkLink`
methods; loading/empty/error/success states, section-scoped and
non-blocking; reuse of the 9 already-shipped
`parentLinks.detailDialog.auditTrail.*` i18n keys.

**Out-of-scope:** any change to the create/unlink dialogs themselves;
screen-level audit tab/table (rejected, DR-023 decision 1); filtering/search/
date-range UI (DR-023 decision 4, explicit YAGNI); extending the shared
`audit-log` feature's `AuditEntityType` union (ADR `0064`, hard constraint —
this ADR is the reason this story exists at all); real `core` BE wiring
(mock-first, no confirmed endpoint); edit/delete of audit entries
(append-only by design).

**Definitions:**
- **Audit entry** — one immutable record of a single Create or Unlink event
  for one `linkId` (`LinkAuditEntry`, INT-101).
- **Feature-scoped audit trail** — an entity + query use-case + mock
  repository OWNED by `src/features/admin/parent-links/`, as opposed to a
  write into the shared, BE-owned `src/features/audit-log/` display feature
  (ADR `0064` §Decision points 1–2 — the distinction this whole story exists
  to implement correctly).
- **Section-scoped state** — a loading/error condition confined to
  `PLAuditTrailSection`'s own mount point; it never surfaces as, or is caused
  by, a whole-dialog failure (mirrors `PLConsentDetailSection`, US-E20.1).

## 2. Actors & Roles

| Actor | Visibility / capability |
| --- | --- |
| `admin` | Full: opens any tenant-scoped link's detail dialog (US-E20.1 gate) and sees its full Create/Unlink history, newest first, with retry on trail-fetch failure. |
| `principal` | Same as admin — inherits the EXISTING detail-dialog role gate; no separate/new gate is introduced by this story. |
| `teacher` / `student` / `parent` | None — never reach the admin `(app)/admin/parent-links` route at all (pre-existing US-E20.1 gate, unchanged). |

No new RBAC surface. This story adds zero new authorization checks — it
inherits the dialog's existing gate and (for emission) the existing
`createLink`/`unlinkLink` HIGH-RISK re-auth (US-E20.1, unchanged).

## 3. Functional Requirements

### FR-101 — Section renders inside existing dialog, own scoped states (Must, TR-E20.3/UC-101)
The system SHALL render `PLAuditTrailSection` inside `PLDetailDialog`,
directly below `PLConsentDetailSection`, with its own loading/error/empty/
success lifecycle.
- AC: AC-101.1 — scoped skeleton, `aria-busy`, rest of dialog unaffected.
- AC: AC-101.3 — scoped `role="alert"` error + retry, rest of dialog usable.
- Dependencies: INT-101, INT-102, INT-109.

### FR-102 — Reverse-chronological list, icon+text badge, actor, timestamp (Must, UC-101)
The system SHALL list entries newest-first; each row SHALL show an icon+text
action badge (never color-only), actor display name, and a short date/time.
- AC: AC-101.4 — full `l6` create→unlink→re-create sequence renders in the
  exact newest-first order.
- Dependencies: INT-103, INT-107.

### FR-103 — Note shown only for 'created' (Must, UC-104)
The system SHALL show the optional `note` on its own muted line ONLY for a
'created' entry that has one; an 'unlinked' entry SHALL NEVER show a note.
- AC: AC — note visible + prefixed "Ghi chú" on a 'created' row with a note;
  absent entirely on 'unlinked' rows and on note-less 'created' rows.
- Dependencies: INT-101 (entity shape enforces `note: string | null`,
  `null` on every 'unlinked' entry by construction in `recordAuditEntry`).

### FR-104 — Dominant, honest empty state, no CTA (Must, UC-101)
The system SHALL show "Chưa có lịch sử ghi nhận" + explanatory body with NO
CTA when the trail has zero entries.
- AC: AC-101.2 — genuine zero-entry links (e.g. `l3`) show this state, not
  styled as an error, no button.
- Dependencies: INT-103 (seed: 4 of 6 seeded links start `[]`).

### FR-105 — Scoped, non-blocking loading skeleton (Must, UC-101)
The system SHALL show a 2-row skeleton with `aria-busy` + `sr-only` label
while the trail query is in flight.
- AC: AC-101.1, AC-106 (a11y loading scenario).
- Dependencies: INT-109 (query lifecycle).

### FR-106 — Scoped `role="alert"` error + retry (Must, UC-101)
The system SHALL show a section-scoped error banner + retry button on
trail-query failure, matching `PLConsentDetailSection`'s visual language,
without surfacing a whole-dialog error.
- AC: AC-101.3, AC-106 (a11y error scenario).
- Dependencies: INT-105 (only `network-error` is realistically returned),
  INT-109 (retry re-issues the query).

### FR-107 — Emission exactly once per successful create/unlink (Must, UC-102/UC-103)
The system SHALL record exactly one 'created' entry on `createLink` success
and exactly one 'unlinked' entry on `unlinkLink` success; a failed mutation
(any `fail(...)` branch) SHALL record nothing.
- AC: UC-102 both scenarios (success emission, already-linked failure →
  no emission); UC-103 all three scenarios (success emission, forbidden-role
  failure → no emission, forbidden cross-tenant failure → no emission).
- Dependencies: INT-103, INT-106 (actor sourcing).

### FR-108 — Trail survives unlink, independent of active-links STORE (Must, UC-103)
The system SHALL keep a linkId's audit entries readable even after the link
is removed from the active-links list.
- AC: UC-103 scenario 1 — `getLinkAuditTrail("l1")` still returns the
  'unlinked' entry after `l1` no longer appears in `listLinks()`.
- Dependencies: INT-104 (separate `AUDIT_STORE` map, never derived from or
  cleared by the active-links `STORE` array).

### FR-109 — No edit/delete/filter (Won't, explicit exclusion)
The system SHALL NOT provide edit, delete, filter, search, or date-range
controls for the audit trail.
- AC: UC-107 — negative-scope assertion; no such control exists anywhere in
  `PLAuditTrailSection`.

## 4. Non-Functional Requirements

| NFR | Requirement | Measurable target | QA verification |
| --- | --- | --- | --- |
| NFR-101 (a11y) | Icon+text action badges (never color-only); `aria-busy`+`sr-only` loading; `role="alert"`+keyboard-reachable retry on error, all section-scoped | WCAG 2.1 AA 1.4.1/4.1.3; impeccable audit reports 0 color-only-status violations in this section | Storybook a11y addon + manual keyboard/screen-reader check on all 4 states |
| NFR-102 (determinism) | `occurredAt` via injectable clock seam; array order = reverse-chronological by construction (unshift-only, no read-time sort) | unit test injects a fixed/incrementing clock and asserts exact `occurredAt` + exact array order, zero flaky time assertions | `vitest` unit test using `__setMockAuditClock` |
| NFR-103 (security/truthfulness) | `actorId`/`actorName` sourced only from the acting session's own `AuthContext`, never invented or cross-attributed | code review: traced to `AuthContext.actorId`/`actorName`, never a client-supplied or per-row-hardcoded value | code review + unit test asserting the entry's `actorId` equals the calling `authCtx.actorId` |
| NFR-104 (i18n) | All copy from the already-shipped `parentLinks.detailDialog.auditTrail.*` (9 keys), no new namespace, no duplication | `tsc --noEmit` passes; 0 net-new i18n keys required | `bunx tsc --noEmit`; diff review of `vi.json`/`en.json` (no edits expected) |
| NFR-105 (scope/architecture) | Entity/use-case/repository method live inside `parent-links`; MUST NOT touch `src/features/audit-log/` | grep: zero references from this story's new files to `audit-log` types/repository | code review + `grep -r "audit-log" src/features/admin/parent-links/` returns nothing new |

## 5. UI States & Flows

| Surface | Loading | Empty | Error | Success |
| --- | --- | --- | --- | --- |
| `PLAuditTrailSection` (INT-109 query, keyed by `linkId`) | 2-row skeleton, `aria-busy`+`sr-only` label, rest of dialog unaffected (AC-101.1) | "Chưa có lịch sử ghi nhận" + body, no CTA (AC-101.2) | `role="alert"` banner + "Thử lại" retry, section-confined; rest of dialog usable; retry re-issues the query (AC-101.3) | reverse-chron rows: icon+text action badge, actor name, short date/time, optional note-line on 'created' only (AC-101.4, FR-103) |
| Emission (create mutation) | n/a (fire-and-forget on the mutation's own success path) | n/a | mutation failure ⇒ zero audit side-effect (UC-102 scenario 2) | mutation success ⇒ exactly one new 'created' entry, immediately visible on next `getLinkAuditTrail` (UC-102 scenario 1) |
| Emission (unlink mutation, HIGH-RISK) | n/a | n/a | mutation failure (forbidden/etc.) ⇒ zero audit side-effect (UC-103 scenarios 2–3) | mutation success ⇒ exactly one new 'unlinked' entry, persists even after the link leaves the active list (UC-103 scenario 1, FR-108) |

Key flow: admin/principal opens a link's detail dialog → dialog renders
immediately from already-fetched row data → `PLConsentDetailSection` AND
`PLAuditTrailSection` each independently issue their own scoped queries →
each resolves to its own state without blocking the other or the static
rows. Separately: an admin's successful create/unlink action appends exactly
one new entry to that `linkId`'s trail, retrievable the next time the
dialog/section is opened or refetched.

## 6. Data & Integration

Per INT-10x in `integration.md`. **Fully mock-first** — no `core` endpoint
exists (ADR `0064`); no real-repository branch is exercised by this story.

| INT | Service | Method | Contract | Error→UI | Auth/role |
| --- | --- | --- | --- | --- | --- |
| INT-102 (mock) | `src/features/admin/parent-links` (feature-local, NOT `core`) | `getLinkAuditTrail(linkId): Promise<Result<LinkAuditEntry[], ParentStudentLinkFailure>>` | returns `AUDIT_STORE[linkId] ?? []`, reverse-chron by construction | thrown/unexpected exception only → `network-error`, section-scoped, non-blocking (INT-105) | inherits existing detail-dialog gate (admin/principal); no new re-auth on this read |
| INT-108 (future, non-blocking) | `core` (unconfirmed) | `GET /api/v1/parent-student-links/{linkId}/audit-trail` | envelope `data: LinkAuditEntry[]` (camelCase, matches mock shape 1:1), no pagination expected | n/a — contract-first guidance only, not built | n/a |

Entity (`LinkAuditEntry`, INT-101):

```ts
export type LinkAuditAction = "created" | "unlinked";

export interface LinkAuditEntry {
  entryId: string;
  linkId: string;
  action: LinkAuditAction;
  actorId: string;
  actorName: string;
  occurredAt: string; // ISO 8601, injectable-clock-produced
  note: string | null; // non-null only when action === "created"
}
```

`AuthContext` extension (INT-106):

```ts
export interface AuthContext {
  role: UserRole;
  tenantId: string;
  actorId: string;   // decodeSubClaim(token) — already-existing JWT helper
  actorName: string; // mock mode: fixed MOCK_ACTOR_NAME constant; real mode: OQ-101
}
```

Mock emission mechanics (INT-103/104/107, full detail in `integration.md`):
a second module-level store `AUDIT_STORE: Record<string, LinkAuditEntry[]>`
in `mock-parent-student-link.repository.ts`, seeded via `seedAuditTrail()`,
written to by `recordAuditEntry(...)` called from `createLink`/`unlinkLink`
strictly after each mutation's own success path, keyed independently of the
active-links `STORE` array so an unlinked link's history is never lost.
Deterministic via an injectable `auditClock`, test-only reset via
`__resetMockLinkAuditTrail()`/`__setMockAuditClock()`.

## 7. Use Case Summary

| UC ID | Title | FR coverage | AC count |
| --- | --- | --- | --- |
| UC-101 | View trail (loading/empty/error/success) | FR-101, FR-104, FR-105, FR-106 | 4 |
| UC-102 | Emission on successful Create | FR-107 | 2 |
| UC-103 | Emission on successful Unlink (+ trail-survives-unlink) | FR-107, FR-108 | 3 |
| UC-104 | Note only on 'created' | FR-103 | 2 |
| UC-105 | Reverse-chronological ordering + determinism | FR-102 | 2 |
| UC-106 | A11y states | NFR-101 | 3 |
| UC-107 | Append-only invariant (negative scope) | FR-109 | 1 |
| **Total** | | **all 8 Must FRs + 1 Won't FR** | **17** |

No functional requirement is UNCOVERED — see `use-cases.md` §AC Coverage
Summary for the full trace.

## 8. Constraints & Assumptions

**Technical constraints:**
- `core` service has no confirmed audit-emission endpoint (ADR `0064`) —
  fully mock-first; the real `ParentStudentLinkRepository`'s
  `getLinkAuditTrail` method is contract-first guidance only (INT-108), not
  built by this story.
- ADR `0064` is **binding** on ownership: this story's entity/use-case/
  repository method MUST live in `src/features/admin/parent-links/` and MUST
  NOT extend `src/features/audit-log/`'s `AuditEntityType` union or write
  into its repository.
- `AuthContext` gains 2 new required fields (`actorId`, `actorName`) —
  additive to `createLink`/`unlinkLink`'s existing signature (no breaking
  change to the interface's method signatures themselves, only to the
  `AuthContext` shape both already consume).

**Confirmed [ASSUMPTION]s (carried from requirements.md):**
- Role gate for the section is identical to the existing detail-dialog gate
  (admin/principal) — no new check introduced.
- No pagination modeled (DR-023 decision 4's YAGNI reasoning — a single link
  realistically has 1–2 entries).
- Mock-mode `actorName` is a fixed constant (`MOCK_ACTOR_NAME` = "Quản trị
  viên demo"), not a per-admin real display name — explicitly documented as
  a mock-only stand-in, never presented as BE-truth.

**[GAP]:** none identified beyond OQ-101 below — the AC set is otherwise
self-contained and mock-first end-to-end.

**[CONFLICT]:** none identified between requirements/integration/use-cases
inputs for this story.

**[OPEN QUESTION]s (carried forward, NOT resolved here, non-blocking):**
1. **OQ-101** — once a real `core` audit endpoint exists, what is the true
   source of `actorName` server-side (a JWT display-name claim, if `iam`
   ever adds one, vs a cached `/users/me`-style join)? Not blocking this
   story (no real repository branch is exercised); flag to whoever wires the
   real repository, analogous to how `academic-records`' real Seal endpoint
   remains pending `core` US-064.
2. Whether `/fe` additionally invalidates the audit-trail TanStack Query key
   on successful create/unlink so an ALREADY-OPEN dialog reflects the new
   entry without a manual re-open — nice-to-have per `integration.md`
   INT-109, not an AC (the dialog is typically re-opened per row, which
   already refetches fresh).

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | Priority |
| --- | --- | --- | --- | --- |
| FR-101 Section renders, own scoped states | TR-E20.3 FR-101 | UC-101 | INT-102, INT-109 | Must |
| FR-102 Reverse-chron list, badge, actor, timestamp | TR-E20.3 FR-102 | UC-101 | INT-103, INT-107 | Must |
| FR-103 Note only on 'created' | TR-E20.3 FR-103 | UC-104 | INT-101 | Must |
| FR-104 Dominant honest empty state, no CTA | TR-E20.3 FR-104 | UC-101 | INT-103 | Must |
| FR-105 Scoped non-blocking loading skeleton | TR-E20.3 FR-105 | UC-101, UC-106 | INT-109 | Must |
| FR-106 Scoped role=alert error + retry | TR-E20.3 FR-106 | UC-101, UC-106 | INT-105, INT-109 | Must |
| FR-107 Emission exactly once per success | TR-E20.3 FR-107 | UC-102, UC-103 | INT-103, INT-106 | Must |
| FR-108 Trail survives unlink | TR-E20.3 FR-108 | UC-103 | INT-104 | Must |
| FR-109 No edit/delete/filter | TR-E20.3 FR-109 | UC-107 | n/a (exclusion) | Won't |
| NFR-101 A11y icon+text/aria-busy/role=alert | TR-E20.3 NFR-101 | UC-106 | n/a | Must |
| NFR-102 Determinism (clock seam, ordering invariant) | TR-E20.3 NFR-102 | UC-105 | INT-107 | Must |
| NFR-103 Actor truthfulness | TR-E20.3 NFR-103 | UC-102, UC-103 | INT-106 | Must |
| NFR-104 i18n reuse, no new namespace | TR-E20.3 NFR-104 | all | n/a (static copy, already shipped) | Must |
| NFR-105 Feature-scoped, no audit-log union extension | TR-E20.3 NFR-105 | n/a (architectural) | n/a | Must |

## 10. Handoff to FE

`fe-lead` should build:
- **Domain:** `link-audit-entry.entity.ts` (`LinkAuditEntry`,
  `LinkAuditAction`) + `get-link-audit-trail.use-case.ts`
  (`GetLinkAuditTrailUseCase`, pure delegate) in
  `src/features/admin/parent-links/domain/`; extend
  `IParentStudentLinkRepository` with `getLinkAuditTrail(linkId)`; extend
  `AuthContext` with `actorId`/`actorName`.
- **Infrastructure (mock):** extend
  `mock-parent-student-link.repository.ts` with a second module-level
  `AUDIT_STORE` map + `seedAuditTrail()` + `recordAuditEntry()` wired into
  the existing `createLink`/`unlinkLink` success paths, an injectable
  `auditClock`, and `__setMockAuditClock`/`__resetMockLinkAuditTrail`
  test-only exports — full mechanics in `integration.md` INT-103/104/107.
  Extend `makeParentLinksAuthContext()`
  (`bootstrap/di/parent-student-link.di.ts`) to populate `actorId`
  (`decodeSubClaim`) and `actorName` (`MOCK_ACTOR_NAME` constant).
- **Presentation:** `PLAuditTrailSection` component mirroring
  `PLConsentDetailSection`'s own-state pattern exactly (loading/error/empty/
  success props, no shared state with the rest of the dialog); mount inside
  `PLDetailDialog` below `PLConsentDetailSection`; source styling/copy from
  `design_src/edu/parent-links.jsx` (`PLAuditTrailSection`) and
  `docs/product/design-spec.jsonc` →
  `screens.parentLinks.detailDialog.auditTrailSection` (component names,
  action-badge tone/icon mapping, exact tokens — normative per decision
  `0011`). Reuse the already-shipped `parentLinks.detailDialog.auditTrail.*`
  i18n keys verbatim — **zero new i18n keys expected**.
- **Wiring:** new Server Action calling
  `makeGetLinkAuditTrailUseCase()` → `GetLinkAuditTrailUseCase.execute(linkId)`
  → the EXISTING `toActionResult`/`isRetryableFailure` helpers (no new
  failure-mapping code needed, the union is unchanged); a TanStack Query key
  such as `["parent-links", "audit-trail", linkId]` per
  `parent-links.query-keys.ts`'s existing convention.

**Suggested lane:** normal (per `ba-lead` — read-only display feature, no
new mutation/auth surface; reuses the existing HIGH-RISK re-auth on the
create/unlink side unchanged; no hard-gate flag trips: no new auth/RBAC
surface, no new session/token handling, no tenant-isolation change, no PII
beyond what US-E20.1 already displays, no data loss risk, no validation
weakening).

**Proof owed (→ TEST_MATRIX row, update from `planned` once built):**
- Unit: `GetLinkAuditTrailUseCase` (delegate proof), mock repository
  `getLinkAuditTrail` (empty/seeded/post-runtime-emission cases),
  `recordAuditEntry` emission-exactly-once-on-success /
  zero-on-failure for BOTH `createLink` and `unlinkLink` (including the
  forged-role and cross-tenant forbidden cases mirroring US-E20.1's
  AC-005.5 proofs), deterministic clock/ordering test via
  `__setMockAuditClock`, note-only-on-created invariant.
- Integration: `makeParentLinksAuthContext()` actorId/actorName population;
  Server Action mapping (reuses existing `toActionResult` — assert no
  regression).
- E2E: Storybook interaction stories for all 4 section states (loading/
  empty/error+retry/success), the `l6` create→unlink→re-create ordering
  case, note-visible-on-created vs note-absent-on-unlinked, keyboard-
  reachable retry button, color-independence (icon+text) spot-check.
- Platform: `tsc --noEmit` clean with the extended `AuthContext`/
  `IParentStudentLinkRepository`; `bun run build` OK; grep confirms zero
  references to `src/features/audit-log/` from the new files (NFR-105).
- Release: design-review gate (tokens/a11y/states) — this is a small,
  pattern-reusing extension per DR-023's own self-audit, so the gate should
  be quick to clear if the component genuinely mirrors
  `PLConsentDetailSection`.
