# US-E18.29 Tenant Invitations — BE Wiring (list + resend)

## Status

implemented

## Lane

normal

## Dependencies

> Parallel branch workflow (decision `0025`). No other `feat/us-*`/`fix/*` branch
> in-flight as of 2026-08-01 (claim check: `git fetch --prune` + `git branch -r`
> clean) — solo, main checkout, no worktree needed.

- Depends on: none technically. Builds directly on US-E21.1 (screen shell,
  domain/use-cases/entity/failure union, presentation, `admin-invitations.di.ts`
  hybrid factory) and US-E18.23/US-E18.24 (`iam-directory` feature — `listMembers`
  raw:true+parseEnvelope cursor pattern, `batchLookup`/`batchResolveMembers`
  composition precedent for resolving a userId to a display name).
- Blocks: none.
- Feature module(s) chạm: `src/features/admin/invitations/` (all layers),
  `src/features/auth/infrastructure/repositories/iam-member.repository.ts` +
  `src/features/auth/domain/repositories/i-iam-member.repository.ts` (the two
  MOCK-ONLY guard methods `listInvitations`/`resendInvitation` become real),
  `src/features/auth/infrastructure/dtos/iam-member-response.dto.ts` (extend/
  reshape `InvitationResponseDto` → real `InvitationListItemResponse` shape),
  `src/bootstrap/di/admin-invitations.di.ts` (collapse hybrid → real/mock per
  `USE_MOCK`, mirroring `US-E18.23`/`US-E18.25`'s hybrid-repo-retirement
  precedent), `src/bootstrap/endpoint/iam-member.endpoint.ts` (add `.resend()`).
- Shared contract/file: `IIamMemberRepository` (list/resend signatures — now
  need `cursor`/`limit`/`status` query params + a `DirectoryPage`-shaped return,
  mirroring `i-iam-directory.repository.ts`'s `ListMembersParams`/`DirectoryPage`),
  `IamMemberFailure` (extend: `invitation-not-resendable` 409, `rate-limited` 429
  w/ `retryAfterSeconds`, `invalid-request` 400), `iam-directory` feature (consumed
  read-only for `invitedBy` display-name resolution via `batchLookup`).

## Product Contract

Admin (real system role `admin`, or platform `SUPER_ADMIN`) manages tenant-scoped
invitations at `(app)/admin/invitations`. This story un-mocks the invitation
**table** (list) and **resend** action — the epic's 5th fully-blocked operation
set (see `EPIC-OVERVIEW.md` asks #29/#30) — now that BE US-147 ships
`GET /iam/api/v1/tenants/{id}/invitations` (cursor-paginated, `status` filter) and
`POST /iam/api/v1/tenants/{id}/invitations/{invitationId}/resend` (same-row token
rotation). Send (invite) and revoke were already wired real by US-E21.1 and are
unaffected. Full contract + ground-truth in `integration.md` (this packet).

## Relevant Product Docs

- `docs/stories/epics/E21-tenant-invitations/US-E21.1-admin-invitations/` — prior
  art: screen shell, domain layer, presentation, `admin-invitations.di.ts` hybrid
  factory this story collapses to real.
- `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` — asks #29/#30 (to be
  marked RESOLVED).
- `docs/reports/2026-08-01-fe-to-be-asks.md` — FE's own confirmation that BE
  US-147 shipped asks #29/#30.
- `../edu-api/services/iam/docs/INTEGRATION.md` (footnotes ¹⁰/¹¹) +
  `services/iam/docs/openapi.yaml` (`InvitationListItem` schema) +
  `services/iam/docs/ERROR_CODES.md` (`invitation_not_resendable`,
  `rate_limit_exceeded`, `invalid_request_parameters`, `forbidden_action`,
  `invitation_invalid`) — ground-truth contract (see `integration.md` §GT).
- `docs/product/design-spec.jsonc` → `screens.invitations` — normative layout,
  unaffected by this wiring (no layout change).

## Acceptance Criteria

Condensed (full Given/When/Then to be confirmed by `fe-planner`/`fe-nextjs-engineer`
against US-E21.1's existing `use-cases.md` UC-001/UC-002/UC-005/UC-007, since this
story does not change UI shape, only the data source + a few reshapes):

- AC-1 List loads from the real `GET .../invitations` endpoint (mock mode still
  uses the mock repo); `status` query param IS forwarded server-side (BE supports
  it — no longer client-only filtering for status, though search/email substring
  stays client-side since BE has no `q=`/`search=` param on this endpoint).
- AC-2 Cursor pagination: `hasMore`/`nextCursor` drive a "load more" affordance
  consistent with this repo's existing paginated-list UX precedent (confirm with
  `fe-state-engineer` — infinite-scroll vs explicit button, check what a sibling
  admin list screen does, e.g. `iam-directory`-backed member listing).
