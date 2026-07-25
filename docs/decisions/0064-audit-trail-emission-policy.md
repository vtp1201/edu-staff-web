# 0064 Audit-Trail Emission Policy (parent-links Unlink/Create + general mutation classes)

Date: 2026-07-25

## Status

Accepted

## Context

US-E20.1 (Admin Parent–Student Link Management) flagged an open ADR candidate
carried from `requirements.md`/`integration.md`: Unlink is a high-risk
authorization mutation (it strips a parent's data-visibility grant — grades,
conduct, attendance, notifications — for a child without deleting either
account). `ba-integration-analyst` found the existing generic audit-log
(`AuditEvent`, US-E12.12, `src/features/audit-log/`) a plausible fit and asked
whether Create/Unlink on parent-student-links should extend the shared
`AuditEntityType` union (`"grade" | "conduct" | "record" | "setting"`) with a
new `"parent-student-link"` variant and emit into that generic log. The
story's spec.md explicitly deferred this (§8 [OPEN QUESTION] 1, §9 point 6)
and the item has been outstanding since.

**Ground-truth on the generic audit-log feature** (`src/features/audit-log/`):
- It is a **read-only display screen** (`(app)/admin/audit-log`, US-E12.12,
  implemented mock-first, `core` BE endpoint US-064 still planned/unconfirmed
  — `docs/product/screens.md` row, `docs/TEST_MATRIX.md` US-E12.12 row).
- `IAuditLogRepository` exposes exactly one method, `getAuditLog(filter,
  cursor, limit)` — **there is no `append`/`emit`/`record` write method
  anywhere in the interface or its mock/real repositories.** The mock
  repository (`mock-audit-log.repository.ts`) is backed by a fixed,
  hand-authored `AUDIT_LOG_SEED` array of ~30 historical-looking entries; it
  is not fed by any other feature's mutations at runtime.
- Repo-wide grep confirms **no other feature currently writes into this
  repository or imports its `AuditEvent`/`AuditEntityType` types** to emit an
  entry. The only real-code references to "AuditEntityType"/"audit-log"
  outside the feature itself are unrelated string matches (comments, a
  differently-named `date-range-fields` component reused by
  `student-absences`).
- **Two existing high-risk mutation features already needed exactly this
  question and answered it independently, WITHOUT extending the shared
  union:**
  - `moderation` (dismiss/remove content, NFR-101 compliance) defines its own
    `AuditEntryEntity` (`src/features/moderation/domain/entities/audit-entry.entity.ts`)
    — a feature-local, read-only audit-trail entity + its own mock data, fully
    decoupled from `src/features/audit-log/`.
  - `academic-records` Seal/Unseal (US-E14.6, ADR `0037`, decision text at the
    time literally says "written to the audit log (entity_type: record,
    action: UNSEAL)") **did not, in implementation, write into the generic
    `AuditEvent`/`AuditEntityType` union** — it built its own scoped
    `SealAuditEntry` entity (`seal-batch.entity.ts`) and
    `GetSealAuditTrailUseCase`/`getSealAuditTrail` repository method inside
    `src/features/academic-records/`, entirely separate from
    `src/features/audit-log/`. This is a real, load-bearing divergence
    between ADR `0037`'s stated intent and what was actually built and
    shipped (`AuditTrail`/`AuditTrail_Empty` Storybook stories, TEST_MATRIX
    US-E14.6 row) — i.e. even when a decision explicitly said "the audit
    log," engineering practice settled on a feature-scoped trail instead.
- By contrast, other high-risk mutation classes that could plausibly want an
  audit trail — `staff-discipline` approve/reject, `student-absences` flag,
  `grades` lock/bulk-lock (`lock-term.use-case.ts`,
  `bulk-lock-batches.use-case.ts`) — have **no audit-trail feature at all**
  today (grep confirms zero `AuditEntry`/audit-emission code in those
  features; the only "audit" string hits are unrelated code comments). No
  story has flagged a need for one, so this ADR does not mandate retrofitting
  them.

The BE side (`.claude/rules/api-integration.md`, service map): `core` has no
confirmed audit contract yet for member/link mutations — the same US-064
placeholder that gates the generic audit-log screen's real wiring also
covers any future real audit-emission endpoint. There is no BE contract to
consume today, so any web-side audit trail for parent-links would be
mock-first regardless of which shape is chosen.

## Decision

1. **Do NOT extend the shared `AuditEntityType` union for parent-student-link
   (or for any other feature).** The generic `audit-log` feature
   (`src/features/audit-log/`) is a **display surface for a BE-owned,
   read-only aggregate audit feed** (pending `core` US-064), not a
   web-side event-emission bus — it has no write path, and nothing in the
   codebase feeds it at runtime. Extending its type union without an
   emission mechanism would add a dead-code union member with no producer.

