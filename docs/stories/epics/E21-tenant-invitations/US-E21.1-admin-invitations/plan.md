# Implementation Plan — US-E21.1 Admin Tenant Invitation Management

Status: ready for `/fe`. Branch: `feat/us-e21.1-admin-invitations` (claimed).
Ground truth: `integration.md` §6 (fe-lead correction, 2026-07-18) supersedes
every `[OPEN QUESTION]` in `requirements.md`/`use-cases.md`/`spec.md`. This
plan builds against §6, not the superseded sections.

## 0. Ground-truth recap (binding on every phase below)

- REAL today: send (`inviteMember`, N sequential calls, one per email),
  revoke (`revokeInvitation`) — both already exist on `IIamMemberRepository`.
- PERMANENTLY MOCK (not "pending BE"): list, resend, copy-link token source,
  `invitedBy`/sentDate columns, countdown base data beyond a freshly-sent
  row's own `expiresAt`. Mirrors `staff-leave.di.ts` (force-mock regardless
  of `NEXT_PUBLIC_USE_MOCK`), composed via `class-management.di.ts`'s
  proven **hybrid delegate** pattern (real methods `.bind()`ed through,
  mock methods delegated) — this story's DI does the same, not the
  fully-forced-mock shape.
- Role wire vocab: 6 UPPERCASE values on the wire
  (`ADMIN MANAGER TEACHER STAFF STUDENT PARENT`); UI's 5 radio options map
  1:1 by uppercasing (`manager`→`"MANAGER"`, `admin`→`"ADMIN"` — **no
  alias/collapse**, unlike the unrelated login-time `ROLE_ENUM_TO_APP`
  mapping in `role-meta.ts`). Status wire values also UPPERCASE
  (`PENDING|ACCEPTED|EXPIRED|REVOKED`) — lowercase in the mapper, same
  pattern as `TenantMembership`.
- Revoke error code confirmed `invitation_invalid` → already-mapped
  `{ type: "invitation-invalid" }` in `IamMemberFailure`. No failure-union
  change needed for revoke.
- Expiry SELECT (7/14/30d) has zero wire effect — keep it per AC-003.6/7 +
  design-spec, comment at the mock boundary that it's UI-only today.

## 1. Canonical-home recap (already decided, not re-litigated)

- Extend `IIamMemberRepository` (auth feature) with 2 new methods:
  `listInvitations(tenantId, params?)` and `resendInvitation(tenantId, invitationId)`
  — both mock-only implementations (the real `IamMemberRepository` class does
  not implement a real HTTP branch for these; only the mock repo does).
- New feature module `src/features/admin/invitations/{domain,infrastructure,presentation}/`
  (matches `admin/staffing`, `admin/class-management` convention) with its
  OWN narrower `IInvitationRepository` domain interface.
- New `src/bootstrap/di/admin-invitations.di.ts` — composition root that
  adapts `IamMemberRepository`/`MockIamMemberRepository`'s methods into this
  feature's `IInvitationRepository`, using the `class-management.di.ts`
  hybrid-delegate shape.
- Route: `src/app/[locale]/t/[tenant]/(app)/admin/invitations/{page.tsx,actions.ts}`
  (RBAC already enforced by `admin/layout.tsx`, decision 0022/0024 — no new
  guard needed).

## 2. Phased breakdown

### Phase 0 — Extend `IIamMemberRepository` (auth feature, shared)

Goal: add the 2 new invitation-shaped methods to the existing IAM repo
contract + DTO, without touching `inviteMember`/`revokeInvitation`'s real
behavior.

