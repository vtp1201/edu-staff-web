---
name: project-e17-ux-polish
description: E17 UX polish epic (DR-010/DR-011) — US-E17.1/US-E17.2/US-E17.3/US-E17.4/US-E17.5/US-E17.6/US-E17.7 implemented; other US in epic
metadata:
  type: project
---

US-E17.1 (Responsive Stat-Card Grid, UX-03/DR-010) implemented 2026-07-05 on
`feat/us-e17.1-responsive-stat-grid` (merged `4bbcf91` + deleted). Solo mode.

**Pure Tailwind arbitrary-value grid swap is the cleanest profile in this epic: engineer
found an 8th grid beyond the spec's 7-file list via a self-directed grep (OQ-003) with zero
back-and-forth, both tech-lead + a11y gates passed immediately with no findings.** Delegating
"grep for the same pattern beyond the listed files" as an explicit brief instruction (not just
trusting the BA spec's file list) reliably catches drift — same value seen when specs predate a
shared-component extraction (E17.4/E17.6/E17.7 pattern), just a different kind of staleness
(missing file, not stale JSX).

**QA's real-browser Storybook run caught 2 test-authoring bugs invisible to node-env Vitest:**
(1) a `Viewport375` story asserted on a grid selector that never mounted for its chosen fixture
(the "pass" fixture took an untouched 3-col branch; only the "pending" fixture renders the
auto-fit grid this story touched) — a vacuous assertion that passed for the wrong reason; (2) a
tabbed screen's `Viewport375` story only ever exercised the default-active tab because Radix
`Tabs` unmounts inactive `TabsContent` — the non-default tab's AC had zero real coverage despite
a code comment claiming otherwise. **Node-env class-string assertions can't catch "does this
fixture/tab actually mount the element under test" — that requires the real-browser runner.**
Neither was a production bug; both were QA-owned test fixes, correctly left as QA's job rather
than escalated back to the engineer.

**Gap normalization judgment call, made explicitly in the delegation brief up front:** several
grids had `gap-3`/`gap-3.5` (12/14px) pre-existing, not the design-system's 16px stat-grid
standard. Told the engineer to normalize these to `gap-4` as part of the same diff (not scope
creep — AC-14 requires `gap-4`, and design-system.md's stat-grid spacing standard already says
16px) rather than leaving inconsistent gaps or treating it as out-of-scope. Tech-lead confirmed
this was the correct call, not a rule violation.

Full pipeline: engineer (TDD, 6 test files, 39 tests, self-found 8th file via OQ-003 grep) →
tech-lead (Approved, 0 findings) + a11y (PASS, 0 findings) in parallel → design-review gate
(fe-lead, reused both verdicts, impeccable = 0 findings for a pure layout-utility change, no
separate CLI invocation needed — consistent with prior small-CSS-diff US precedent) → QA (Go,
closed 2 test-authoring gaps, no production bugs) → harness proof (`--unit 1 --integration 1
--e2e 1 --platform 0`) → TEST_MATRIX row synced (was stale `planned`/no×4 from BA-time) → merge.
989/989 unit, tsc/build clean throughout.

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

US-E17.6 (Empty States — Notifications all/unread, UX-01/DR-010) implemented 2026-07-05 on
`feat/us-e17.6-empty-states-notifications` (merged `27ac4ce` + deleted). Solo mode, no in-flight
branches at claim time. 950/950 unit + tsc/build clean; tech-lead Approved; a11y PASS 0 findings;
QA Go, 100% AC coverage.

**A BA spec.md can be stale the moment a shared component ships mid-epic — check for a newer
canonical home before following the spec literally.** This story's spec.md (written before
US-E17.4 existed) instructed editing a *local* `EmptyState` inside `notifications-center.tsx`.
By delivery time, US-E17.4 had already extracted the canonical `components/shared/empty-state/`.
Followed `component-organization.md` (one component, one home) over the stale spec instruction:
migrated onto the shared component instead of upgrading the local one in place. Documented the
deviation explicitly in `story.md` `## Evidence` so the packet doesn't silently contradict the
shipped code (same lesson as US-E17.4's own note about syncing AC text after a fix).

**The shared component itself carried the exact same contrast bug this story was written to
fix — found it before delegating, not after.** `empty-state.tsx`'s optional `body` paragraph
used `text-muted-foreground` (→ `--edu-text-muted`, 2.95:1 FAIL), identical in kind to the icon
bug US-E17.4 had already fixed in the same file (icon uses `text-edu-text-secondary`, not the
design-spec-literal `text-edu-text-muted`). Fixing it at the shared-component level (not just in
the notifications-center call site) fixed it for every current AND future consumer in one change
— always check whether a bug named in a story's AC already exists inside a shared dependency
before treating it as call-site-local.

**Judgment call on "low-risk sibling migration": migrate call sites with generic negative/
neutral empty states, explicitly SKIP ones with a distinct positive-framing semantic the shared
component can't represent.** User asked to migrate 2 legacy inline empty-state call sites if
low-risk. Migrated `leave-history-list.tsx` (generic `Inbox` + muted text — straightforward,
also normalized icon 36px→64px per canonical size, no test pinned the old size). Deliberately
did NOT migrate `ViolationsList.tsx` (parent-discipline) — its icon is intentionally
`text-edu-success-text` (green, "no violations = good news", per inline comment
`A11Y-E09.4-005`), a positive-framing decision the shared component's hardcoded icon color
can't preserve without an API change (optional tone/`iconClassName` prop — flagged as a future
ADR candidate by tech-lead, not built now). **When "migrate onto the shared component" would
silently regress a deliberate, commented a11y/semantic decision in the file being touched, stop
and exclude it — don't force every legacy pattern through one component just because it's now
canonical.**

