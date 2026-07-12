# US-E22.1 — Implementation Plan (fe-planner)

Sources: `requirements.md` (TR-221), `integration.md` (INT-001..003),
`use-cases.md` (UC-001..008, 48 AC), `story.md`, `spec.md`. Branch
`feat/us-e22.1-email-verification` (already checked out). Lane: normal, no
ADR, all 3 `iam` endpoints REAL.

## 0. Architecture decisions this plan makes (flag, don't re-litigate)

1. **`IAuthRepository` extension, not a new `IEmailVerificationRepository`.**
   It already owns `AuthUser`/`GET /users/me`, `mapAuthError`/`CODE_MAP`
   already cover all 3 confirm error codes — a second repository would only
   add a second DI wiring path for the same failure union. Mirrors
   `requestPasswordReset`/`resetPassword` exactly.
2. **DTO field name: keep `isEmailVerified` on the wire-shaped DTO** (1:1 with
   `openapi.yaml`), map to **`emailVerified`** on the domain-shaped
   `AuthUser`/`ProfileScreenVM` — matches the existing DTO-vs-entity casing
   split already in this file (DTO fields today are already normalized
   away from IAM's raw shape per integration.md risk #2, so this is not a
   new inconsistency, just this story's own field following the same rule).
3. **INT-003 confirm-success handling: optimistic local flip**, not a
   `/users/me` refetch. No new blocking round-trip (NFR-006 spirit); the
   flip happens on a shared client Context (see #5), which is what makes
   AC-007.7 ("reactive update" across banner + Profile row) trivially true
   — both surfaces read the same context value, no invalidation needed.
4. **`OtpInput` promoted to `components/shared/otp-input/`** (decision 0026)
   — this is the 2nd call site (forgot-password + email-verify), and the two
   need genuinely different props (Vietnamese digit-label i18n + an
   error-state visual). Promote, don't fork.
5. **Shared cooldown + `emailVerified` state = one client React Context
   (`EmailVerifyProvider`), NOT TanStack Query.** Architectural finding:
   `ReactQueryProvider` (`bootstrap/lib/react-query-provider.tsx`) is mounted
   by `layout.tsx` **around `{children}` only**, passed as `AppShell`'s
   `children` prop — `AppShell`'s own JSX (`Header`, the banner slot,
   `Sidebar`) is a **sibling** of that provider, not a descendant
   (`app-shell.tsx:74-83`). A banner mounted directly in `AppShell` cannot
   use a `useQuery` hook — there is no `QueryClient` in its React tree. A
   plain Context mounted in `AppShell` itself (wrapping `Header` + banner +
   `{children}`) has no such boundary problem, needs no server-state cache
   library for what is fundamentally 2 booleans + 1 timestamp, and satisfies
   NFR-006 (no new round-trip: seeded from the RSC-fetched initial value).
   **`fe-state-engineer` should confirm/challenge this** if a broader
   pattern is preferred, but it is the only mechanism that actually crosses
   the `AppShell`/`ReactQueryProvider` boundary as currently wired.
6. **`layout.tsx` gains its first real `GET /users/me` call** (new
   `makeGetProfileUseCase`), fixing the `[GAP]` in spec.md §8 (today it only
   decodes JWT claims + hardcodes `userName`). `ProfilePage`'s `actions.ts`
   also calls the same use-case for `email`/`emailVerified` only — the rest
   of its `MOCK` (fullName/phone/role/sessions) is **out of scope**, left
   as-is (no scope creep into full profile-data wiring).

## Phase 0 — Data plumbing (`iam` DTO → entity → mapper → VM), TDD

**Files:**
- `src/features/auth/infrastructure/dtos/user-profile-response.dto.ts` — add
  `isEmailVerified: boolean`.
- `src/features/auth/domain/entities/auth-user.entity.ts` — `AuthUser` gains
  `emailVerified: boolean`.
- `src/features/auth/infrastructure/mappers/auth.mapper.ts` — `mapProfile()`
  maps `dto.isEmailVerified → emailVerified`.
- `src/features/user/presentation/profile/profile-screen.i-vm.ts` —
  `ProfileScreenVM` gains `emailVerified: boolean`.

**Test first:** extend
`src/features/auth/infrastructure/mappers/auth.mapper.test.ts` — new case
asserting `mapProfile({ ..., isEmailVerified: true }).emailVerified === true`
(and `false`/missing → `false`, defensive default since older cached
sessions predate this field).

**Done when:** `bun vitest run auth.mapper.test.ts` green; no other file
touches yet (pure domain change).

## Phase 1 — New endpoints + repository methods + use-cases + DI, TDD

**Files:**
- `src/bootstrap/endpoint/auth.endpoint.ts` — add to `AUTH_EP`:
  `requestEmailVerification: "/iam/api/v1/users/me/email/verification"`,
  `confirmEmailVerification: "/iam/api/v1/users/me/email/verification/confirm"`.
- `src/features/auth/domain/repositories/i-auth.repository.ts` — add to
  `IAuthRepository`:
  - `getProfile(): Promise<AuthResult>` — wraps a standalone
    `GET /users/me` (no signin flow attached); new method, mirrors the
    inline call already in `signin`/`socialSignin` but as its own thing.
  - `requestEmailVerification(): Promise<VoidResult>`.
  - `confirmEmailVerification(otp: string): Promise<VoidResult>`.
- `src/features/auth/infrastructure/repositories/auth.repository.ts` —
  implement the 3 methods: `getProfile()` does `GET AUTH_EP.me` → `mapProfile`
  → `{ data: mapSession-like AuthUser }` (note: no tokens involved, so this
  returns `{ data: AuthUser; error?: never } | { data?: never; error: AuthFailure }`
  — **new narrower result type**, e.g. `ProfileResult` in
  `i-auth.repository.ts`, do NOT overload `AuthResult` which requires a full
  `AuthSession`/tokens); `requestEmailVerification()` → `POST` no body →
  `{ ok: true }` (mirrors `requestPasswordReset`); `confirmEmailVerification(otp)`
  → `POST { otp }` → `{ ok: true }` (mirrors `resetPassword`). All 3 catch →
  `mapAuthError(err)` (reuse, zero new failure types — confirmed `CODE_MAP`
  already has `USER_INVALID_OTP`/`USER_OTP_EXPIRED`/`USER_TOO_MANY_ATTEMPTS`).
- `src/features/auth/domain/use-cases/get-profile.use-case.ts` — new,
  trivial wrapper (`execute(): Promise<ProfileResult> { return this.repo.getProfile(); }`).
- `src/features/auth/domain/use-cases/request-email-verification.use-case.ts`
  — new, trivial wrapper (no input) mirroring
  `request-password-reset.use-case.ts`.
- `src/features/auth/domain/use-cases/confirm-email-verification.use-case.ts`
  — new; validates `^[0-9]{6}$` client-side before calling repo (mirror
  `reset-password.use-case.ts`'s `OTP_RE` guard) → `{ error: { type: "invalid-otp" } }`
  on malformed input without a network call.
- `src/bootstrap/di/auth.di.ts` — add `makeGetProfileUseCase()`,
  `makeRequestEmailVerificationUseCase()`,
  `makeConfirmEmailVerificationUseCase()` — **all three call
  `await ensureFreshSession()` first** (they're protected calls issued
  outside the login flow, unlike the existing factories which don't need
  it); each `new AuthRepository(await createServerHttpClient())`.

**Test first (red → green):**
- `src/features/auth/domain/use-cases/get-profile.use-case.test.ts` (new) —
  mock `IAuthRepository`, assert pass-through of `data`/`error`.
- `src/features/auth/domain/use-cases/email-verification.use-cases.test.ts`
  (new, combined file mirroring `password-reset.use-cases.test.ts`'s
  pattern) — `RequestEmailVerificationUseCase` pass-through;
  `ConfirmEmailVerificationUseCase` OTP-format guard (malformed → error
  without touching repo mock; 6-digit → calls
  `repo.confirmEmailVerification`).
- Extend `src/features/auth/infrastructure/repositories/auth.repository.test.ts`
  — 3 new `describe` blocks: `getProfile` (200→mapped `AuthUser`, error→`mapAuthError`),
  `requestEmailVerification` (204→`{ok:true}`, 429→`too-many-requests`,
  5xx→network/unknown), `confirmEmailVerification` (204→`{ok:true}`,
  `USER_INVALID_OTP`→`invalid-otp`, `USER_OTP_EXPIRED`→`otp-expired`,
  `USER_TOO_MANY_ATTEMPTS`(429)→`too-many-requests`) — this is the
  **integration-layer proof** the story owes (repo↔HTTP envelope/error
  mapping) per `story.md` §Validation.

**Done when:** all 4 new/extended test files green; `AuthFailure` union
unchanged (0 new members, confirmed).

## Phase 2 — `OtpInput` promotion to `components/shared/otp-input/`

**Files:**
- NEW `src/components/shared/otp-input/otp-input.tsx` — moved from
  `src/features/auth/presentation/forgot-password/otp-input.tsx`, extended
  with:
  - `digitAriaLabel?: (n: number) => string` prop (default
    `` (n) => `OTP digit ${n}` `` for back-compat if a caller omits it —
    but both real call sites will always pass one).
  - `groupAriaLabel?: string` + wraps the cells in a `<div role="group"
    aria-label={groupAriaLabel}>` (design-spec `dialog.otpInput.a11y`:
    `role=group`, `aria-label` "Mã xác thực 6 chữ số" — forgot-password's
    current usage has no group wrapper today; add it for both, cheap and
    correct per NFR-002/AC-003.6 without behavior change for
    forgot-password).
  - `error?: boolean` prop → cell classes swap to design-spec
    `dialog.otpInput.errorState`: border `border-edu-error-dark` (verify
    token exists in `tokens.css`; if only `--edu-error`/`--edu-error-dark`
    variants exist under a different Tailwind class name, use the matching
    `border-edu-error-dark`/`bg-edu-error-dark-light` utilities — grep
    `tokens.css` first, do NOT invent a new token), text
    `text-edu-error-text` (existing token, already used elsewhere in this
    file per `profile-screen.tsx`'s `text-edu-error-text` usage).
  - `disabled?: boolean` prop (needed for UC-006 lockout — cells disabled
    until Resend) → each `<input disabled={disabled}>`.
  - `aria-invalid={error}` + accepts an optional `describedById?: string`
    → `aria-describedby` on the group div (AC-004.1's `aria-describedby`
    linkage).
- NEW `src/components/shared/otp-input/index.ts` — `export { OtpInput } from "./otp-input"`.
- NEW `src/components/shared/otp-input/otp-input.stories.tsx` — states:
  default/empty, filled, error (wrong-code copy), disabled (lockout).
- DELETE `src/features/auth/presentation/forgot-password/otp-input.tsx`
  (moved, not copied).
- `src/features/auth/presentation/forgot-password/forgot-password.tsx` —
  update import to `@/components/shared/otp-input`; pass
  `digitAriaLabel={(n) => t("otpDigitAriaLabel", { n })}` sourced from
  whatever i18n namespace forgot-password already uses for its OTP copy
  (grep `forgot-password.i-vm.ts`/existing messages under `auth.forgotPassword.*`
  or similar — if forgot-password currently has NO translated digit-label
  key at all, add one alongside this story's `emailVerify.dialog.digitAriaLabel`
  under forgot-password's own existing namespace, not `emailVerify`'s).

**Test first:** move/extend whatever test exists today for `OtpInput`
(if none exists yet, this is the first — add
`src/components/shared/otp-input/otp-input.test.tsx`: renders 6 cells,
auto-advance on digit entry, backspace-to-previous, `error` prop sets
`aria-invalid`/error classes, `disabled` prop disables all cells).

**Done when:** forgot-password Storybook/tests still pass unchanged
(behavior-preserving move) + new shared story states render; only one
`OtpInput` file exists in the repo (grep confirms).

## Phase 3 — Shared cooldown + verification-status Context

**Files:**
- NEW `src/features/auth/presentation/email-verify/use-email-verify-cooldown.ts`
  — pure hook, **unit-testable in isolation** (no DOM): takes no args,
  returns `{ remainingSeconds: number, start(): void }`; internally
  `useState<number | null>(cooldownEndsAt)` + a `useEffect` `setInterval`
  ticking a derived `remainingSeconds` from `Date.now()` (inject a `now`
  provider function for deterministic tests — default `() => Date.now()`,
  override in tests with fake timers/vi.useFakeTimers()). Exposes
  `remainingSeconds === 0` as "actionable".
- NEW `src/features/auth/presentation/email-verify/email-verify-context.tsx`
  — `"use client"`. `EmailVerifyProvider({ initialEmailVerified, email,
  children })` — wraps `useEmailVerifyCooldown()` + a
  `useState(initialEmailVerified)` for `emailVerified`, exposes via Context:
  `{ emailVerified, email, markVerified(): void, remainingSeconds,
  startCooldown(): void }`. `useEmailVerify()` hook throws if used outside
  the provider (fail loud, matches repo's existing hook conventions).
- Mount point: **`AppShell`** (`src/components/layout/app-shell/app-shell.tsx`)
  wraps its whole return value's inner `<div className="flex min-w-0…">`
  content (or the outermost `<div>`) in `<EmailVerifyProvider
  initialEmailVerified={emailVerified} email={email}>` — new required
  `AppShellProps.emailVerified: boolean` + `AppShellProps.email: string`.

**Test first:**
`src/features/auth/presentation/email-verify/use-email-verify-cooldown.test.ts`
— `vi.useFakeTimers()`: `start()` sets remaining to 60, advancing 1s ticks
down, advancing past 60s clamps to 0 and stays 0 (not negative), calling
`start()` again while already running resets to a fresh 60 (used by
Resend), never auto-starts without an explicit `start()` call (AC-008.6
"not started by errors" — errors simply never call `start()`).

**Done when:** cooldown hook tests green in isolation, before any component
consumes it.

## Phase 4 — `layout.tsx` + `AppShell` wiring (first real `GET /users/me`)

**Files:**
- `src/app/[locale]/t/[tenant]/(app)/layout.tsx` — after the existing
  `evaluateAccess` guard, call `const profile = await
  makeGetProfileUseCase().then(uc => uc.execute())`; on `profile.data`, pass
  `emailVerified={profile.data.emailVerified}` and
  `email={profile.data.email}` (and optionally replace the hardcoded
  `userName="Nguyen Van A"` with `profile.data.name` — in scope since it's
  the same call, closes another piece of the `[GAP]`) to `<AppShell>`; on
  `profile.error`, pass `emailVerified={false}`-but-**unresolved** — actually
  per AC-001.1/1.3 "fail-closed, banner SHALL NOT render on error", so
  thread a tri-state, not a plain boolean: `AppShellProps.emailVerified:
  boolean | null` (`null` = unresolved/error → banner never renders,
  `EmailVerifyProvider`'s `initialEmailVerified` also tri-state,
  `EmailVerifyBanner` checks `emailVerified === false` explicitly, never
  `!emailVerified`).
- `src/components/layout/app-shell/app-shell.tsx` — new props
  `emailVerified: boolean | null`, `email: string`; wrap render in
  `<EmailVerifyProvider initialEmailVerified={emailVerified} email={email}>`;
  mount `<EmailVerifyBanner />` in the same slot as `SseDisconnectBanner`
  (line ~81, `between <Header> and <main>`), reading everything from context
  (no props needed on the banner itself beyond an optional `className`).
- `src/bootstrap/di/auth.di.ts` — already has `makeGetProfileUseCase` from
  Phase 1; used here.

**Test first:** this phase is presentation-wiring, not new business logic —
proof is the Storybook interaction test in Phase 7 (`app-shell.stories.tsx`
if it exists, else a new `email-verify-banner.stories.tsx` covering the
mounted-in-shell case) + the E2E in Phase 8. No new unit test needed here
beyond what Phase 0 already covers (mapper) — confirm no regression via
`bun vitest run` on existing `app-shell`-adjacent tests if any exist.

**Done when:** `bun build` succeeds (RSC boundary intact — `layout.tsx`
stays a server component, no `bootstrap/di` import leaks into `AppShell`
which remains `"use client"`).

## Phase 5 — `EmailVerifyBanner` component

**Files:**
- NEW `src/features/auth/presentation/email-verify/email-verify-banner.tsx`
  — `"use client"`. Reads `useEmailVerify()`. Renders `null` when
  `emailVerified !== false` (covers both `true` and `null`/unresolved —
  AC-001.1/1.2/1.3 collapse to the same "don't render" branch). Session
  dismiss: local `useState` seeded from `sessionStorage.getItem("ev-banner-dismissed")`
  (read in a `useEffect` post-mount to avoid SSR/hydration mismatch, same
  pattern as `use-sidebar-collapsed.ts`'s `localStorage` read); dismiss
  writes `sessionStorage.setItem(...)`. States: `default` (unverified,
  `t("emailVerify.banner.unverifiedTitle")`/`unverifiedBody` + send CTA) →
  on click, call `requestEmailVerificationAction()` (server action, Phase
  6) → success → local `"sent"` state (`sentTitle`/`sentBody` with
  `{email}` interpolation) + `startCooldown()`; error → inline errorKey
  text (new small local error-state, NOT a separate component) + no
  cooldown start. `role="status"`, mail icon (`lucide-react` `Mail`),
  dismiss `X` button with `aria-label={t("emailVerify.banner.dismissAriaLabel")}`.
  Tokens per design-spec `screens.emailVerify.banner`: padding `9px 24px`
  (`px-6 py-2.5` if it round-trips exactly, else arbitrary value per
  tailwind-v4.md — verify against 4px grid first), bg
  `var(--edu-warning)/1A` → Tailwind `bg-edu-warning/10`-ish (grep exact
  existing opacity-modifier convention used by `StatusBadge`'s `/15`, reuse
  that scale unless design-spec's literal alpha matters enough for an
  `fe-tech-lead-reviewer` call), text `text-edu-warning-foreground`
  (NFR-003, never white), icon box 28px/radius-8 bg
  `bg-edu-warning/15`ish.
- NEW `src/features/auth/presentation/email-verify/email-verify-banner.stories.tsx`
  — states: unverified/default, sent+cooldown-running, sent+cooldown-elapsed,
  error (send failed), dismissed (renders nothing — documented via a note,
  not a visual story).

**Test first:** Storybook interaction test (play function) —
default→click send→sent state→cooldown text present→dismiss→hidden. This
IS the E2E-tier proof for this component per `tdd.md`'s story-tier row; no
separate unit test file needed beyond what the cooldown hook (Phase 3)
already unit-tests in isolation.

**Done when:** story interaction test green; a11y: `role="status"` present,
dismiss button keyboard-reachable with visible focus ring.

## Phase 6 — Server action + i18n (send/resend)

**Files:**
- NEW `src/app/[locale]/t/[tenant]/(app)/actions/email-verification.actions.ts`
  (or co-located under an existing shared actions file if one already
  centralizes cross-cutting shell actions — grep first; if none exists,
  this new file is the natural home since the banner is shell-level, not
  tied to one route) — `"use server"`:
  - `requestEmailVerificationAction(): Promise<{ ok: true } | { errorKey: AuthFailure["type"] }>`
    — calls `makeRequestEmailVerificationUseCase()` → `.execute()`.
  - `confirmEmailVerificationAction(otp: string): Promise<{ ok: true } | { errorKey: AuthFailure["type"] }>`
    — calls `makeConfirmEmailVerificationUseCase()` → `.execute(otp)`.
  Both translate `VoidResult` → the plain `{ok}`/`{errorKey}` shape;
  **no translation happens here** (i18n rule: server action returns the
  stable key, presentation translates).
- `messages/vi.json` / `messages/en.json` — add (verbatim from DR-016 §UX
  copy, both files simultaneously):
  - net-new `emailVerify.banner.*` (7 keys: `unverifiedTitle`,
    `unverifiedBody`, `sendButton`, `sentTitle`, `sentBody`, `resendIn`,
    `resend`, `dismissAriaLabel` — 8 actually, see DR-016 block).
  - net-new `emailVerify.dialog.*` (13 keys: `title`, `description`,
    `close`, `codeGroupAriaLabel`, `digitAriaLabel`, `errorWrong`,
    `errorExpired`, `resendIn`, `resend`, `confirm`, `confirming`,
    `successTitle`, `successBody`, `done`) **PLUS one new key not in
    DR-016** (spec.md §8 [GAP]): `emailVerify.dialog.errorLockout` —
    proposed copy (implementer/reviewer may adjust wording, key itself is
    not optional):
    - vi: `"Bạn đã nhập sai quá số lần cho phép. Bấm \"Gửi lại mã\" để nhận mã mới."`
    - en: `"Too many incorrect attempts. Press \"Resend code\" to get a new one."`
  - additive `profile.personal.emailVerified` / `emailUnverified` /
    `emailVerifyNow` / `emailImmutableHint` (4 keys, both vi/en, verbatim
    from DR-016 — grep existing `profile.personal` block first per
    NFR-007/i18n.md, confirm no collision, insert alongside).
- `src/bootstrap/i18n/messages.d.ts` — no manual change needed (typed via
  `typeof vi.json`, auto-picks up new keys) — just re-run `bunx tsc --noEmit`
  to confirm.

**Test first:** none new at unit tier (i18n keys aren't independently
testable) — the proof is `bunx tsc --noEmit` passing (typed key coverage,
NFR-007) plus every consuming component (Phases 5, 7) actually calling
`t("emailVerify...")` successfully compiling.

**Done when:** `tsc --noEmit` green with all new keys referenced from at
least one component; vi/en structurally identical (same key set).

## Phase 7 — Profile personal-info row wiring

**Files:**
- `src/app/[locale]/t/[tenant]/(app)/(shared)/profile/page.tsx` — call
  `makeGetProfileUseCase()` alongside the existing `getLinkedAccountsAction()`
  call; spread `email: profile.data?.email ?? MOCK.email` and
  `emailVerified: profile.data?.emailVerified ?? false` into `ProfileScreen`
  props (rest of `MOCK` — fullName/phone/role/sessions — **stays as-is**,
  out of scope per §0.6 above). On `profile.error`, fall back to
  `emailVerified: null` (unresolved, tri-state) not `false`, so the row
  doesn't show a wrong badge (AC-007.1/7.3) — thread the same tri-state as
  Phase 4.
- `src/features/user/presentation/profile/profile-screen.i-vm.ts` —
  `emailVerified: boolean | null` (tri-state, matches AppShell's contract).
- `src/features/user/presentation/profile/profile-screen.tsx` — in the
  `personal` `TabsContent`, next to the existing `email` `Field`
  (line ~101-105): add a row — `emailVerified === null` → nothing extra
  (existing `Field` only, AC-007.1/7.3); `=== true` →
  `<StatusBadge tone="success"><Check .../>{t("personal.emailVerified")}</StatusBadge>`;
  `=== false` → `<StatusBadge tone="warning"><TriangleAlert .../>{t("personal.emailUnverified")}</StatusBadge>`
  + a "Xác thực ngay" button
  (`t("personal.emailVerifyNow")`) that calls `setDialogOpen(true)` (opens
  `EmailVerifyDialog` from Phase 8, imported here) — **but** `ProfileScreen`
  needs access to `useEmailVerify()` context for the shared cooldown/flip;
  since `ProfilePage`'s tree IS inside `AppShell`'s `{children}` (which is
  inside `EmailVerifyProvider`, confirmed by Phase 4's wrap placement),
  `ProfileScreen` can safely call `useEmailVerify()` directly — **reads
  `emailVerified` from context, not from its own VM prop**, once the dialog
  can flip it; the VM prop only seeds the row's *initial* SSR-safe render to
  avoid a hydration flash, then context takes over reactively (mirrors the
  same seed-then-context pattern as `AppShell`). Add an `emailImmutableHint`
  caption (`t("personal.emailImmutableHint")`) under the disabled email
  `Field` (FR-008, small caption, `text-muted-foreground`, already-used
  text token).

**Test first:** extend `profile-screen.stories.tsx` — add stories for
unverified (badge+CTA), verified (badge only), unresolved (no badge) — with
a play function clicking "Xác thực ngay" and asserting the dialog opens
(dialog itself may be mocked/stubbed at this phase if Phase 8 isn't done
yet; sequence Phase 7→8 or do them together since they're tightly coupled —
`fe-nextjs-engineer`'s call on exact commit granularity, but both must land
before this phase is "done").

**Done when:** all 3 badge states render correctly in Storybook; email
`Field` still `disabled` unchanged (AC-007.8 regression check).

## Phase 8 — `EmailVerifyDialog` (3 error states + success)

**Files:**
- NEW `src/features/auth/presentation/email-verify/email-verify-dialog.tsx`
  — `"use client"`. Props: `open: boolean`, `onOpenChange(open: boolean): void`.
  Reads `useEmailVerify()` for `email`, `remainingSeconds`,
  `startCooldown()`, `markVerified()`. Local state: `otp: string`,
  `status: "idle" | "pending" | "error-wrong" | "error-expired" |
  "error-lockout" | "success"`. Uses `Dialog`/`DialogContent` from
  `components/ui/dialog` (`maxWidth: 420` per design-spec — pass
  `className="max-w-[420px]"`). Body:
  - `idle`/`error-wrong` → `<OtpInput value={otp} onChange={setOtp}
    digitAriaLabel={(n) => t("emailVerify.dialog.digitAriaLabel", {n})}
    groupAriaLabel={t("emailVerify.dialog.codeGroupAriaLabel")}
    error={status === "error-wrong"} disabled={false} />` + Confirm
    (disabled until `otp.length === 6`) + Resend (disabled while
    `remainingSeconds > 0`, showing `t("emailVerify.dialog.resendIn",
    {seconds: remainingSeconds})` when cooling, else
    `t("emailVerify.dialog.resend")`).
  - `error-expired`/`error-lockout` → same OTP group but
    `disabled={status === "error-lockout"}` (AC-006.2 "cells locked"; UC-005
    stays editable per AC-005 — only lockout disables), Resend **emphasized**
    (e.g. `variant="default"` vs `variant="ghost"` for the plain case —
    visual emphasis choice for `fe-nextjs-engineer`/reviewer, not
    prescribed beyond "must look distinct from the passive resend link").
  - `success` → `iconCircle` (72px, `bg-edu-teal-light`? — verify exact
    token name in `tokens.css`, else nearest `teal` tint) + Check icon +
    `t("emailVerify.dialog.successTitle")`/`successBody` (`{email}`
    interpolation) + `t("emailVerify.dialog.done")` button → calls
    `onOpenChange(false)`, clears `otp` state (NFR-008), focus returns to
    invoking control (native `Dialog` from Radix already restores focus on
    close — verify this is true for this `ui/dialog` wrapper, don't
    reinvent).
  - Confirm handler: `pending` disables Confirm button only (cells stay
    focusable, NFR-004) → `confirmEmailVerificationAction(otp)` → on
    `{ok:true}` → `markVerified()` + `status = "success"`; on
    `errorKey === "invalid-otp"` → `status = "error-wrong"`, `otp` NOT
    cleared; `errorKey === "otp-expired"` → `status = "error-expired"`;
    `errorKey === "too-many-requests"` → `status = "error-lockout"` **only
    when this came from the CONFIRM call** — never conflate with a Resend
    call's own `too-many-requests` (AC-006.4) which instead surfaces via
    the Resend button's own inline error (same generic bucket as
    `EmailVerifyBanner`'s send-error, not a dialog-body state change).
  - Resend handler: calls `requestEmailVerificationAction()` → success →
    `startCooldown()` + clears `error-expired`/`error-lockout` back to
    `idle` (re-enables cells) per AC-005.3/AC-006.3; failure → inline
    small error near the Resend control (does not replace the existing
    expired/lockout body text — both coexist, per UC-005 E1/UC-006 E1
    "falls back to UC-002 exceptions" while "expired-code error message
    stays visible").
  - `role="group"`/`aria-invalid`/`aria-describedby` wiring lives inside
    `OtpInput` itself (Phase 2) — dialog just passes `error`/`describedById`.
- Wire into both entry points:
  - `EmailVerifyBanner` (Phase 5) — no direct dialog mount needed per
    UC-002/AC (banner's own flow is send→sent→cooldown only; the dialog is
    reached via Profile row per FR-005's literal wording, "opens when the
    user activates Xác thực ngay on the Profile row" — re-check
    `use-cases.md` UC-003 step 1 "or an equivalent banner-reachable entry"
    is vague; **recommend**: keep the banner send-only (no dialog trigger)
    for this story, single entry point via Profile row, since DR-016/design
    spec's banner mockup has no "verify now" affordance beyond
    send/resend — flag this reading to `fe-component-architect`/reviewer
    as a scope call, easy to add a banner-side entry later if wrong).
  - `ProfileScreen` (Phase 7) — `EmailVerifyDialog` mounted alongside the
    personal `TabsContent`, `open`/`onOpenChange` from local `useState` in
    `ProfileScreen`.
- NEW `src/features/auth/presentation/email-verify/email-verify-dialog.stories.tsx`
  — states: empty/idle, filled-pending, error-wrong, error-expired
  (cooldown running + elapsed variants), error-lockout, success. Include a
  play-function interaction test per state transition (open→type 6
  digits→submit→each error branch via mocked action, plus the happy path).

**Test first:** the Storybook interaction tests above ARE this phase's
TDD proof (E2E/story tier) — write the story file with play functions
BEFORE wiring the real action calls solidify, iterating red→green per
state.

**Done when:** all 6 dialog states covered in Storybook, keyboard-only
walkthrough passes manually (NFR-004), 320px viewport story addon shows no
overlap (NFR-005).

## Phase 9 — Storybook completeness pass + a11y

Confirm every new/modified component's `.stories.tsx` covers
loading/empty/error/success (tdd.md E2E tier) in one pass:
`otp-input.stories.tsx` (Phase 2), `email-verify-banner.stories.tsx`
(Phase 5), `profile-screen.stories.tsx` additions (Phase 7),
`email-verify-dialog.stories.tsx` (Phase 8). Run `/impeccable audit` on the
banner + dialog + profile row (contrast of `--edu-warning-foreground` on
warning bg, `--edu-error-text` on error bg, focus rings, motion-safe on the
banner's `ev-banner-in` entrance per design-spec `animation` field — gate
behind `prefers-reduced-motion` per accessibility.md).

## Phase 10 — Playwright E2E

**Files:** new spec under the repo's existing Playwright test root (grep
`e2e/` or `tests/` — follow existing US-E08.5/forgot-password Playwright
spec location/naming convention, e.g.
`e2e/email-verification.spec.ts` or co-located per existing convention).
Cover: banner unverified→send→sent→cooldown (mock `iam` 204s at the network
layer, consistent with how existing auth E2E specs stub `iam`); Profile row
CTA→dialog→wrong-code→expired-code→lockout→resend-unlocks→success→banner
disappears+badge flips (no reload); keyboard-only walkthrough through the
dialog; 320px viewport resize check.

**Done when:** `fe-qa-playwright`'s Go/No-Go gate passes; harness proof
updated (`harness-cli story update --id US-E22.1 --unit 1 --integration 1
--e2e 1 --platform 1`).

## Component + state sketch (for `fe-component-architect`/`fe-state-engineer`)

```
AppShell (client, existing)
  └─ EmailVerifyProvider (NEW, client context — email, emailVerified tri-state, cooldown)
       ├─ Header (existing)
       ├─ EmailVerifyBanner (NEW) — reads context only, no props
       ├─ <main>
       │    └─ ReactQueryProvider (existing, server-state boundary — unrelated to EV context)
       │         └─ {children}  (e.g. ProfilePage)
       │              └─ ProfileScreen
       │                   ├─ personal-info row: StatusBadge + CTA (reads context)
       │                   └─ EmailVerifyDialog (NEW, mounted here, controlled open state)
       └─ Sidebar (existing)
```

State classification:
- `emailVerified` (tri-state `boolean | null`) — **shared client state**
  (Context), seeded from **server state** (RSC `GET /users/me` in
  `layout.tsx`/`profile/page.tsx`). Not TanStack Query (§0.5).
- `remainingSeconds` (cooldown) — **local/shared client state**, pure timer,
  no server component.
- `otp` (dialog input) — **local component state**, cleared on close
  (NFR-008), never lifted to context.
- Banner dismiss — **client-only, `sessionStorage`**, not part of the
  shared context (session-scoped, not shared-clock-scoped).

`fe-component-architect`: confirm the `EmailVerifyProvider` mount boundary
(§0.5) and the `OtpInput` prop contract (§Phase 2) before `fe-nextjs-engineer`
starts; `fe-state-engineer`: confirm optimistic-flip-via-context (§0.3) vs
a TanStack Query alternative if there's a project-wide preference this
plan isn't aware of.

## Risks, dependencies, open questions (carried + new)

- **[Carried, spec.md §8 OQ1]** Does send/resend enforce its own
  server-side rate limit? AC-002.5 modeled defensively either way.
- **[Carried, OQ2]** Is `USER_TOO_MANY_ATTEMPTS` lockout scoped to the code
  (Resend unlocks, AC-006.3 assumption) or account/window? Affects whether
  Phase 8's Resend-unlocks-lockout behavior is correct.
- **[Carried, OQ3]** Pre-existing `UserProfileResponseDto` field-name drift
  vs iam's documented schema — this story adds one more field onto that
  same, possibly-stale DTO. Verify against a live/staging `iam` call during
  Phase 0-1 testing, not just against `openapi.yaml`.
- **[New]** §0.5's Context-vs-QueryClient boundary finding should be raised
  to `fe-lead`/`fe-state-engineer` explicitly — it's a real architectural
  constraint of the current `AppShell`/`layout.tsx` wiring, not unique to
  this story (any future shell-level reactive data hits the same wall).
- **[New]** `EmailVerifyBanner`'s scope (send/resend only, no dialog entry
  point) is a reading of ambiguous UC-003 step-1 wording ("or an equivalent
  banner-reachable entry") — flagged in Phase 8 for reviewer sign-off, not
  re-litigated here.
- No new design token; no ADR. `border-edu-error-dark`/`bg-edu-error-dark-light`/
  `bg-edu-teal-light` class names used in Phase 2/8 must be verified against
  `src/app/tokens.css` before use — if the exact modifier doesn't exist,
  use the nearest existing token (e.g. `border-edu-error`/`bg-edu-error/15`)
  rather than inventing one; this is a lookup, not a new-token decision.

## Component Architecture Sign-off (fe-component-architect)

Read `otp-input.tsx`, `profile-screen.tsx`, `app-shell.tsx`, `status-badge.tsx`,
`tokens.css`/`globals.css`, `design-spec.jsonc §screens.emailVerify`, and
`use-cases.md` UC-003/UC-007 verbatim before writing this. Verdict: plan.md's
architecture is sound with one prop-contract finalization (§1), one scope
confirmation (§2, no correction needed), and one token/tone note for the
reviewer (§3).

### 1. `OtpInput` promotion — finalized prop contract

Token check (against `src/app/tokens.css` + `globals.css` `@theme` mapping,
confirmed present as real Tailwind utilities, not just CSS vars):
`border-edu-error-dark` ✓, `bg-edu-error-dark-light` ✓, `text-edu-error-text`
✓ (already used elsewhere, e.g. `profile-screen.tsx` sessions tab). Plan's
named classes are all valid — no substitution needed.

Cell sizing note: current `h-13 w-11.5` already round-trips to 52×46px
(Tailwind v4 spacing scale, 1 unit = 4px) — matches design-spec
`dialog.otpInput.cellSize: "46x52"` exactly. No change needed to sizing, only
to states/labels below.

Placement per `component-organization.md` §2 (composed, ≥2 screens →
`components/shared/<name>/`) — confirmed correct call, not a variant-of-primitive
(this isn't customizing `ui/input`, it's a composed multi-cell pattern) and not
feature-local (2nd caller incoming now). Plain co-located props interface (no
separate `.i-vm.ts`) is correct per this file's own guidance — `.i-vm.ts` is
reserved for the screen/feature **container↔server** contract; `OtpInput` is a
controlled, non-container presentational primitive-composed component, so an
inline exported `OtpInputProps` in `otp-input.tsx` is the right shape (mirrors
how `StatusBadge` — the nearest sibling shared component — does it:
`StatusBadgeProps` inline in `status-badge.tsx`, no `.i-vm.ts`).

```ts
// src/components/shared/otp-input/otp-input.tsx
export interface OtpInputProps {
  /** Controlled value, digits only, length 0-6. */
  value: string;
  onChange: (value: string) => void;
  /** Per-cell aria-label, e.g. (n) => `Chữ số thứ ${n}` (1-indexed). Both real
   *  callers MUST pass one; default below is back-compat only for a caller
   *  that omits it (should not happen post-migration). */
  digitAriaLabel?: (n: number) => string;
  /** aria-label on the `role="group"` wrapper, e.g. "Mã xác thực 6 chữ số". */
  groupAriaLabel?: string;
  /** id of an element describing the current error (linked via
   *  aria-describedby on the group wrapper) — e.g. the dialog's inline
   *  error-message paragraph id. Only meaningful when `error` is true. */
  describedById?: string;
  /** Visual + a11y error state — design-spec dialog.otpInput.errorState:
   *  border-edu-error-dark / bg-edu-error-dark-light / text-edu-error-text.
   *  Sets aria-invalid on cells + the group wrapper. */
  error?: boolean;
  /** All 6 cells non-interactive (UC-006 lockout). Cells keep their value,
   *  just can't be typed into. */
  disabled?: boolean;
}
```

Behavioral contract notes for `fe-nextjs-engineer` (not prop-level, but
implementer needs to know at the call boundary):
- Default for `digitAriaLabel`: keep plan's `(n) => \`OTP digit ${n}\`` — it's
  dead code in practice (both callers always pass a translated fn) but keeps
  the prop optional/back-compat-safe per plan.md Phase 2.
- Wrapper: `<div role="group" aria-label={groupAriaLabel}
  aria-invalid={error || undefined} aria-describedby={error ?
  describedById : undefined}>`. `groupAriaLabel`/`describedById` stay optional
  (undefined-safe) so a hypothetical 3rd caller with no group semantics
  doesn't regress — but forgot-password and email-verify both pass them.
- Per-cell: `aria-label={digitAriaLabel?.(i + 1) ?? \`OTP digit ${i + 1}\`}`,
  `aria-invalid={error || undefined}`, `disabled={disabled}`.
- Cell class swap on `error`: replace `border-border` → `border-edu-error-dark`,
  add `bg-edu-error-dark-light`, text stays `text-edu-error-text` (overrides
  the default `text-foreground`). Keep `focus:border-primary` for non-error
  cells only — an error cell should not flip back to primary-blue focus ring
  (would visually contradict the error state); use
  `focus:border-edu-error-dark focus:ring-2 focus:ring-edu-error-dark/20` when
  `error` is true (implementer's exact Tailwind composition, not prescribed
  further — `cn()` conditional per `tailwind-v4.md`).

**Forgot-password call-site change:** import path only
(`@/features/auth/presentation/forgot-password/otp-input` →
`@/components/shared/otp-input`), plus now passes `digitAriaLabel` and
`groupAriaLabel` (currently has neither — grep confirmed forgot-password's
current usage passes only `value`/`onChange`). It does **not** pass
`error`/`disabled`/`describedById` — those stay `undefined`, cells render in
the default (non-error, enabled) visual exactly as today. **Behavior-preserving
move**, per plan.md's own "Done when" criterion. If forgot-password's own i18n
namespace has no existing per-digit/group label key, add one there (plan.md
already calls this out — `auth.forgotPassword.*`, not `emailVerify.*`); do not
invent one on its behalf here, that's an i18n-namespace call for
`fe-nextjs-engineer` to grep at implementation time.

One file, one home: after the move, `grep -r "forgot-password/otp-input"` must
return zero hits outside the deleted file's own git history.

### 2. `EmailVerifyDialog` mount point + component tree — plan's reading CONFIRMED

Read `use-cases.md` UC-003 step 1 verbatim: "User activates 'Xác thực ngay'
(Profile row, UC-007) **or an equivalent banner-reachable entry**." This is
genuinely permissive wording ("or"), not a mandate — it describes two *possible*
entry points without requiring both to ship in this story. Cross-checked
against `design-spec.jsonc`'s `banner.states` (`default`/`sent` — send/resend
CTA only, no third "open dialog" affordance) and the `dialog` section's own
mount description (opened from Profile). **No banner-side dialog trigger
exists in the design artifact this story is scoped to build against.**
Confirming plan.md's recommendation: single entry point via Profile row for
this story; a banner-side "Xác thực ngay" link is a legitimate, cheap follow-up
if UX later wants it, but is out of scope now (adding it speculatively would be
scope creep against DR-016/the mockup, not a fix).

Final component tree (matches plan.md's sketch; confirmed, not altered):

```
AppShell (client, existing, 'use client')
  └─ EmailVerifyProvider (NEW, client Context — presentation, feature-local)
       │   mounts wrapping the shell's existing outer <div> (app-shell.tsx:57)
       │   so it covers Header + banner slot + {children} + Sidebar/Sheet.
       ├─ Header (existing, unchanged)
       ├─ EmailVerifyBanner (NEW, presentational — reads context, no data props)
       ├─ <main>
       │    └─ ReactQueryProvider (existing, server-state boundary; orthogonal
       │         to EV context — no interaction between the two)
       │         └─ {children}  →  e.g. ProfilePage (RSC)
       │              └─ ProfileScreen (existing, client, extended)
       │                   ├─ personal TabsContent: email Field (existing,
       │                   │    unchanged, still disabled) + emailImmutableHint
       │                   │    caption (NEW) + verification row (NEW: StatusBadge
       │                   │    variant + CTA button, reads context for current
       │                   │    emailVerified + opens dialog)
       │                   └─ EmailVerifyDialog (NEW, mounted here,
       │                        open/onOpenChange local useState in ProfileScreen)
       └─ Sidebar / mobile Sheet (existing, unchanged)
```

**`EmailVerifyBanner` props:** confirmed — `{ className?: string }` only (or
zero props). All data (`emailVerified` tri-state, `email`, `remainingSeconds`,
`startCooldown`) comes from `useEmailVerify()`. No `.i-vm.ts` needed (it's not
a screen container, it's a shell-mounted presentational component reading a
Context — same class of component as `SseDisconnectBanner`, which plan.md
correctly uses as `app-shell.tsx`'s existing sibling pattern for the mount
slot). Confirm `SseDisconnectBanner`'s own prop shape as precedent:

```ts
// email-verify-banner.tsx (co-located props type, no separate contract file)
export interface EmailVerifyBannerProps {
  className?: string;
}
```

**`EmailVerifyDialog` props:** plan's `{ open, onOpenChange }` is sufficient —
confirmed. No `email`/`onVerified` prop needed since both are sourced from
`useEmailVerify()` (email for interpolation, `markVerified()` for the flip).
Do **not** add an `initialOtp`/`defaultStatus` prop — plan.md's local
`status`/`otp` state reset-on-close (NFR-008) fully owns that, no controlled
override needed from either call site (there's only one call site: Profile row).

```ts
// email-verify-dialog.tsx (co-located props type)
export interface EmailVerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**Profile personal-info row — exact slot:** `profile-screen.tsx` lines 97–112,
inside the `personal` `TabsContent`'s `CardContent` grid. Insert the new
verification row as a sibling to the existing `email` `Field` (currently line
101–105), same `sm:grid-cols-2` grid cell region — i.e. immediately after the
`email` `Field`'s closing tag, before the `phone` `Field` (or as a
`sm:col-span-2` row directly under the `email` field if the badge+CTA don't
fit one grid cell — implementer's call on exact grid placement, not
prescribed further; both are valid per NFR-005's "no overlap" bar as long as
it's tested at 320px). The `emailImmutableHint` caption goes directly under
the `email` `Field`'s `<Input>` (inside that same `Field`'s wrapper, or as a
sibling — implementer's call), not under the verification row. `ProfileScreen`
gains one new local state: `const [dialogOpen, setDialogOpen] =
useState(false)` (component-owned UI state, not lifted — matches state
classification below).

### 3. `StatusBadge` reuse — confirmed exists, ONE tone correction to flag

`src/components/shared/status-badge/status-badge.tsx` confirmed: API is
exactly `{ tone?: StatusTone; className?: string; children: ReactNode;
"aria-label"?: string }`, `StatusTone` union already includes `"success"`,
`"warning"`, and (relevant correction below) `"teal"`. Plan's assumption
(`<StatusBadge tone="success">`/`tone="warning"`) is a valid API call —
**no new badge component needed**, decision 0026 satisfied.

**Flag for `fe-tech-lead-reviewer` (not blocking, but worth a conscious
choice):** `design-spec.jsonc`'s `profileEmailField.badge.verified.color` is
literally `var(--edu-teal)` (`#00b8a9`), not `var(--edu-success)`
(`#13deb9`) — two distinct, close-but-different tokens. `StatusBadge` already
has a `tone="teal"` option (`bg-edu-teal/15 text-edu-text-primary`) that
matches the design-spec's literal hue more precisely than `tone="success"`.
**Recommendation: use `tone="teal"` for the verified badge**, not
`tone="success"`, to match the literal design-spec color — `tone="warning"`
for unverified is fine as-is (design-spec's unverified color
`var(--edu-warning-text)`/`var(--edu-warning-light)` is close enough to
`StatusBadge`'s existing warning tone that, per `design-system.md`'s own
precedent of treating the `Badge`/`StatusBadge` pattern's `/15`-opacity
formula as canonical over a legacy spec's literal alpha value, reusing the
existing `warning` tone as-is is the right call — don't fork a
badge-specific opacity/token combo for one screen). This is a one-word
(`tone="teal"` vs `tone="success"`) implementation detail, not a new
component or new token — flagging so `fe-nextjs-engineer`/reviewer make it
consciously rather than defaulting to the semantically-obvious-but-
literally-wrong `"success"`.

### State ownership recap (confirms plan §Component+state sketch, no changes)

| State | Owner | Notes |
| --- | --- | --- |
| `emailVerified` (tri-state) | `EmailVerifyProvider` context, seeded from RSC | shared, not TanStack Query (§0.5) |
| `remainingSeconds`/cooldown | `EmailVerifyProvider` context | shared clock, banner+dialog both read/write |
| `otp` (dialog input) | `EmailVerifyDialog` local `useState` | never lifted, cleared on close (NFR-008) |
| `status` (dialog: idle/pending/error-*/success) | `EmailVerifyDialog` local `useState` | derived from action result, not context |
| `dialogOpen` | `ProfileScreen` local `useState` | controlled prop down into `EmailVerifyDialog` |
| banner dismissed | `EmailVerifyBanner` local `useState` seeded from `sessionStorage` | not in context — session-scoped, not clock-scoped |

`fe-state-engineer`: no changes needed to plan §0.5/§0.3's Context-vs-Query
reasoning from this review — confirmed as the only mechanism crossing the
`AppShell`/`ReactQueryProvider` boundary as currently wired.

## State Architecture Sign-off (fe-state-engineer)

### 1. §0.5 finding — CONFIRMED, no correction

Read `src/components/layout/app-shell/app-shell.tsx` and
`src/app/[locale]/t/[tenant]/(app)/layout.tsx` directly. `layout.tsx` line
44-46 is exactly:

```tsx
<AppShell tenantId={tenant} role={role!} userName="Nguyen Van A">
  <ReactQueryProvider>{children}</ReactQueryProvider>
</AppShell>
```

`AppShell` (client component) receives `children` as an already-composed
React element tree — `ReactQueryProvider` is a **descendant of `AppShell` in
render terms** (it's literally the `children` prop value), but `AppShell`'s
OWN JSX (`Header` line 75, `SseDisconnectBanner` slot line 81, `Sidebar`
lines 59/70) is rendered *outside* `{children}` — i.e. it is a sibling
subtree of `ReactQueryProvider`, not wrapped by it. `useQuery`/`useMutation`
called from a component mounted directly in `AppShell`'s own render (banner)
or passed a prop into it has no `QueryClient` in its context chain. Finding
holds exactly as plan.md §0.5 states, confirmed against the real file, not
just the plan's description of it.

**Call: Context is correct here, not a TanStack Query workaround.** This is
not "we need shell-level shared state so let's reach for a global store" —
it's a hard process/tree-boundary constraint (no `QueryClient` reaches
`AppShell`'s own slot), the state itself is 2 booleans + 1 string + 1 derived
timer (not a server-data cache with invalidation semantics), and it is seeded
once from server-fetched data (RSC `GET /users/me` in `layout.tsx`) and never
re-fetched client-side after that — so there's no cache-invalidation problem
for TanStack Query to solve in the first place. Introducing a second
`QueryClientProvider` instance scoped above `AppShell` instead of a Context
would be the wrong fix: it would fragment the query cache (two clients in one
tree) for a payload that isn't cache-shaped. **No ADR needed** — this is not
a global client store (no cross-feature business state, no persistence, one
`EmailVerifyProvider` scoped to exactly the tenant-shell subtree, disposed
per navigation like any other React Context) and does not contradict "no
Zustand/Redux/Jotai"; it is the same category of local/derived UI state
`useSidebarCollapsed`/`use-sidebar-collapsed.ts` already uses (hook +
`useState`, just needs a Context instead of a hook because two *different*
mount points — banner in `AppShell`, dialog in `{children}`'s subtree — must
read the same instance).

### 2. `EmailVerifyProvider` — finalized contract

```ts
// src/features/auth/presentation/email-verify/email-verify-context.tsx
export interface EmailVerifyContextValue {
  /** Tri-state: null = unresolved/fetch-error (fail-closed), never re-derived client-side except by markVerified(). */
  emailVerified: boolean | null;
  email: string;
  /** Optimistic local flip on confirmed 204 — see §4. Idempotent (calling twice is a no-op). */
  markVerified: () => void;
  /** Derived from the cooldown hook (§3) — 0 = actionable. */
  remainingSeconds: number;
  /** (Re)starts a fresh 60s window — resets to 60 even if already running (Resend semantics). */
  startCooldown: () => void;
}

export function EmailVerifyProvider(props: {
  initialEmailVerified: boolean | null;
  email: string;
  children: React.ReactNode;
}): JSX.Element;

/** Throws `Error("useEmailVerify must be used within EmailVerifyProvider")` outside the provider — fail loud, no existing custom-context precedent in this repo (only shadcn's own `useFormField` throws similarly) but this is the standard React pattern and matches "no silent undefined" repo convention. */
export function useEmailVerify(): EmailVerifyContextValue;
```

Mount boundary (unchanged from plan): `AppShell` wraps its full return value
(the outermost `<div className="flex min-h-screen …">`, so Sidebar/Header/
banner/`{children}` are ALL descendants) in `<EmailVerifyProvider>`. This is
the only placement that lets both `EmailVerifyBanner` (mounted in `AppShell`
directly) and `EmailVerifyDialog`/Profile row (mounted inside `{children}`,
itself inside `ReactQueryProvider`) read one shared instance — confirms
plan.md's component-tree sketch is correct, `ReactQueryProvider` nests
*inside* `EmailVerifyProvider`, never the reverse.

No provider-level `useEffect` refetch, no `initialData` reconciliation
concern (no TanStack Query involved) — `initialEmailVerified`/`email` seed
`useState` exactly once (`useState(initialEmailVerified)`), consistent with
this being RSC-seeded one-shot state, not a cache.

### 3. Cooldown hook — API tightened

Plan's shape confirmed sound; tightening per the AC set (esp. AC-008.5/8.6
and the Resend-mid-cooldown-resets rule):

```ts
// src/features/auth/presentation/email-verify/use-email-verify-cooldown.ts
export interface UseEmailVerifyCooldownOptions {
  /** Injectable clock for deterministic tests (vi.useFakeTimers + this). Default: () => Date.now(). */
  now?: () => number;
  durationSeconds?: number; // default 60
}

export interface UseEmailVerifyCooldownResult {
  /** Clamped to [0, durationSeconds]; 0 = actionable (Resend/Send enabled). */
  remainingSeconds: number;
  /** (Re)arms a fresh window from `now()`. Safe to call while already running — always resets to a fresh 60, never additive/no-op (Resend-mid-cooldown case, AC-002.6). Never called automatically by an error path (AC-008.6) — that discipline lives in the CALLER (banner/dialog error branches simply never call this), not the hook itself. */
  start: () => void;
}

export function useEmailVerifyCooldown(
  options?: UseEmailVerifyCooldownOptions,
): UseEmailVerifyCooldownResult;
```

- **No `reset()` needed** — nothing in the 48 AC calls for manually
  cancelling a cooldown early (only natural expiry or a fresh `start()`
  overwrite). Adding one would be speculative; skip it.
- **`start()` re-entrancy**: must overwrite `cooldownEndsAt` to
  `now() + durationSeconds*1000` unconditionally (not "only if not already
  running") — this is what AC-002.6 ("mid-cooldown reopen/resend shows a
  fresh 60, not stacked or ignored") requires. Plan's Phase 3 note already
  says this; confirmed as the correct, not-negotiable behavior.
- **State lives in the hook, not the Context's own `useState`** — the
  Context (§2) only forwards `remainingSeconds`/`startCooldown` from one
  `useEmailVerifyCooldown()` call made *inside* `EmailVerifyProvider`. Do not
  duplicate timer state in both places.
- `aria-live="polite"` announcement (AC-008.2/8.3) is explicitly a
  **component-level** concern (banner and dialog each render their own
  `aria-live` region reading `remainingSeconds`/derived text) — the hook
  stays a pure number-producer with zero DOM/ARIA responsibility. Confirmed,
  do not push announcement logic into the hook or the Context.

### 4. Optimistic flip (INT-003) — confirmed, one edge case noted

`markVerified()` sets the Context's `emailVerified` `useState` to `true`
directly (no `GET /users/me` refetch). Since both `EmailVerifyBanner`
(reads `emailVerified !== false` → render/hide) and the Profile row (reads
`emailVerified` for badge, per Phase 7's "context takes over reactively after
first paint") subscribe to the **same** `EmailVerifyProvider` instance (one
per tenant-shell mount, confirmed by §2's boundary), both flip in the same
render pass the moment `EmailVerifyDialog` calls `markVerified()` — AC-007.7
holds by construction, no invalidation/refetch wiring needed.

Edge case checked: cross-tab (spec.md §8 explicitly out of scope) — each
browser tab has its OWN `AppShell` mount → its own `EmailVerifyProvider`
instance → its own `useState`. Tab B's context is untouched by Tab A's
`markVerified()` call; Tab B still shows unverified until its own next
`layout.tsx` RSC render (new nav or reload) re-seeds `initialEmailVerified`
from a fresh `GET /users/me`. This matches spec.md's documented
out-of-scope behavior exactly — **no accidental regression**, nothing further
to design here.

One in-tab thing to watch (not a regression, just worth naming for
`fe-nextjs-engineer`): same-tab client-side navigation between routes does
NOT remount `layout.tsx`'s RSC render in the App Router unless the
`(app)` layout segment itself unmounts — so `EmailVerifyProvider`'s instance
persists across route changes within one tab, which is exactly the desired
behavior (verified status and cooldown both need to survive navigation
within a session, per AC-001.5/AC-008.5). No extra plumbing needed for that
persistence; it falls out of Next's layout-persistence-across-navigation
behavior for free.

### 5. `getProfile()` result shape — confirmed, `ProfileResult` is correct

Read `i-auth.repository.ts`: `AuthResult = { data: AuthSession; ... }` where
`AuthSession` bundles `user` + tokens (`signin`/`socialSignin`'s shape).
`getProfile()` is a standalone `GET /users/me` with **no** token pair to
return — reusing `AuthResult` would force a fake/partial `AuthSession` at
every call site (fragile, invites a bug where someone reads `.tokens` off a
profile-only fetch). The plan's new, narrower type is correct and mirrors
the existing `RefreshResult`/`VoidResult` pattern (one result type per
distinct data shape a repo method actually returns) rather than overloading:

```ts
// i-auth.repository.ts — add
export type ProfileResult =
  | { data: AuthUser; error?: never }
  | { data?: never; error: AuthFailure };

// add to IAuthRepository
/** Standalone `GET /users/me` (no signin flow attached, no tokens). */
getProfile(): Promise<ProfileResult>;
```

No further shape needed — do not add pagination/meta fields (single-resource
fetch, no list semantics) and do not gold-plate with a generic
`Result<T>` — the repo already prefers one named result type per shape
(`AuthResult`/`RefreshResult`/`VoidResult`), `ProfileResult` fits that
convention exactly.

### Summary for `fe-nextjs-engineer`

No TanStack Query anywhere in this story's new code. One `EmailVerifyProvider`
(plain Context) mounted in `AppShell` around its entire return value; one pure
`useEmailVerifyCooldown()` hook (DOM-free, fake-timer-testable) owned by that
provider; `markVerified()`/`startCooldown()` are the only two write paths,
both local `useState` sets, no query invalidation involved; server data enters
exactly once per RSC render via `makeGetProfileUseCase()` in `layout.tsx` (and
again, independently, in `profile/page.tsx` for the VM's initial-paint seed —
both reads of the same `GET /users/me`, no shared cache between them by
design, consistent with NFR-006's "no added round-trip" meaning "don't add a
NEW blocking fetch," not "there must be exactly one fetch total").
