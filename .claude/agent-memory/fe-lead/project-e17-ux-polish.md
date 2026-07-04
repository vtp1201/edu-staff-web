---
name: project-e17-ux-polish
description: E17 UX polish epic (DR-010/DR-011) — US-E17.2/US-E17.3/US-E17.5 implemented; other US in epic
metadata:
  type: project
---

US-E17.2 (Grade Table Mobile Scroll + Sticky Column, UX-03/DR-010) implemented
2026-07-04 on branch `feat/us-e17.2-grade-table-mobile-scroll` (merged + deleted).
Single-source fix to `src/components/shared/grade-book-table/grade-book-table.tsx`
consumed by teacher/principal/student/parent grade routes.

**Why:** BA spec packet was already exhaustive (exact line-level diffs) — skipped
`fe-planner`/`fe-component-architect`/`fe-state-engineer` entirely and went straight
to `fe-nextjs-engineer`. Worked well for small, well-specified single-component CSS/a11y
fixes; don't skip architecture steps when the packet is vaguer than this.

**a11y audit caught a real gap the engineer + tech-lead reviewer both missed initially:**
`role="region"` was added without `tabIndex={0}` — a scrollable region with no interactive
descendants is otherwise permanently unreachable by keyboard-only users (WCAG 2.1.1). Also
flagged duplicate `aria-label`/`<caption>` text — fixed via `aria-labelledby` + `useId()`
(repo already uses `useId()` elsewhere for this exact id-linking pattern, e.g. `form.tsx`).
**How to apply:** whenever a scoped/composed test asks for `role="region"` on an
`overflow-x-auto` wrapper, always pair it with `tabIndex={0}` — this is a recurring pattern
across DR-010/DR-011 scroll-container stories (see US-E17.11 same file).

**QA found a real Storybook/Chromium gotcha:** `-webkit-overflow-scrolling` cannot be
asserted via `getComputedStyle`/`style.cssText` in real Chromium — the browser silently
drops non-standard vendor properties from the CSSOM even though React sets them fine via
the JS style API and Safari/iOS honors them. Authoritative proof for this property must be
an SSR string-match unit test (`renderToStaticMarkup`), not a browser-mode assertion.

**Harness note:** `harness-cli story update --status` only accepts `in_progress`/`implemented`/
etc (underscore), not `in-progress` (hyphen) — the packet's own `story.md` prose uses hyphens
by convention but the CLI enum uses underscores. Don't conflate the two.

**Concurrent-session hygiene reconfirmed:** working tree had stray uncommitted memory files
from BA/uiux sessions (`.claude/agent-memory/{ba-lead,ba-spec-writer,uiux-lead,...}/*`) and
one unpushed `main` commit from a prior session throughout this run — always `git status`
before checkout/pull, push any pending legit `main` commits first, and stage only your own
files (never blanket `git add -A`) so you don't carry another session's WIP into your commit.

**Related:** [[project-parallel-branch-workflow]], [[project-e16-impeccable-fixes]] (shared-branch
pattern precedent — not needed here since this was solo/single-US, but same auto-merge discipline).

US-E17.3 (Messaging Mobile Pane Toggle, UX-03/DR-010) implemented 2026-07-04 on
`feat/us-e17.3-messaging-mobile-pane` (merged `11acbb7` + deleted). Blocks US-E17.7.

**Real functional gap the first implementation pass missed:** engineer's first commit kept
the old `hidden`/`flex` display toggle and only added transform/transition classes on top —
but `display:none` suppresses CSS transitions entirely, so the "slide" would have been
visually instant, not animated (AC-05/06/10/14/15). Engineer self-flagged this in its report.
Fix: both panes always-mounted + `absolute inset-0` on mobile (position via `translate-x-*`
only), `md:static` resets desktop. **When a spec calls for a CSS transform transition on a
toggled element, verify the old `display`/`hidden` mechanism isn't still gating visibility —
transitions don't play across a `display:none` boundary.**

**`aria-hidden` alone isn't enough once the pane stays mounted:** switching from
`display:none` to always-mounted+transform means the off-screen pane's focusable children
are still literally in the DOM. Added React 19 native `inert` prop (belt-and-suspenders with
`aria-hidden`) gated by the same `matchMedia`-based `useIsMobile()` hook. `aria-hidden`/`inert`
are HTML attributes a CSS media query cannot toggle — a real JS `matchMedia` check for this is
fine and does not violate a "reduced-motion must be CSS-only" AC (that constraint is scoped to
the animation itself, not an unrelated a11y attribute gate). a11y auditor confirmed this pairing
is the correct APG-recommended pattern for animated always-mounted panels.

