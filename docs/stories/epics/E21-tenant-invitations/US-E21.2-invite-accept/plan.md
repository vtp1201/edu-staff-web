# Implementation Plan — US-E21.2 Public Invitation Accept (HIGH-RISK, corrected)

Status: ready for `/fe`. Ground truth: `story.md` §"Ground-Truth Correction",
`spec.md` §11, `use-cases.md` §7, ADR `0059` (amends `0051`) — **all
authoritative** over the original spec's UC-101/102/104 guest-account-creation
premise. This plan builds ONLY the corrected surface. Do not resurrect the
dropped guest-signup/preview/account-conflict branches.

## 0. Ground-truth recap (binding on every phase below)

- `POST /iam/api/v1/invitations/accept` requires `RequireAuth`, body `{token}`
  only, response `MemberResponse{tenantId, userId, roles[], status}` — NOT a
  token/session-issuance shape. No preview/resolve GET exists anywhere.
- 2 terminal error codes: `invitation_invalid` (410, covers
  not-found/used/revoked as ONE code) + `invitation_expired` (410, separate).
  Plus `invitation_email_mismatch` (403, CONFIRMED hard reject, F8).
- **`IamMemberFailure` union already has all 3 needed types** —
  `invitation-invalid` / `invitation-expired` / `invitation-email-mismatch` —
  ground-truthed and wired in `src/features/auth/domain/failures/iam-member.failure.ts`
  + mapped in `iam-member.repository.ts`'s `mapIamFailure` already (US-E18.6).
  **No failure-union change needed** — this is smaller than the original spec
  assumed.
- `MemberResponseDto` already exists (currently unused) in
  `src/features/auth/infrastructure/dtos/iam-member-response.dto.ts` —
  `{tenantId, userId, roles, status}`. Reuse verbatim, do not fork a new DTO.
- `IIamMemberRepository.acceptInvitation(token): Promise<void>` (US-E06.4,
  signed-in-only, currently fire-and-forget) is the method to extend — change
  return type to the mapped entity, keep the existing throw-typed-failure
  convention (matches `inviteMember`/`revokeInvitation` sibling methods in the
  same interface — do NOT switch this interface to the `{data,error}`
  discriminated-result convention `IAuthRepository` uses elsewhere; two
  conventions already coexist in this repo, extend in-place per interface).
- Session refresh reuses `IIamMemberRepository.switchTenant(tenantId, clientId)`
  + `setAuthCookies()` — the EXACT method/cookie-writer `select-tenant/actions.ts`
  already calls. No new session-issuance code, no `TokenResponseDto` involved.
- No middleware/route-guard layer exists on `(auth)/*` — `admin/layout.tsx`'s
  guard pattern is namespace-specific (`/t/[tenant]/(app)/admin`), not
  reusable here. This page does its OWN inline check: read
  `getAccessToken()` (existing helper, already used by `admin/layout.tsx`)
  presence/absence — no new guard abstraction needed for one route.

## 1. Canonical-home decisions (recap, not re-litigated)

- Extend `IIamMemberRepository`/`IamMemberRepository` (auth feature) —
  `acceptInvitation` only. No new repository interface, no new feature module
  (unlike US-E21.1's separate `admin/invitations` — that was justified by a
  genuinely different domain-shaped screen table; this screen is a thin
  action + redirect, stays in `auth`).
- New entity `src/features/auth/domain/entities/member.entity.ts` (`Member`
  shape mirroring `MemberResponseDto`) — distinct from `TenantMembership`
  (that's `GET .../me/tenants` shape) and distinct from `Invitation` (that's
  the admin list-row shape, US-E21.1). Three different entities, three
  different wire shapes — do not collapse them.
- New use-case `src/features/auth/domain/use-cases/accept-invitation.use-case.ts`
  — thin orchestration, `{data,error}` discriminated result (matches
  `LoginUseCase`/`AuthResult` convention, since the CALLER — the Server
  Action — needs the same ergonomics `loginAction` already has).
- New public route `src/app/[locale]/(auth)/invitations/accept/` — same
  `(auth)` route group as `login`/`select-tenant`/`forgot-password` (public,
  no shell), not a new top-level group.
- New presentation folder `src/features/auth/presentation/invite-accept/` —
  sibling to `login-form`/`forgot-password` presentation folders already in
  `auth/presentation/`.
