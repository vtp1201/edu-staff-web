# Tech-Lead Review — US-E23.1 Header Tenant-Switch Menu + Dialog

Reviewer: `fe-tech-lead-reviewer` · Date: 2026-07-19 · Lane: high-risk
Branch: `feat/us-e23.1-tenant-switch-menu` (commits `7efeae5`, `9ca1e51`,
`3633a45`, `c1bc6d1`) reviewed against `main`.

## 1. Review Summary

Additive presentation slice that wires the existing `SwitchTenantUseCase` /
`switchTenantAction` into a header user-menu "Đổi trường" item + "Chọn trường"
dialog, with a Path-A discriminated Server-Action result, a mock-first tenant
display lookup, and a one-shot `?switched=1` success toast. The
security-critical core (Path A redirect-vs-error handling, no-cookie-mutation on
403, no client token exposure, server-only boundary) is implemented correctly
and well-tested. Architecture, TypeScript, tokens, and i18n are all clean.
**One blocking gap**: the menu→dialog→ESC-dismiss + focus-return path (AC-10 /
NFR-002) is not covered by a committed interaction test, and a fix the engineer
was trialing for exactly this path (`e.preventDefault()` on the menu-item
`onSelect`) was discarded from the working tree during review rather than
committed with proof.

## 2. Architecture Compliance — PASS

- `resolveTenantDisplay` (`.../mocks/tenant-display.mock.ts`) and
  `enrichMemberships` (`.../infrastructure/enrich-memberships.ts`) both carry
  `import "server-only"`. ✓
- `TenantRepository.toFailure` + `switchTenant` throw a typed `TenantFailure`;
  branches on `errorCodeOf`/`statusOf`, never on `error.message`
  (`api-integration.md`). Mirrors `AnnouncementRepository.toFailure`. ✓
- Presentation (`tenant-card.tsx`, `tenant-switch-dialog.tsx`, `tenant-logo.tsx`,
  `header.tsx`, `app-shell.tsx`) are `'use client'` / pure and import NONE of
  `infrastructure/` or `bootstrap/di/`. Data flows via props; the Server Action
  is passed as a prop (`onSwitchTenant`). ✓
- `app/.../select-tenant/actions.ts` (`'use server'`) calls only
  `bootstrap/di` + `bootstrap/lib` + the server-only mock. `layout.tsx` (RSC,
  `server-only`) does the DI fetch + enrichment and passes plain data down. ✓
- `SwitchTenantResult` / `TenantCardViewModel` types live in
  `tenant-card.i-vm.ts` (pure types, no directive) so both the `'use server'`
  action and client components share them without a client→server import. ✓
- Component placement (decision 0026): `TenantLogo`/`TenantCard`/
  `TenantSwitchDialog`/`.i-vm.ts` all in `src/components/shared/tenant-card/`,
  no fork/duplication. ✓
- `bun run build` exits 0 → server-only import guard confirms no server module
  leaked into a client bundle. ✓

## 3. Code Quality — Excellent

- Risk-A handling is textbook: `runSwitchActivation` and `switchTenantAction`
  both re-throw `isRedirectError(err)` as the FIRST line of their catch, before
  any classification. No `any`; no unexplained `!`.
- `switch-activation.ts` extracted as a framework-free controller → the
  redirect-vs-error classification is unit-tested without mounting Radix. Good
  separation.
- `deriveTenantMenu` / `parseSwitchedParam` are pure and unit-tested.
- Minor (CONSIDER): `AppShell` strips the success param with
  `router.replace(pathname)`, which drops ALL query params on the destination,
  not just `switched`/`school`. Acceptable because a fresh switch redirect only
  carries those two, but a `URLSearchParams` delete would be more surgical.

## 4. Data & Contract Review — PASS

- `switchTenantAction` success path: `useCase.execute()` → `setAuthCookies()` →
  compute href → `redirect()` (throws NEXT_REDIRECT) → `return {ok:true}`. The
  `redirect()` throw is inside `try`, AFTER `setAuthCookies`, and is propagated
  unchanged by the catch guard. `actions.test.ts` proves the throw propagates
  (`.rejects.toMatchObject({digest: NEXT_REDIRECT})`) rather than being folded
  to `{ok:false}`. ✓ (Risk A item 1a/1b/1c all satisfied.)
- AC-8 / FR-008 (no cookie mutation on 403): structurally impossible for a
  caught failure to reach `setAuthCookies` — `execute()` throws before
  `setAuthCookies` is ever called; test asserts `setAuthCookies` NOT called and
  no redirect on `{type:"forbidden"}`. ✓
- Path A contract: `TenantFailure` union + `toFailure` present; 403/`FORBIDDEN`
  → `forbidden`; `NETWORK_ERROR`/no-status/401/408/429/5xx → `network`; else
  `unknown` (action folds `unknown`→`network`). Traced the actual branch logic,
  not comments. ✓
- AC-9 / FR-010 descope honored: 401 maps to `network`; NO retry-once shim was
  added anywhere. ✓
- Regression: `select-tenant.tsx` updated to the new `Promise<SwitchTenantResult>`
  signature, ignores the return value, wraps in `void`; its own tests still pass
  in the full suite. ✓
- List fetch fail-closed to `[]` in `layout.tsx` (`.catch(() => [])`) → menu
  degrades to hidden (FR-002), no crash. ✓

## 5. Design System & i18n — PASS