**Delegated the entire implementation (component fix + 2-file migration + story hardening) in
ONE `fe-nextjs-engineer` prompt with an explicit "do NOT migrate X, here's why" instruction —
worked cleanly, zero deviations reported.** Front-loading the scope boundary (what to migrate,
what to explicitly skip and why, which existing test/story conventions to follow) in the initial
delegation avoided any back-and-forth; the engineer's own report matched the plan exactly,
including correctly reusing the pre-existing `activeFilter === "unread"` condition instead of
inventing new branching logic.

**QA's AC-to-test traceability pass caught a real "state suppression" gap the engineer's
Storybook hardening had missed:** the strengthened `EmptyAll`/`EmptyUnread` stories proved the
empty-state renders correctly, but nothing asserted the empty-state copy is ABSENT during
loading/error/populated (AC-01.10–12/AC-02.8–10) — a classic "tested the happy path, not the
negative/exclusion path" gap. QA closed it itself (test-only) by adding `queryByText(...)` null
assertions to the pre-existing `Loading`/`ErrorState`/`AllLoaded` stories rather than writing new
ones — reusing existing stories for negative-space assertions is cheaper than adding new stories
whose only job is "prove X is NOT there."

**`bun build` (bare) is Bun's own bundler CLI, not the npm script — use `bun run build` (or `bun
build` only works if it happens to alias correctly, verify per-repo).** Running `bun build`
directly here errors "Missing entrypoints" because Bun intercepts it as its native bundler
subcommand rather than dispatching to `package.json`'s `"build": "next build"` script. Always use
`bun run build` for this repo's production build gate (not the drop-`run` shorthand that works
for e.g. `bun dev`/`bun lint`).

US-E17.7 (Empty States — Lesson Bank + Messaging, UX-01/DR-010) implemented 2026-07-05 on
`feat/us-e17.7-empty-states-lessonbank-messaging` (merged `54fcca0` + deleted). Solo mode.

**A BA spec.md instructing "hand-write the canonical pattern inline" is exactly the E17.4/E17.6
staleness pattern repeating — caught at intake, before delegating, not after.** The task brief
already flagged it ("shared EmptyState exists, BẮT BUỘC dùng nó"), so no discovery was needed this
time — but this is now the THIRD story in this epic where a spec pre-dating the shared component
instructs inline duplication. Wrote the deviation explicitly into the engineer's delegation brief
(exact props, exact color, why) rather than letting the spec's literal JSX guide implementation —
zero back-and-forth, engineer's report matched exactly.

**CTA touch-target AC was already satisfied for free by the shared `Button`'s `min-h-11` on both
`size="sm"` and `size="default"` — verified this BEFORE delegating** by reading `button.tsx`'s
`buttonVariants`, which let the brief explicitly forbid the engineer from adding a redundant
`min-h-[44px]` className (which the stale AC text literally asks for). Check the primitive's actual
CSS before assuming an AC's suggested mechanism is still needed post-shared-component-migration.

**QA found a real per-role AC gap invisible without an explicit AC-to-test trace: `canUpload=false`
(Principal) was never exercised by any of the 3 originally-planned lesson-bank-empty stories** —
`FilterVariant` suppresses the CTA via a *different* prop (`hasActiveFilter`), so it doesn't
substitute as proof for the `canUpload` gate. QA closed it test-only (`PrincipalNoUpload` story).
Recurring lesson: a CTA gated by multiple independent props each needs its OWN negative-space
story — "one story shows CTA, one shows no-CTA" isn't enough if different props can each
independently suppress it.

**Shared-file collision with concurrent sessions handled cleanly, twice in one run.** Unrelated
BA/uiux-lead/QA sessions had uncommitted `.claude/agent-memory/*` changes in the working tree both
before branch creation AND again before the final merge-to-main, blocking plain
`git pull --ff-only`/`git checkout -b`. Resolved both times with
`git stash push -u -m "..."` → do the git op → `git stash pop` — never touched or committed those
other sessions' files, exactly restored afterward. Same pattern as `[[project-shared-worktree-race]]`;
solo-mode git ops still need this stash-around-git-op discipline whenever other sessions are live in
the same checkout, not just literal parallel-worktree races.

Full pipeline this run: engineer (migrate, TDD red→green, 2 commits) → tech-lead (Approved, 2
non-blocking CONSIDER notes) + a11y (PASS, 0 findings) in parallel → design-review gate (fe-lead,
reused tech-lead/a11y verdicts, no separate `/impeccable` CLI invocation for a token-reuse-only
polish diff — consistent with US-E17.5/E17.6 precedent) → QA (Go, closed 1 coverage gap, 48/48 AC)
→ harness proof (`--unit 1 --integration 1 --e2e 0 --platform 0`) → TEST_MATRIX row replaced (was a
stale `planned` row from an earlier BA sync) → merge. 950/950 unit, tsc/build clean throughout.
