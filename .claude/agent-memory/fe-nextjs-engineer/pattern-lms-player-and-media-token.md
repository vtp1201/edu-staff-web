---
name: pattern-lms-player-and-media-token
description: LMS student player patterns — media-surface token, tone→literal-class map, RSC-seeded plain useQuery + cross-query optimistic patch, all-content-up-front lesson VM
metadata:
  type: project
---

Built US-E11.6 (`src/features/lms/`, mock-first two-screen: courses grid + lesson player).

- **Media-surface token (ADR 0050):** `bg-edu-media-surface` (#0f1117) /
  `text-edu-media-surface-foreground` (#fff) exist in tokens.css+globals for dark
  video/media faux-chrome. Dimmer text = `/75` opacity modifier, not a 2nd token.
- **Course tone → Tailwind class:** map raw hex→semantic tone in the *mapper*
  (`mapColorToTone`, palette hexes lowercased), never let hex reach the client.
  Client tone→class via a `Record<Tone,string>` of FULL literal classes
  (`bg-edu-primary` etc.) so the v4 scanner detects them — `bg-edu-${tone}` won't.
- **RSC-seeded plain useQuery** (not infinite): `useQuery({queryKey, queryFn: async()=>initial, initialData: initial, staleTime, refetchOnWindowFocus:false})`
  — same as messaging-screen. Tabs filter the cached array client-side (key has NO
  status param).
- **Cross-query optimistic mark-complete:** onMutate cancels+snapshots BOTH
  `["lms","course",id,"lessons"]` and `["lms","courses","list"]`, patches via pure
  `patchLessonDone` + `calculateCourseProgress`; onError rolls both back; onSuccess
  re-patches with server values; NO invalidateQueries (avoids refetch flicker).
- **All lesson content up front:** player VM carries full `ChapterEntity[]` (with
  blocks/downloadHref) so lesson-switch is pure client state (no per-lesson fetch);
  a `.derive.ts` file holds pure `projectChapters`/`toActiveLessonVm`/`findNextLessonId`
  (unit-tested, client-safe).
- **VideoPlayer faux-chrome a11y:** biome rejects `role="group"` (wants `<fieldset>`)
  — drop it, the visible label + labeled play button/slider suffice. `role="slider"`
  is fine (no useSemanticElements native equiv, so no biome-ignore needed).
- Notes/Q&A go through repo methods + thin use-cases (module-level mock store so
  Server Action calls — each a fresh DI instance — share state); reset helper for tests.

Related: [[pattern-rsc-seeded-infinite-query]], [[pattern-storybook-tanstack-decorator]],
[[pattern-usecase-result]] (Result = {ok,data}|{ok:false,failure} here), [[pattern-mock-first-wiring]].
