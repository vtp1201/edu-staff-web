# US-E21.1 Admin Tenant Invitation Management

## Status

in-progress

## Lane

normal

## Dependencies

- Depends on: none (US-E06.4 already wired `IIamMemberRepository.inviteMember`/`revokeInvitation`/`acceptInvitation` — this story extends that repo, does not replace it)
- Blocks: none technically; US-E21.2 (public accept) is only *meaningfully* end-to-end demoable once this story ships the invite-generation surface that produces real tokens (soft sequencing, not a hard dependency)
- Feature module(s) chạm: `src/features/auth/` (existing `IIamMemberRepository` extension — list/batch-send/resend) or a new `src/features/admin/invitations/` slice — `fe-component-architect`/`fe-lead` to decide canonical home, not decided here
- Shared contract/file: `bootstrap/endpoint/iam-member.endpoint.ts` (`IAM_MEMBER_EP.invitations`/`.invitation`), `src/features/auth/infrastructure/dtos/iam-member-response.dto.ts` (`InvitationResponseDto` — needs extension), `src/features/auth/domain/failures/iam-member.failure.ts`

## Product Contract

Admin (real system role `admin`, decision `0022`/`0024`) manages tenant-scoped
invitations at `(app)/admin/invitations`. Sends 1..N email invitations per
submit (chip input), each batch tied to exactly one role — from
`teacher|student|parent|manager|admin` (UI labels; `manager` is a display
alias for `principal`, `admin` is the real 5th system role — see spec.md §3
for the full mapping) — and one expiry (7/14/30 days, default 14). Views a
filterable/searchable table (status: pending/accepted/expired/revoked) and can
copy-link (pending), resend (expired), or revoke (pending, destructive
confirm) any row. Full engineering detail, traceability, and open questions
are in `spec.md` (this packet).

## Relevant Product Docs

