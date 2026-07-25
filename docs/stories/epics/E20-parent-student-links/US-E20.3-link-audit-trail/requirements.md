# US-E20.3 — Parent–Student Link Audit Trail — Requirements

Source: `docs/design-requests/DR-023-parent-link-audit-trail.md` (merged
`c6c9bfb`, delivered 2026-07-25) · `docs/product/design-spec.jsonc` →
`screens.parentLinks.detailDialog.auditTrailSection` · ADR
`docs/decisions/0064-audit-trail-emission-policy.md` (**BINDING** — resolves
the shape question; do NOT extend the shared `AuditEntityType`/generic
`audit-log` feature) · existing implementation
`src/features/admin/parent-links/**` (US-E20.1, delivered) · precedent
`src/features/academic-records/domain/entities/seal-batch.entity.ts` +
`get-seal-audit-trail.use-case.ts` (`SealAuditEntry`/`GetSealAuditTrailUseCase`
— the shape convention this story mirrors, per ADR `0064` §Decision point 2).

This is a **RECONCILE / EXTENSION** of the already-implemented
`(app)/admin/parent-links` screen (`US-E20.1`) — no new route, no new screen.
It adds one read-only sub-section (`PLAuditTrailSection`) to the existing
`PLDetailDialog`, directly below the existing `PLConsentDetailSection`
(`US-E20.1`).

## 1. Requirements Summary

The system SHALL show, inside the existing admin Parent–Student Link detail
dialog, a read-only, reverse-chronological history of `Create`/`Unlink`
events for that specific link, recorded by the web's own existing
create/unlink mutations (mock-first, no `core` audit-emission endpoint exists
— ADR `0064`). The trail is a **feature-scoped** entity/use-case/repository
method owned by `src/features/admin/parent-links/`, never a write into the
shared `audit-log` feature's `AuditEntityType` union (ADR `0064` §Decision
point 1, hard constraint). The section owns its own loading/empty/error state
— a trail-fetch failure never blocks the rest of the (already-rendered)
dialog. The trail is append-only: no edit/delete affordance exists or should
ever be modeled.

## 2. Technical Requirements (JSON)