- **Component-organization trigger**: the brand-panel decorative gradient
  (`screens.login.left`) is currently inlined ONLY in `login/page.tsx` (1
  usage — `forgot-password/page.tsx` uses a plain centered layout, no brand
  panel). This story's shell reuses that same panel — the 2nd usage. Per
  `.claude/rules/component-organization.md` ("promote on 2nd use, don't
  copy"), extract it into `src/components/shared/auth-brand-panel/` (props:
  `title`, `tagline`, or children for bullet-list variance) in Phase 3, then
  have BOTH `login/page.tsx` and the new `invitations/accept/page.tsx` import
  it — do not paste the gradient div a 2nd time.

## 2. Phased breakdown

### Phase 1 — Domain (TDD-first)

Goal: `Member` entity + extended repo interface contract + the
`accept-invitation` use-case, zero framework deps.

Files:
- `src/features/auth/domain/entities/member.entity.ts` (NEW) —
  ```ts
  export type MembershipRowStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "LEFT";
  export interface Member {
    tenantId: string;
    userId: string;
    roles: string[]; // raw wire role enums, e.g. ["TEACHER"] — unmapped, mirrors select-tenant's own precedent of passing raw role through to tenantUrl
    status: MembershipRowStatus;
  }
  ```
- `src/features/auth/domain/repositories/i-iam-member.repository.ts` — change
  `acceptInvitation(token: string): Promise<void>` →
  `acceptInvitation(token: string): Promise<Member>` (still throws
  `IamMemberFailure` on error, per existing convention for this interface).
  Update JSDoc: response is real `MemberResponse`, not void.