**a11y audit found a real hydration gap (A11Y-001):** `useIsMobile()` defaulting its
`useState` to `false` and only setting the real value in a `useEffect` left a brief
post-hydration window where a keyboard user tabbing on mobile could reach the visually
off-screen pane. Fix: read `matchMedia` synchronously in the `useState` initializer function
(still SSR-safe, guarded by `typeof window`). Cheap, worth doing immediately rather than
deferring — a11y auditor's "Minor, optional" findings that are <10 min to fix should just be
applied before QA, not left open.

**QA found real Storybook/Chromium test-runner health signal:** contrary to older team memory
saying `vitest.storybook.mts`/browser runner was "broken env-wide," it worked fine this run —
QA executed 21/23 real Chromium interaction tests. Re-verify current runner health per-story
rather than trusting a stale "broken" memory note; the 2 failures found were pre-existing
E10.4 flakes (`Create Group Optimistic Prepend`, `Reply Strip Active`), confirmed by diffing
against `main`'s copy of the same file — that's the right way to distinguish "my change broke
this" from "this was already flaky."

**Subagent lifecycle note:** a spawned `fe-nextjs-engineer` doing a follow-up fix concurrently
edited the same files I was mid-editing in the shared working tree (solo mode, no worktree
isolation) after I'd already sent it a follow-up instruction — both of our edits interleaved
in `pane-visibility.ts`/`messaging-screen.tsx` correctly by luck (functionally compatible), but
this could just as easily have produced a broken merge. When resuming a subagent AND doing
manual fixes yourself in the same run, re-`Read` the file immediately before every `Edit` (an
`Edit` will hard-fail with "file modified since read" if it raced you) and re-run
`bunx tsc --noEmit` + full `vitest run` after reconciling, don't trust either party's
self-report of "done" until you've verified the merged state compiles and tests pass yourself.

