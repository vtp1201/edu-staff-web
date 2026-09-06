---
name: notification-relativetime-hardcoded-locale
description: relativeTime() in the notification feature hardcodes vi/en strings AND both call sites pass "vi" literally — an EN user sees Vietnamese timestamps
metadata:
  type: project
---

`relativeTime(ts, locale)` (now `src/features/notification/presentation/shared/notification-row.tsx`,
promoted out of `notifications-center.tsx` in US-E24.13) builds its output from
inline literals — `"vừa xong"` / `"just now"`, `` `${minutes} phút trước` `` —
instead of i18n keys, and **both** call sites inside `NotificationRow` invoke it
as `relativeTime(item.ts, "vi")` with a hardcoded literal. So an `en`-locale user
sees Vietnamese relative timestamps.

**Why:** predates the i18n centralization (ADR 0020 / decision 0066 keyed
notifications). US-E24.13 moved it verbatim into `presentation/shared/` and gave
it a second consumer (the header bell dropdown), so the defect is now on a
shell-global surface visible from every page, not just `/notifications`.

**How to apply:** don't re-flag it as a NEW violation of the "no hardcoded
Vietnamese in .tsx" gate when a story merely moves it — but DO flag it as a
required follow-up on any story that touches this file or adds a consumer, and
push for the real fix: next-intl's `useFormatter().relativeTime()` + `useLocale()`
(kills both the literals and the hardcoded `"vi"` argument in one change). It is
NOT covered by the `bunx tsc --noEmit` typed-key check, and the vi-diacritics
grep in `.claude/rules/i18n.md` §Kiểm chứng WILL hit it.

Related: [[recurring-violations]].
