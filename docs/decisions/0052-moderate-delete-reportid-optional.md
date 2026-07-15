# 0052 Moderate-delete `reportId` becomes optional (direct removal without a prior report)

Date: 2026-07-15

## Status

Accepted

## Context

US-E19.2 (Content Moderation) shipped `IModerationRepository.removeContent(input: RemoveContentRepoInput)`
with `reportId: string` **required** — every removal in that screen resolves an
existing report row, so a `reportId` is always in scope.

US-E19.1 (Social Feed) reuses this exact use-case/repository (`makeRemoveContentUseCase()`,
`src/bootstrap/di/moderation.di.ts`) for its own "…" menu **Gỡ nội dung** entry
point (FR-012), by design — the story's spec is explicit that Remove must
delegate entirely to US-E19.2's flow, not reimplement a second delete call. But
a moderator (principal/teacher) removing a post/comment directly from the feed
has **no report in scope** — there is no `reportId` to supply. The shared
contract's required field blocks this legitimate direct-removal path.

## Decision

Make `RemoveContentRepoInput.reportId` **optional** (`reportId?: string`) in
`src/features/moderation/domain/repositories/i-moderation.repository.ts`.
`RemoveContentUseCase` stays a pure passthrough (no change). The real
`ModerationRepository.removeContent()` and `MockModerationRepository.removeContent()`
send/handle `reportId` when present (queue-resolution audit trail path,
US-E19.2's own flow) and omit/no-op it when absent (feed's direct-removal path
— the BE endpoint is the same `DELETE .../moderate-delete`; the audit trail
still records `removedBy`/`removedAt`, just without a linked report row).

Rejected alternative: feed synthesizes an implicit report before removing —
rejected because it invents a phantom report record purely to satisfy a type,
pollutes the moderation queue/audit data with fake entries, and adds a second
round-trip for no product value.

## Alternatives Considered

1. Feed synthesizes an implicit/throwaway report immediately before calling
   remove, just to obtain a `reportId`. Rejected — pollutes moderation data,
   extra round-trip, no product benefit.
2. Feed forks its own second `removeContent`-shaped call bypassing the shared
   use-case. Rejected — directly violates the story's own scope contract
   ("no second delete call, no second confirm dialog implemented here",
   FR-012) and creates two moderate-delete code paths to maintain.

## Consequences

Positive:

- Single moderate-delete implementation continues to serve both stories exactly
  as FR-012 requires — no duplicated delete logic.
- `ModerationRepository`/`MockModerationRepository` need only a small
  optional-handling tweak (skip sending `reportId` in the request body when
  undefined); existing US-E19.2 call sites (`resolveNote`/`reportId` always
  supplied there) are unaffected — this is a backward-compatible widening, not
  a breaking change.

Tradeoffs:

- The BE audit-log payload's `reportId` field must tolerate `null`/absent for
  direct removals; if the real `social` service payload strictly requires a
  `reportId`, this needs BE confirmation before `NEXT_PUBLIC_USE_MOCK=false`
  ships for feed's remove path (tracked as an integration risk in
  `US-E19.1/integration.md`, not a new open question here).

## Follow-Up

- `fe-nextjs-engineer` implementing US-E19.1 Phase 5: widen the type, adjust
  `ModerationRepository`/`MockModerationRepository` to treat `reportId` as
  optional (send only when present; mock skips the report-lookup branch when
  absent), and add a test asserting direct removal (no `reportId`) succeeds
  against the mock.
- No i18n/UI change required — this is a domain/infrastructure-layer contract
  widening only.