```json
{
  "requirementId": "TR-E20.3",
  "title": "Parent–Student Link Audit Trail (detail-dialog sub-section)",
  "status": "Draft",
  "actors": [
    {
      "role": "admin",
      "capabilities": [
        "open a link's existing detail dialog (US-E20.1) and see its history of Create/Unlink events, newest first",
        "retry a failed trail fetch without losing the rest of the already-open dialog",
        "read an optional note on a 'created' entry (never present on an 'unlinked' entry)"
      ]
    },
    {
      "role": "principal",
      "capabilities": ["same as admin — inherits the existing detail-dialog role gate (US-E20.1), no separate gate for this sub-section"]
    }
  ],
  "functionalRequirements": [
    {
      "id": "FR-101",
      "priority": "Must",
      "description": "The system SHALL render a `PLAuditTrailSection` inside `PLDetailDialog`, directly below `PLConsentDetailSection`, with its own section title ('Lịch sử liên kết') and its own scoped loading/error/empty/success state — independent of the rest of the dialog's already-fetched row data.",
      "trigger": "Admin/principal opens the detail dialog for a link",
      "preconditions": ["actor has role admin or principal (inherits US-E20.1's existing detail-dialog gate)"],
      "postconditions": ["section mounts and issues its own `getLinkAuditTrail(linkId)` query"],
      "errorConditions": ["query failure -> section-local error state only; student/parent/relation/consent rows remain visible and usable"]
    },
    {
      "id": "FR-102",
      "priority": "Must",
      "description": "The system SHALL list entries reverse-chronologically (newest first); each row SHALL show an icon+text action badge ('Đã tạo liên kết' tone=success / 'Đã gỡ liên kết' tone=error, never color-only), the actor's display name, and a short date/time.",
      "trigger": "Trail query resolves with >=1 entry",
      "postconditions": ["rows rendered newest-first; action conveyed by icon AND text"],
      "errorConditions": []
    },
    {
      "id": "FR-103",
      "priority": "Must",
      "description": "The system SHALL show the optional `note` field on its own muted line ONLY for a 'created' entry that has one; an 'unlinked' entry SHALL NEVER show a note line (the unlink confirm dialog, `pl-unlink-dialog.tsx`, has no note input — inventing one here would be undocumented UI).",
      "trigger": "Rendering a success-state row",
      "postconditions": ["note line present iff action==='created' AND note is non-null/non-empty"],
      "errorConditions": []
    },
    {
      "id": "FR-104",
      "priority": "Must",
      "description": "The system SHALL show a dominant, honest empty state ('Chưa có lịch sử ghi nhận' / body explaining recording starts now) with NO call-to-action when the trail has zero entries — this is the expected default for every link created before this feature existed, not an error.",
      "trigger": "Trail query resolves with an empty array",
      "postconditions": ["empty-state copy rendered, no CTA button"],
      "errorConditions": []
    },
    {
      "id": "FR-105",
      "priority": "Must",
      "description": "The system SHALL show a section-scoped, non-blocking skeleton (2 rows, `aria-busy` + `sr-only` loading label) while the trail query is in flight, mirroring `PLConsentDetailSection`'s own-loading pattern exactly.",
      "trigger": "Dialog opens / trail query starts",
      "postconditions": ["skeleton shown only inside the section's mount point"],
      "errorConditions": []
    },
    {
      "id": "FR-106",
      "priority": "Must",
      "description": "The system SHALL show a section-scoped `role=\"alert\"` error banner + retry button on trail-query failure, visually matching `PLConsentDetailSection`'s error state (`bg-edu-error/10`/`text-edu-error-text`/`AlertTriangle`), WITHOUT surfacing a whole-dialog error.",
      "trigger": "Trail query rejects (network-error)",
      "postconditions": ["error banner + retry rendered in-section; rest of dialog unaffected"],
      "errorConditions": []
    },
    {
      "id": "FR-107",
      "priority": "Must",
      "description": "The system SHALL append exactly one 'created' audit entry when `CreateParentStudentLinkUseCase` succeeds, and exactly one 'unlinked' audit entry when `UnlinkParentStudentLinkUseCase` succeeds — recorded by the SAME mock repository these mutations already call (`MockParentStudentLinkRepository`), NOT a separate/duplicated write path.",
      "trigger": "createLink or unlinkLink resolves `ok`",
      "postconditions": ["exactly one new entry recorded per successful mutation; a FAILED mutation (validation/forbidden/already-linked/not-found/network-error) records NOTHING"],
      "errorConditions": []
    },
    {
      "id": "FR-108",
      "priority": "Must",
      "description": "The system SHALL persist an entry's audit-trail visibility independent of whether the underlying link still exists in the active links list — an 'unlinked' entry (and any prior 'created' entry for that same linkId) SHALL remain readable even after the link itself is removed from the active roster, since the trail is the record of what happened to that linkId over time, not a derived view of currently-active links.",
      "trigger": "A link is unlinked, then its (now-closed) detail dialog history is re-opened via a re-created link sharing no data with the old one OR via direct re-query of the old linkId",
      "postconditions": ["audit entries for a linkId are stored independently of the active-links list and are never deleted when the link is unlinked"],
      "errorConditions": []
    },
    {
      "id": "FR-109",
      "priority": "Won't",
      "description": "The system SHALL NOT provide any edit or delete affordance for audit entries (append-only, read-only) and SHALL NOT provide filtering/search/date-range UI for the trail (YAGNI — DR-023 decision 4, a single link realistically has 1-2 entries).",
      "trigger": "N/A — explicit scope exclusion",
      "postconditions": [],
      "errorConditions": []
    }
  ],
  "nonFunctionalRequirements": [
    {
      "id": "NFR-101",
      "category": "Accessibility",
      "requirement": "Action badges convey Create/Unlink via icon + text, never color alone; loading region uses `aria-busy` + `sr-only` label; error region uses `role=\"alert\"` with a visible, keyboard-reachable retry button — all scoped to the sub-section so a screen-reader user is never told the whole dialog failed when only the trail sub-fetch failed.",
      "measurableTarget": "WCAG 2.1 AA 1.4.1 / 4.1.3 — impeccable audit reports 0 color-only-status violations in this section"
    },
    {
      "id": "NFR-102",
      "category": "Determinism/Testability",
      "requirement": "Audit-entry `occurredAt` timestamps SHALL be produced via an injectable clock seam in the mock repository (never a raw `Date.now()`/`new Date()` call inlined in a way that cannot be overridden in a test), and new entries SHALL be inserted such that array order already equals reverse-chronological order (no sort-at-read-time reliance on wall-clock precision).",
      "measurableTarget": "unit test can inject a fixed/incrementing clock and assert exact `occurredAt` values + exact array order deterministically, no flaky time-based assertions"
    },
    {
      "id": "NFR-103",
      "category": "Security/Data-truthfulness",
      "requirement": "`actorId`/`actorName` on a runtime-recorded entry SHALL come only from the acting admin/principal's OWN authenticated session context — never invented, never attributed to a different admin than the one who performed the action.",
      "measurableTarget": "code review: `actorId`/`actorName` traced to `AuthContext` derived from the session's own token claims, not a client-supplied or hardcoded-per-row value"
    },
    {
      "id": "NFR-104",
      "category": "i18n",
      "requirement": "All copy comes from the already-shipped `parentLinks.detailDialog.auditTrail.*` sub-tree (9 keys, vi source + en mirror, already present in `messages/{vi,en}.json`) — no new namespace, no duplicate keys.",
      "measurableTarget": "`tsc --noEmit` passes; 0 net-new i18n keys required beyond the 9 already shipped"
    },
    {
      "id": "NFR-105",
      "category": "Scope/Architecture",
      "requirement": "The audit entity, use-case, and repository method live inside `src/features/admin/parent-links/` and MUST NOT extend `src/features/audit-log/`'s `AuditEntityType` union or write into its repository (ADR `0064`, hard constraint).",
      "measurableTarget": "code review + grep: zero references from this story's code to `src/features/audit-log/` types/repository"
    }
  ],
  "uiStates": ["loading", "empty", "error", "success"],
  "dataDependencies": [
    { "source": "mock", "entity": "LinkAuditEntry[] recorded by the existing mock createLink/unlinkLink methods, keyed by linkId, independent of the active-links STORE array", "sensitivity": "Confidential" },
    { "source": "core (future, unconfirmed)", "entity": "a sibling per-resource audit endpoint for parent-student-links, analogous to `core`'s planned seal-audit endpoint (US-064) — NOT built, contract-first guidance only per ADR 0064", "sensitivity": "Confidential" }
  ],
  "scope": {
    "inScope": [
      "PLAuditTrailSection sub-component inside the existing PLDetailDialog",
      "LinkAuditEntry entity + getLinkAuditTrail query use-case, feature-scoped to admin/parent-links",
      "mock repository emission wiring inside create/unlink (same mock repo file)",
      "loading/empty/error/success states, section-scoped, non-blocking",
      "reuse of the 9 already-shipped parentLinks.detailDialog.auditTrail.* i18n keys"
    ],
    "outOfScope": [
      "any change to the create/unlink dialogs themselves",
      "screen-level audit tab/table (rejected in DR-023 decision 1, YAGNI for a single-link-scoped history)",
      "filtering/search/date-range UI (DR-023 decision 4, explicit YAGNI)",
      "extending the shared audit-log feature's AuditEntityType union (ADR 0064, hard constraint)",
      "any real core BE wiring (mock-first; core has no confirmed audit-emission endpoint, ADR 0064/US-064 placeholder)",
      "edit/delete of audit entries (append-only by design)"
    ],
    "externalDependencies": [
      "none required to build this story — fully mock-first, independent of any in-flight core work"
    ]
  },
  "assumptions": [
    "[ASSUMPTION] Role gate for the audit trail sub-section is IDENTICAL to the existing detail-dialog gate (admin/principal) — no new role check is introduced.",
    "[ASSUMPTION] `AuthContext` (currently `{ role, tenantId }`) is extended with `actorId`/`actorName` for this story's mutation call sites — see integration.md OQ-101 for the exact sourcing decision (JWT `sub` claim for actorId via the already-existing `decodeSubClaim`; actorName sourcing is flagged as an open question for the REAL, non-mock repository only — the mock repository's answer is fully decided in integration.md, not left open).",
    "[ASSUMPTION] A single link realistically accumulates at most a handful of entries in a demo/dev session — no pagination is modeled for this query (matches DR-023 decision 4's YAGNI reasoning)."
  ],
  "openQuestions": [
    "OQ-101 (see integration.md for full analysis): once a real `core` audit endpoint exists, what is the true source of `actorName` server-side (JWT claim vs a `/users/me`-style join)? Not blocking this story (mock-first, no real repo call today) — flagged for whoever wires the real repository."
  ]
}
```

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Requirement | Priority | Rationale |
| --- | --- | --- | --- |
| FR-101 | Section renders inside existing detail dialog, own scoped states | Must | Core placement decision, DR-023 |
| FR-102 | Reverse-chron list, icon+text action badge, actor, timestamp | Must | DR-023 success-state spec |
| FR-103 | Note shown only for 'created' | Must | DR-023 explicit UI-honesty rule (unlink dialog has no note field) |
| FR-104 | Empty state dominant, honest, no CTA | Must | DR-023 decision 3 — every pre-feature link starts at zero entries |
| FR-105 | Scoped, non-blocking loading skeleton | Must | Hard 4-states rule + DR-023 pattern reuse |
| FR-106 | Scoped `role=alert` error + retry | Must | Hard 4-states rule + a11y (never whole-dialog error) |
| FR-107 | Emission exactly once per successful create/unlink | Must | Core mechanics — the entire feature's data source |
| FR-108 | Trail survives unlink (independent of active STORE) | Must | Otherwise the unlink entry itself would vanish — defeats the feature's purpose |
| FR-109 | No edit/delete/filter | Won't | Explicit scope boundary, DR-023 decision 4 + append-only design |

## 4. Handoff Notes

**For `ba-integration-analyst`:** Resolve the exact mock emission mechanics
(where the audit store lives relative to the existing `STORE` array, how
`AuthContext` gains `actorId`/`actorName` truthfully, the clock-injection seam
for deterministic tests, and the contract-first shape of a future `core`
audit endpoint). ADR `0064` is binding on the entity's *ownership* (feature-
scoped, not shared `audit-log`) but does not resolve these mechanics — that is
this story's job.

**For `ba-use-case-modeler`:** Model: (1) view trail — loading/empty/error/
success, (2) emission on successful create, (3) emission on successful
unlink, (4) note appears only on 'created' rows, (5) reverse-chronological
ordering (including the create→unlink→re-create sequence from the DR's own
`PL_AUDIT_SEED` `l6` example), (6) a failed mutation records nothing, (7) a
trail-query failure never blocks the rest of the already-open dialog, (8) a11y
states (aria-busy/role=alert/icon+text badges), (9) append-only invariant (no
AC should ever describe editing/deleting an entry).

## Dependencies

- **Depends on US-E20.1 (implemented)** — `PLDetailDialog`,
  `PLConsentDetailSection` (pattern to mirror), `MockParentStudentLinkRepository`
  (the exact file this story's emission hooks into),
  `CreateParentStudentLinkUseCase`/`UnlinkParentStudentLinkUseCase` (the two
  mutations that emit).
- **No blocking dependency on any in-flight story** — touches only
  `src/features/admin/parent-links/**`, `design_src/edu/parent-links.jsx`
  (already updated by DR-023), `docs/product/design-spec.jsonc` (already
  updated), and the already-shipped `parentLinks.detailDialog.auditTrail.*`
  i18n keys. No shared-token/shared-component contention.
