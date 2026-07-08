# US-E08.6 — State Architecture (`useRealtimeEvents` extension)

_Written by `fe-state-engineer`, 2026-07-08. Scope: hook-local state design for
`sseStatus`/`pendingMsgCount`/reconnect, the `message.new` event-contract
addition, and the exact test plan. Consumes `component-architecture.md`
(`SseDisconnectBannerProps`/`SsePendingPillProps`, `SseStatus` type-location
flag) and the plan's Decisions A/B/C as given — does not redo them. No
implementation code, no component/store code._

## 1. State classification (explicit, per repo convention)

| State | Mechanism | Why |
| --- | --- | --- |
| `sseStatus`, `pendingMsgCount`, "has ever connected" | **hook-local React state** (`useState`/`useRef` inside `useRealtimeEvents`) | Push-stream connection-lifecycle state driven by an external subscription (`EventSource` callbacks), not a server fetch → **not TanStack Query**. Not shared across unrelated component subtrees via any provider → **not a global store** (this repo has none — Zustand/Redux/Jotai are out of scope per `.claude/CLAUDE.md`). Not shareable/bookmarkable → **not URL state**. Not a user input → **not react-hook-form**. |
| `pathname` (read, not owned) | `usePathname()` from `@/bootstrap/i18n/routing`, existing URL-state primitive | Hook reads it to gate `pendingMsgCount` increment/reset; does not own or duplicate it. |
| `message.new` → cache invalidation | none (returns `[]` from `queryKeysFor`) | Per Decision C, this event carries no query-cacheable payload in this story's scope; `pendingMsgCount` is the only reaction. |

No RSC/server-fetched data is involved anywhere in this story — everything is
client-only connection state. There is therefore no `.i-vm.ts` boundary to
define here (confirmed, matches `component-architecture.md` §4).

## 2. Types

### `src/bootstrap/realtime/event.ts` — add `message.new` variant

```ts
export type RealtimeEvent =
  | { type: "notification.created"; ... }        // unchanged
  | { type: "notification.new"; ... }             // unchanged
  | { type: "attendance.updated"; ... }           // unchanged
  | { type: "session.revoked"; ... }              // unchanged
  | {
      type: "message.new";
      eventId: string;
      tenantId: string;
      occurredAt: string;
      payload: { conversationId: string };
    };

export const REALTIME_EVENT_TYPES: readonly RealtimeEventType[] = [
  "notification.created",
  "notification.new",
  "attendance.updated",
  "session.revoked",
  "message.new",
];
```

`parseEvent`/`shouldHandle` need no changes — both are generic over
`RealtimeEvent["type"]` and already validate `eventId`/`tenantId`/`payload`
presence structurally; `KNOWN_TYPES` derives from `REALTIME_EVENT_TYPES` so
adding the array entry is sufficient for parse-acceptance.

### `src/bootstrap/realtime/event-invalidation.ts` — exhaustive arm

```ts
export function queryKeysFor(event: RealtimeEvent): QueryKey[] {
  switch (event.type) {
    case "notification.created": return [["notifications"]];
    case "notification.new": return [ /* unchanged */ ];
    case "attendance.updated": return [ /* unchanged */ ];
    case "session.revoked": return [];
    case "message.new":
      // No query invalidated by this story — pendingMsgCount is hook-local
      // React state, not cache. Messaging screen queries stay US-E10.x scope.
      return [];
  }
}
```

TypeScript's exhaustive `switch` over a union return type forces this arm to
exist at compile time — that IS the regression guard against forgetting it.

### `src/bootstrap/realtime/use-realtime-events.ts` — exported `SseStatus` + return shape

```ts
export type SseStatus = "connected" | "connecting" | "disconnected";

export interface UseRealtimeEventsResult {
  /** Current EventSource lifecycle state. See §3 for the state machine. */
  sseStatus: SseStatus;
  /**
   * Derived: whether `SseDisconnectBanner` should render at all. False on the
   * very first mount's 'connecting' (AC-1); true for 'disconnected' and for
   * every 'connecting' that follows an actual disconnect (AC-3).
   */
  showBanner: boolean;
  /** Count of `message.new` events received while not on `/messages`. */
  pendingMsgCount: number;
  /** Manual reconnect trigger (AC-2's "Kết nối lại" button). */
  reconnect: () => void;
}

export function useRealtimeEvents(options: Options): UseRealtimeEventsResult
```

