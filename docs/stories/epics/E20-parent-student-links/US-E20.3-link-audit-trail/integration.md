# US-E20.3 — Parent–Student Link Audit Trail — Integration Analysis

Governing: ADR `0064` (feature-scoped audit-trail policy, **binding** on
ownership — do NOT extend `src/features/audit-log/`'s `AuditEntityType`).
`core` has **no** confirmed audit-emission endpoint for parent-student-links
(ADR `0064` §Context, US-064 placeholder is for the seal case only, not this
one) → this story is **mock-first, no real repository branch exercised**,
matching decision `0014`.

## INT-101 — `LinkAuditEntry` entity (domain, new)

`src/features/admin/parent-links/domain/entities/link-audit-entry.entity.ts`:

```ts
export type LinkAuditAction = "created" | "unlinked";

export interface LinkAuditEntry {
  entryId: string;
  linkId: string;
  action: LinkAuditAction;
  actorId: string;
  actorName: string;
  occurredAt: string; // ISO 8601, produced by the repository's injectable clock
  note: string | null; // populated ONLY for action === "created"
}
```

Mirrors `SealAuditEntry`'s shape convention (own entity, own optional-fields
discipline) — see `src/features/academic-records/domain/entities/seal-batch.entity.ts`.
No `tenantId`/`ipAddress`/`deviceInfo` fields — not captured by any mutation
today, not invented (DR-023 explicit exclusion).

## INT-102 — repository contract addition

Extend `IParentStudentLinkRepository`
(`src/features/admin/parent-links/domain/repositories/i-parent-student-link.repository.ts`):

```ts
getLinkAuditTrail(linkId: string): Promise<PSLResult<LinkAuditEntry[]>>;
```

Reuses the existing `ParentStudentLinkFailure` union (no new failure type).
**Only `network-error` is realistically returned** by this query — see
INT-105 for why `not-found`/`forbidden` are NOT modeled for this read.

New query use-case
`src/features/admin/parent-links/domain/use-cases/get-link-audit-trail.use-case.ts`,
a pure delegate exactly like `GetLinkConsentDetailUseCase`:

```ts
export class GetLinkAuditTrailUseCase {
  constructor(private readonly repo: IParentStudentLinkRepository) {}
  execute(linkId: string): Promise<Result<LinkAuditEntry[], ParentStudentLinkFailure>> {
    return this.repo.getLinkAuditTrail(linkId);
  }
}
```

## INT-103 — emission mechanics (mock-first, THE central engineering question)

**Where entries live.** Add a SECOND module-level mutable store in the SAME
file, `mock-parent-student-link.repository.ts` — do not split into a sibling
file, since the two mutation methods that write to it (`createLink`,
`unlinkLink`) already live in this file and a cross-file mutable coupling
would be strictly worse for locality:

```ts
// Keyed by linkId; NOT derived from / cleared alongside the active-links
// STORE array — see INT-104 (trail survives unlink).
let AUDIT_STORE: Record<string, LinkAuditEntry[]> = seedAuditTrail();
let AUDIT_ID_SEQ = 0;
let auditClock: () => string = () => new Date().toISOString();

/** Test-only: override the clock for deterministic occurredAt assertions. */
export function __setMockAuditClock(clock: () => string): void {
  auditClock = clock;
}

/** Test-only: restore seed + clock + id counter between tests. */
export function __resetMockLinkAuditTrail(): void {
  AUDIT_STORE = seedAuditTrail();
  AUDIT_ID_SEQ = 0;
  auditClock = () => new Date().toISOString();
}

function recordAuditEntry(
  linkId: string,
  action: LinkAuditAction,
  authCtx: AuthContext,
  note: string | null,
): void {
  const entry: LinkAuditEntry = {
    entryId: `ae-${++AUDIT_ID_SEQ}`,
    linkId,
    action,
    actorId: authCtx.actorId,
    actorName: authCtx.actorName,
    occurredAt: auditClock(),
    note: action === "created" ? note : null,
  };
  // Unshift, never push/sort-at-read — array order IS reverse-chronological
  // by construction (NFR-102). Never mutate an existing entry (append-only).
  AUDIT_STORE[linkId] = [entry, ...(AUDIT_STORE[linkId] ?? [])];
}
```

