# US-E20.3 Parent–Student Link Audit Trail

## Status

planned

## Lane

normal

## Dependencies

> Dùng cho parallel branch workflow (decision `0025`). Giúp fe-lead phát hiện ràng
> buộc với US team khác đang làm trước khi claim.

- Depends on: US-E20.1 (implemented — `PLDetailDialog`,
  `PLConsentDetailSection` pattern, `MockParentStudentLinkRepository`,
  `CreateParentStudentLinkUseCase`/`UnlinkParentStudentLinkUseCase`)
- Blocks: none
- Feature module(s) chạm: `src/features/admin/parent-links/**` (domain +
  infrastructure + presentation), `src/bootstrap/di/parent-student-link.di.ts`
- Shared contract/file: `IParentStudentLinkRepository` (`AuthContext`
  extended additively with `actorId`/`actorName`), reuses
  `ParentStudentLinkFailure` union (no change), reuses
  `parentLinks.detailDialog.auditTrail.*` i18n keys (already shipped, no
  edit expected)

## Product Contract

Show a read-only, reverse-chronological Create/Unlink history for a
parent-student link inside its existing admin detail dialog. Entries are
recorded by the web's own existing create/unlink mutations (mock-first — no
`core` audit endpoint exists yet). The trail is feature-scoped (own entity,
own query use-case, own mock repository method inside
`src/features/admin/parent-links/`) per ADR `0064`, which explicitly forbids
extending the shared `audit-log` feature's `AuditEntityType` union. The
sub-section owns its own loading/empty/error state — a trail-fetch failure
never blocks the rest of the already-rendered dialog. Append-only: no
edit/delete/filter surface.

## Relevant Product Docs

- `docs/design-requests/DR-023-parent-link-audit-trail.md` (delivered
  2026-07-25, merged `c6c9bfb`)
- `docs/decisions/0064-audit-trail-emission-policy.md` (binding on ownership)
- `docs/product/design-spec.jsonc` →
  `screens.parentLinks.detailDialog.auditTrailSection`
- `docs/product/screens.md` (Parent–Student Links row, already updated)
- `design_src/edu/parent-links.jsx` (`PLAuditTrailSection`)

## Acceptance Criteria

Full Given/When/Then set in `use-cases.md` (17 scenarios across 7 use
cases). Summary:

- Section renders inside the existing detail dialog with its own scoped
  loading/empty/error/success states (never blocking the rest of the dialog).
- Empty state is the dominant, honest default (no CTA) — every link created
  before this feature shipped starts with zero entries.
- Success state lists entries reverse-chronologically with an icon+text
  action badge (never color-only), actor name, timestamp, and an optional
  note shown ONLY on 'created' entries.
- Exactly one audit entry is recorded per successful `createLink`/
  `unlinkLink` call; a failed mutation records nothing.
- A link's audit trail persists even after the link is removed from the
  active-links list (the unlink event itself must remain visible).
- No edit/delete/filter affordance exists anywhere (append-only, YAGNI).

## Design Notes

- Commands: none new — reuses the existing `createLink`/`unlinkLink`
  use-cases, now with a side-effect (audit emission) added after their
  existing success path.
- Queries: `getLinkAuditTrail(linkId)` — new, feature-scoped, mock-first.
- API: none confirmed — `core` has no audit-emission endpoint (ADR `0064`).
  Contract-first guidance only: `GET /api/v1/parent-student-links/{linkId}/audit-trail`.
- Tables: n/a (no persistent storage — in-memory mock store,
  `AUDIT_STORE: Record<string, LinkAuditEntry[]>`, keyed by `linkId`,
  independent of the active-links `STORE` array).
- Domain rules: append-only (unshift-only, never sort/mutate/delete);
  `note` non-null only for `action === "created"`; a failed mutation
  produces zero audit side-effects; `actorId`/`actorName` come only from the
  acting session's own `AuthContext`.
- UI surfaces: `PLAuditTrailSection` inside `PLDetailDialog`, below
  `PLConsentDetailSection`.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E20.3 --unit 1 --integration 1 --e2e 0 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | `GetLinkAuditTrailUseCase` delegate; mock repo `getLinkAuditTrail` (empty/seeded/post-emission); `recordAuditEntry` exactly-once-on-success / zero-on-failure for create AND unlink (incl. forged-role + cross-tenant forbidden cases); deterministic clock/ordering via `__setMockAuditClock`; note-only-on-created invariant |
| Integration | `makeParentLinksAuthContext()` actorId/actorName population; Server Action reuses existing `toActionResult`/`isRetryableFailure` (no regression) |
| E2E | Storybook interaction: all 4 section states, `l6` create→unlink→re-create ordering, note-visible vs note-absent, keyboard-reachable retry, color-independence spot-check |
| Platform | `tsc --noEmit` clean with extended `AuthContext`/`IParentStudentLinkRepository`; `bun run build` OK; grep confirms zero new references to `src/features/audit-log/` |
| Release | Design-review gate (tokens/a11y/states) |

## Harness Delta

- `docs/TEST_MATRIX.md` US-E20.3 row description updated to point at this
  packet (`docs/stories/epics/E20-parent-student-links/US-E20.3-link-audit-trail/`)
  instead of the bare ADR-`0064` backlog-stub description.
- `harness.db` `story` row for `US-E20.3` updated: `contract_doc` now points
  at this `story.md`; `notes` updated to reflect that the full packet
  (requirements/integration/use-cases/spec) now exists — status remains
  `planned` (spec-only, not yet implemented by `/fe`).
- No new ADR raised by this packet — ADR `0064` already resolved the shape
  question; this packet only resolves the remaining ENGINEERING mechanics
  (emission wiring, clock/determinism, actor sourcing) that the ADR
  deliberately left to the eventual story packet.