Exported from this module (not `event.ts`) per the architect's flag — it's a
hook-owned derived-state type, and `SseDisconnectBannerProps` does a **type-only**
import (`import type { SseStatus } from "@/bootstrap/realtime/use-realtime-events"`),
which is legal for `presentation/` per the layer table (types have zero
runtime footprint, so this isn't an `infrastructure`/`bootstrap` leak into
presentation — it's the same category as importing a domain entity type).

Signature change: `(): void` → `(): UseRealtimeEventsResult`. Confirmed safe
per the given context: `useRealtimeEvents(` matches nowhere else in `src/`
except its own definition, so no caller destructures/discards the old `void`
return in a way a stricter lint rule could flag. Biome's
`noConfusingVoidExpression`-style checks don't apply here since there is no
existing call site at all yet (this story adds the first one, in `AppShell`,
which will consume the object). No lint risk.

## 3. Internal state machine + two-effect split (pseudocode)

### Hook-local state/refs

```ts
const [sseStatus, setSseStatus] = useState<SseStatus>("connecting");
const [pendingMsgCount, setPendingMsgCount] = useState(0);
const hasConnectedRef = useRef(false);      // "ever reached connected" — AC-1 gate
const pathnameRef = useRef(pathname);        // latest pathname, read inside dispatch
const reconnectRef = useRef<() => void>(() => {}); // stable wrapper target, see below

const showBanner =
  sseStatus === "disconnected" ||
  (sseStatus === "connecting" && hasConnectedRef.current);
```

`showBanner` is a **derived value computed at render time** from `sseStatus`
(state → triggers re-render) and `hasConnectedRef.current` (ref, read only —
never itself the trigger). This is safe because every transition that flips
`hasConnectedRef.current` (`onopen`) is always paired with a `setSseStatus`
call in the same tick, so a re-render always follows the ref mutation — no
render is "missed".

### Effect 1 — connection effect (owns the `EventSource` lifecycle)

```ts
useEffect(() => {
  if (!enabled) return;

  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  let source: EventSource;

  function connect() {
    const url = `/${locale}/api/stream?tenant=${encodeURIComponent(tenantId)}`;
    source = new EventSource(url, { withCredentials: true });

    source.onopen = () => {
      hasConnectedRef.current = true;
      setSseStatus("connected");
    };

    source.onerror = () => {
      source.close();                       // avoid a duplicate live connection
      setSseStatus("disconnected");
      timeoutHandle = scheduleReconnect({
        onReconnect: () => {
          setSseStatus("connecting");
          connect();                         // re-instantiate, recurse into this closure
        },
        previousTimer: timeoutHandle,
      });
    };

    const listener = (e: MessageEvent) => handle(e.data);
    const handle = (raw: string) => {
      const event = parseEvent(raw);
      if (!event || !shouldHandle(event, tenantId)) return;
      dispatch(event);
    };
    const dispatch = (event: RealtimeEvent) => {
      if (event.type === "session.revoked") {
        onSessionRevoked?.(event.payload.sessionId);
        return;
      }
      if (event.type === "message.new") {
        if (!pathnameRef.current.endsWith("/messages")) {
          setPendingMsgCount((n) => n + 1);
        }
        return; // no query keys to invalidate (queryKeysFor returns [])
      }
      for (const queryKey of queryKeysFor(event)) {
        queryClient.invalidateQueries({ queryKey });
      }
    };

    source.onmessage = listener;
    for (const type of REALTIME_EVENT_TYPES) {
      source.addEventListener(type, listener as EventListener);
    }
  }

  connect();

  // Manual reconnect (AC-2): clear any pending scheduled reconnect, close the
  // stale connection, go straight to 'connecting' + a fresh connect() — skips
  // the 4s wait entirely. Written into a ref each effect run so the hook can
  // expose one STABLE `reconnect` callback (see below) that always calls
  // through to the current effect instance's live `source`/`timeoutHandle`.
  reconnectRef.current = () => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
    source.close();
    setSseStatus("connecting");
    connect();
  };

  return () => {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    source.close();
  };
}, [enabled, tenantId, locale, queryClient, onSessionRevoked]);
// ^ UNCHANGED deps from today's hook — pathname is intentionally NOT a dep,
//   so navigation never tears down/recreates the EventSource.

const reconnect = useCallback(() => {
  reconnectRef.current();
}, []);
```

Cleanup guarantees (no leaks, no duplicate connections):
- Every path that schedules a `setTimeout` (`onerror`) stores the handle in
  `timeoutHandle`, which is cleared before scheduling a new one (via
  `scheduleReconnect`'s own `previousTimer` clear, §4) AND on effect
  cleanup/unmount.
- Every `connect()` call is preceded by a `source.close()` of the previous
  instance in every code path that calls it a second time (`onerror` closes
  before scheduling; `reconnect()` closes before calling `connect()` again) —
  the only place `connect()` runs without a prior `close()` is the very first
  call on effect mount, where there is no previous instance.
- Effect cleanup (dep change or unmount) always closes `source` and clears any
  pending `timeoutHandle` — covers the `tenantId` dep-change case (old
  connection torn down, new one opened on the next effect run) and true
  unmount (no post-unmount `setState`, since `setSseStatus`/`setPendingMsgCount`
  calls can only originate from `source`'s own callbacks or the timeout,
  both of which are now unreachable).

### Effect 2 — pathname-driven read/reset effect (does NOT touch the connection)

```ts
useEffect(() => {
  pathnameRef.current = pathname;
  if (pathname.endsWith("/messages")) {
    setPendingMsgCount(0);
  }
}, [pathname]);
```

- Deliberately its own effect with `[pathname]` as the only dependency — this
  is what keeps `pathname` OUT of Effect 1's dependency array, satisfying the
  hard constraint ("must NOT force the main EventSource connection effect to
  re-run on every navigation").
- Updates `pathnameRef.current` unconditionally (so Effect 1's `dispatch`
  closure always reads the latest pathname for the increment guard) and
  additionally resets the counter to `0` the moment the pathname enters
  `/messages`.
- Ordering note: on a route change that lands on `/messages`, this effect's
  ref-write and its `setPendingMsgCount(0)` both fire in the same effect pass
  — no window where a `message.new` event arriving between "pathname changed"
  and "count reset" could be double-counted or lost, because both happen
  synchronously within the one `useEffect` body (React flushes effects before
  yielding back to the event loop where a new SSE frame could be handled).

## 4. `schedule-reconnect.ts` — exact API (mirrors `highlight-timer.ts`)

```ts
// src/bootstrap/realtime/schedule-reconnect.ts
export const SSE_RECONNECT_DELAY_MS = 4000;

export interface ScheduleReconnectOptions {
  /** Invoked once, after `delayMs`, to re-run the connect logic. */
  onReconnect: () => void;
  /** Handle of a previously scheduled reconnect (cleared first), if any. */
  previousTimer: ReturnType<typeof setTimeout> | null;
  /** Delay before firing; defaults to {@link SSE_RECONNECT_DELAY_MS}. */
  delayMs?: number;
}

/**
 * Schedules `onReconnect` to fire after `delayMs`, always clearing
 * `previousTimer` first so overlapping error events (or an error immediately
 * followed by a manual reconnect) never leak a duplicate pending timer.
 * Returns the new timer handle so the caller can store it and clear it on
 * unmount/dep-change/manual-reconnect — same DEF-01 contract as
 * `scheduleHighlightClear`.
 */
export function scheduleReconnect({
  onReconnect,
  previousTimer,
  delayMs = SSE_RECONNECT_DELAY_MS,
}: ScheduleReconnectOptions): ReturnType<typeof setTimeout> {
  if (previousTimer) clearTimeout(previousTimer);
  return setTimeout(onReconnect, delayMs);
}
```

Difference from `scheduleHighlightClear` (intentional, not an inconsistency):
`scheduleHighlightClear` performs an **immediate side effect** (`setHighlightId(messageId)`)
*and* schedules a delayed clear, because highlighting must apply synchronously.
`scheduleReconnect` has no immediate side effect to perform — `onerror`'s
caller (`Effect 1`) already calls `setSseStatus("disconnected")` itself before
invoking `scheduleReconnect`, so the helper's only job is "schedule one
delayed callback, clearing any previous one first." Keeping it this thin
(no status-setting inside the helper) is what makes it independently testable
with a plain `vi.fn()` callback and no React/EventSource involved at all.

### How `reconnect()` interacts with it

`reconnect()` (the hook's returned function) does **not** call
`scheduleReconnect` — it bypasses the delay entirely:

1. `reconnectRef.current()` clears `timeoutHandle` directly (`clearTimeout`,
   same handle `scheduleReconnect` would have cleared had the 4s fired
   naturally) so a stale scheduled auto-reconnect can never also fire and
   race a fresh manual one.
2. Closes the current (stale/erroring) `source`.
3. Sets `sseStatus` to `'connecting'` and calls `connect()` immediately — no
   `setTimeout` in this path at all.

This guarantees: **manual reconnect always wins and cancels the pending
automatic one** — there is never a world where both an auto-reconnect timer
and a manual click each independently call `connect()`, which would otherwise
produce two live `EventSource` instances.

## 5. Concrete test plan for `fe-nextjs-engineer` (TDD)

### `EventSource` mocking approach (no existing convention found — designing one)

Grepped `sse.test.ts` (tests `toSseFrame`/`SSE_PING`, no `EventSource` at all)
and `event.test.ts` (tests `parseEvent`/`shouldHandle`/`queryKeysFor` as pure
functions, no `EventSource`) — **neither the hook nor
`use-notification-new-event.ts` has a test file today**, and no
`EventSource` stub exists anywhere in `src/`. Introduce a minimal stub local
to the new hook test file (do not over-engineer a shared mock until a second
hook needs it — matches the repo's "no abstraction before 2nd use" convention):

```ts
// inline in use-realtime-events.test.ts (or a co-located
// use-realtime-events.test-helpers.ts if the engineer prefers to keep the
// test file shorter — either is fine, not a hard requirement of this design)
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  closed = false;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  private listeners = new Map<string, Set<EventListener>>();

  constructor(url: string, _init?: EventSourceInit) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }
  addEventListener(type: string, cb: EventListener) {
    (this.listeners.get(type) ?? this.listeners.set(type, new Set()).get(type)!)
      .add(cb);
  }
  removeEventListener(type: string, cb: EventListener) {
    this.listeners.get(type)?.delete(cb);
  }
  close() { this.closed = true; }

  // test-only helpers (not part of the real EventSource API)
  emitOpen() { this.onopen?.(); }
  emitError() { this.onerror?.(); }
  emit(type: string, payload: unknown) {
    const event = { data: JSON.stringify(payload) } as MessageEvent;
    this.listeners.get(type)?.forEach((cb) => cb(event));
    this.onmessage?.(event);
  }
}
```

Wire with `vi.stubGlobal("EventSource", FakeEventSource)` in `beforeEach`,
`FakeEventSource.instances = []` reset alongside it, `vi.unstubAllGlobals()`
in `afterEach`. Combine with `vi.useFakeTimers()`/`vi.advanceTimersByTime()`
(same pattern as `highlight-timer.test.ts`) for the 4s reconnect assertions.
`renderHook` from `@testing-library/react`, wrapped in a
`QueryClientProvider` (fresh `new QueryClient()` per test) since the hook
calls `useQueryClient()`. Mock `next-intl`'s `useLocale` (`vi.mock("next-intl", ...)`,
return a fixed `"vi"`) and `@/bootstrap/i18n/routing`'s `usePathname`
(`vi.mock` with a mutable `let currentPathname` so tests can change it and
`rerender()` to simulate navigation).

### `schedule-reconnect.test.ts`

1. Fires `onReconnect` exactly once after 4000ms, not before (`vi.advanceTimersByTime(3999)` → 0 calls, `+1` → 1 call) — mirrors `highlight-timer.test.ts`'s first case.
2. Clears `previousTimer` before scheduling a new one (spy `clearTimeout`, assert called with the previous handle) — no double-fire when both the old and new delays elapse.
3. Returns a reclaimable handle usable with `clearTimeout` directly (unmount-cleanup simulation, mirrors `highlight-timer.test.ts`'s third case).
4. Honors a custom `delayMs`.

### `use-realtime-events.test.ts`

State-machine / connection lifecycle:

5. Initial mount → `sseStatus === "connecting"`, `showBanner === false` (AC-1: first connect never shows the banner).
6. `FakeEventSource.instances[0].emitOpen()` → `sseStatus === "connected"`, `showBanner === false`.
7. After a prior `emitOpen()`, `emitError()` → the first instance is `closed === true`, `sseStatus === "disconnected"`, `showBanner === true` (AC-2).
8. After step 7, `vi.advanceTimersByTime(4000)` → `sseStatus === "connecting"`, `showBanner === true` (AC-3: post-disconnect connecting DOES show the banner — the opposite of case 5), and exactly one NEW `FakeEventSource` instance was created (`instances.length === 2`).
9. That second instance's `emitOpen()` → `sseStatus === "connected"`, `showBanner === false` again (AC-4: full disconnect→connecting→connected cycle).
10. Calling the hook's returned `reconnect()` while `sseStatus === "disconnected"` (before the 4s elapses): immediately closes the stale instance, opens a new one, sets `"connecting"` synchronously (no timer wait) — then `vi.advanceTimersByTime(4000)` must NOT create a third instance (proves the auto-reconnect timer was cancelled by the manual call, per §4).
11. Unmount mid-backoff (after `emitError()` but before the 4s elapses) → assert `clearTimeout` was effectively applied (no additional `FakeEventSource` instance appears after advancing timers post-unmount) and the live instance is `closed === true` — no leak.
12. Changing `tenantId` between renders (`rerender` with a new prop) → old instance closed, new instance opened with the new tenant in its `url`; any timer pending from the old instance's error state is cleared (assert `instances.length` increments by exactly one, old instance stays closed).
13. `enabled: false` → zero `FakeEventSource` instances ever constructed; calling `reconnect()` while disabled is a safe no-op (no throw, no instance created) — guards the case where a caller holds a stale `reconnect` reference from before `enabled` flipped false.

`message.new` / `pendingMsgCount`:

14. `emit("message.new", { conversationId: "c1" })` while mocked `usePathname()` returns a path NOT ending in `/messages` → `pendingMsgCount` increments to `1`; a second emit → `2`.
15. Same emit while mocked pathname ends with `/messages` → `pendingMsgCount` stays `0` (never increments while already on the messages route).
16. Rerender with pathname changed to end with `/messages` (simulating navigation) → `pendingMsgCount` resets to `0`.
17. **Effect-split regression guard**: perform the pathname-only rerender from case 16 and assert `FakeEventSource.instances.length` is unchanged across it (proves Effect 2 never tore down/recreated Effect 1's connection — the specific constraint called out in the brief).
18. Malformed frame (`emit("message.new", { conversationId: undefined })` → `parseEvent` should reject since `payload` still needs to be a record; assert with an actually-malformed JSON string via `onmessage`/manual `emit` bypassing `JSON.stringify` if needed) is dropped silently: `pendingMsgCount` unchanged, `sseStatus` unchanged, no throw.

Existing-behavior regression guard (Phase 2 done-criterion from the plan):

19. `notification.created` emitted → `queryClient.invalidateQueries` called with `["notifications"]` (spy on the `QueryClient` instance passed via the test's `QueryClientProvider`, or pass a manually-constructed client and spy `invalidateQueries`).
20. `attendance.updated` emitted → invalidates `["attendance","roster",classId]` and `["attendance","history",classId]`.
21. `session.revoked` emitted → `onSessionRevoked` callback called with the event's `sessionId`; no `invalidateQueries` call for this event.

These three (19–21) did not exist as a hook-level test before this story (the
hook itself had no test file — only `event.ts`'s pure `queryKeysFor` was unit
tested). Adding them here is in scope per the plan's Phase 2 "existing
US-E06.2 tests for query invalidation still pass unmodified" done-criterion —
there is nothing pre-existing to "not modify" at the hook level, so this test
file becomes the first regression guard for that behavior once `AppShell`
actually mounts it.

### `event.test.ts` / `event-invalidation.test.ts` additions (Phase 1, small)

22. `parseEvent` accepts a well-formed `message.new` frame (`type`, `eventId`,
    `tenantId`, `occurredAt`, `payload: { conversationId }`).
23. `parseEvent` rejects a `message.new` frame with `payload: undefined`
    (same structural check as every other event type — no new code path,
    just a new fixture confirming the existing generic checks still apply).
24. `queryKeysFor` returns `[]` for a `message.new` event (exhaustiveness arm).

## 6. Race conditions considered

| Race | Resolution |
| --- | --- |
| `onerror` fires, schedules a 4s timer, then `reconnect()` is called manually before the timer elapses | `reconnect()` clears `timeoutHandle` directly before opening a new connection (§4) — the stale timer can never fire and open a second, redundant connection. |
| Two `onerror` events fire in quick succession (flaky network) before the first reconnect completes | `scheduleReconnect`'s `previousTimer` clear means the second `onerror`'s scheduled timer always supersedes the first — only one timer is ever live, so only one reconnect fires. |
| `tenantId` changes while a reconnect timer is pending | Effect 1's cleanup (return function) runs on every dep change, clearing `timeoutHandle` and closing the stale `source` before the new effect instance's `connect()` runs for the new tenant — no cross-tenant timer leak. |
| A `message.new` event arrives in the same tick as a pathname change into `/messages` | Both effects run to completion synchronously per render pass; Effect 2's `pathnameRef.current = pathname` write happens before Effect 1 could process a frame arriving asynchronously afterward (SSE frames are always async browser events, never synchronous with a render), so there's no ordering ambiguity — by the time any new frame is handled, `pathnameRef.current` already reflects the latest route. |
| Component unmounts while a `FakeEventSource`/real `EventSource` still has an in-flight frame queued | Effect 1's cleanup closes `source` and nulls out nothing else needed — `source.onopen/onerror/onmessage` become irrelevant once `close()` is called (the closed source stops delivering events per the `EventSource` spec), so no post-unmount `setState` can occur. |

## 7. Summary for `fe-lead`

- Hook return shape: `{ sseStatus: SseStatus; showBanner: boolean; pendingMsgCount: number; reconnect: () => void }`, `SseStatus` exported from `use-realtime-events.ts`.
- Two-effect split confirmed and fully specified (§3): connection effect keeps its current deps (`enabled, tenantId, locale, queryClient, onSessionRevoked`); a second effect keyed only on `pathname` updates a ref and resets `pendingMsgCount`.
- `schedule-reconnect.ts` mirrors `highlight-timer.ts`'s clear-then-schedule contract; `reconnect()` bypasses it entirely for immediate manual reconnects.
- State placement: 100% hook-local React state (`useState`/`useRef`) — no TanStack Query (not fetched data), no global store (none exists in this repo), no URL state ownership (only reads `pathname`).
- No existing `EventSource` test convention found anywhere in `src/` — designed a minimal `FakeEventSource` stub (§5) local to the new hook test file; no shared/global mock module proposed yet (defer until a second hook needs one).
- No ADR triggered — no new token, no new auth/data-contract decision; `message.new`'s empty `queryKeysFor` arm is a plain exhaustive-switch requirement, not a design decision needing sign-off.
