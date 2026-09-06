---
name: pattern-failure-reason-and-url-story
description: "A domain failure covering N causes must carry a `reason` (one notice for many causes = wrong advice); URL-driven container behaviour is testable via Storybook `parameters.nextjs.navigation.query`"
metadata:
  type: feedback
---

Two review findings from the US-E24.14 fix round, both reusable.

**1. One failure type, many causes ⇒ carry the reason.**
`resolveSummaryRange` returned bare `{type:"invalid-request"}` for FOUR causes
(>366 days, malformed `?month=`, a month that hasn't started, an inverted term)
and the container collapsed every non-`no-terms` outcome to a single
"range exceeds 366 days" notice — so `?month=2027-01` told a teacher to shorten
a one-month span.

**Why:** the failure UNION is the error catalogue (i18n rule), but a union
*member* reused for several causes silently loses the distinction, and the UI
then has to guess. Guessing produces advice that is not just vague but wrong.

**How to apply:** when one failure member is returned from >1 `return` site with
materially different user advice, extend it structurally rather than adding a
second failure type:
```ts
export interface InvalidSummaryRange
  extends Extract<AttendanceFailure, { type: "invalid-request" }> {
  reason: "too-large" | "invalid-selection";
}
```
`type` is unchanged, so the value is still a plain `AttendanceFailure` for
anything that only branches on `type`; add an `isInvalidRange()` narrow + a
`Record<Notice, i18nKey>` map at presentation. Prove it with paired assertions:
each story asserts its own copy **and** `queryByText(/other copy/)` is absent —
that negative is what actually pins the differentiation.

**2. URL→state behaviour needs a CONTAINER story.**
A presentational story pinned `rangeKind: "month"` in args, so the URL-drift path
(`?range=term` while the terms read degrades to empty ⇒ segmented control with
nothing selected) was untestable there. `@storybook/nextjs-vite` mocks
`useSearchParams`/`usePathname` from story parameters — no precedent existed in
this repo, but it works:
```ts
parameters: {
  nextjs: {
    appDirectory: true,
    navigation: { pathname: "/vi/attendance", query: { range: "term", month: "2027-01" } },
  },
}
```
Mount the container with `QueryClientProvider` + `NextIntlClientProvider` and an
injected `today` prop. Sanity-check the mock is live with one story whose
assertion FAILS if the query is ignored (e.g. assert the non-default segment is
`data-state="on"`) — otherwise a story that "passes" may just be reading defaults.

**How to apply:** whenever a fix is about what a stale/foreign URL does, the
proof belongs in a container story, not a props-driven one. Related:
[[pattern-additive-tab-and-type-promotion]], [[pattern-client-searchparams-nav]].