This mirrors the file's EXISTING convention exactly: a module-level mutable
store + a `__reset*` test-only export (see `__resetMockParentLinks` already
in this file) — no new architectural pattern introduced, just a second store
+ a second reset function, named consistently.

**Wiring into the two mutations** (both already re-authorize `authCtx` before
mutating — the audit call happens strictly AFTER the domain mutation
succeeds, never on a rejected path):

```ts
// inside createLink(), immediately before `return ok(stripTenant(created));`
recordAuditEntry(created.linkId, "created", authCtx, created.note ?? null);

// inside unlinkLink(), immediately before `return ok(undefined);`
recordAuditEntry(linkId, "unlinked", authCtx, null);
```

A failed mutation (any `fail(...)` return — `forbidden`/`already-linked`/
`validation`/`not-found`) records **nothing** — the audit call sits after
every guard clause, on the success path only (FR-107).

```ts
async getLinkAuditTrail(linkId: string): Promise<PSLResult<LinkAuditEntry[]>> {
  return ok(AUDIT_STORE[linkId] ?? []);
}
```

**Seed** (`PL_AUDIT_SEED`, per DR-023's own worked example — 4 of 6 seeded
links start `[]`, matching the dominant-empty-state design decision):

```ts
function seedAuditTrail(): Record<string, LinkAuditEntry[]> {
  return {
    l1: [
      {
        entryId: "ae-seed-l1-1",
        linkId: "l1",
        action: "created",
        actorId: "admin-seed",
        actorName: "Quản trị viên demo",
        occurredAt: "2025-08-12T02:00:00.000Z",
        note: null,
      },
    ],
    l6: [
      {
        entryId: "ae-seed-l6-3",
        linkId: "l6",
        action: "created",
        actorId: "admin-seed",
        actorName: "Quản trị viên demo",
        occurredAt: "2025-11-01T03:00:00.000Z",
        note: "Tái tạo liên kết sau khi xác minh lại giấy tờ giám hộ.",
      },
      {
        entryId: "ae-seed-l6-2",
        linkId: "l6",
        action: "unlinked",
        actorId: "admin-seed",
        actorName: "Quản trị viên demo",
        occurredAt: "2025-10-20T03:00:00.000Z",
        note: null,
      },
      {
        entryId: "ae-seed-l6-1",
        linkId: "l6",
        action: "created",
        actorId: "admin-seed",
        actorName: "Quản trị viên demo",
        occurredAt: "2025-10-02T02:00:00.000Z",
        note: null,
      },
    ],
    // l2, l3, l4, l5, l7, l8 intentionally absent -> `AUDIT_STORE[linkId] ?? []`
    // returns [] (the dominant honest empty state, DR-023 decision 3).
  };
}
```

Note the seed array for `l6` is written newest-first (matching the
"unshift, never sort" invariant) so `/fe` can literal-copy it without a sort
step.

**How seed interacts with a runtime create/unlink in the SAME session:** a
runtime `recordAuditEntry` call unshifts onto whatever array is already in
`AUDIT_STORE[linkId]` (seeded or not) — e.g. re-unlinking `l1` in a dev
session prepends a new `unlinked` entry ahead of the seeded `created` entry,
with no special-casing between "seeded" and "runtime" entries; they are the
same shape and live in the same array.

## INT-104 — trail independent of the active-links STORE (FR-108)