- AC-3 `invitedBy` (a userId on the real wire) resolves to a display name via
  `iam-directory`'s `batchLookup` (admin caller passes its tiered RBAC per ¹³) —
  never renders a raw UUID; falls back to a stable placeholder (e.g. "—" or the
  truncated id) if the batch lookup itself fails (never blocks the whole list on
  a secondary failure).
- AC-4 Status vocabulary reshaped to the real wire (`PENDING|ACCEPTED|EXPIRED|
  REVOKED` uppercase → existing lowercase `InvitationStatus` union, already
  defined) — no behavior change needed here since the mock already modeled the
  same 4 values 1:1; `status=expired` returns near-permanently empty per BE's
  TTL-sweep note — the "expired" status tab must still render correctly (empty
  state, not an error) when this happens.
- AC-5 Resend: real POST, same-row in-place update (per BE footnote ¹¹, exactly
  as US-E21.1 already assumed and built the UI for) — no UI change needed beyond
  wiring; new error paths: 409 `invitation_not_resendable` (ACCEPTED/REVOKED —
  should be structurally unreachable since the UI only shows resend on `expired`
  rows, but map defensively), 429 `rate_limit_exceeded` with `Retry-After` header
  (surface as a distinct toast — "thử lại sau" with the wait time if available,
  not the generic network-error copy), 410 `invitation_invalid` (already mapped).
- AC-6 Expiry-selector (7/14/30-day) in the send dialog: confirm/preserve the
  UI-only behavior already documented by US-E21.1 (zero wire effect) — this story
  does NOT change the send flow, only list+resend. No new dishonesty is
  introduced (the selector's disconnect from reality predates this story and is
  send-dialog scope, not list/resend scope) — explicitly re-confirm in
  `integration.md` that this stays out of scope, do not silently expand scope to
  "fix" it.
- AC-7 `admin-invitations.di.ts` no longer force-mocks list/resend — collapses to
  the plain `USE_MOCK ? Mock : Real` gate (US-E18.23/US-E18.25 precedent), while
  the mock repository/mode is fully preserved for local dev + Storybook.
- AC-8 RBAC: real 403 (`forbidden_action`) from MANAGER/TEACHER tokens attempting
  list/resend (stricter than the member directory) maps to the existing
  `{ type: "forbidden" }`-equivalent failure and renders the existing
  error+retry (or a no-retry variant if 403 — confirm precedent) state; this
  should be unreachable in practice since the route is already `admin`-gated
  client-side, but the repository must still map it correctly (defense in depth,
  ADR 0063 precedent).

## Design Notes

- Commands: `resend-invitation` (existing use-case, now real transport).
- Queries: `list-invitations` (existing use-case, now real transport + real
  pagination + real status vocabulary).
- API (`iam` service):
  - `GET /iam/api/v1/tenants/{tenantId}/invitations?status=&cursor=&limit=` (US-147)
  - `POST /iam/api/v1/tenants/{tenantId}/invitations/{invitationId}/resend` (US-147)
  - (unaffected, already real) `POST .../invitations`, `DELETE .../invitations/{id}`
