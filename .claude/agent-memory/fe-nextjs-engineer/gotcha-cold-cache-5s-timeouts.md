---
name: gotcha-cold-cache-5s-timeouts
description: Editing a widely-imported shared file (i18n messages, endpoints) invalidates vitest's transform cache → a handful of RSC page tests hit the 5s default timeout; re-run warm before blaming your change
metadata:
  type: feedback
---

After touching `src/bootstrap/i18n/messages/{vi,en}.json`, a shared
`bootstrap/endpoint/*.ts`, or `bootstrap/lib/http.ts` (US-E01.3: 3 failures on
the first run, then 4117/4117 green on three consecutive re-runs), the first
`bun vitest run` can report a handful of failures —
always the FIRST test of an `app/**/page.test.ts(x)` file, always
`Test timed out in 5000ms`. They are not real: the 5s budget is being eaten by
cold vite transform of a large RSC module graph.

**Why:** those shared files sit in nearly every module graph, so editing one
invalidates the whole transform cache. `git stash` + re-run makes the BASELINE
look green (its cache is warm) and `stash pop` makes your change look guilty —
a false accusation trap on top of the usual baseline check.

**How to apply:** before blaming the change, (a) re-run the same suite warm —
green means it was cache cost; or (b) re-run the single file with
`--testTimeout=30000`; it will pass in ~1s of actual test time. The same flake
can fail lefthook's `vitest-related` on the first commit attempt — just retry
the commit, do NOT reach for `--no-verify`. Known genuinely-flaky Storybook
stories under full-suite load: `principal-classes-screen.stories.tsx`
(Radix portal timing) and `staff-discipline-screen.stories.tsx`; both pass in
isolation and are documented as pre-existing in the FE→BE reports.

**Machine load is the second cause, and it does NOT warm away** (US-E24.8 review
round): with parallel `/fe` sessions running, `uptime` showed load 45–65 and the
same suite failed 4 → 9 → 28 → 37 tests across consecutive runs, with a DIFFERENT
file set each time and never a file I had touched. A one-key throwaway edit to
`vi.json` on an otherwise clean tree reproduced it, which proves innocence without
guessing. The honest re-verification that fits in the 5s-per-test world is
`bun vitest run --maxWorkers=2 --testTimeout=30000` → 4323/4323 green; afterwards
the real lefthook pre-push gate (default settings) passed once load dropped
below ~25. Retry, never `--no-verify`.

Related: [[gotcha-storybook-baseline-failures-and-dual-dialog]].
