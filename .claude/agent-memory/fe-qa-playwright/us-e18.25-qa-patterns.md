---
name: us-e18.25-qa-patterns
description: notification-center BE US-146 wiring — self-reported "fix verified" coverage was for once genuinely accurate; drain-truncation exact bug + test recipe
metadata:
  type: project
---

US-E18.25 (notification-center wiring) QA gate: rare case where an independent
re-verification of a tech-lead-cited fix came back clean — worth noting the
verification recipe since it generalizes.

**The bug** (`notification.repository.ts` `drainUnread`): the client-side
"Unread" tab drain capped `collected` to the caller's `limit` even though the
cursor had already advanced PAST the whole fetched page — any unread rows
beyond `limit` on that page became permanently unreachable (bell badge count
correct, list silently short). Fix: return every unread row found on a page,
uncapped; overshoot bounded by one page size, page-aligned cursor rules out
dupes. Locked in by
`notification.repository.test.ts` — `"returns EVERY unread row found on a
page, never truncating to \`limit\`"`: generate `limit+5` unread rows in ONE
page, assert `result.items` has all `limit+5`, not `limit`.

**Verification recipe used** (generalize to any "reviewer says X was fixed"
claim): (1) read the actual fixed source, don't trust the changelog prose;
(2) `git log --oneline main..HEAD` to find the exact fix commit, `git show
<sha> --stat` then `git show <sha> -- <file>` to see the real diff; (3) find
the specific test asserting the ORIGINAL failure mode is now impossible
(count-exact assertion beyond the boundary value, e.g. `limit+N` not just
`limit`), not just "doesn't throw."

**Other things worth re-checking even when self-report looks solid**:
diff the file explicitly claimed "UNCHANGED" (`git diff origin/main...HEAD --
<file>` should be empty) rather than trusting the sentence in the story;
verify i18n key SETS match exactly between `vi.json`/`en.json` and the
`isKnownTitleKey`/`isKnownBodyKey` allow-list in code (python json diff is
fast); confirm mock fixtures that fall back to a generic "unknown" i18n
string (an intentional ADR-documented behavior change, not a regression)
still render sane rows in the populated Storybook story rather than
blank/broken ones.

DI factory testing convention confirmed: only 3/44 `*.di.ts` files in this
repo have a dedicated `.test.ts` (all force-mock-specific) — absence of a
`notification.di.ts` test is NOT a gap, verify AC by grep (no lingering
import of a deleted facade) + direct code read instead of demanding a new
test file.
