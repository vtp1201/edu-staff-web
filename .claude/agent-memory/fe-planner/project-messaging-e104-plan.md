---
name: project-messaging-e104-plan
description: US-E10.4 additive messaging plan — GroupEntity shape, 9 new repo methods, i18n gaps, dark-mode token risk
metadata:
  type: project
---

Additive build on US-E10.1 (already implemented). Plan at `docs/stories/epics/E10-communications/US-E10.4-messaging-enhancements/plan.md`.

Key decisions in plan:
- `GroupEntity` is a separate entity (not merged into ConversationEntity); linked by same `id`. `ConversationEntity` gets additive optional fields (`selfIsGroupAdmin`, `groupKind`, `pinnedMessageIds`, `lastSenderName`).
- `IMessagingRepository` gains 9 new methods. Adding them causes TypeScript errors in `MockMessagingRepository` + `MessagingRepository` until Phase 2 stubs them — this is expected and intentional.
- `sentAt: string` (ISO) must be added to `MessageEntity` for the 1-hour delete gate to be testable without raw `Date.now()`.
- `MessageContextMenu` wraps existing `components/ui/context-menu/` primitive (run `bun ui:add context-menu` if absent). NOT a new shared/ component.
- `ReplyStrip` lives as a sub-section inside `MessageInput` — no separate component file.
- 5 new i18n error keys needed: `create-group-failed`, `group-mutation-failed`, `pin-failed`, `delete-message-failed`, `not-group-admin` — the existing `messaging.errors` only has 4 keys.
- Dark-mode risk: quoted bubble own-variant uses `rgba(255,255,255,0.18)` in mockup — must check `src/app/tokens.css` for a semantic token; if absent, flag ADR ≥ 0045 before Phase 4.
- Long-press detection: `onTouchStart` 500ms timer, cancel on `touchmove > 10px`. No library.
- Mobile GroupInfoPanel (OQ-1 from spec): full-width overlay at `< 400px` with z-50.
- Scroll to out-of-window quoted/pinned message (OQ-2): scroll within loaded messages only; no-op if not found.

**Why:** DR-008 edustaff_5 handoff (+1390 lines) tách khỏi E10.1 để giữ base story stable (ADR 0044 follow-up).
**How to apply:** When planning future additive messaging stories, check this entity shape + i18n error catalog before proposing new types.
