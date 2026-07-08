---
name: us-e08.6-qa-patterns
description: SSE connection status UI QA — AppShell-level wiring gap pattern (leaf components tested in isolation, container computation untested) and node-env AppShell test recipe
metadata:
  type: project
---

US-E08.6 (SSE disconnect banner + pending pill) QA findings, 2026-07-08:

- **Container-level prop computation is a recurring blind spot.** Both
  `SseDisconnectBanner`/`SsePendingPill` were pure/presentational (correctly,
  per component-architecture doc) and fully unit+story tested in isolation,
  but the actual boolean/string wiring (`visible = count>0 && !pathname.endsWith(...)`,
  `status = showBanner && sseStatus!=="connected" ? sseStatus : undefined`,
  `onClick = () => router.push(tenantUrl(...))`) lived only in `AppShell` with
  zero test file. This is the same shape of gap as [[us-e17.4-qa-patterns]]'s
  "shared-component migration can still leave per-call-site empty-branch gaps"
  — always check the call site, not just the leaf component's own tests.

- **Node-env (no jsdom/@testing-library) container test recipe**: `vi.mock()`
  every child import (`Header`, `Sidebar`, `Sheet`, `use-sidebar-collapsed`,
  `@/bootstrap/i18n/routing`, `@/bootstrap/realtime`, and the leaf components
  themselves) to plain functions/objects; have the mocked leaf components push
  their received props into a module-level array; `renderToStaticMarkup` the
  container; assert on the captured props array; invoke captured callback
  props (`onClick()`, `onReconnect()`) as **plain function calls** (not DOM
  clicks — unavailable in this env) to prove wiring to `router.push`/`reconnect`.
  File: `src/components/layout/app-shell/app-shell.test.tsx`.

- **Biome `useValidAriaRole` false positive** on any component prop literally
  named `role` (e.g. `<AppShell role="teacher">`) — Biome reads it as a JSX
  ARIA attribute. Fix: build a `const props = {...}` object and spread
  (`<AppShell {...props}>`) instead of an inline JSX attribute. Established
  precedent: `grade-book-table.test.tsx`.

- **AC-4 (multi-step timer transition) was correctly proven** with
  `vi.useFakeTimers()` in `sse-connection.test.ts` against the extracted
  framework-free controller (`openSseConnection`), not asserted-but-untested —
  confirms the repo's established pattern (per prior memory) of extracting
  timer/state-machine logic out of the React hook into a plain-JS controller
  specifically so Vitest `node` env (no `renderHook`) can fake-timer test it
  directly. `use-realtime-events.ts` itself (the thin React binding) has no
  test file — acceptable per tech-lead's own non-blocking CONSIDER note, low
  risk since the imperative core is exhaustively covered.

- **CSS stacking-order claims (z-40 pill vs z-50 Sheet, no-320px-overflow)
  remain code-review-only proof**, not testable in this jsdom-less env without
  disproportionate effort — consistent with [[us-e17.1-qa-patterns]]'s note
  that computed-layout assertions in this stack are often vacuous; the
  individual z-index values ARE each unit-asserted (pill's `z-40` in
  `sse-pending-pill.test.tsx`, Sheet's `z-50` in `sheet.tsx` source) which is
  sufficient traceability for a MINOR/INFO-level acceptance, not a gap to fix.
