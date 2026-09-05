---
name: us-e24.4-qa-patterns
description: QA patterns from US-E24.4 (student cross-subject courses/assignments/exams tab merge) — closes E24 Phase 1 student epic
metadata:
  type: project
---

US-E24.4 merged `/student/assignments` + `/student/exams` into `/student/courses?view=`.
Another fully-accurate self-report (4th in a row after E24.1/E24.2/E24.4-precedents) — zero
new tests needed, all Evidence claims verified independently.

Reusable patterns confirmed here:
- **Redirect-digest test recipe** (`permanentRedirect` → `NEXT_REDIRECT;<type>;<url>;<status>`)
  is now used twice more (assignments/exams legacy routes) — split `digest.split(";")` and
  assert exact status "308" + full URL string, not just "redirected: true".
- **RSC page.test.ts as the single AC-7 "URL is state" proof** — when a route has ZERO Client
  Components (every switch is `<Link href="?...">`), there's nothing for a browser
  back/forward test to add; params-in/VM-out coverage in a node-env page.test.ts is sufficient
  and is what the team's QA brief itself scoped ("không cần test back/forward thật").
- **Untouched-route verification via git diff against the pre-story parent commit** — used to
  confirm `/student/exams/[examId]/page.tsx` byte-identical, closing AC-9 without needing to
  write a test for a file this US was explicitly forbidden from touching.
- **Node one-off key-diff script** (`require()` both message JSONs, recursive key-flatten,
  set-diff both directions) is a fast, reliable way to prove "vi/en mirror intact + zero
  leftover deleted-namespace keys" without grep false-positives (a nested `"assignments"` key
  existed elsewhere in the tree — top-level-only diff avoided a false alarm).
- Cross-subject Storybook stories (`cross-subject-list.stories.tsx`) shipped 7 named stories
  against a 5-state AC ask (all/assignment-open-urgent/exam-upcoming/closed/empty) — 2 extra
  (viewport-320, touch-target) folded in cleanly, a good template for future cross-view lists.
- Full `bun vitest run` had 1 flaky timeout (`parent/attendance/page.test.ts`, unrelated,
  resource-contention pattern already logged in US-E24.5 memory) — isolated rerun confirmed
  non-regression in <5s.