- Domain rules: tenantId always server-derived (NFR-006, unchanged); `invitedBy`/
  `createdAt` NOT re-attributed on resend (BE preserves original — entity/mapper
  must not overwrite these from the resend response in a way that would suggest
  re-attribution, though the response IS the authoritative row so a straight
  replace is correct); resend rate-limit is per-`invitationId`, not per-IP —
  surface distinctly from generic throttling if this repo has a shared
  rate-limit UI pattern (check precedent, e.g. any existing 429 handling).
- UI surfaces: no new surfaces — existing table/card-list/status-tabs/row-actions
  from US-E21.1 gain a real data source, possible "load more" control for
  pagination (if not already present), and a distinct resend-rate-limited toast.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E18.29 --unit 0 --integration 0 --e2e 0 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | domain: `list-invitations.use-case` (status passthrough, empty page), `resend-invitation.use-case` (ok / not-resendable / rate-limited / invalid); mapper: real DTO → entity (status/role case-fold, invitedBy passthrough as raw id pre-resolution) |
| Integration | `invitation.repository.ts` against real+mock HTTP boundary (raw:true+parseEnvelope pagination, error-code mapping for 400/403/409/410/429); `iam-member.repository.ts`'s now-real `listInvitations`/`resendInvitation` (envelope unwrap, error mapping); `invitedBy` resolution composition (iam-directory batchLookup call + fallback on its failure) |
| E2E | Storybook interaction: existing US-E21.1 stories re-verified green (list/resend now backed by a real-shaped repository call in the story harness, same UI); new/extended: load-more pagination, rate-limited resend toast, resolved invitedBy name render, expired-status-tab empty state |
| Platform | `bun build` + `tsc --noEmit` clean, both mock and real mode |
| Release | design-review gate — scope is data-source swap + possibly a load-more control + a new toast copy; run `/impeccable audit` if any new UI element (load-more button, rate-limit toast) is added, else document N/A rationale |

## Harness Delta

- `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md`: mark asks #29/#30 RESOLVED
  once implemented, cite this US.
- `docs/TEST_MATRIX.md`: add/flip US-E18.29 row to `implemented` with real proof
  once done.
- No ADR expected (reuses `iam-directory`'s established raw:true+parseEnvelope
  pagination pattern and US-E18.24's batch-resolve composition pattern, and
  US-E18.23/US-E18.25's hybrid-repo-collapse-to-real precedent — no new
  architecture/token/auth decision). Re-assess only if the load-more UX or the
  rate-limit toast turns out to need a genuinely new pattern this repo hasn't
  used before.

## Evidence

Ground-truthed IAM's US-147 additions directly against `../edu-api/services/iam/internal/membership/adapter/http/{invitation_handler.go,dto/invitation_dto.go}` + `docs/openapi.yaml`/`INTEGRATION.md`/`ERROR_CODES.md` (2026-08-01). Un-mocked `admin/invitations`'s list + resend, collapsing `admin-invitations.di.ts` from US-E21.1's hybrid force-mock to a plain `USE_MOCK` gate.

