# US-E18.18 — Accessibility Audit (inbound typing wiring, regression-focused)

## 1. Audit Summary

Scope: `git diff main..HEAD` for
`src/features/messaging/presentation/messaging-screen/{messaging-screen.tsx,typing-inbound.ts}`
plus the pre-existing `TypingIndicator` (`src/features/messaging/presentation/typing-indicator/typing-indicator.tsx`,
audited under US-E16.5) and its host `ChatWindow`
(`src/features/messaging/presentation/chat-window/chat-window.tsx`). This US
wires a real inbound SSE `typing` event to the `isTyping` prop; it introduces
no new visual/interactive surface (confirmed by diff — `typing-indicator/`
and `chat-window.tsx` have **zero changes** in `git diff main..HEAD`).

Criteria checked: SR announcement correctness (`aria-live`/`sr-only` timing),
component identity (no duplicate/bypass indicator), motion-safe gating
(unchanged), room-scoping as a "status must not mislead" a11y-adjacent
concern.

**Findings: none. Overall: PASS** — this US does not regress the US-E16.5
audit. One **Minor, non-blocking observation** noted below (pre-existing
behavior, not introduced by this diff) for the record.

## 2. WCAG 2.1 AA Coverage table

| Criterion | Description | PASS/FAIL | Finding ID |
| --- | --- | --- | --- |
| 4.1.3 Status Messages | New typing status announced via `aria-live` without stealing focus | PASS | — |
| 1.3.1 Info & Relationships | `sr-only` text conveys typing state; decorative avatar/dots `aria-hidden` | PASS | — |
| 2.2.2 Pause/Stop/Hide (motion) | `msg-typing` keyframe gated by `prefers-reduced-motion` | PASS (unchanged) | — |
| Component duplication (`.claude/rules/component-organization.md`) | Same `TypingIndicator` reused, not forked | PASS | — |
| Status accuracy (no misleading indicator) | Indicator scoped to open room only | PASS, see OBS-001 | OBS-001 |

## 3. Findings Catalogue

No Blocking/Critical/Major/Minor findings against this diff's actual scope.

One observation, logged for completeness (pre-existing, not introduced by
this US, not a regression):

```
OBS-001 (non-blocking, informational only)
Severity: N/A — pre-existing scope decision, not a new defect
Component: src/features/messaging/presentation/chat-window/chat-window.tsx:361
Issue: `{!isGroup && isTyping && <TypingIndicator .../>}` only renders the
  indicator for DIRECT conversations. Now that `isTyping` is real-data-driven,
  a `typing` SSE frame for an open GROUP conversation is received by
  `nextInboundTyping`/`messaging-screen.tsx` (sets `typingRoomId`), computed
  into `isTypingForActive = true`, but `ChatWindow` silently drops it via the
  `!isGroup` guard. This is a pre-existing conditional (not touched by this
  diff — confirmed via `git diff main..HEAD -- chat-window.tsx` = empty) and
  is consistent with the story's stated scope (`isTyping` prop was already
  dormant/group-excluded before this US). Not a false-status a11y violation
  today since no indicator renders at all for groups (silence, not a wrong
  claim) — but flag as a product/UX gap for a follow-up US if group typing
  indicators become a requirement, since the SSE data path already supports
  it (`roomId` is generic, not direct-only).
Evidence: `chat-window.tsx:361-366` — `{!isGroup && isTyping && (<TypingIndicator .../>)}`.
Fix: N/A for this US (out of scope — no code change needed to close this
  audit). If group typing becomes in-scope: drop the `!isGroup` guard and add
  a `senderName`/`senderId`-aware variant of `TypingIndicator` (group chats
  need "who" is typing, not just "someone"), which WOULD need its own
  design-review + a11y pass (new visual state).
Reference: WCAG 4.1.3 Status Messages (informational only, not a fail here).
```

## 4. Keyboard Navigation Map (unchanged by this diff)

No new focusable/interactive elements were added. `TypingIndicator` remains
non-interactive (no button/link/tab role) — nothing to tab to; it does not
appear in tab order, consistent with US-E16.5's original audit. Keyboard flow
for the surrounding `ChatWindow`/message log is untouched by this US.

## 5. Screen Reader Script

**Before this US** (mock-only `isTyping`, manually toggled/dormant):
When `isTyping` flips true (previously only reachable via mock/demo state),
the SR user hears the new `<span className="sr-only">{t("chat.typing")}</span>`
text announced once the node enters the `role="log" aria-live="polite"`
message container (`chat-window.tsx:318-319` — pre-existing, unchanged) —
e.g. "Đang nhập..." (or configured `messaging.chat.typing` string). Avatar
initials and the 3 animated dots are `aria-hidden="true"`, so they add no
noise.

**After this US** (real SSE `typing` event): Identical announcement
mechanism and timing — the only change is *what triggers* `isTyping` to flip
(a real inbound SSE frame via `useRealtimeEvents({ onTyping })` →
`nextInboundTyping` → `typingRoomId` state → `isTypingForActive` passed to
the same `ChatWindow`/`TypingIndicator` prop chain). Because
`nextInboundTyping` ignores frames whose `roomId` doesn't match the
currently-open conversation (`typing-inbound.ts:15-24`, unit-tested in
`typing-inbound.test.ts`), the SR user will never hear a typing announcement
for a conversation they don't have open — no false/misleading status change.
The 6s TTL auto-clear (`TYPING_INDICATOR_TTL_MS`, `messaging-screen.tsx:39,
417-425`) also prevents a stuck/stale "typing" announcement outliving a
dropped `typing:false` frame — this is a **positive** finding: it reduces the
risk of a misleading persistent status, which directly serves WCAG 4.1.3's
intent (status must reflect real state).

No difference in what is announced or when — same `sr-only` node, same live
region, same component. **Confirmed: no regression.**

## 6. Quick Wins

None required — no findings to fix. (OBS-001 is intentionally out-of-scope
per the story's own Design Notes and would require new UI/design-review work,
not a quick fix.)
