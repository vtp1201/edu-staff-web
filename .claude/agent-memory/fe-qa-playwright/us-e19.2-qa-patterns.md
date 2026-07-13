---
name: us-e19.2-qa-patterns
description: US-E19.2 content-moderation QA gate — mocked next/navigation router is a no-op spy, don't chase click-driven tab/filter refetch proofs in Storybook
metadata:
  type: project
---

US-E19.2 (principal moderation screen + shared ReportContentDialog, high-risk lane)
QA pass findings, 2026-07-14 (worktree `us-e19.2`).

**Critical environment fact — `@storybook/nextjs-vite`'s `next/navigation` mock is a
no-op spy.** `createNavigation()` in `node_modules/@storybook/nextjs-vite/dist/export-mocks/navigation/index.js`
makes `router.push`/`replace`/etc plain `fn()` spies that never write back into
`useSearchParams()`/`usePathname()`. Any component that drives its filter/tab state
through the URL (`router.replace(...)` + reading `useSearchParams()`) CANNOT be
click-tested end-to-end in a single story — clicking a tab/filter control fires
`router.replace` but the component never re-renders with the new URL. Confirmed
empirically (three stories failed with "element not found" / "undefined" until
redesigned). Workaround: seed the target state via `parameters.nextjs.navigation.query`
per-story (pre-existing pattern, e.g. `AuditReadOnly`/`AuditEmpty` in this file), and
prove same-render-cycle UI wiring (aria-selected, input value, select text) directly
instead of asserting a refetch round-trip. Don't try `useRouter()` inside a `play()`
function either — it's a hook, throws "Invalid hook call" outside a component body.

**HIGH-RISK release-gate criterion ("audit-log entry retrievable end-to-end for every
remove/dismiss") is proven at the mock-repository level, not via Storybook UI click-through.**
`moderation.mock.repository.test.ts` already has `dismissReport`/`removeContent` →
`getModerationAuditLog` write-then-read assertions — this genuinely satisfies the
criterion given the router-mock limitation above prevents a same-story tab-switch
proof. Don't demand a UI-chained version; verify the repo-level test does the exact
chain instead.

Gaps found + closed (all via new stories, no prod code changes needed — story was
otherwise well-built): AC-1921.5 focus-trap Tab-loop (only Escape was tested before);
Dismiss/Remove happy-path + Remove cancel/conflict(409)/transient(retry) — ZERO
Storybook stories existed for these despite 12 ACs across UC-1926/1928 (only
mocked-repo passthrough unit tests existed, no UI-level proof); AuditForbidden
(AC-1929.5, code already correct — `AuditStatus` has no separate "forbidden" status,
it's just `errorKey`+`errorRetryable=false` routed through the generic "error" status,
untested); DuplicateNone (AC-1930.2); real-viewport 375/320 responsive checks via
`page.viewport()` (`@storybook/addon-viewport` not installed in this repo — established
precedent, see US-E17.1/E17.9/E22.1 memories) — table→card `md:` switch had ZERO
viewport-driven proof before, only implicit via default 1280 width.

Result: Storybook interaction suite for moderation/report-content-dialog/
destructive-confirm-dialog scoped run: 44/44 pass (was 33/33 before this pass).
Full-repo storybook baseline unchanged: 17 failed files / 71 failed tests (all
pre-existing, none in moderation/dialog files) — 93 passed files / 509 passed tests.
`bun vitest run`: 1442/1442 unchanged (no unit-level gaps found — domain/use-case/
mapper/repo layer was already fully proven, including the code-only 403-vs-transient
branching NFR-101 test).
