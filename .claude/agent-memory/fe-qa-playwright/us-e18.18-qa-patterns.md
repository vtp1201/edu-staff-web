---
name: us-e18.18-qa-patterns
description: QA patterns for notification SSE contract remap (real EventSource stub in a Storybook story, module-eval-time env const test recipe for route handlers, exact boundary gaps)
metadata:
  type: project
---

US-E18.18 (notification `/stream`+`unread-counts`+`presence` contract remap) — engineer's
self-report was accurate at the unit level (sse-connection.test.ts, event.test.ts, mapper/repo
tests all genuinely exercised the real frame shapes), but 3 real gaps existed at the
integration/wiring boundary, all closed with test-only additions:

1. **Inbound `typing` SSE → UI toggle had only a pure-reducer unit test, never a rendered
   proof.** `typing-inbound.test.ts` proved `nextInboundTyping()` in isolation and
   `sse-connection.test.ts` proved `onTyping` is *called*, but nothing proved the callback
   chain (`useRealtimeEvents` → `messaging-screen.tsx` → `ChatWindow`'s `isTyping` prop →
   `TypingIndicator` DOM) actually renders/hides the indicator. Closed by adding a Storybook
   interaction story (`InboundTyping_TogglesIndicatorForOpenRoomOnly`) that stubs
   `window.EventSource` with a fake class **inside the story's own `decorators` array** (runs
   during render, before the connection-opening `useEffect` fires — no other story in the repo
   had done this). Key precondition: pass `args: { tenantId: "school-a" }` — every other story
   in this file omits `tenantId`, which keeps `useRealtimeEvents({enabled: Boolean(tenantId)})`
   disabled and opens no `EventSource`, so this pattern is zero-interference with existing
   stories. Assert via the indicator's sr-only text (`t("chat.typing")` = "Đang nhập tin
   nhắn...") — `queryByText`/`getByText`, no test id needed.

2. **Presence 5-minute threshold had an exact-boundary test (`<=`) and a far-outside test
   (10min), but no "just past the boundary" test** — a `>` vs `>=` off-by-one in the mapper
   would have passed silently. Added `lastSeen` at `+1s` (still recent) and `-1s` past 5min
   (now offline) to `messaging.mapper.test.ts`'s `toPresenceRecord` describe block. Same pattern
   as [US-E18.17](us-e18.17-qa-patterns.md)'s delete-window boundary finding — this class of gap
   (boundary tested loosely, not at ±1) recurs across the epic; always add both directions of
   the exact edge, not just "clearly inside" and "clearly outside."

3. **`NOTI_EP.stream === "/api/v1/stream"` (AC-1) had ZERO test anywhere** — not a literal
   constant test, not a route-handler test. `route.ts` (the SSE proxy) had never been unit
   tested at all (only `stream-tenant.test.ts` covers the tenant-resolution helper it calls).
   Wrote `src/app/[locale]/api/stream/route.test.ts` using the exact `vi.stubEnv` +
   `vi.resetModules()` + dynamic `import()` recipe from
   `principal/reports/layout.test.ts` (both `USE_MOCK` and `NOTI_URL` are frozen at
   module-eval-time from `process.env`, so env vars must be stubbed *before* a fresh dynamic
   import, not just before the test body runs). Mocked `next/headers` + `auth-token.server`,
   stubbed `global.fetch`, constructed a real `new NextRequest(url)` (works fine in this repo's
   node vitest env, no prior precedent existed for that but it "just worked"). Proved: real
   mode fetches `NOTI_SERVICE_URL + /api/v1/stream` with `Authorization: Bearer <token>`; mock
   mode and missing-`NOTI_SERVICE_URL` both skip fetch entirely. This is a reusable recipe for
   any other never-tested Route Handler in this repo gated by module-scope env consts.

Zero-regression proof technique used again (see [US-E17.3](us-e17.3-qa-patterns.md),
[US-E18.17](us-e18.17-qa-patterns.md)): `git stash -u` → rerun the exact same
`vitest --config vitest.storybook.mts` invocation → same 7 pre-existing failures
(`message-context-menu` × 2, `messaging-screen` Create-Group/Reply-Strip × 2,
`notifications-center` × 3) with 1 fewer passing test than after my additions → confirms my
new story is the only delta and it passes.

Full-suite numbers this US: `bun vitest run` 2527/2527 (389 files) unchanged pass rate;
`vitest --config vitest.storybook.mts` messaging+notification scope 79/86 after (78/85 before
my additions) — the 7 failures are identical pre-existing baseline, not caused by this US or by
my test additions. `bunx tsc --noEmit` clean; `bun run build` (real mode, `NEXT_PUBLIC_USE_MOCK`
unset) clean.
