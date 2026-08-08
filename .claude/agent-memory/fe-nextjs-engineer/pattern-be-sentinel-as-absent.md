---
name: pattern-be-sentinel-as-absent
description: E18.58 — a BE placeholder STRING ("Member") is an absent-value, not a name; normalize it in the mapper to undefined so it reuses the one existing i18n fallback
metadata:
  type: project
---

When BE stops sending `""` and starts sending a literal English placeholder
(e.g. `senderName: "Member"` for an unprojected sender), the fix belongs in the
**mapper**, not the component.

**Why:** the presentation already has ONE localized fallback (`x ?? t("unknown…")`).
Adding a second check in the `.tsx` forks the fallback logic and lets the English
sentinel leak into a Vietnamese UI on any other consumer of the entity. Normalizing
both absent-causes (blank, sentinel) to `undefined` in the mapper keeps a single
i18n path and needs zero UI change.

**How to apply:**
- Named constant + type guard, not an inline second condition:
  `const UNRESOLVED_X_SENTINEL = "Member"` +
  `function isRealX(raw?: string): raw is string { const t = raw?.trim(); return !!t && t !== SENTINEL }`.
  Trim BEFORE comparing; **exact case-sensitive match** — a real name may *contain*
  the word ("Member Nguyễn" must pass through). Test that case explicitly, it is
  the one that catches a lazy `includes()`.
- Keep the old-contract case (`""` → absent) as a cheap regression test.
- **Shared DTO type ≠ shared mapper.** Pin board and message history both embed
  `RoomMessageResponseDto`, but history goes through
  `messaging.mapper.ts#toMessageEntityFromRoom` (which never reads `senderName`)
  while the pin board has its own `pinned-message.mapper.ts`. Grep for the field,
  then check *which function* each call site uses before claiming blast radius.
- Fix the stale TSDoc in the same commit (entity + DTO + component header). A doc
  that still says "always `\"\"`" is what makes the next reader ship a regression.
- Storybook gotcha: assert a pinned/derived name that is NOT also in the member
  list — otherwise `getByText` fails with "Found multiple elements".

Related: [[pattern-entity-i18n-key-reshape]], [[pattern-boundary-narrow-remap]].