- `TenantAccentTone` is a closed 6-value string enum consumed via existing
  semantic Tailwind classes (`bg-primary/15`, `bg-edu-info/15`, `-text`
  contrast variants). No raw hex / rgba / gray-N / inline color — grep clean
  (only match is a pre-existing code comment). ✓
- vi/en parity for all 10 `tenant.switch.*` keys (`menuItem`, `dialogTitle`,
  `dialogDescription`, `current`, `switching`, `error403`, `errorGeneric`,
  `empty`, `cardAriaLabel`, `switched`); ICU `select` in `cardAriaLabel` matches
  across locales. Dynamic role label uses pre-translated typed keys (no raw
  string into `t()`). `bunx tsc --noEmit` exits 0 (typed-message drift caught). ✓
- Error/decorative text uses `text-edu-error-text` (ADR 0049), warning uses
  `-foreground`. ✓

## 6. Security Review — PASS

- Tokens minted + set server-side only (`setAuthCookies` in the `'use server'`
  action); no token value reaches any client prop/state/log. `bun build` guard
  green. ✓
- `?switched=1&school=<name>` carries only the tenant display name (not PII per
  BA spec); one-shot: `switchedFired` ref + `router.replace` strip prevents
  re-fire on refresh. ✓
- No `dangerouslySetInnerHTML`/`eval`. Redirect target is server-computed via
  `tenantUrl`, not user-supplied. ✓

## 7. Test Coverage — INSUFFICIENT (one AC gap)

Verified independently (not trusting self-report):
- `bunx tsc --noEmit` → exit 0.
- `bun lint` → clean for this story's files (the 1 warning + 1 info are
  pre-existing in `features/messaging`, untouched here).
- `bun vitest run` → **362 files / 2326 tests, all pass** (matches report).
- `bun run build` → exit 0.
- `bun run vitest:storybook run <tenant-card + header>` → 4 files / 17 tests
  pass on clean HEAD.

Gap: no committed interaction test exercises the **menu→dialog→ESC-dismiss +
focus-return-to-trigger** path (AC-10 / FR-006 / NFR-002). The committed
`MultiTenant` header story only asserts the dialog OPENS. The dialog-level
`DismissIdle` story tests dismiss on a directly-mounted dialog, not one opened
from the `DropdownMenuItem` — which is where Radix's menu-close-focus-return can
race the dialog focus-trap.

Note on the full storybook suite: a broad set of UNRELATED story files
(lesson-bank, discipline, timetable, announcements, messaging, …) fail both in
the full run and in isolation with a pre-existing Radix error (`A <Select.Item />
must have a value prop that is not an empty string`) + full-suite worker
contention. This is a repo-wide storybook-health issue, NOT a US-E23.1
regression (this story touches none of those features). Flagged for `fe-lead`.

## 8. Required Changes

- **[MUST FIX — blocking close]** Menu→dialog→ESC dismiss + focus-return
  (AC-10/NFR-002) is unproven on committed code. `src/components/layout/
  app-shell/header/header.tsx:185` opens the dialog via
  `<DropdownMenuItem onSelect={() => setDialogOpen(true)}>` with NO
  `e.preventDefault()`. Opening a Radix Dialog from a `DropdownMenuItem` without
  preventing the default select (which closes the menu and returns focus to the
  trigger) is a known focus-management foot-gun. During this review the working
  tree contained an uncommitted fix adding `e.preventDefault()` here, plus two
  untracked debug stories (`header.a11y-audit.stories.tsx`,
  `escape-audit.stories.tsx`, both with `console.log`; the a11y-audit one
  asserted the dialog was NOT closing after ESC and was FAILING) — all of which
  were discarded/removed (not committed) mid-review. Resolve deliberately:
  (a) add a committed interaction story that opens the dialog via the `menuitem`,
  presses Escape, asserts the dialog is gone AND focus returns to the user-menu
  trigger; (b) if that fails on current committed code, restore the
  `e.preventDefault()` fix and re-run until green. Do not leave the behavior
  proven only by a discarded debug story.
- **[SHOULD FIX]** Ensure no debug/scratch story files (`*a11y-audit*`,
  `*escape-audit*`, or any with `console.log`) get committed. Confirm the branch
  tip is clean before merge (`git status` clean, `git log -p` free of
  `console.log` in `*.stories.tsx`).
- **[CONSIDER]** `app-shell.tsx` success-param strip via `router.replace(pathname)`
  drops all destination query params; prefer deleting only `switched`/`school`
  from a `URLSearchParams` copy if any destination is ever expected to carry
  other params.
- **[CONSIDER — repo-health, not this story]** Flag the pre-existing storybook
  suite failures (Radix `<Select.Item>` empty-value across lesson-bank/
  discipline/timetable/etc.) to `fe-lead` as a separate cleanup item.

## 9. Final Decision — REVISION REQUIRED

No critical security or data-loss defect — the Path-A / 403 / token-boundary
core is correct and well-proven. The single blocking item is the missing
committed proof (and possibly missing fix) for the AC-10/NFR-002 menu→dialog
ESC-dismiss + focus-return path in a high-risk, a11y-gated lane. Once a
committed interaction test demonstrates that path is correct (restoring
`e.preventDefault()` if needed) and the tree is confirmed free of debug
artifacts, this is otherwise APPROVED-quality and ready for design-review + QA.
`fe-nextjs-engineer` to address; re-review is trivial (one story + one code
line).
