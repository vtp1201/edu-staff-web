---
name: social-feed-moderation-e19-baseline
description: US-E19.1 (feed) + US-E19.2 (moderation) integration contracts, shared moderate-delete endpoint, role-gate resolution, pin/unpin mock boundary
metadata:
  type: project
---

Integration maps written at `docs/stories/epics/E19-social/US-E19.1-social-feed/integration.md`
and `docs/stories/epics/E19-social/US-E19.2-content-moderation/integration.md`.

## Key facts
- `DELETE .../moderate-delete` is a SHARED endpoint: US-E19.1 (feed) renders only
  the menu entry point; US-E19.2 (moderation) OWNS the canonical contract
  (auth, confirm dialog, audit trail). Don't let both stories define it — US-E19.1's
  integration.md explicitly references US-E19.2's, doesn't redefine.
- Post pin/unpin (BE `social` US-101) has genuinely NO endpoint yet (status
  `in_progress`) — the only true mock-first item in this pair. Everything else
  (feed fetch, reactions, comments, reports, resolve, audit, moderate-delete) is
  stated as BE-implemented (US-097→100, US-098) but still has no published
  openapi.yaml — flagged as "REAL but contract-inference, verify with BE" rather
  than mock-first.
- FR-108 role-gate (destructive Remove-content) resolved by ba-lead directly in
  requirements.md to **`principal` only** (applying existing decision 0022, no
  new ADR) — despite design-spec.jsonc listing `["principal","admin"]`. Use this
  resolution, don't re-litigate.
- Notify-on-removal maps to **`noti`** service (not `social`) per the 5-service
  map — but it's a server-side side effect of social's moderate-delete call, not
  a direct FE-initiated HTTP call. No FE mock surface needed even if noti's
  event-type support is unconfirmed.
- `GET /api/v1/rooms/{roomId}/moderation-audit`'s `roomId` param name looks
  copy-pasted from a messaging/room contract — open question on what FE should
  actually pass for feed/moderation audit scope (classId/schoolId/tenant-scope).

## Error-mapping addition for this pair
403 FORBIDDEN on the destructive remove call MUST be visually distinct from
retryable transient errors (this is the NFR-101 "zero client-only trust" driver)
— no optimistic remove ever, dialog stays open on 403 with no retry button, vs.
retry button shown for 429/502/503/504.