2. **General policy for future high-risk mutation classes that need a web-side
   audit trail:** follow the pattern already established twice in this repo
   (`moderation`'s `AuditEntryEntity`, `academic-records`' `SealAuditEntry` +
   `GetSealAuditTrailUseCase`) — a **feature-scoped, read-only audit-trail
   entity + query use-case + mock repository, owned by the feature itself**,
   NOT the shared `audit-log` feature. This keeps the audit shape specific to
   the resource (parent-student-link vs seal vs moderation each have
   different natural fields) and matches the real BE trajectory: each
   `core`/`iam` domain will eventually expose its own audit endpoint
   (`core` US-064 covers seal; a parent-links audit endpoint, if it ships,
   would be a sibling `core` endpoint, not a write into the generic log).

3. **For parent-student-links specifically:** an audit trail is NOT required
   for US-E20.1's `implemented` gate (already correctly scoped as
   out-of-scope in spec.md §9 point 6 and §3 out-of-scope list). If/when the
   product wants Unlink/Create history visible to admins, build it as
   `src/features/admin/parent-links/domain/entities/link-audit-entry.entity.ts`
   + a `getLinkAuditTrail` query (mirroring the academic-records pattern),
   mock-first, surfaced either inline in the detail dialog or as a
   standalone view — this is registered as a **planned, not built** backlog
   item (see Follow-Up), not implemented by this ADR.

4. **This ADR does not retroactively mandate an audit trail for
   `staff-discipline` approve/reject, `student-absences` flag, or `grades`
   lock/bulk-lock.** No story has flagged an audit-worthiness question for
   those mutation classes; when one does, this ADR's policy (point 2) is the
   answer to reach for rather than re-litigating the shared-union question.

## Alternatives Considered

1. **Extend `AuditEntityType` with `"parent-student-link"` and emit
   Create/Unlink into the generic `audit-log` feature.** Rejected: the
   generic feature has no write/emit method at all (read-only mock seed);
   adding a union member with no producer is dead code, and the one prior
   case that stated this intent in an ADR (`0037`) did not actually implement
   it this way — implementation practice already rejected this shape.

2. **Defer entirely — no audit trail for parent-links, no general policy.**
   Rejected: the question would resurface for the next high-risk mutation
   (already true for `academic-records`/`moderation`, both of which
   independently reinvented the same feature-scoped answer); recording the
   pattern once avoids re-analysis and keeps future ADRs from re-deciding the
   same shape question piecemeal.

3. **Build a real cross-feature audit-emission utility (e.g. a shared
   `emitAudit()` helper any feature's use-case can call, backed by a single
   generic sink) now, ahead of any BE contract.** Rejected: no BE endpoint
   exists to receive it (`core` US-064 unconfirmed for even the seal case),
   and inventing a cross-feature emission contract that has to be redesigned
   once `core`'s real audit endpoints ship would create churn; the
   feature-scoped-entity pattern degrades gracefully into "point this
   query use-case at the real per-resource `core` endpoint" later, matching
   how `academic-records` is already mock-first with a stubbed real repo.

## Consequences

Positive:
- Resolves the outstanding US-E20.1 open item with a concrete, evidence-based
  answer instead of leaving it open indefinitely.
- Documents a real (previously undocumented) divergence between ADR `0037`'s
  stated intent and shipped code, preventing a future reviewer from assuming
  `academic-records` writes into the generic audit-log.
- Gives the team a reusable, named policy (point 2) for the next high-risk
  mutation that raises the same question, instead of re-deciding per-feature.

Tradeoffs:
- No unified, cross-feature audit view exists today (each high-risk feature's
  trail is scoped to its own screen) — acceptable until `core` ships a real
  aggregate audit endpoint (US-064) that the generic `audit-log` screen can
  front; at that point the generic screen becomes a true BE-aggregated view,
  which is consistent with its current read-only, no-write design.
- Parent-links itself still has no audit trail after this ADR — only a
  decision on what shape it would take if/when built (see Follow-Up).

## Follow-Up

- Register `US-E20.3` (Parent-Student Link Audit Trail) as a **planned**
  backlog story in epic E20-parent-student-links: feature-scoped
  `LinkAuditEntry` entity + `getLinkAuditTrail` query use-case + mock
  repository in `src/features/admin/parent-links/`, surfaced in the existing
  detail dialog or a dedicated tab; mock-first pending a `core` audit
  endpoint. Not built by this ADR — `ba-lead`/`fe-lead` to scope a full story
  packet only when prioritized.
- Close the open-item note in
  `docs/stories/epics/E20-parent-student-links/US-E20.1-admin-parent-links/story.md`
  §Harness Delta pointing at this ADR.
- `docs/decisions/0037-academic-record-seal-two-admin-gate.md` is NOT amended
  by this ADR (its mechanism is correct and shipped) but a future reader
  should cross-reference this ADR for the accurate audit-trail shape actually
  implemented (feature-scoped `SealAuditEntry`, not the generic `audit-log`).