**DEF-01 logged, not fixed:** QA found `ChatWindow`/`messaging-screen.tsx` has no chat-fetch-
error UI at all (AC-08 in spec.md). This predates the story and is out of its actual AC scope
(story.md's critical AC list omits AC-08) — logged as a backlog follow-up against the base
messaging feature rather than silently expanding this US's scope.

US-E17.5 (Empty State — Grade Book Table, UX-01/DR-010) implemented 2026-07-04/05 on
`feat/us-e17.5-empty-state-gradebook` (merged `5cd5fd9` + deleted). Solo mode (no in-flight
branch at claim time).

**Two "empty" cases share the same visual today — don't conflate them when a spec says only
one should change.** `grade-book-screen.tsx` had ONE local `EmptyState` component reused for
both `!hasSelection` (no-selection prompt) and `!vm.gradeBook` (no grades yet). Spec required
upgrading only the second to the canonical `emptyStatePattern` while leaving the first
byte-identical. Fix: added a second, separate `GradeBookEmptyState` component for the
`!vm.gradeBook` branch; left the original `EmptyState` wired only to `!hasSelection`. **Before
touching a shared local helper component, check every call site it's used from — a spec that
says "change X" may only mean one of N sites reusing that helper.**

**A pre-existing Storybook story exercised the wrong code path — caught by writing the RED
test first.** The original `EmptyState` story passed `gradeBook: { ...book, rows: [] }`
(a *non-null* GradeBook with zero rows) which actually renders `GradeBookTable`'s OWN internal
empty-rows branch, not the screen-level `!vm.gradeBook===null` branch this US targets. Rewrote
the story to `gradeBook: null` before implementing — this is why TDD's red-first step matters
even when "adding" to an existing story: the old assertion was accidentally testing a different
component's empty state under the same story name.

**Token-alias vs explicit edu-* token divergence in dark mode — worth the extra literal-class
swap when the spec says `var(--edu-border)` and not "whatever `--border` resolves to."**
`src/app/globals.css` maps `--border: var(--edu-border)` in `:root` (light) but overrides
`--border: #232b45` as an independent raw hex in the dark-mode block — so `border-border`
computes differently from `border-edu-border` once dark mode is exercised, even though they're
identical today in light mode. When an AC explicitly names a `--edu-*` CSS var (not the shadcn
semantic alias), swap to the literal `border-edu-border`/`bg-edu-card` class — same tokens.css
entries, same "no new token" NFR, but future-proof against alias drift. Confirmed by grepping
`globals.css` for both `--border:` occurrences (found the divergent dark-mode override) before
deciding — don't just trust the light-mode `@theme` mapping.

**Full storybook suite failures are frequently pre-existing infra flake, not your diff — verify
by stashing and re-running on the baseline before treating them as blockers.** `bunx vitest run
--config vitest.storybook.mts` (no filter) showed 17 failed files / 65 failed tests, all
`useRouter`-mount `invariant` errors in unrelated features (timetable, announcements,
class-management, teaching-plan, etc.) — none touching grade-book. Stashed my diff, reran the
identical full-suite command on unmodified `main`, got the exact same 17/65 failures — confirmed
pre-existing/unrelated before proceeding. The filtered run (`... grade-book`) was green the
whole time; that's the signal that actually matters for a scoped US.

**Both parallel gate agents (tech-lead + a11y) independently PASSED immediately — no findings,
no fix loop needed.** Small, well-scoped, spec-driven presentation diff (4 files, no new
tokens/i18n/routes) is the profile where that happens; don't expect the same on larger/vaguer
US.

US-E17.4 (Empty States — Discipline: violations/conduct/leave, UX-01/DR-010) implemented
2026-07-05 on `feat/us-e17.4-empty-states-discipline` (merged `467bafa` + deleted). Solo mode.
Also resolved US-E17.5's tech-debt flag: extracted `src/components/shared/empty-state/`
(canonical no-CTA-by-default `EmptyState`, decision 0026) and used it at 4 discipline call
sites, killing the misleading green `<Check>`/`text-edu-success` "success" icon for
zero-violations/zero-leave states.

**A design-spec.jsonc token literal can itself be a real WCAG contrast fail — don't trust the
pattern doc, compute it.** `emptyStatePattern.icon.color` in design-spec.jsonc and this story's
own AC text both named `text-edu-text-muted` (#8898A9) for the icon. On a white `--edu-card`
background that's 2.95:1, below this repo's own `.claude/rules/accessibility.md` "UI/icon ≥3:1"
floor — a11y auditor caught it (A11Y-001, Major), tech-lead's review missed it (its scope was
architecture/i18n/tokens-existence, not literal contrast math). The fix (`text-edu-text-secondary`,
5.48:1) had ALREADY been discovered and applied once before in the exact file being touched
(`LeaveHistorySection.tsx`'s removed inline comment "DR-GATE-002: ... fails SC 1.4.11 ...
text-edu-text-secondary ... passes") — grepping the git history/comments of code you're about to
delete can surface a prior fix you're about to regress. When a fix like this lands, sync the
story/spec AC text too (they literally quoted the wrong class) — don't leave the packet
contradicting the accessible implementation.

**Resumed background agent + lead editing the same files concurrently produced a silent
"whose commit is this" mystery — resolved by checking author/timestamps, not by re-guessing.**
After sending a `SendMessage` fix instruction to the already-completed `fe-nextjs-engineer`
agent (which auto-resumes and keeps working async), I *also* made the identical manual Edit+git
add+commit myself before the agent's own commit landed. My `git commit -m "a11y(discipline): ..."`
produced a commit whose logged message read "fix(discipline): ..." with different body text —
because the resumed agent had ALREADY committed the same working-tree state moments earlier
(same fix, same file diff) and my subsequent add+commit was a no-op that silently succeeded on
top of it. Confirmed via `git log -1 --format` (author matched the human git identity, not a
distinguishing agent marker) and `git push` returning "Everything up-to-date" (proof the content
was already on the remote). **When a resumed agent's commit message doesn't match what you typed,
check `git reflog`/`git log --format` timestamps before assuming something broke — it's often just
the other party's commit landing first with equivalent content.** Don't stall/end-turn waiting for
an agent notification when there's independently verifiable git state to check yourself in the
meantime — verify `git status`/`git log main..HEAD` directly rather than passively waiting.

**QA found stale info in the task brief itself and corrected it rather than deferring to it.**
I told `fe-qa-playwright` "17 pre-existing failures, NOT discipline" based on a prior US's memory
note — QA actually ran the suite and found `discipline-screen.stories.tsx` genuinely IS among the
17 (its `useRouter`/`usePathname`/`useSearchParams` usage, unrelated to this story's diff which
only touches empty-branch JSX inside sub-components). Confirmed via the standard diff-against-main
technique. **A task brief's "known baseline" claim can itself be stale — treat it as a hypothesis
for the specialist to verify, not a fact to certify against**, especially for anything storybook/
env-related that changes as the codebase grows.

**QA found and closed a real "shared component tested, consumers not" gap.** The new
`EmptyState` had full unit+story coverage, but 2 of its 4 call sites (`ConductTab`, parent-side
`LeaveHistorySection`) had ZERO existing test/story exercising their empty branch at all — a
coverage gap invisible if you only check the shared component's own tests. QA closed both with
new/strengthened Storybook `play()` stories (test-only, no production code touched) rather than
just flagging and stopping — the right call when the fix is test-code-only and squarely in QA's
lane.