- **Ground-truth fidelity**: `InvitationListItem` fields, UPPERCASE `roles`/lowercase-on-this-DTO `status`, raw-userId `invitedBy`, error codes (`invitation_not_resendable` 409, `rate_limit_exceeded` 429 + `Retry-After`, `invalid_request_parameters` 400, `invitation_invalid` 410 reused, `forbidden_action` 403) all verified 1:1 by `fe-tech-lead-reviewer` against the Go source.
- **`invitedBy` resolution**: composed via `iam-directory`'s `BatchResolveMembersUseCase` as a function collaborator (not a repo instance) — mock mode uses an identity map, `iam-directory.di.ts` stays real-only untouched. Resolver rejection never fails the list (AC-3, proven by test).
- **Pagination**: `iam-directory`'s `{raw:true}`+`parseEnvelope` cursor pattern mirrored exactly, incl. the `raw`-must-be-top-level regression guard. Short-page-but-`hasMore:true` semantics proven by story `EmptyShortPageStillHasMore` (a self-found bug fix — load-more must not be gated on `showTable`).
- **State architecture** (`state-architecture.md`): `status` moved INTO the query key (`invitationKeys.list(tenantId, status)`, one `useInfiniteQuery` per tab); tab-count badges REMOVED (real pagination makes an accurate cross-tab count structurally impossible without eager-prefetching every tab); resend success/409 invalidate the whole `lists(tenantId)` subtree (a surgical per-row patch was explicitly rejected — resend moves a row across status partitions); 429 is toast-only, no invalidate, no lockout timer (explicit simplicity call).
- **design-system/i18n**: tokens-only (only a load-more button reuse + toast copy + a `showRetry`/`describedById` additive prop on 2 shared components); vi source + en mirror added together, typed `t()`, zero hardcoded strings.
- **fe-tech-lead-reviewer**: initial **Revision Required** — 1 MUST FIX (AC-8: 403 `forbidden_action` had no `InvitationFailure` member, fell to `unknown` with an unfixable retry button) + 2 SHOULD FIX (list-query retry not gated on a `retryable` flag; all 4 Server Actions in `admin/invitations/actions.ts` missing `requireRole("admin")` defense-in-depth, ADR 0063 precedent). All 3 + 3 CONSIDER items (unknown-status fallback hardening, `parseRetryAfter` negative/empty guard, dead `rawCount` wired back) fixed same-branch, each with a new test.
- **fe-accessibility-auditor**: 2 findings — A11Y-001 (blocking, WCAG 4.1.3 Status Messages: the async partial-search-results hint needed `role="status"`+`aria-live="polite"`, not `aria-describedby` alone) and A11Y-002 (major: an unconditional Load-More button beside an empty-state message needed an sr-only linking hint) — both fixed same-branch via additive props (`describedById` on the canonical `LoadMoreButton`, `showRetry` on `ListError`), zero forks.
- **Design-review gate**: `/impeccable audit` scoped to `invitations-status-tabs.tsx` (badge removal), `invitations-screen.tsx`+`load-more-button.tsx` (load-more + search hint), `list-error.tsx` (new no-retry state) — 0 findings on production code. 2 flagged hits in `list-error.stories.tsx` are em-dashes/numbered-markers inside code comments (not rendered UI copy) — confirmed N/A.
- **fe-qa-playwright**: **PASS/Go** — independently re-derived 8/8 AC (100% coverage), re-verified every review/a11y fix at the actual DOM/assertion level (not from self-report): AC-8 no-retry proven by DOM-absence query, both a11y fixes proven by exact ARIA-attribute assertions incl. negative cases, the retry-gating predicate proven via a real call-count spy through TanStack Query, `requireRole` proven for all 4 actions, the `pending`→`revoked` fallback regression correctly rewritten not left stale. Zero new defects.

**Proof**: `bunx tsc --noEmit` clean; `bun lint` clean (1 warning + 1 info, both pre-existing in `messaging/message-context-menu.tsx`, unrelated); `bunx vitest run` 443 files / 3191 tests pass (baseline 440/3166 before the review-fix pass, zero regression); `bunx vitest --config vitest.storybook.mts run` 151 files / 1132 tests pass (46/46 on `invitations-screen.stories.tsx` alone); `bun run build` green in both `NEXT_PUBLIC_USE_MOCK=true` and real mode (`/admin/invitations` compiled real-mode).

No ADR — additive `ApiError.retryAfterSeconds` field (first `Retry-After` consumer in this repo), DI hybrid-collapse (US-E18.23/25 precedent), and the one new query-key dimension (`status`) all reuse established patterns; nothing crossed into new architecture/token/auth territory.
