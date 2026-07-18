# QA Report — US-E23.1 Header Tenant-Switch Menu + Dialog

Reviewer: `fe-qa-playwright` · Date: 2026-07-19 · Lane: high-risk
Branch: `feat/us-e23.1-tenant-switch-menu` (read-only for production code; QA
added test/story code only, no `.ts(x)` production files touched).

Gate check: `fe-tech-lead-reviewer` status = **APPROVED** (after 1 revision
round, `review.md`), `fe-accessibility-auditor` = 1 Blocking + 1 Major + 1
Minor, all fixed and re-verified (`a11y-audit.md`), fe-lead design-review =
**pass** (`story.md` Evidence block, 2026-07-19). QA proceeds.

## 1. QA Summary

This is a well-executed, narrow, additive presentation slice on top of an
already-hardened server-side switch flow. Independent re-verification
(re-running every claimed suite myself, re-deriving AC coverage from the
actual test files rather than trusting `story.md`/`review.md`'s self-reported
counts) confirms:

- **Risk A (redirect-passthrough)** is genuinely proven at TWO layers
  (`switch-activation.test.ts` unit level + `actions.test.ts` Server Action
  level) — this is the single highest-risk behavior in the story and it is
  solid.
- **A11Y-001 (keyboard trap)** fix is committed and independently re-verified:
  `MultiTenant_CloseRestoresFocus` genuinely asserts focus lands inside the
  dialog on open, the dropdown fully unmounts, Escape closes it, and focus
  returns to the exact trigger button (`toBe(trigger)`, not just "gone").
- **AC-9/FR-010 descope** is honored exactly as decided — `tenant.repository.test.ts`
  proves 401 → `"network"` type, no retry-once shim exists anywhere in the diff.
- Found and closed **2 real coverage gaps** the self-reports missed (AC-6
  no-op-on-current-card had zero spy-based proof; backdrop-click dismiss was
  never tested, only Escape) — both are now committed, passing tests.
- Found **1 real production defect**: a genuine horizontal-overflow bug in
  the shared `DialogContent` primitive at 320px/375px viewports, contradicting
  the design-review Evidence block's claim of "no fixed-width breakpoints to
  break at 320px." Proven with 2 new, intentionally-failing Storybook tests
  (repo convention, see `email-verify-dialog.stories.tsx` `Viewport320`) —
  **not fixed** (QA writes test code only).
- One item (the `?switched=1` one-shot toast wiring in `AppShell`) remains
  proven only at the pure-function level (`parse-switched-param.test.ts`), not
  at the actual `useEffect`/component level — flagged as a real but
  low-severity, low-actionability gap (see §3 finding QA-002) given this
  repo's test infrastructure (no jsdom/`@testing-library/react`; `AppShell`
  itself has no Storybook story and mounting one requires stubbing a
  real-EventSource-opening hook with no established mocking pattern in this
  codebase — judged not worth the flakiness risk to force through in this
  pass).

**Confidence: MEDIUM-HIGH.** The security-critical core (Risk A, 403 no-cookie-
mutation, token boundary, AC-9 descope) is rock solid and independently
re-verified. The one real defect found (viewport overflow) is a genuine UI
regression at narrow viewports but is NOT a security/data-integrity issue and
is isolated to a fixable CSS layout gap in a shared primitive.