Files:
- `src/features/auth/domain/repositories/i-iam-member.repository.ts` — add
  `listInvitations(tenantId: string, params?: { status?: InvitationStatus; q?: string }): Promise<Invitation[]>`
  and `resendInvitation(tenantId: string, invitationId: string): Promise<Invitation>`
  to the interface (JSDoc: "mock-only — no real BE route exists, see
  integration.md §6").
- `src/features/auth/domain/entities/invitation.entity.ts` (NEW) —
  `Invitation { invitationId, tenantId, email, roles: string[] /* lowercased already-mapped role, e.g. "principal" not "MANAGER" */, status: "pending"|"accepted"|"expired"|"revoked", invitedBy: string, sentAt: string, expiresAt: string }`.
  Lives in `auth/domain` (shared shape) since `IIamMemberRepository` is the
  contract owner — the admin-invitations feature's own domain entity (Phase 1)
  is a *different*, screen-shaped type that the DI adapter maps into (keeps
  `auth/domain` unaware of the admin screen, per layer rules).
- `src/features/auth/infrastructure/dtos/iam-member-response.dto.ts` — extend
  `InvitationResponseDto` with a comment marking `invitedBy`/`sentAt`/`status`/
  `tenantId` as **mock-only fields, never present on the real wire response**
  (real `InvitationResponse` is `{invitationId, email, roles[], expiresAt}`
  only, per integration.md §6.3) — do NOT let the real `IamMemberRepository.inviteMember`
  try to parse these; it stays `Promise<void>` (fire-and-forget) exactly as
  today.
- `src/features/auth/infrastructure/repositories/mocks/iam-member.mock.repository.ts`
  (NEW — no mock repo exists yet for this interface; check `USE_MOCK`
  gate wiring at `bootstrap/lib/mock.ts` for the existing convention) —
  implements the full `IIamMemberRepository` including `listInvitations`/
  `resendInvitation` against an in-memory fixture list (module-level mutable
  state reset per `new`, same convention as `MockStaffingRepository`).
- `src/features/auth/infrastructure/repositories/mocks/fixtures.ts` (NEW) —
  seed ~8-10 invitations spanning all 4 statuses + urgent/normal/expired
  countdown variants (see Phase 3 Storybook state list) + at least one row
  per role badge color.

Test first: none (pure interface/entity/DTO addition, no behavior yet) —
covered by Phase 1's use-case tests exercising the mock repo through the
new feature's own interface, and a thin
`iam-member.mock.repository.test.ts` asserting `listInvitations`/`resendInvitation`
against fixtures (status transition, race-error branch).

Done when: `tsc --noEmit` clean, mock repo test green.

### Phase 1 — `admin/invitations` domain layer (TDD-first)

Goal: pure domain — entities, failures, own repository interface, use-cases
for list/send-batch/resend/revoke, independent of the auth feature's types.

Files:
- `src/features/admin/invitations/domain/entities/invitation.entity.ts` —
  screen-shaped `Invitation` (id, email, role: `"teacher"|"student"|"parent"|"principal"|"admin"`
  — already-mapped app-facing role, `manager` UI label resolved to
  `"principal"` display purely in presentation, NOT stored as a distinct
  value; status; invitedBy; sentAt; expiresAt) + `InvitationStatus` union +
  `SendInvitationBatchInput { emails: string[]; role: InviteRoleOption; expiryDays: 7|14|30 }`
  where `InviteRoleOption = "teacher"|"student"|"parent"|"manager"|"admin"`
  (the UI-facing 5-value type — mapping to wire happens in infra, Phase 2).
- `src/features/admin/invitations/domain/failures/invitation.failure.ts` —
  narrow union: `{type:"network-error"}|{type:"invalid-state"}|{type:"invitation-invalid"}|{type:"validation"; fields:{field:string;message:string}[]}|{type:"unknown"}`.
  (`"invitation-invalid"` reused verbatim to match the real revoke wire per
  ground-truth #6 — do not invent `"not-found"`.)
- `src/features/admin/invitations/domain/repositories/i-invitation.repository.ts` —
  `listInvitations(): Promise<Result<Invitation[], InvitationFailure>>`,
  `sendInvitationBatch(input): Promise<Result<SendBatchOutcome, InvitationFailure>>`
  where `SendBatchOutcome = { succeeded: {email:string; invitationId:string}[]; failed: {email:string; failure: InvitationFailure}[] }`
  (per-email reconciliation shape — needed because the real send is a
  client-side fan-out of N calls, ground-truth #2/#4/#7),
  `resendInvitation(invitationId): Promise<Result<Invitation, InvitationFailure>>`,
  `revokeInvitation(invitationId): Promise<Result<void, InvitationFailure>>`.
- `src/features/admin/invitations/domain/use-cases/list-invitations.use-case.ts`
  + `.test.ts` — thin orchestration + the **filter/search combination logic**
  (UC-002, AC-002.1-5): given raw list + status tab + search term, return
  filtered rows AND a flag distinguishing "zero raw" (AC-001.3) vs
  "zero filtered from non-empty raw" (AC-002.4) — this is the one use-case
  with real logic worth unit-testing (pure function, no repo call needed for
  the filter part; the repo call is a thin passthrloop test).
- `.../send-invitation-batch.use-case.ts` + `.test.ts` — **the core TDD
  target of this phase**: given `SendInvitationBatchInput`, (a) dedupe
  same-email-twice-in-batch client-side per AC-003.4/OQ-A (ba-lead didn't
  reject this — plan assumes merge, flag as resolved-by-implementation
  choice, see §4 open questions), (b) map UI role → wire role
  (`manager`→`MANAGER` etc, ground-truth #4) is infra's job, use-case stays
  role-format-agnostic and just passes the `InviteRoleOption` through; (c)
  call `repo.sendInvitationBatch`, (d) return the per-email
  succeeded/failed split untouched for presentation to build the toast
  count + inline per-chip errors. Test matrix: all-succeed, all-fail
  (network), partial (1 duplicate fails, N-1 succeed), duplicate-in-batch
  dedup.
- `.../resend-invitation.use-case.ts` + `.test.ts` — ok path + race
  (`invalid-state`) path (AC-005.4).
- `.../revoke-invitation.use-case.ts` + `.test.ts` — ok path + race
  (`invitation-invalid`, AC-006.6) path — reuse the SAME failure type the
  real repo throws (Phase 2 maps `IamMemberFailure["invitation-invalid"]` →
  this union's `"invitation-invalid"`, 1:1, per ground-truth #6).

Test first (red→green order): `send-invitation-batch.use-case.test.ts` →
`revoke-invitation.use-case.test.ts` → `resend-invitation.use-case.test.ts` →
`list-invitations.use-case.test.ts` (filter logic). Mock the
`IInvitationRepository` interface per test — no HTTP/mock-repo coupling at
this layer.

Done when: all 4 use-case test files green, domain has zero imports outside
itself.

### Phase 2 — Infrastructure + DI (adapter over existing IAM repo)

Goal: wire this feature's `IInvitationRepository` on top of the (extended)
`IIamMemberRepository`, without forking a second HTTP client class.

Files:
- `src/features/admin/invitations/infrastructure/mappers/invitation.mapper.ts`
  — `toUiRole(wireRole: string): AppFacingRole` (uppercase wire → lowercase
  app role, 1:1 per ground-truth #4, e.g. `"MANAGER"`→`"principal"`... wait,
  reconcile: ground-truth #4 says NO alias — `manager`→`"MANAGER"` is a
  distinct wire value from `admin`→`"ADMIN"`, and this repo's own
  `Invitation.role` should therefore be a **6th-ish app value** distinct
  from `role-meta.ts`'s `UserRole`. Model it as its own
  `InvitationRole = "teacher"|"student"|"parent"|"manager"|"admin"` (mirrors
  the UI's 5 options 1:1, lowercased) — do NOT reuse `UserRole`/`appRoleOf`
  from `role-meta.ts` (different mapping, different purpose, ground-truth
  #4 explicit warning). Also `toWireStatus`/`fromWireStatus` (UPPERCASE
  ↔ lowercase, mirrors `TenantMembership`'s `MembershipStatus` handling).
- `src/features/admin/invitations/infrastructure/repositories/invitation.repository.ts`
  (`'server-only'`) — implements `IInvitationRepository`:
  - `sendInvitationBatch`: fan-out — `Promise.allSettled(emails.map(email => iamRepo.inviteMember(tenantId, {email, roles:[toWireRole(role)]})))`,
    reconcile each settled result into `succeeded`/`failed` (map
    `IamMemberFailure` → this feature's `InvitationFailure` via a 1:1
    passthrough for `"invitation-invalid"`/`network-error`/`unknown`, and
    `"validation"` for any 422). `expiryDays` accepted in the input but
    **not sent** on the wire (no-op field, comment explaining why per
    ground-truth #2) — kept only so the mock list can render a
    locally-computed countdown for the just-sent row.
  - `revokeInvitation`: direct passthrough to `iamRepo.revokeInvitation`.
  - `listInvitations`/`resendInvitation`: delegate to
    `iamRepo.listInvitations`/`iamRepo.resendInvitation` (Phase 0's
    mock-only methods) — this repo class itself has NO real HTTP call for
    these two; it simply forwards to whatever `iamRepo` instance it was
    constructed with (which Phase-2's DI factory guarantees is always the
    mock one for these 2 methods, real for the other 2 — see below).
- `src/bootstrap/di/admin-invitations.di.ts` (NEW, `'server-only'`) —
  mirrors `class-management.di.ts`'s hybrid-delegate shape exactly:
  ```
  export async function makeInvitationRepository(): Promise<IInvitationRepository> {
    await ensureFreshSession();
    const iamReal = new IamMemberRepository(await createServerHttpClient());
    const iamMock = new MockIamMemberRepository(); // Phase 0
    // send/revoke real-or-mock per USE_MOCK; list/resend ALWAYS iamMock
    // (mirrors staff-leave.di.ts's force-mock precedent, scoped to just
    // these 2 ops rather than the whole repo, matching class-management.di.ts)
    const iamForMutations = USE_MOCK ? iamMock : iamReal;
    return new InvitationRepository(iamForMutations, iamMock /* list/resend always mock */);
  }
  export async function makeListInvitationsUseCase() { ... }
  export async function makeSendInvitationBatchUseCase() { ... }
  export async function makeResendInvitationUseCase() { ... }
  export async function makeRevokeInvitationUseCase() { ... }
  ```
  (`InvitationRepository`'s constructor takes 2 collaborators —
  `mutationsIamRepo` for send/revoke, `listIamRepo` for list/resend — so the
  force-mock scoping is explicit at the type level, not a runtime branch
  inside the class.)

Test first: `invitation.repository.test.ts` (integration-boundary) —
asserts (a) `sendInvitationBatch` issues N `inviteMember` calls and
correctly splits succeeded/failed on a mixed `Promise.allSettled` result;
(b) `revokeInvitation` maps `invitation_invalid` → `{type:"invitation-invalid"}`
unchanged; (c) `listInvitations`/`resendInvitation` always resolve through
the injected mock regardless of a `USE_MOCK=false` env stub (proves the
force-mock scoping, same style as `class-management.repository.test.ts`
precedent if one exists — else pattern after `staffing.repository.test.ts`).

Done when: repository test green, `admin-invitations.di.ts` factories
compile and are exported from `bootstrap/di/index.ts`.

### Phase 3 — Presentation

Goal: table + toolbar + dialogs + row actions + mobile card variant, all 4
UI states, matching `design_src/edu/invitations.jsx` 1:1.

Component tree (hand off exact prop contracts to `fe-component-architect`):

```
InvitationsScreen (RSC boundary: receives initialInvitations + Server Action refs)
├── PageHeader (title + "Làm mới" + "Gửi lời mời" actions)
├── StatusTabs (tablist, count badges — derived client-side from full list)
├── SearchInput (debounced)
├── states: EduSkeleton(rows=5) | EduError(retry) | EduEmpty(2 variants: noInvitations CTA / noMatch clearFilters) | table
├── InvitationsTable (≥820px) / InvitationsCardList (<820px) — SAME row-action
│   props, just layout swap (design-spec "mobileVariant")
│   └── per row: EmailCell, RoleBadge, InvitedByCell, SentDateCell,
│       ExpiryCountdownCell (UC-007, 4 branches — pure derived component,
│       own small unit/story matrix, no async state)
│       StatusBadge (reuse `components/shared/status-badge` — grep confirms
│       existing canonical home, extend tone map if a status tone is
│       missing, do NOT fork)
│       RowActions (copy-link | resend | revoke — gated by status)
├── SendInvitationDialog (opens on CTA)
│   ├── EmailChipsInput (reuse `components/shared/tag-chips-input` — grep
│   │   confirms existing canonical chip-input component; EXTEND for
│   │   email-format validation styling if it doesn't already support
│   │   valid/invalid chip variants, do NOT fork a new chip component)
│   ├── RoleRadioGroup (5 options, role-tinted active style per design-spec)
│   ├── ExpirySelect (7/14/30, default 14 — comment: UI-only, no wire effect)
│   └── SubmitButton (count-aware label, aria-busy)
└── RevokeConfirmDialog — REUSE `components/shared/destructive-confirm-dialog`
    directly (per US-E19.2 precedent in memory: shared dialog owns
    DI/use-case-agnostic confirm UX, consumer wires its own action) — do
    NOT fork a new confirm dialog.
```

ViewModel contracts (`fe-component-architect` to finalize, seed below):
- `invitations-screen.i-vm.ts`: `InvitationRowVM { id,email,role,roleLabel,status,statusLabel,invitedBy,sentAtLabel,countdown: {variant:"normal"|"urgent"|"expired"|"na"; text; icon?} , actions:{copyLink:boolean;resend:boolean;revoke:boolean} }` — all label/i18n resolution happens in the VM-building step at the presentation boundary (server-key → translated string), not in domain.
- Action props: `onRefresh`, `onSendBatch(input): Promise<SendBatchActionResult>`, `onResend(id)`, `onRevoke(id)`, `onCopyLink(row)` (client-only, no server action — constructs URL from row data already in VM).

State classification (hand off to `fe-state-engineer`):
- **Server** (TanStack Query): the invitation list. Key hierarchy:
  `["admin-invitations", tenantId]` root; no per-row keys needed (list is
  small, whole-list refetch is fine per OQ-B's "stale until next fetch"
  resolution — no realtime requirement). Initial data seeded from the RSC
  `initialInvitations` prop (`initialData` option), refetch on `onRefresh`
  and after any mutation settles.
- **Optimistic mutations**:
  - send: NOT optimistic per AC-003.12 ("no optimistic row added" on
    network error) — wait for the fan-out result, then invalidate/refetch
    the list query on any success (even partial).
  - resend: optimistic row-level `status→pending` + spinner is
    presentation-local (row-level `isPending` from the mutation's own
    `isPending` flag, not a query-cache optimistic patch) — on success,
    invalidate list query for authoritative refresh (server-truth per
    AC-005.3/5.4).
  - revoke: same pattern — row-level pending state from mutation, then
    invalidate on settle (success or not-found race, both trigger refetch
    per AC-006.5/6.6).
- **URL state**: none required (status tab + search are local component
  state per UC-002 — no deep-linking requirement in any AC).
- **Local-form**: chip input array + role radio + expiry select — plain
  `useState` in `SendInvitationDialog`, no react-hook-form needed (small
  form, custom chip validation loop already bespoke).
- **RSC↔client boundary**: `page.tsx` (RSC) calls `makeListInvitationsUseCase()`
  once for `initialInvitations`, passes as VM props + all Server Action refs
  to `InvitationsScreen` ('use client'), matching `staffing/page.tsx` shape
  exactly (no new boundary pattern needed).

i18n keys (namespace `invitations`, both `vi.json`+`en.json`, add all at
once):
```
invitations.pageTitle, .refresh, .sendInvite,
invitations.tabs.{all,pending,accepted,expired,revoked},
invitations.search.placeholder,
invitations.table.columns.{email,role,invitedBy,sentDate,expiry,status,actions},
invitations.roleLabels.{teacher,student,parent,principal,admin} (principal label = "BGH" per DR-015/manager display),
invitations.statusLabels.{pending,accepted,expired,revoked},
invitations.countdown.{daysLeft (ICU plural), expiredOn, notApplicable},
invitations.empty.{noInvitationsTitle,noInvitationsCta,noMatchTitle,clearFiltersCta},
invitations.error.{title,description,retry},
invitations.sendDialog.{title,emailChipsLabel,emailChipsPlaceholder,invalidEmailError,roleLabel,expiryLabel,expiryOptions (7/14/30, ICU plural "ngày"),submitOne,submitMany (ICU plural)},
invitations.toast.{sentOne,sentMany,duplicateEmail,networkError,copiedLink,clipboardDenied,resentTo,resendRaceError,resendNetworkError,revokedOf,revokeNotFoundRace,revokeNetworkError},
invitations.revokeDialog.{title,body,cancel,confirm},
invitations.a11y.{removeChip,rowActionsLabel}
```

Storybook states (`invitations-screen.stories.tsx`, per spec.md §5 + story.md
E2E row):
1. `Loading` — 5-row skeleton.
2. `Success` — full table, all 4 statuses represented, all countdown
   variants visible.
3. `EmptyNoInvitations` — zero rows, CTA opens send dialog.
4. `EmptyNoMatch` — filter/search active, zero matches, Clear-filters CTA.
5. `Error` — fetch failed, retry button (interaction test: click retry →
   loading → success, matching design-spec's "failedOnce ref" demo pattern
   used elsewhere).
6. `SendDialogChipStates` — valid chip, invalid chip + inline error,
   paste-multiple, duplicate-in-batch merge, keyboard removal.
7. `SendDialogSubmitting` — spinner/aria-busy, count-aware label (1 vs N).
8. `SendDialogPartialFailure` — 3 succeed + 1 duplicate-fails toast/inline
   composition.
9. `CopyLink` — success toast + clipboard-denied toast variant.
10. `ResendRowLoading` / `ResendSuccess` / `ResendRaceError`.
11. `RevokeConfirmDialog` (idle/confirming/cancel) / `RevokeSuccess`
    (0.65 opacity + actions removed) / `RevokeNotFoundRace`.
12. `CountdownVariants` — isolated `ExpiryCountdownCell` story: normal
    (≥3d), urgent (<3d, bold+alertTriangle+`--edu-warning-text`), expired
    (muted+calendarX), n/a (em-dash for accepted/revoked).
13. `MobileCardList` (<820px viewport addon) — same data/actions as desktop
    table.

Done when: all 13 stories pass interaction tests, `fe-tech-lead-reviewer` +
`fe-accessibility-auditor` gates + design-review gate green.

### Phase 4 — RSC page + Server Actions

Files:
- `src/app/[locale]/t/[tenant]/(app)/admin/invitations/page.tsx` — mirrors
  `admin/staffing/page.tsx` shape: `const repo = await makeInvitationRepository(); const list = await repo.listInvitations(); <InvitationsScreen initialInvitations={...} onRefresh={refreshAction} onSendBatch={sendBatchAction} onResend={resendAction} onRevoke={revokeAction} onCopyLink={/* client-only, no action needed */} />`.
- `.../actions.ts` (`'use server'`) — `refreshAction`, `sendInvitationBatchAction(input)`,
  `resendInvitationAction(id)`, `revokeInvitationAction(id)` — each calls the
  matching `make*UseCase()` from `admin-invitations.di.ts`, returns
  `{ok:true, ...}` / `{ok:false, errorKey}` shape (matches `staffing/actions.ts`
  convention exactly — translate `errorKey` at presentation via
  `tErrors(errorKey)`).

Test first: none new (actions are thin `'use server'` wrappers — covered by
Phase 3's Storybook interaction tests exercising the action props via
mocked callbacks; no dedicated actions.test.ts in this repo's convention
for other admin/* screens either, per grep of `staffing/actions.ts`).

Done when: `bun build` + `tsc --noEmit` clean, page renders through the
existing `admin/layout.tsx` guard with zero new route-gate code.

## 3. Test matrix summary (maps to story.md §Validation)

| Layer | File(s) |
| --- | --- |
| Unit | `send-invitation-batch.use-case.test.ts`, `revoke-invitation.use-case.test.ts`, `resend-invitation.use-case.test.ts`, `list-invitations.use-case.test.ts` (filter/search combination), `invitation.mapper.test.ts` (role/status wire↔app) |
| Integration | `invitation.repository.test.ts` (fan-out reconciliation, force-mock scoping for list/resend, revoke failure passthrough), `iam-member.mock.repository.test.ts` |
| E2E | `invitations-screen.stories.tsx` — 13 states enumerated Phase 3 |
| Platform | `bun build && bunx tsc --noEmit` |
| Release | design-review gate (`docs/DESIGN_REVIEW.md`) |

## 4. Risks, dependencies, open questions

- **Cross-repo asks #29/#30** (list/resend BE absence) already filed per
  ground-truth note — this plan does NOT block on them; mock-first is
  permanent, matching US-E18.8/9/13/14 precedent. No new ADR needed (this
  is an established pattern, not a new architectural decision).
- **Chip dedup-in-batch (OQ-A)**: plan assumes client-side merge (per
  AC-003.4's literal wording) — this is an implementation choice at the
  use-case level, not a blocking open question; flag to `fe-lead` only if
  `fe-nextjs-engineer` wants to deviate.
- **OQ-C (max batch size)**: not specified anywhere; recommend a soft client
  cap (e.g. 20 chips) purely as a UX safety net against an unbounded
  `Promise.allSettled` fan-out — flag to `fe-lead`/`ba-lead` as a
  non-blocking follow-up, implement the cap defensively regardless.
- **`InvitationRole` vs `role-meta.ts`'s `UserRole`**: this feature
  introduces a parallel small role-label type (`teacher|student|parent|manager|admin`,
  5 values, `manager` literal kept as a distinct UI/display value here,
  unlike the unrelated `MANAGER`→`principal` collapse in `role-meta.ts`).
  This is intentional per ground-truth #4 but is exactly the kind of
  "two role vocabularies in one repo" situation the team should be aware
  of — flag to `fe-lead` for awareness, not for an ADR (no design-system
  token or cross-cutting architecture is affected, it's a screen-local
  domain type).
- **No design-system token gaps identified** — `--edu-warning-text`,
  `--edu-error-dark(-light)`, `--edu-teal`, badge/opacity patterns all
  already exist per design-spec's literal token references.
- **`tag-chips-input`/`destructive-confirm-dialog`/`status-badge` reuse**:
  confirmed these exist at `components/shared/*` today — `fe-component-architect`
  should verify each already supports what this screen needs (chip
  valid/invalid styling, confirm-dialog body-slot for the email-naming
  copy, status tone additions for `expired`/`revoked` if missing) before
  extending vs. forking, per `component-organization.md`.
- **`InvitationResponseDto` real fields are permanently thin** — any future
  attempt to "finish" this DTO by adding `invitedBy`/`token` etc. would be
  wrong; the mock DTO extension in Phase 0 is explicitly NOT a
  step toward a real contract, just a mock-repo convenience shape. Comment
  this clearly to avoid a future engineer trying to wire it real.