- `src/features/auth/domain/repositories/i-iam-member.repository.ts` — NO
  other method changes (do not touch `listInvitations`/`resendInvitation`
  mock-only methods, out of this story's scope).
- `src/features/auth/domain/use-cases/accept-invitation.use-case.ts` (NEW) —
  ```ts
  export type AcceptInvitationResult =
    | { data: Member; error?: never }
    | { data?: never; error: IamMemberFailure };

  export class AcceptInvitationUseCase {
    constructor(private readonly repo: IIamMemberRepository) {}
    async execute(token: string): Promise<AcceptInvitationResult> {
      if (!token.trim()) return { error: { type: "invitation-invalid" } };
      try {
        return { data: await this.repo.acceptInvitation(token) };
      } catch (err) {
        return { error: err as IamMemberFailure };
      }
    }
  }
  ```
  (Client-side empty/malformed-token short-circuit — AC equivalent of the
  dropped AC-101.3, now applied to the accept call itself since there's no
  separate preview call to short-circuit.)

Test first (red→green): `accept-invitation.use-case.test.ts` — cases: ok
(returns `Member`), empty/whitespace token → `invitation-invalid` with ZERO
repo call (assert `repo.acceptInvitation` not called — mirrors the dropped
AC-101.3's "zero network call" intent, now on the single real call site),
`invitation-invalid` passthrough, `invitation-expired` passthrough,
`invitation-email-mismatch` passthrough, `network-error` passthrough, `unknown`
passthrough. Mock `IIamMemberRepository` per test.

Done when: all 7 cases green, domain has zero imports outside itself.

### Phase 2 — Infrastructure (server-only, extend in place)

Goal: update the real `IamMemberRepository.acceptInvitation` to parse+map the
response instead of discarding it.

Files:
- `src/features/auth/infrastructure/repositories/iam-member.repository.ts` —
  ```ts
  async acceptInvitation(token: string): Promise<Member> {
    try {
      const dto = (await this.http.post(
        IAM_MEMBER_EP.acceptInvitation,
        { token },
      )) as unknown as MemberResponseDto;
      return mapMemberResponse(dto);
    } catch (err) {
      throw mapIamFailure(err); // unchanged — mapIamFailure already covers all 3 needed codes
    }
  }
  ```
- `src/features/auth/infrastructure/mappers/iam-member.mapper.ts` — add
  `mapMemberResponse(dto: MemberResponseDto): Member` (1:1 passthrough,
  `status` cast to `MembershipRowStatus` — same style as
  `mapMembershipSummary`).
- `src/features/auth/infrastructure/dtos/iam-member-response.dto.ts` — no
  change needed (`MemberResponseDto` already matches the real wire exactly);
  update its doc-comment to remove the now-stale "currently unused" note.

Test first: extend the existing repository test file for
`IamMemberRepository` (find/create `iam-member.repository.test.ts` if one
doesn't exist for this class — grep first) with cases: `acceptInvitation`
success maps DTO→`Member` correctly; each of the 3 error codes maps through
`mapIamFailure` unchanged (regression-proof that Phase 1/2's extension didn't
disturb the existing US-E18.6 mapping).

Done when: repository test green, `tsc --noEmit` clean.

### Phase 3 — Bootstrap/DI

Goal: expose `makeAcceptInvitationUseCase()` alongside the existing
`makeSwitchTenantUseCase()`/`makeLogoutUseCase()` this route's Server Action
needs — no new DI file, extend `auth.di.ts`.

Files:
- `src/bootstrap/di/auth.di.ts` — add
  ```ts
  export async function makeAcceptInvitationUseCase() {
    const http = await createServerHttpClient();
    return new AcceptInvitationUseCase(new IamMemberRepository(http));
  }
  ```
  (No `ensureFreshSession()` pre-check here — unlike `makeGetProfileUseCase`,
  this call is reached ONLY after the page's own auth-gate check already
  confirmed a token exists; if it's expired, the reactive-401 path or a
  clean error render handles it, consistent with `ensureFreshSession`'s
  narrower "protected calls that assume a healthy session" usage elsewhere —
  flag as an open question below, not blocking, since the existing hybrid
  strategy (decision `0018`) doesn't mandate proactive refresh on every call
  site uniformly.)
- `src/bootstrap/di/tenant.di.ts` — no change; `makeSwitchTenantUseCase()`
  already exported and reusable as-is.
- `src/bootstrap/di/auth.di.ts` — no change to `makeLogoutUseCase()`; reused
  as-is for the switch-account affordance (Phase 5).

Test first: none new (thin factory wiring, same convention as every other
`make*UseCase` in this file — no dedicated DI test exists elsewhere in this
file either, per grep).

Done when: `tsc --noEmit` clean, factory exported.

### Phase 4 — Presentation

Goal: 3 states (auth-gate / signed-in join / terminal error) + success +
switch-account, built against `design_src/edu/invitations.jsx`
`InviteAcceptScreen` for shell/tone ONLY (see §3 Design drift below — most of
its content is dropped).

Component tree:
```
InviteAcceptScreen ('use client', in features/auth/presentation/invite-accept/)
├── (shell: AuthBrandPanel + centered card — see Phase 3's component-org note)
├── AuthGateState        — shown when no access-token cookie (signed-out)
│   "Bạn cần đăng nhập để tham gia lời mời này" + plain <Link href="/login">
├── SignedInJoinState    — shown when access-token cookie present
│   ├── current email (from GetProfileUseCase, RSC-fetched, passed as prop)
│   ├── single "Tham gia {tenantId}" button — NO tenant/school NAME available
│   │   pre-accept (no preview endpoint exists) — see open question below,
│   │   recommend generic copy until resolved, do NOT fabricate a name
│   ├── loading (aria-busy + spinner on submit)
│   ├── EmailMismatchError + "Đổi tài khoản?" (switch-account) affordance
│   ├── genericError (network/5xx/unmapped — toast or inline, re-enable button)
│   └── on success → redirect (Server Action does the redirect, see Phase 5;
│       no distinct client-rendered "success" screen needed since redirect
│       is synchronous in the Server Action, matching switchTenantAction's
│       own pattern of redirecting directly with no intermediate success UI)
├── TerminalErrorState    — "invalid" (covers not-found/used/revoked/unmapped)
│                           | "expired" — 2 variants, dashed-ring icon circle
│                           + title + body + contact-office chip (reuse
│                           `tokenErrorStates.expired`/`.invalid` visual
│                           treatment from design-spec `inviteAccept`, DROP
│                           `.used` — folds into `.invalid`)
```

ViewModel (`invite-accept.i-vm.ts`):
```ts
export type InviteAcceptVM =
  | { kind: "auth-gate" }
  | { kind: "signed-in"; email: string; token: string }
  | { kind: "invalid" }   // malformed/missing token, OR later a terminal error
  | { kind: "expired" };
```
(No `kind: "loading"`/`"success"` variant in the VM — loading is local
component state during the submit transition; success is a redirect, not a
render.)

Action prop: `onJoin(token: string): Promise<{ errorKey?: "invitation-invalid" | "invitation-expired" | "invitation-email-mismatch" | "network-error" | "unknown" }>`
(Server Action redirects internally on success, matching `switchTenantAction`
— never returns on the happy path.)

Switch-account prop: `onSwitchAccount(token: string): Promise<{ errorKey?: string }>`
(logout + redirect back to the SAME `?token=` URL — see Phase 5; on logout
failure, returns an error key instead of throwing, so the button can show
"remained signed in" messaging per AC-107.2).

State classification (no `fe-state-engineer` handoff needed — this screen has
no server-cached list, no TanStack Query anywhere):
- **Server-derived once, RSC**: signed-in email (via `makeGetProfileUseCase()`,
  called once in `page.tsx` when the auth-gate check finds a token) — passed
  as a plain prop, no client refetch.
- **URL state**: `token` query param, read in `page.tsx` (RSC,
  `searchParams`), passed to the client component as a prop — never
  re-derived client-side, never stored beyond the prop chain (FR-009/NFR
  no-persistence rule still applies even though the guest-preview branch is
  gone).
- **Local-form**: none (no form fields left — single button + a plain link).
- **Local UI state**: `isPending` (React `useTransition`) for the join
  button's spinner/aria-busy.

i18n keys (namespace `invitations.accept`, both `vi.json` + `en.json` — check
first whether ANY `invitations.accept.*` keys exist today; per grep at
plan-time, NONE exist — the packet's claim of "already-staged
`alreadyHaveAccount`/`signInToJoin`" is stale/incorrect, those keys are not in
either messages file. Do not add them — UC-104 is dropped, they'd be dead on
arrival):
```
invitations.accept.authGate.{title, body, loginCta}
invitations.accept.join.{cta, loading, currentEmailLabel}
invitations.accept.switchAccount.{link, failedBody}
invitations.accept.errors.{invitationInvalid, invitationExpired, invitationEmailMismatch, network, unknown}
invitations.accept.tokenError.{invalid: {title, body}, expired: {title, body}, contactOffice}
```

Storybook states (`invite-accept-screen.stories.tsx`):
1. `AuthGate` — signed-out visitor, plain login link.
2. `SignedInJoinIdle` — email shown, single button enabled.
3. `SignedInJoinLoading` — aria-busy + spinner mid-submit.
4. `EmailMismatchError` — explicit error + switch-account CTA visible.
5. `SwitchAccountFailure` — logout fails, stays signed in, error shown.
6. `NetworkError` — generic error, button re-enabled.
7. `TokenExpired` — terminal expired state, no button.
8. `TokenInvalid` — terminal invalid state (covers not-found/used/revoked),
   no button.
9. `MissingToken` — no `?token=` at all → same `TokenInvalid` render, zero
   network call (client-side short-circuit before any action fires).

Done when: all 9 stories pass interaction tests, `fe-tech-lead-reviewer` +
`fe-accessibility-auditor` gates green, design-review gate pass.

### Phase 5 — RSC page + Server Actions

Files:
- `src/app/[locale]/(auth)/invitations/accept/page.tsx` (RSC) —
  ```ts
  export default async function InviteAcceptPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const { token } = await searchParams;
    if (!token?.trim()) return <InviteAcceptScreen vm={{ kind: "invalid" }} onJoin={joinAction} onSwitchAccount={switchAccountAction} />;

    const accessToken = await getAccessToken();
    if (!accessToken) return <InviteAcceptScreen vm={{ kind: "auth-gate" }} onJoin={joinAction} onSwitchAccount={switchAccountAction} />;

    const profile = await (await makeGetProfileUseCase()).execute();
    // profile.error → treat as auth-gate (session unusable) rather than crash;
    // see open question below on whether this needs bespoke copy (OQ-2.2 precedent: no, generic handling suffices).
    const email = profile.data?.email ?? "";
    return <InviteAcceptScreen vm={{ kind: "signed-in", email, token }} onJoin={joinAction} onSwitchAccount={switchAccountAction} />;
  }
  ```
- `.../actions.ts` (`'use server'`) —
  ```ts
  export async function joinAction(token: string) {
    const useCase = await makeAcceptInvitationUseCase();
    const result = await useCase.execute(token);
    if (result.error) return { errorKey: result.error.type };

    const switchUseCase = await makeSwitchTenantUseCase();
    const tokens = await switchUseCase.execute(result.data.tenantId);
    await setAuthCookies(tokens);

    const locale = await getLocale();
    const role = result.data.roles[0] ?? "";
    redirect(tenantUrl(result.data.tenantId, role ? `/${role}` : "/"), locale)
    // ^ mirrors switchTenantAction's exact `role ? /${role} : /` pattern —
    //   see open question below on raw-role-vs-appRole mapping, followed
    //   verbatim per spec instruction, not "fixed" here.
  }

  export async function switchAccountAction(token: string) {
    const useCase = await makeLogoutUseCase();
    try {
      await useCase.execute();
    } catch {
      return { errorKey: "logout-failed" }; // session NOT cleared — AC-107.2
    }
    await clearAuthCookies();
    const locale = await getLocale();
    redirect(`/${locale}/invitations/accept?token=${encodeURIComponent(token)}`);
    // deliberately NOT reusing login/actions.ts's exported `logoutAction`
    // verbatim — that function hard-redirects to `/login`, which would lose
    // the token/URL (violates UC-107's "SAME token/URL" requirement). This
    // reuses the SAME underlying primitives (`makeLogoutUseCase`,
    // `clearAuthCookies`) but redirects differently — not a fork of the
    // logout use-case/cookie-clearing logic itself, just a different Server
    // Action wrapping it, per ADR 0059's own "no returnTo on login" stance
    // (this is invitation-accept's own action, not a touch to login/actions.ts).
  }
  ```

Test first: none new for the thin Server Action wrappers (matches
`admin/invitations` Phase 4 precedent — no dedicated `actions.test.ts`
convention for this shape of file elsewhere in the repo); covered by Phase 4's
Storybook interaction tests exercising the action props via mocked callbacks.

Done when: `bun build` + `tsc --noEmit` clean, page renders both auth-gate and
signed-in branches correctly for a live/mock token, malformed token short-
circuits with zero network call (verifiable via network-tab assertion in the
Storybook/Playwright layer).

## 3. Design-mockup drift (flag only — not fixed here, `uiux-docs-manager`'s job)

`design_src/edu/invitations.jsx` `InviteAcceptScreen` + `design-spec.jsonc`
`screens.inviteAccept` were authored against the ORIGINAL (uncorrected)
4-state/guest-form premise. Keep from the mockup:
- shell: `layoutReuse: screens.login.left` brand panel (hidden ≤900px).
- card treatment: `maxWidth: 440, padding: "32px 32px 28px"`.
- `tokenErrorStates` visual style (dashed-ring 96px icon circle + title + body
  + contact-office chip) for the 2 surviving variants (`expired`, `invalid`).
- `successState` icon-circle tone (teal check) IF a distinct success render
  is ever added later (currently this plan redirects without an intermediate
  success screen, matching `switchTenantAction`'s own no-success-screen
  precedent — flag as an open question below, not a hard requirement).

Drop from the mockup (not buildable, per ADR 0059):
- `invitationSummary` block (school/role/inviter/expiry pre-action card) —
  no data source exists.
- `userStates.guest` (email/fullName/password form + "Tạo tài khoản & tham
  gia" + "Đã có tài khoản?" switch-to-signin copy) — no BE capability.
- `tokenErrorStates.used` (3rd illustration) — folds into `.invalid`.
- Any account-conflict state — unreachable.
- `userStates.signedin.primaryButton: "Tham gia {school}"` — no `{school}`
  name is available anywhere pre- or immediately-post-accept (`MemberResponse`
  has no `tenantName`); use a generic label (e.g. "Tham gia trường được mời")
  until/unless a follow-up story adds a tenant-name lookup. Flagged as an
  open question below.

This drift is NOT fixed by this plan (that's `uiux-docs-manager` syncing
`design-spec.jsonc`/`invitations.jsx` for the corrected scope) — `/fe`
implements against THIS plan + ADR `0059`, using the mockup only for the
visual elements listed as "keep" above.

## 4. Test matrix summary (maps to story.md §Validation — corrected)

| Layer | File(s) |
| --- | --- |
| Unit | `accept-invitation.use-case.test.ts` (7 cases incl. empty-token zero-call) |
| Integration | `iam-member.repository.test.ts` (`acceptInvitation` DTO→entity mapping + 3 error-code passthrough regression) |
| E2E | `invite-accept-screen.stories.tsx` — 9 states enumerated Phase 4 |
| Platform | `bun build && bunx tsc --noEmit` |
| Release | design-review gate + **mandatory `fe-tech-lead-reviewer` security-diff**: reject any `joinAction`/`switchAccountAction` payload containing anything beyond `{token}` on the accept call — this is now the ONLY code path to diff (ADR 0059 narrows scope, does not relax the gate) |

## 5. Risks, dependencies, open questions

- **`switchTenant` proactive-refresh omission (Phase 3)**: `makeAcceptInvitationUseCase`
  does not call `ensureFreshSession()` before the accept POST, unlike
  `makeSwitchTenantUseCase`'s own `makeRepo()` which does. Since the page's
  own auth-gate check only verifies token PRESENCE (not freshness), an
  about-to-expire token could hit a 401 on the accept call itself. Recommend:
  either (a) accept this — the existing reactive-401 handling (decision 0018)
  is deferred/incomplete repo-wide, consistent with other call sites, or (b)
  add `ensureFreshSession()` to `makeAcceptInvitationUseCase` proactively
  (cheap, matches `makeGetProfileUseCase`'s own precedent). Recommend (b) as
  the safer default since this is a high-risk lane — flag to `fe-lead` for a
  yes/no, non-blocking either way (worst case is one avoidable 401).
- **`{school}`/tenant-name display (Phase 4/5)**: no tenant/school NAME is
  available anywhere in this corrected flow (`MemberResponse` has only
  `tenantId`, a UUID) — the mockup's "Tham gia {school}" copy cannot be
  filled with real data. Recommend generic copy ("Tham gia trường được mời"
  or similar) for the button/caption until a follow-up adds a tenant-name
  lookup (out of scope here — no such endpoint exists per ADR 0059 finding
  7). Flag to `ba-lead`/`uiux-docs-manager` for the eventual copy sync, not
  blocking this story.
- **No intermediate success screen**: this plan redirects directly from
  `joinAction` on success (mirroring `switchTenantAction`'s own pattern,
  which also has no success screen) rather than rendering
  `design-spec.jsonc`'s `successState` block first. If product wants a
  visible "Chào mừng!" moment before redirect, that's an additive Phase 4
  change (client-side success render + delayed redirect) — flag as an open
  question, not built by default since neither `switchTenantAction` nor
  `loginAction`'s `routeAfterAuth` do this today (consistency over
  invention).
- **Raw-role redirect segment**: this plan follows `select-tenant`'s exact
  `role ? /${role} : /` pattern verbatim (raw wire role string, e.g.
  `"TEACHER"`, used directly as a URL segment) per the story's explicit
  instruction. `role-meta.ts`'s `appRoleOf`/`landingPathOf` mapping exists and
  looks more "correct" (lowercase app-role landing paths), but introducing it
  here would diverge from `select-tenant`'s established (if debatable)
  behavior. Flag as an observation only — not this story's bug to fix.
- **`already-member` re-accept behavior (AC-103.5, per ADR 0059 finding)**: no
  distinct error code was found for re-accepting an already-ACTIVE
  membership; `accept_invitation.go` likely no-ops/upserts. This plan treats
  any unlisted/unexpected error as the generic `network-error`/`unknown`
  path rather than inventing an "already member" copy block — matches ADR
  0059's own recommendation, not a gap in this plan.
- **`GetProfileUseCase` round-trip for email display**: chosen over decoding
  an `email` JWT claim (no `decodeEmailClaim` helper exists today, only
  `role`/`sub`/`tenantId`/`exp` are decoded in `jwt.ts` — unconfirmed whether
  the JWT even carries an email claim). Recommend the network round-trip for
  correctness on this low-traffic public route; flag as a possible future
  optimization if `jwt.ts` ever adds an email-claim decoder for other reasons
  (do not add one JUST for this story — that would be scope creep on a
  shared file for a minor perf gain).
- **`AuthBrandPanel` extraction (Phase 4/component-organization)**: this is
  the first REQUIRED promotion under `component-organization.md`'s "promote
  on 2nd use" rule for this specific pattern — `fe-component-architect`
  should own the exact prop contract (title/tagline vs. children slot) since
  `login/page.tsx`'s current copy differs from what this screen needs.
- Cross-repo ask #31 (self-serve registration + invite-token consumption) is
  already filed (`EPIC-OVERVIEW.md`) — not this story's problem, no action
  needed here.