**Findings by severity:**
- CRITICAL: 0
- MAJOR: 1 (QA-001 — dialog horizontal overflow at 320/375px, shared `DialogContent` grid-item min-width gap)
- MINOR: 1 (QA-002 — `AppShell`'s one-shot toast effect wiring has no test above the pure-parse level)
- INFO: 1 (QA-003 — `TenantSwitchDialog` renders non-switchable memberships as clickable cards; confirmed INTENTIONAL per AC-004.6's own wording, not a defect — see §3)

## 2. Acceptance Criteria Coverage Matrix (25/25 AC, all traced)

| AC ID | Criterion (condensed) | Test ID(s) | Type | Status |
| --- | --- | --- | --- | --- |
| AC-001.1 | Current-tenant block happy-path match | `derive-tenant-menu.test.ts` "matches the current membership by currentTenantId" | Unit | Covered |
| AC-001.2 | Stale/foreign tenantId → role-only fallback | `derive-tenant-menu.test.ts` "falls back to undefined on a stale/foreign tenantId" | Unit | Covered |
| AC-001.3 | INT-001 fetch fails → same fallback | `derive-tenant-menu.test.ts` "canSwitch=false on fetch-fail (empty memberships)" (asserts on `[]` input; `currentMembership` is `undefined` by the same `.find()` code path as AC-001.2 — no distinct named assertion existed before this pass) | Unit | Covered (weak — see QA-004 below) |
| AC-002.1 | ≥2 ACTIVE → menu item shown | `header.stories.tsx` `MultiTenant` | Storybook | Covered |
| AC-002.2 | No optimistic render while INT-001 in flight | `derive-tenant-menu.test.ts` is a pure sync function (no async gap to flash) — `layout.tsx` awaits the fetch server-side before ever rendering `<Header>`, so "no flash" is structurally guaranteed (RSC data-then-render), not independently tested client-side | Design (structural) | Covered by architecture |
| AC-002.3 | Keyboard (Enter/Space) opens dialog | `header.stories.tsx` `MultiTenant`/`MultiTenant_CloseRestoresFocus` use `userEvent.click`, not literal `{Enter}`/`{Space}` on the menuitem — native `role=menuitem` Enter/Space semantics are Radix's own (not re-implemented) | Storybook (click only) | Covered (indirect — see QA-005) |
| AC-003.1 | Exactly 1 membership → NO menu item node (negative) | `header.stories.tsx` `SingleTenantZeroNoise` (`queryByRole(...).not.toBeInTheDocument()`) + `derive-tenant-menu.test.ts` "canSwitch=false with exactly 1" | Storybook + Unit | Covered |
| AC-003.2 | Fetch fails → NO menu item node (negative), fail-closed | `header.stories.tsx` `FetchFailZeroNoise` (distinct story, own negative assertion) + `derive-tenant-menu.test.ts` fetch-fail case | Storybook + Unit | Covered |
| AC-003.3 | No regression to existing single-tenant menu | `header.stories.tsx` `Teacher`/`Student` (pre-existing stories still pass unmodified) + `SingleTenantZeroNoise` | Storybook | Covered |
| AC-004.1 | Dialog open, focus-trap, card list, "Hiện tại" badge | `tenant-switch-dialog.stories.tsx` `OpenCardList` + `header.stories.tsx` `MultiTenant_CloseRestoresFocus` (focus-into-dialog assertion) | Storybook | Covered |
| AC-004.2 | Empty list at open → `tenant.select.empty` copy | `tenant-switch-dialog.stories.tsx` `Empty` | Storybook | Covered |
| AC-004.3 | Per-card loading `aria-busy`/`role=status` within 100ms | `tenant-card.stories.tsx` `Loading` | Storybook | Covered |
| AC-004.4 | Success: cookies set, toast, navigate, dialog closes | `actions.test.ts` "on success sets cookies and redirects…" (cookie+redirect); toast itself only at `parse-switched-param.test.ts` level (see QA-002) | Integration (partial) | Covered (partial — QA-002) |
| AC-004.5 | No-op on current card: no network call, no toast | **`tenant-switch-dialog.stories.tsx` `NoOpOnCurrentCard` (NEW, QA-added)** — spy assertion `onSwitchTenant` not called | Storybook | **Covered (gap closed by QA)** |
| AC-004.6 | 403 → inline card error, dialog open, no nav, no cookie mutation | `tenant.repository.test.ts` "throws a typed TenantFailure… on a 403", `actions.test.ts` "returns {ok:false,errorKey:'forbidden'}… no cookie, no redirect", `tenant-switch-dialog.stories.tsx` `ForbiddenInlineError` | Unit + Integration + Storybook | Covered |
| AC-004.7 | Network/5xx → error toast, card idle, dialog open | `tenant.repository.test.ts` "maps 5xx → network", `switch-activation.test.ts` "classifies a network result → generic toast + resets loading" | Unit | Covered |
| AC-004.8 | 401 mid-flow → descoped to network path | `tenant.repository.test.ts` "folds 401 into network (AC-9 descope…)" | Unit | Covered (as descoped) |
| AC-004.9 | Dismiss blocked while busy (Escape + backdrop) | `tenant-switch-dialog.stories.tsx` `DismissBlockedWhileBusy` (Escape) + **`DismissBlockedWhileBusy_Backdrop` (NEW, QA-added, overlay click)** | Storybook | **Covered (gap closed by QA)** |
| AC-004.10 | Dismiss allowed while idle, focus returns to trigger | `tenant-switch-dialog.stories.tsx` `DismissIdle` (Escape) + **`DismissIdle_Backdrop` (NEW, QA-added)**; `header.stories.tsx` `MultiTenant_CloseRestoresFocus` (real composed-flow focus-return) | Storybook | Covered |
| AC-005.1 | Idle dismiss, focus returns to trigger (not `<body>`) | `header.stories.tsx` `MultiTenant_CloseRestoresFocus` (`document.activeElement === trigger`) | Storybook | Covered |
| AC-006.1 | No client-only scope mutation before server round-trip | `switch-activation.test.ts` "on {ok:true} keeps loading… no error surface" (only a loading flag changes pre-navigation) | Unit | Covered |
| AC-006.2 | Server round-trip mandatory for badge change | Structural: `deriveTenantMenu`'s `currentMembership` is derived from `currentTenantId` prop, itself decoded server-side in `layout.tsx` from the httpOnly-cookie token — no client code path sets it independently (code-review-verified, no dedicated test possible without an integration harness spanning RSC+cookie, judged proportionate) | Code review | Covered (by construction) |
| AC-006.3 | No token exposure in client-reachable state/props/logs | `actions.test.ts` (asserts `setAuthCookies` called with tokens, never returned to caller); `switchTenantAction`'s return type (`SwitchTenantResult`) structurally excludes token fields (compile-time enforced) | Unit + type-level | Covered |
| AC-006.4 | BE rejection cannot be bypassed by stale client state | `actions.test.ts` forbidden case (no cookie, no redirect) + `tenant-switch-dialog.stories.tsx` `ForbiddenInlineError` (dialog stays open, no client override) | Integration + Storybook | Covered |
| AC-006.5 | No stale cross-tenant data leak post-switch | `switchTenantAction`'s `redirect()` performs a full Next.js route transition into the new `[tenant]` segment (structural: `layout.tsx` re-runs RSC data fetch, `ReactQueryProvider` is re-mounted per the route tree) — no dedicated regression test exists proving the absence of a leak at the UI layer (would require a real 2-tenant E2E session, out of proportion for this slice per `fe-state-engineer`'s own note that mechanism ownership is theirs) | Code review (structural) | Covered (by construction, not by dedicated test) |

**Coverage: 25/25 AC traced. Before this QA pass: 23/25 with committed test
proof (AC-004.5 and the busy-backdrop half of AC-004.9 had no committed test).
After this pass: 25/25, with 2 new committed Storybook tests closing the real
gaps (NoOpOnCurrentCard, DismissBlockedWhileBusy_Backdrop), plus a companion
idle-backdrop test (DismissIdle_Backdrop) added defensively for the same
"Escape-only was tested" pattern.**

### Additional weak-spots flagged (not blocking, not double-counted above)

- **QA-004** (MINOR): AC-001.3's "fetch fails → current-tenant fallback" only
  has an *incidental* proof (the `canSwitch` test on `[]` happens to also
  exercise the code path `currentMembership` would take), no test explicitly
  names/asserts `deriveTenantMenu([], "a", true).currentMembership` is
  `undefined`. Trivially true given the `.find()` implementation, but per this
  team's own precedent (US-E19.1/E11.8 findings on "a comment/code-path citing
  an AC ≠ proof"), I recommend a one-line named test be added by the engineer
  in a follow-up (not adding it myself here since it duplicates existing
  assertions almost byte-for-byte and the risk is genuinely near-zero given
  `.find()` semantics — judgment call, flagged rather than force-added).
- **QA-005** (MINOR): AC-002.3 says "Enter or Space" opens the dialog; the
  committed stories only use `userEvent.click`. Radix's own `DropdownMenuItem`
  guarantees native Enter/Space activation (not reimplemented by this story),
  so the residual risk is near-zero, but there is no committed keyboard-only
  proof of this specific claim. Flagged, not blocking.

## 3. Code Review Findings (QA lens)

| ID | Severity | File | Finding |
| --- | --- | --- | --- |
| QA-001 | **MAJOR** | `src/components/ui/dialog/dialog.tsx` (`DialogContent`, shared primitive) | Real horizontal overflow at 320px/375px viewports: `DialogContent` is a CSS `grid` container; its direct children (`DialogHeader`, the card `<ul>`) have no `min-w-0`, so per CSS Grid's default `min-width:auto` item sizing they refuse to shrink below their content's intrinsic min-width. The un-wrapped "name + role badge" row inside `TenantCard` forces an intrinsic width of ~350px — wider than the dialog's own shrunk box (~342px at 375px, ~287px at 320px) — producing 8px/63px of real internal horizontal overflow (`scrollWidth` 350 vs `clientWidth` 342/287, measured via `page.viewport()` real-resize in a headless-Chromium Storybook interaction test, not `parameters.viewport` which is inert in this repo). Directly contradicts the design-review Evidence block's claim ("card layout is a simple flex row… no fixed-width breakpoints to break at 320px"). Since `DialogContent` is the shared UI primitive, this likely affects other dialogs in the repo too, not just this story's card content. **Proof: 2 new intentionally-failing tests** (`tenant-switch-dialog.stories.tsx` `Viewport375`/`Viewport320`) — kept red per this repo's established convention (`email-verify-dialog.stories.tsx` `Viewport320`, same pattern from the US-E22.1 QA pass). **Not fixed by QA** (test code only) — routed to `fe-lead`→`fe-nextjs-engineer`. Suggested fix direction (not applied): add `min-w-0` to `DialogContent`'s grid-item children, or `overflow-x-hidden` + `min-w-0` on the header/list wrappers. |
| QA-002 | MINOR | `src/components/layout/app-shell/app-shell.tsx` (`useEffect` reading `?switched=1`) | The one-shot toast wiring (parse param → `toast.success` → `router.replace`) is only proven at the pure `parseSwitchedParam` function level (`parse-switched-param.test.ts`), not at the actual component/effect level. `app-shell.test.tsx` explicitly stubs `useSearchParams` to always return `""` (comment: "effects don't run under renderToStaticMarkup" — this repo has no jsdom/`@testing-library/react`, node-env-only Vitest). No `AppShell` Storybook story exists (the component pulls in `useRealtimeEvents`, which opens a real `EventSource`, with no established mocking pattern in this codebase to safely stub it in a real-browser Storybook test) — judged too risky/heavy to force through in this pass without an established recipe. Residual risk is genuinely low (the `switchedFired` ref guard mirrors the already-audited `EmailVerifyProvider` one-shot pattern per this story's own fe-lead decision), but there is currently zero direct proof that the toast actually fires exactly once and the URL is stripped. **Recommend**: `fe-lead`/engineer add a lightweight `AppShell` story (mock `useRealtimeEvents` at the module level, matching a pattern this repo would need to newly establish) OR extract the "read-once-then-strip" sequence into a small hook (mirroring the `switch-activation.ts` extraction pattern already used for Risk A) so it becomes unit-testable without mounting the whole shell. Not blocking release. |
| QA-003 | INFO (not a defect) | `src/components/shared/tenant-card/tenant-switch-dialog.tsx` (`memberships.map`) | The dialog renders EVERY entry in the `memberships` prop as a clickable card, including ones with `isSwitchable: false` (SUSPENDED/INACTIVE) — no filtering happens in `TenantSwitchDialog`, `enrich-memberships.ts`, or `layout.tsx`. Initially looked like a gap against FR-003/AC-004.1's "every ACTIVE switchable membership renders as a card" (read as an exclusive filter). On closer read, this is **intentional and spec-compliant**: AC-004.6's own wording explicitly covers "any other reason BE rejects the target as non-switchable… e.g. membership already SUSPENDED/INACTIVE at select-time, not only a race" — i.e., the spec anticipates a non-switchable membership being clickable and relies on the existing FR-008 403-handling path to reject it server-side. No test gap, no defect — documented here so a future reader doesn't re-flag it. |

## 4. Storybook Interaction Test Plan (state before → after this QA pass)

| Component | States covered (pre-existing) | States added by QA | play() assertions (new only) |
| --- | --- | --- | --- |
| `TenantCard` | Idle, Current, Loading, ForbiddenError, ParentRole | — | — |
| `TenantSwitchDialog` | OpenCardList, Empty, ForbiddenInlineError, DismissIdle, DismissBlockedWhileBusy | `DismissIdle_Backdrop`, `DismissBlockedWhileBusy_Backdrop`, `NoOpOnCurrentCard`, `Viewport375` (defect), `Viewport320` (defect) | Backdrop click via `document.querySelector('[data-slot="dialog-overlay"]')` + `userEvent.click`; spy (`fn()`) assertion `expect(onSwitchTenant).not.toHaveBeenCalled()`; real-viewport resize via `vitest/browser`'s `page.viewport()`, `scrollWidth`/`clientWidth`/card-`getBoundingClientRect()` overflow assertions |
| `Header` | Teacher, Student, MultiTenant, MultiTenant_CloseRestoresFocus, SingleTenantZeroNoise, FetchFailZeroNoise | — (already complete post-a11y-fix) | — |
| `TenantLogo` | CardSize, HeaderSize, AllTones | — | — |

All new `play()` code is committed in
`src/components/shared/tenant-card/tenant-switch-dialog.stories.tsx`.

## 5. Playwright E2E Plan

No dedicated Playwright browser-mode spec exists for this story beyond the
Storybook interaction layer — consistent with this repo's established pattern
(Storybook interaction tests ARE the E2E layer for component/dialog-scoped
flows; full-page Playwright specs are reserved for multi-page journeys this
story doesn't have — it's a single header+dialog surface, not a new route).
No gap identified here beyond what §4 covers.

## 6. Defect List

| DEF-ID | Title | Severity | Repro | Expected vs Actual | Evidence |
| --- | --- | --- | --- | --- | --- |
| DEF-E23.1-01 | `TenantSwitchDialog` overflows horizontally at 320px/375px viewports | MAJOR | Open `Shared/TenantSwitchDialog` → `Viewport375`/`Viewport320` stories, or resize any real browser to ≤375px and open "Chọn trường" | Expected: dialog content fits within its own shrunk box, no horizontal scroll (NFR-004). Actual: `scrollWidth` (350px) exceeds `clientWidth` (342px @375px / 287px @320px) — root cause is `DialogContent`'s CSS-grid children missing `min-w-0` | `src/components/shared/tenant-card/tenant-switch-dialog.stories.tsx` `Viewport375`/`Viewport320` (both fail, intentionally, with a code comment explaining root cause + numbers) |

Fix owner: `fe-nextjs-engineer` (routed via `fe-lead`). QA did not modify
`src/components/ui/dialog/dialog.tsx` or any other production file.

## 7. Test Run Evidence (re-verified independently, not trusted from prior reports)

| Command | Result | Notes |
| --- | --- | --- |
| `bunx tsc --noEmit` | exit 0 | clean |
| `bun lint` | 1 warning + 1 info | both pre-existing in `features/messaging`, untouched by this story (confirmed same 2 findings tech-lead already flagged as pre-existing) |
| `bun vitest run` (full) | **362 files / 2326 tests, all pass** | unchanged from tech-lead's report (QA added zero `.test.ts` files — all new proof is Storybook) |
| `bun run build` | exit 0 | server-only import guard intact |
| `bun run vitest:storybook run <tenant-card + header>` (pre-QA scope) | 4 files / 19 tests pass | up from tech-lead's reported 4/17 (the 2 new tests are the a11y fix's `MultiTenant_CloseRestoresFocus` companion assertions already counted in that file) |
| `bun run vitest:storybook run <tenant-card + header>` (post-QA additions) | **1 file failed (2 tests) / 23 files passed (137 tests)**, scoped to `components/shared` + `components/layout/app-shell` + `features/tenant` | the 2 failures are the intentional `Viewport375`/`Viewport320` defect-proof tests (DEF-E23.1-01); all other 137 tests pass, including all 8 new non-viewport tests added this pass |

Full-suite Storybook health note (unchanged from tech-lead's finding, verified
still true): a broad set of UNRELATED story files (lesson-bank, discipline,
timetable, announcements, messaging, …) fail with a pre-existing Radix
`<Select.Item>` empty-value error + worker contention — confirmed NOT a
US-E23.1 regression (this story touches none of those features); not
re-litigated here, already flagged to `fe-lead` by tech-lead review.

## 8. Release Readiness Decision

**CONDITIONAL PASS.**

Rationale: no BLOCKER/CRITICAL findings — the security-critical core (Risk A
redirect-passthrough, 403 no-cookie-mutation, token boundary, AC-9 descope)
is independently re-verified and solid, the A11Y-001 keyboard-trap fix is
genuinely proven, and AC coverage is 25/25 with all real gaps this pass found
now closed by committed tests. One MAJOR finding (QA-001, dialog overflow at
narrow viewports) is a genuine UI regression in a shared primitive that should
be fixed before this ships to production, but it is not a security/data-
integrity issue and does not block merging the story's own code (which QA did
not touch) — it blocks the READINESS bar per this team's PASS/CONDITIONAL-
PASS/FAIL rubric (any MAJOR → CONDITIONAL PASS, not FAIL, since it's isolated
to a fixable narrow-viewport CSS gap, not the auth-boundary this lane is
gated on).