- `docs/product/design-spec.jsonc` → `screens.invitations` (line ~4162)
- `docs/product/screens.md` — row "Tenant Invitations" (`(app)/admin/invitations`)
- `design_src/edu/invitations.jsx` — `InvitationsScreen`
- `docs/design-requests/DR-015-tenant-invitations.md`
- `docs/product/roles-permissions.md` — admin route-gate row (decision `0022`/`0024`)
- Sibling packet: `docs/stories/epics/E21-tenant-invitations/US-E21.2-invite-accept/` (public accept flow, out of this story's scope)

## Acceptance Criteria

Condensed — full Given/When/Then in `use-cases.md` (this packet), §4
(AC-001.x .. AC-007.x, 7 use cases). Summary by use case:

- UC-001 View invitation table: loading skeleton (5 rows), success table render, zero-invitations empty state + CTA, fetch-error state + retry, tenant-scoping invariant.
- UC-002 Filter and search: status-tab filter with count badges, email-substring search, combinable, distinct no-match empty state + clear-filters CTA.
- UC-003 Send invitation batch: chip input (valid/invalid/paste-multiple/keyboard-remove), role+expiry required, submit label reflects count, success toast + row(s) prepended, per-email server duplicate error, 422 validation, network error.
- UC-004 Copy invite link: pending-only, clipboard success/denied toast, action gated off non-pending rows.
- UC-005 Resend invitation: expired-only, row-level loading, in-place row update to pending on success, race/network error toasts.
- UC-006 Revoke invitation: pending-only, destructive confirm dialog, cancel path, loading, success (row dimmed 0.65 opacity, actions removed), not-found race, network error.
- UC-007 Expiry countdown: ≥3 days default text; <3 days bold + `alertTriangle` icon in `--edu-warning-text` (never color-only); expired = muted + `calendarX`; accepted/revoked = em-dash.

## Design Notes

- Route: `(app)/admin/invitations` — role-gated `admin` (decision `0022`/`0024`)
- Design file: `design_src/edu/invitations.jsx` — `InvitationsScreen`
- Commands (indicative, not binding on FE implementation naming): send-invite-batch, resend-invitation, revoke-invitation
- Queries: list-invitations (tenant-scoped, filter/search)
- API (`iam` service — see spec.md §6 for full contract + open questions):
  - `GET /iam/api/v1/tenants/{tenantId}/invitations` — list (repo method gap, needs adding)
  - `POST /iam/api/v1/tenants/{tenantId}/invitations` — send (existing single-email method under-shaped for FR-004's batch; `[OPEN QUESTION]` batch request shape)
  - `DELETE /iam/api/v1/tenants/{tenantId}/invitations/{invitationId}` — revoke (existing)
  - `POST /iam/api/v1/tenants/{tenantId}/invitations/{invitationId}/resend` — resend (best-effort/unconfirmed, `[OPEN QUESTION]`)
- Domain rules: tenantId always server-derived, never client-supplied (NFR-006); role+expiry apply to the whole batch, not per-email; countdown urgency never color-only (decision `0046`).
- UI surfaces: invitation table (+ mobile card-list <820px), status tabs + search toolbar, send-invite dialog (email chips, role radiogroup, expiry select), revoke confirm dialog, copy-link/resend/revoke row actions, loading/empty/error states (`EduSkeleton`/`EduError` per design-spec).

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E21.1 --unit 0 --integration 0 --e2e 0 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | domain use-cases: list-invitations (filter/search combination), send-invitation-batch (valid/duplicate/validation), resend-invitation (ok/invalid-state race), revoke-invitation (ok/not-found race) |
| Integration | `IIamMemberRepository` extension — list/batch-send/resend against mock + real HTTP boundary once BE contract confirmed |
| E2E | Storybook interaction: Loading / EmptyNoInvitations / EmptyNoMatch / Error+Retry / SendDialog (chip states) / CopyLink / Resend / RevokeConfirm / RevokedRow / CountdownVariants |
| Platform | `bun build` + `tsc --noEmit` clean |
| Release | design-review gate pass (`docs/DESIGN_REVIEW.md`) |

## Evidence

Design review: pass
- design-system: conform — tokens-only (no raw color), role/status badge tones
  match `design-spec.jsonc` `roleBadgeColors`/`statusBadges` 1:1, `StatusBadge`
  gains one additive `error-dark` tone (existing tokens, no ADR), `TagChipsInput`
  gains one additive `validate`/`invalidDescribedBy` prop pair (backward-compatible,
  `lesson-plan`/`question-bank` consumers unaffected and re-verified green),
  `DestructiveConfirmDialog`/`EmptyState` reused directly with zero fork.
- a11y: WCAG AA — 5 findings from `fe-accessibility-auditor` (A11Y-001/002
  blocking, A11Y-003/004 major, A11Y-005 minor) all fixed and re-verified:
  invalid email chips now carry `aria-invalid`+`aria-describedby`; status-tab
  count badge contrast fixed (~2.67:1 → ~11.5:1); Dialog/AlertDialog focus-restore-
  to-invoker fixed at the SHARED primitive level (`components/ui/dialog/dialog.tsx`
  + `components/shared/destructive-confirm-dialog/destructive-confirm-dialog.tsx`,
  via the pre-existing `useDialogReturnFocus` hook) — this is a cross-cutting fix
  benefiting every Dialog/AlertDialog consumer repo-wide (~50 combined), not just
  this screen; loading skeleton gains an `sr-only role="status"` announcement;
  mobile status-tab height bumped to the 44px touch-target floor. Keyboard-only
  and reduced-motion paths verified.
- impeccable audit: `node .claude/skills/impeccable/scripts/detect.mjs` on
  `src/features/admin/invitations/presentation/invitations-screen`,
  `components/shared/tag-chips-input`, `components/shared/status-badge`,
  `components/shared/destructive-confirm-dialog`, `components/ui/dialog` — 0
  findings, no anti-patterns.
- states: loading/empty(×2)/error+retry/success all present per UC-001/002/009,
  responsive: desktop table + mobile card-list (<820px) verified.

Disclosure: the shared Dialog/DestructiveConfirmDialog focus-restore fix touches
~50 consumers repo-wide (every Dialog/AlertDialog usage), not just this screen.
Regression was A/B-isolated by the engineer (reverting only the 2 shared files
reproduces an identical pre-existing baseline failure count in this repo's
Storybook interaction runner, confirming the ~66 failing stories are an
env-wide/pre-existing issue unrelated to this change, not a regression this
story introduced) — targeted re-run of all Dialog/DestructiveConfirmDialog
consumers plus this screen's 17 stories: 77/77 pass. Full suite (`bun vitest run`):
352 files / 2258 tests pass; `tsc --noEmit` clean; `bun lint` clean (excluding a
pre-existing unrelated warning/info in `messaging`); `bun run build` green in
both mock and real mode (`NEXT_PUBLIC_USE_MOCK` unset).

Follow-up (not blocking this story, flagged for `fe-lead`/team): the ~66
pre-existing Storybook interaction failures observed as an env-wide baseline
during this story's Dialog-fix regression check do not appear to be tracked by
any existing story/ticket — worth a dedicated investigation before they mask a
real regression in a future story.

## QA Gate (fe-qa-playwright, independent AC re-derivation)

Verdict at first pass: **Conditional Pass**. QA independently mapped all 42 ACs
(UC-001..UC-007) to a specific test, wrote 9 new/extended Storybook interaction
tests closing real coverage gaps (17→26 passing stories: AC-001.5 retry-still-fails,
AC-002.5 clear-filters, AC-004.2 clipboard denied/unavailable, AC-005.4/.5
resend race+network, AC-006.6/.7 revoke race+network, NFR-001 keyboard-only
completion), and found 2 defects:

- **DEF-1 (MAJOR, FIXED)**: pressing Escape while the send-dialog's expiry
  `Select` listbox was open closed BOTH the listbox AND the whole Send-Invite
  `Dialog`, silently discarding all typed email chips — Select and Dialog each
  ran independent, uncoordinated Escape-key handling. Fixed by making the
  `Select`'s open state fully controlled (`invitation-expiry-select.tsx`) and
  intercepting Escape via a document-level CAPTURE-phase listener in
  `send-invitation-dialog.tsx` while the popover is open — capture-phase runs
  before either Select's or Dialog's own (bubble-phase) Escape handling, so
  `stopPropagation`+`preventDefault` there reliably suppresses both, and the
  Select is closed manually via the controlled `open` prop instead. Regression
  story added: `SendDialogEscapeOnOpenSelectKeepsDialogOpen` (asserts the
  listbox closes, the Dialog + already-typed chip remain). Re-verified:
  `invitations-screen.stories.tsx` 27/27 pass (was 26/26 before this test);
  full suite unaffected (352 files / 2258 tests); `tsc --noEmit` clean;
  `bun lint` clean.
- **DEF-2 (MAJOR, closed as N/A)**: AC-003.11 (422 inline field-validation
  errors) has no real implementation path — the real IAM wire never returns a
  `"validation"`-typed failure for the invite endpoint (only this feature's own
  client-side empty-batch check produces one), and it is practically
  unreachable via the UI regardless (submit is gated on ≥1 valid chip + role +
  expiry already at valid defaults). Formally closed as N/A for this story;
  revisit with `ba-lead` only if BE ever adds real 422 field validation to the
  invite endpoint.

Final verdict after DEF-1 fix: **Go**. 40/42 ACs fully proven by an existing or
newly-added test, 1 (AC-003.12 send-network-error) has an implicit-but-not-
dedicated story (low risk, toast copy reused from other flows — tracked as a
non-blocking follow-up, not required for this story to close), 1 (AC-003.11)
formally N/A per above.

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E21.1 (planned, normal lane)
- `docs/product/screens.md`: already has a design-ready row for this screen (see Relevant Product Docs) — update status to spec-ready once this spec lands
- No ADR required for this story — OQ-1 (role vocabulary) already resolved by `ba-lead` without a new decision record (existing decision `0022` covers it, see `spec.md` §8)
- Open contract questions (batch-send shape, resend endpoint shape, missing DTO fields `invitedBy`/`createdAt`/`token`, server- vs client-side filter/search) are carried to `fe-lead`/BE team in `spec.md` §8 — not blocking spec completion, but block `/fe` implementation of the affected FRs until resolved