`AUDIT_STORE` is keyed by `linkId` and is a **separate map from the active-
links `STORE` array** — `unlinkLink` removes the row from `STORE` (so it no
longer appears in the list/detail-dialog-open flow) but `recordAuditEntry`
still runs against `AUDIT_STORE` first, so the entry for that `linkId`
persists. There is currently no UI path that re-opens a detail dialog for an
unlinked (now-invisible) link within this story's scope — this guarantee
matters for the create→unlink→re-create sequence (`l6`'s seed), where the
SAME `linkId` must show its full history across multiple lifecycle events. If
a future story ever re-uses a `linkId` after full deletion (not currently
possible — `linkId`s are never reused, they're freshly generated per create),
`AUDIT_STORE` would need explicit disambiguation; out of scope today since no
mutation regenerates a `linkId`.

## INT-105 — why the failure union stays as-is (no new failure type)

- `not-found`: NOT modeled for this query. A missing/never-existed `linkId`
  in `AUDIT_STORE` returns `ok([])` (the same honest empty state as a real
  link with zero events) rather than an error — there is no user-facing
  difference between "this link has no history" and "this id has no
  history," and inventing that distinction adds no UI value (same YAGNI
  reasoning as DR-023 decision 4's filtering deferral).
- `forbidden`: NOT modeled. The detail dialog is already gated (US-E20.1); by
  the time this query runs, the caller has already passed that gate. No
  separate per-query re-auth is introduced (this is a read, not a mutation —
  it does not need the HIGH-RISK re-auth pattern that `createLink`/
  `unlinkLink` have).
- `network-error`: the ONLY failure this query can realistically surface in
  mock mode — reserved for an unexpected thrown exception at the DI/Server
  Action boundary (mirrors how `getLinkConsentDetail` is handled — see
  `pl-consent-detail-section.tsx`'s error state, which today is exercised via
  Storybook-forced state, not a real mock failure path).
- **Does a trail-query failure block the dialog? NO** (per DR-023 explicitly)
  — `PLAuditTrailSection` owns a fully independent `status` prop
  (`loading | error | success`), exactly like `PLConsentDetailSection`. The
  Server Action/hook that calls `GetLinkAuditTrailUseCase` catches any thrown
  exception and resolves to `{ ok: false, errorKey: "network-error", retryable: true }` — never rejects the promise the dialog's own render depends on.

## INT-106 — `AuthContext` extension + actor-truthfulness (NFR-103)

Current `AuthContext` (`i-parent-student-link.repository.ts`) is
`{ role: UserRole; tenantId: string }` — no actor identity. Extend it:

```ts
export interface AuthContext {
  role: UserRole;
  tenantId: string;
  actorId: string;
  actorName: string;
}
```

**`actorId`**: decode the JWT `sub` claim via the ALREADY-EXISTING
`decodeSubClaim(token)` helper (`src/bootstrap/lib/jwt.ts:78`) — no new JWT
helper needed. This is the same truthful, already-shipped seam used for
role/tenant (`decodeRoleClaim`/`decodeTenantId`).

**`actorName`**: no JWT claim carries a display name today (`decodeJwtClaims`
only reads `role`/`sub`/`exp`/tenant claims — verified by reading
`jwt.ts`). The real, non-mock display name would have to come from a
`/users/me`-style fetch (per `.claude/rules/api-integration.md`, the same
chain `auth.di.ts` already performs after `signin`), which is more wiring
than this mock-first story should introduce speculatively for a feature that
has no real repository branch exercised at all yet.

**Decision for THIS story (mock repository, fully resolved, not open):**
`makeParentLinksAuthContext()` (`bootstrap/di/parent-student-link.di.ts`)
gains:

```ts
const actorId = decodeSubClaim(token) ?? "mock-admin";
const actorName = "Quản trị viên demo"; // MOCK_ACTOR_NAME constant, mock mode only
return { role, tenantId, actorId, actorName };
```

This follows the SAME fallback convention already in this exact function
(`tenantId` falls back to `MOCK_TENANT_ID` in mock mode) — no new pattern.
`actorName` is a fixed, clearly-named mock constant (`MOCK_ACTOR_NAME`,
exported from the mock repository file alongside `MOCK_TENANT_ID`), never
presented as if it were BE-supplied.

**OQ-101 (flagged, non-blocking):** once a real `core` audit endpoint exists
and the real `ParentStudentLinkRepository` branch is wired, where does
`actorName` truthfully come from — a JWT display-name claim (if `iam` ever
adds one) or a `/users/me` join done once per session (cached, not per
mutation)? Not resolved here because there is no real repository call in this
story's scope to make the decision concrete against; flag to whoever wires
the real repository (analogous to how `academic-records`' real Seal endpoint
is still pending `core` US-064).

## INT-107 — ordering & determinism for tests (NFR-102)

- **Invariant:** `AUDIT_STORE[linkId]` is ALWAYS stored in reverse-
  chronological order because entries are only ever `unshift`ed, never
  appended or re-sorted at read time. `getLinkAuditTrail` returns the array
  as-is — no comparator function exists to get wrong.
- **Clock seam:** `auditClock: () => string`, defaulting to
  `() => new Date().toISOString()`, overridable via `__setMockAuditClock` —
  the SAME shape of seam a unit test needs to assert exact `occurredAt`
  values and exact ordering deterministically (e.g. inject a counter-backed
  clock returning strictly increasing ISO strings per call).
- **Entry ids:** a simple incrementing module counter (`ae-${++AUDIT_ID_SEQ}`)
  — fully deterministic across a test run, reset via
  `__resetMockLinkAuditTrail()`. (`createLink`'s own existing `linkId`
  generation already uses `Date.now()`-based ids in this file today; this
  story does NOT need to fix that pre-existing pattern, but deliberately does
  NOT repeat it for the NEW `entryId`, since `occurredAt`/ordering assertions
  are exactly what this story's tests need to be deterministic about.)

## INT-108 — contract-first guidance for a future `core` endpoint (non-blocking)

No `core` audit-emission endpoint exists (ADR `0064`). If/when one ships
(sibling to the seal case's US-064), the expected real-repo contract this
mock shape is designed to degrade into:

```
GET /api/v1/parent-student-links/{linkId}/audit-trail
→ envelope.data: LinkAuditEntry[] (same field names, camelCase, already matches)
  meta.pagination not expected (single-link scope, small N — DR-023 decision 4)
```

The real `ParentStudentLinkRepository`
(`infrastructure/repositories/parent-student-link.repository.ts`) should add
a `getLinkAuditTrail` method following the file's existing pattern (the other
methods there are currently unimplemented stubs pending `core` — see
`_authCtx` unused-param convention already present for `createLink`/
`unlinkLink` in that file). Not built by this story.

## INT-109 — presentation wiring summary (for `fe-component-architect`/`fe-lead`, not built here)

- `PLAuditTrailSection` mounts unconditionally alongside
  `PLConsentDetailSection` when `PLDetailDialog` opens; it manages its own
  TanStack Query keyed by `linkId` (e.g.
  `["parent-links", "audit-trail", linkId]`, following
  `parent-links.query-keys.ts`'s existing convention) — independent of the
  query(ies) already backing the rest of the dialog.
- Server Action: a new thin action (mirrors the existing consent-detail
  action pattern) calling `makeGetLinkAuditTrailUseCase()` →
  `GetLinkAuditTrailUseCase.execute(linkId)` → `toActionResult` (reusing the
  SAME `toActionResult`/`isRetryableFailure` helpers already in
  `actions.ts`, since the failure union is unchanged).
- No mutation/invalidation wiring is needed for the CREATE/UNLINK side beyond
  what already exists — `/fe` MAY additionally invalidate the audit-trail
  query key on successful create/unlink mutations so an already-open dialog
  reflects the new entry without a manual refetch (nice-to-have, not an AC —
  the dialog is typically re-opened per row anyway, which would refetch
  fresh).