## 9. Message to fe-lead

CONDITIONAL PASS. Independently re-verified all of tech-lead's/a11y's claims
(re-ran every suite myself, didn't trust self-reports) and they hold: Risk A,
403/no-cookie-mutation, AC-9 descope, and the A11Y-001 keyboard-trap fix are
all genuinely proven. I closed 2 real AC-coverage gaps myself (AC-004.5 no-op-
on-current-card had no spy proof; AC-004.9's backdrop-half was untested) with
2+1 new committed Storybook tests — 25/25 AC now traced with real test proof
(up from 23/25 with committed proof at pass start). I also found 1 real MAJOR
defect NOT previously caught: `TenantSwitchDialog` genuinely overflows
horizontally at 320px/375px (contradicts the design-review Evidence's "no
fixed-width breakpoints to break at 320px" claim) — root cause is a missing
`min-w-0` on `DialogContent`'s (shared primitive) grid-item children, proven
with 2 new intentionally-failing tests (`Viewport375`/`Viewport320` in
`tenant-switch-dialog.stories.tsx`), not fixed by me per my read-only-on-
production-code mandate. Action items: (1) route DEF-E23.1-01 to
`fe-nextjs-engineer` for a `min-w-0` fix on `DialogContent` (check for
blast radius on other dialogs using this primitive); (2) optionally close
QA-002 (AppShell toast-effect wiring has no component-level test — low
severity, flagged not blocking) and QA-004/QA-005 (both MINOR, near-zero risk)
in a follow-up if time allows.
