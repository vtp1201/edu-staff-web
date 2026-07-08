---
name: pattern-subscription-hook-node-test
description: Testing an EventSource/subscription React hook in this repo's node-env Vitest (no renderHook) — extract a framework-free controller + pure helpers
metadata:
  type: feedback
---

Testing a hook that owns an external subscription (EventSource/SSE, WebSocket,
timers) in this repo: **renderHook is NOT available** — Vitest runs `environment:
"node"` (vitest.config.mts) and there is no `@testing-library/react` nor
`react-test-renderer` installed (only `@testing-library/dom`). So you cannot run
React effects in a test.

**Pattern that works (used for US-E08.6 `useRealtimeEvents`):**
- Extract the imperative state machine into a framework-free controller factory
  (e.g. `sse-connection.ts` `openSseConnection(options)` returning `{ reconnect,
  close }`), reporting transitions via callbacks (`onStatus`, `onInvalidate`,
  `onMessageNew`, `onSessionRevoked`). No React, no JSX.
- Extract timing into a pure helper mirroring `chat-window/highlight-timer.ts`
  (`schedule-reconnect.ts` — clear-previous-then-schedule, returns the handle).
- Extract derived-render logic into a pure function (`deriveShowBanner(status,
  hasEverConnected)`).
- The hook becomes a thin binding: `useState`/`useRef` + effects that just wire
  the controller callbacks to setState and tear it down on cleanup.
- Test the controller with a local `FakeEventSource` class + `vi.stubGlobal(
  "EventSource", FakeEventSource)` (reset `instances=[]` in beforeEach,
  `vi.unstubAllGlobals()` in afterEach) + `vi.useFakeTimers()` /
  `advanceTimersByTime`. Covers status transitions, N-second reconnect, manual
  reconnect cancelling the pending timer, teardown/no-leak, dispatch gating.
- The `FakeEventSource.emit(type, payload)` helper must build a FULL frame
  (type/eventId/tenantId/occurredAt/payload) — `parseEvent` rejects a
  payload-only body. parseEvent only does structural checks (payload is a
  record), so `{ field: undefined }` serialises to `{}` and IS accepted — use
  genuinely-malformed input (non-JSON, or omit `payload`) to test the drop path.

Component render/i18n proof still goes via `renderToStaticMarkup` +
`NextIntlClientProvider` (node) for structure/tokens, and Storybook interaction
`play()` for click/nav. See [[pattern-node-env-component-test]].

**Why:** the state-architecture doc specced `renderHook` + FakeEventSource, but
that's unrunnable here. This extraction is the runnable, faithful equivalent and
matches the repo's established "pure logic in unit tests, DOM in Storybook"
convention (empty-state, pane-visibility, status-badge).
