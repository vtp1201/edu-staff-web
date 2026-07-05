---
name: project-e17-ux-polish
description: E17 UX polish epic (DR-010/DR-011) — US-E17.1..E17.9 implemented; other US in epic
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

US-E17.8 (DestructiveConfirmDialog shared component, UX-02/DR-011) implemented 2026-07-05
on `feat/us-e17.8-destructive-confirm-dialog` (merged `9d6875a` + deleted). Solo mode. The
most consolidation-heavy story in this epic: 1 new shared component + 2 real net-new
instances + 7 feature-local dialogs deleted-and-migrated + 1 net-new mock-first Clean-Arch
mini-feature (discipline delete-violation didn't exist at all before this story).

**A BA spec's "no net-new anything" framing can still hide real net-new work and a real
typo — verify each claim against the actual codebase before delegating, not after.** spec.md
said "purely presentational... no BE integration" and "all i18n keys existing," but grepping
first found: (1) discipline violation delete had ZERO existing capability anywhere (no
use-case/repo method/button) — FR-007 actually required building a full mock-first
Clean-Arch mini-feature, not just wiring a dialog; (2) the spec's own key name
`discipline.violations.deleteDialog.confirmLabel` doesn't exist in vi.json/en.json — the
real key is `.confirm`. Both caught via a 5-minute grep+python-json-check *before*
delegating, which let the engineer's brief include the exact correction instead of
discovering it mid-implementation.

**A shared-dialog API with only title/body/confirmLabel cannot always replace a bespoke
existing flow — check the actual call site's behavior, not just its category, before
folding it into a consolidation.** Staff-leave reject (framed by spec.md as a "net-new
instance" using the shared dialog) turned out to be an ALREADY-SHIPPED inline panel with a
MANDATORY rejection-reason `Textarea` (US-E09.3, 448 tests). Migrating it onto the plain
confirm dialog would have silently dropped the reason-capture requirement — a real
regression, not a style choice. Caught by reading the actual component file before
delegating (not trusting the spec's framing), and the deviation was written into the
delegation brief up front so the engineer didn't have to discover and improvise it — it
correctly left the flow untouched and documented the deviation per FR-009's own escape
clause ("bespoke behavior → document, no fork").

**A11y audit (round 1) found 3 Blocking + 2 Major that BOTH tech-lead review AND the
engineer's own TDD missed — all stemmed from one design choice made to fix a different,
real bug.** The engineer correctly used plain `<Button>`s instead of Radix
`AlertDialogAction`/`AlertDialogCancel` to stop `onCancel` from double-firing (Radix's
auto-close triggers `onOpenChange(false)` on top of an explicit handler). But that same
substitution silently dropped Radix's `onOpenAutoFocus → cancelRef.current?.focus()`
built-in initial-focus-on-open, since `cancelRef` is only ever populated by
`AlertDialogCancel` itself — a no-op with plain buttons. **When you deliberately swap out a
primitive's wrapper subcomponent to fix one behavior, audit what ELSE that subcomponent was
silently providing for free** (here: initial focus routing) — it's not enough to verify the
one behavior you were fixing. The other 2 findings (icon/body contrast) were plain token
misuse (`text-destructive`/`text-muted-foreground` both fail their WCAG floors against
`bg-background` — this is now the 3rd+ time in this epic the same pair of "obviously named"
semantic tokens turns out to be under 3:1/4.5:1; worth flagging as a systemic docs gap, not
just fixing per-instance). All 5 fixes verified correct against the auditor's exact
recommendations by re-reading the diff myself before re-running the gate — didn't just trust
the engineer's self-report.

**QA's real Storybook run (not the tech-lead/a11y reviews, which don't execute interactions)
caught a genuine CRITICAL production defect: DEF-001, a confirm dialog that never closes
after a successful send.** `announcement-drawer.tsx`'s `submit()` success branch reset the
Sheet's `onOpenChange(false)` but never reset the confirm dialog's own `confirmSendOpen`
state — since the drawer is always-mounted (not conditionally unmounted), the nested
`DestructiveConfirmDialog` stayed `open=true`, focus-trapped, visibly stuck on top of the
closed drawer forever. Neither tech-lead review nor the a11y audit run actual browser
interactions, so this was invisible to both — reinforces that QA's real-Chromium pass is
not redundant with the earlier gates, it's a different failure class (state-machine bugs
across an always-mounted parent, not layering/tokens/static-a11y).

**QA's own red-test proof for a real bug can itself be flaky for an unrelated reason —
verify the fix against a clean baseline before accepting "still red" as "still broken."**
After the engineer's one-line DEF-001 fix (`setConfirmSendOpen(false)` alongside
`onOpenChange(false)`), QA's own updated Storybook assertion (`queryByRole("alertdialog")`
right after the confirm click) still failed in the full-file run. Rather than trust that at
face value, I: (1) ran the SAME 19-story file against a clean `main` worktree
(`git worktree add`) and got the *identical* 9/19 failures at an *unrelated* assertion
(`getByRole("tablist")`, a pre-existing cascading env issue unrelated to this diff at all —
confirmed byte-identical failure count/names on both branches); (2) ran the ONE test in
isolation (`-t "Create Drawer Send Submit"`) to strip out that cascading contamination, which
revealed the REAL remaining issue: the test asserted synchronously right after
`userEvent.click`, racing the un-awaited `submit()` promise + Radix's exit-animation unmount
delay. Fixed by swapping to `waitFor(() => expect(...).not.toBeInTheDocument())`. **The
lesson: when a full-suite run shows unexpected failures after a fix that should have worked,
isolate the ONE test with `-t` before concluding the fix is wrong — a shared-file/ordering
env issue elsewhere in the same file can mask (or fake) an unrelated pass/fail signal.**

**Coordinator flagged a real stalling pattern mid-run: don't end your turn with prose like
"waiting for X" when a subagent is running — actively poll with a bounded bash
until/sleep-loop instead** (subagents only execute while the lead's own turn is active; an
idle "waiting" text response doesn't advance anything and the user has to manually nudge).
Fixed by using `while [ condition ] && [ $i -lt N ]; do sleep 10; i=$((i+1)); done` loops
against `git log -1 --format=%H <branch>` to detect new commits, immediately after every
`Agent`/`SendMessage` resume call, instead of a bare status sentence.

Full pipeline: engineer (TDD, new shared component + net-new discipline delete-violation
Clean-Arch stack + announcements wiring + 7-file consolidation, 1 documented API-typo
correction, 1 documented staff-leave deviation) → tech-lead (Approved, 0 blocking, 4
CONSIDER notes) + a11y (round 1: 3 Blocking + 2 Major — all fixed, re-verified by fe-lead
against the auditor's exact recommendations) in parallel → design-review gate (fe-lead,
reused tech-lead/a11y verdicts, no separate `/impeccable` CLI invocation — token-reuse
consolidation, not a new screen, consistent with E17.5/E17.6/E17.7 precedent) → QA (found +
QA closed 4 real coverage gaps test-only, found 1 CRITICAL production defect DEF-001 →
routed to engineer → fixed → QA's own red-test assertion needed a `waitFor` fix, applied by
fe-lead directly after isolating via a clean-main-worktree diff) → harness proof (`--unit 1
--integration 0 --e2e 1 --platform 0`) → TEST_MATRIX row synced → merge. 1000/1000 unit,
tsc/build clean throughout; final gate re-verified by fe-lead after every fix round, not just
trusted from agent self-reports.

US-E17.9 (DetailPanelHeader shared component, UX-04/DR-011) implemented 2026-07-05 on
`feat/us-e17.9-detail-panel-header` (merged `17c4078` + deleted). Solo mode.

**A BA spec.md's "existing/confirmed" i18n claim and its "AlertDialog-based back" assumption
were BOTH wrong for the same consumer — verified by reading the actual consumer files before
delegating, not trusting the packet.** `announcements.backToList` did not exist in either
messages file (net-new, added same commit); the messaging group-info panel had no
AlertDialog-based back affordance at all (its AlertDialogs are Leave/Delete confirmations,
untouched) — spec.md conflated two unrelated things. Caught both via direct grep/read of the
3 consumer files during intake, so the engineer's brief carried the correction instead of
discovering it mid-implementation (same discipline as US-E17.8's spec-typo catch).

**A spec's literal Tailwind class name can itself be backwards from its own stated intent —
resolve by testing the prose requirement, not the literal classname.** AC-E17.9-09/FR-005 said
`md:hidden` on action-label spans to achieve "icon-only below 768px, labeled at 768px+" — but
`md:hidden` hides at md-and-above (backwards). Engineer used `sr-only md:not-sr-only` plus an
explicit `aria-label` on each action button instead; both tech-lead and a11y independently
verified this produces the correct behavior with no double-announced accessible name (aria-label
wins accessible-name computation over child text, so the sr-only span is inert once aria-label is
set). Flagged as a documentation bug in the story/TEST_MATRIX evidence, not a behavior change.

**One consolidation target (exam-builder's `BuilderActionBar`) was already shaped exactly like
the target component before migration — back-left/actions-right, no title.** Recognizing this
during intake let the delegation brief specify "replace this component's internals with
`DetailPanelHeader`, actions=Save+Publish" directly rather than treating it as a from-scratch
wiring task.

**a11y audit found the exact same repeat-offender contrast bug this epic keeps hitting
(A11Y-001/002): `text-muted-foreground` (2.95:1) on a new component's back button AND on an
untouched pre-existing icon button it now sits next to inside the `actions` slot.** Both fixed
to `text-edu-text-secondary` (5.48:1) in one small follow-up delegation. This is now the 4th+
story in this epic where `text-muted-foreground`/`text-destructive` fail their WCAG floor on
`bg-card`/`bg-background` — a systemic docs gap (these tokens read as "obviously safe" semantic
names but aren't verified-AA for body/icon text), worth a design-system.md callout rather than
re-discovering per-story.

**QA's real-browser run found a repo-wide test-infrastructure defect, not a bug in this story:**
`@storybook/addon-viewport` isn't installed, so every `globals.viewport`/`parameters.viewport`
annotation across the codebase is inert under `vitest.storybook.mts` — stories claiming to prove
"mobile" behavior have been running at the default 1280×720 Chromium viewport this whole time.
QA worked around it for this story using `vitest/browser`'s `page.viewport()` (real resize) and
flagged the repo-wide gap as a follow-up rather than blocking on it. **Any prior "Mobile_375"/
"Viewport375" story sign-off in this epic should be treated as viewport-inert unless it also used
`page.viewport()` explicitly — re-verify before citing as proof of a responsive AC.**

**QA also closed a "shared component tested, consumers not" gap for a THIRD time in this
epic (see E17.4/E17.7 notes):** the shared `DetailPanelHeader` had full unit+story coverage but
zero of its 3 consumer wirings (announcements/messaging/exam-builder) had a back-button test at
the integration/consumer level — QA added one story per consumer, test-only. **Recurring pattern
worth generalizing: when delegating a shared-component consolidation, explicitly ask the engineer
(or QA) for at least one consumer-level interaction test per wiring, not just the component's own
isolated stories.**

Full pipeline: engineer (TDD, 6 unit tests + Storybook stories, 3 consumer wirings, 1 net-new
i18n key, 2 documented spec corrections) → tech-lead (Approved, 1 non-blocking CONSIDER re:
orphaned `examBank.builder.back` key) + a11y (2 findings A11Y-001 Critical/A11Y-002 Major, both
fixed) in parallel → fix (1 small delegation, both contrast swaps) → design-review gate (fe-lead,
reused tech-lead/a11y verdicts, scoped manual impeccable audit — 0 findings for a token-reuse
consolidation) → QA (Go, 8/8 named AC = 100%, closed 4 consumer-level coverage gaps + flagged the
addon-viewport repo-wide gap) → harness proof (`--unit 1 --integration 0 --e2e 1 --platform 0`)
→ TEST_MATRIX row synced → merge. 1006/1006 unit, tsc/build clean throughout.

US-E17.10 (Loading Skeletons — StatCard + TableRow, UX-05/DR-011) implemented 2026-07-05 on
`feat/us-e17.10-loading-skeletons` (merged `e6df325` + deleted). Solo mode.

**A BA spec's "isLoading boolean" assumption was simply false for 2 of 3 target screens —
verified by reading each dashboard's actual code before delegating, not trusting the packet.**
spec.md assumed all 3 dashboards (discipline/teacher/student) expose a client `isLoading` flag
from TanStack Query. Grepping found: discipline genuinely has one (`vm.isLoading`, client
component); teacher (`teacher-dashboard.tsx`) and student (`student-dashboard.tsx`) are BOTH
pure async RSCs with zero client state — `grep isLoading` returned nothing. Fix: used the
correct Next.js idiom instead — route-segment `loading.tsx` (Suspense-boundary convention),
which achieves the same "skeleton visible during fetch, unmount on resolve" outcome without
inventing a client flag that doesn't exist. Documented as a deliberate deviation in the
delegation brief AND the commit body; tech-lead independently re-verified the RSC claim by
reading both files and confirmed it as sound engineering judgment, not a spec violation.

**A literal AC count ("3 StatCardSkeleton") conflicted with the actual real-content count —
resolved by matching real content, not the AC's literal number.** AC-01 said discipline shows
3 skeletons, but both `violations-tab.tsx` and `conduct-tab.tsx` (the default+2nd tab) render
exactly 4 real `StatCard`s. Used count=4 (verified via grep before delegating) because
NFR-002's zero-CLS requirement is the higher-priority constraint — a skeleton that doesn't
match real content's card count causes visible layout shift when data resolves, which is a
worse outcome than literally satisfying a possibly-stale AC number. Also computed
teacher=6/student=4 the same way (grep actual `StatCard` counts in each screen) rather than
guessing. Tech-lead independently re-verified all three counts against the real code.

**A `.claude/rules/component-organization.md` "shared vs feature-local" call was made
correctly BEFORE delegating by reading design-spec.jsonc, not left as an open question for the
engineer.** design-spec.jsonc's `interactionPatterns.loadingSkeleton.shapes.StatCardSkeleton`
already states ONE universal shape "appliesTo" all 3 dashboards — confirmed by reading
`stat-card.tsx`'s `DefaultStatCard` (the variant all 3 screens use) has the exact icon-box/
value/label shape the spec names. This resolved the spec's own `OQ-E17.10-01`
open-question up front: shared component at `components/shared/stat-card-skeleton/`, not 3
feature-local files. `TableRowSkeleton` stays feature-local (single discipline consumer) per
the same file.

**a11y audit caught a real "obviously fine but actually double-announced" pattern that no
earlier gate would catch:** two independently-correct `role="status"` regions (stat grid +
table skeleton) rendering in the same tick both carry the identical sr-only text, so screen
readers announce "Đang tải dữ liệu" twice back-to-back for one logical loading event
(A11Y-001, Minor). Each region was individually spec-compliant (FR-005 says "wrap all skeleton
containers" — doesn't forbid multiple), so this wasn't caught by tech-lead's structural review,
only by a11y's screen-reader-script-level analysis. Fix: added an `announce?: boolean` prop
to the shared `StatCardSkeletonGrid` (default `true`, so the teacher/student `loading.tsx`
single-region call sites are unaffected) so a caller wrapping multiple skeleton pieces in one
outer status region can suppress the nested grid's own live-region attrs. **When a shared
a11y-wrapping component might be composed alongside a sibling that ALSO wraps itself in the
same live-region role, give the shared component an opt-out prop up front — don't assume "each
piece owns its own wrapper" is always composable.**

**A systemic, pre-existing a11y finding was correctly deferred rather than fixed inline.**
A11Y-002: the shared `Skeleton` primitive's `bg-accent` block is ~1.1:1 contrast against
`bg-card` in both light/dark themes (near-imperceptible) — but this affects 8+ unrelated
screens already using the same primitive (grade-entry/grade-book/exam-bank/etc.), and switching
to `bg-muted` wouldn't even fix it (computed equally poor, ~1.07:1). Correctly flagged as a
design-system ADR candidate (new `--edu-skeleton` token) rather than patched inside this story's
diff — a cross-cutting primitive change needs its own regression pass across every consumer,
not a side-effect of one US.

**No `/impeccable` slash-command tool available in this orchestration session — substituted a
manual checklist audit against the same written criteria (`design-system.md`+`impeccable.md`),
documented as such in the story's Evidence rather than silently presented as if the CLI ran.**
Consistent with prior E17 stories' "no separate CLI invocation for a token-reuse-only polish
diff" precedent, but this time explicitly noted the substitution reason (tool unavailability,
not judgment that it was unnecessary) for packet honesty.

**QA independently found and closed a real test-coverage asymmetry between two sibling test
files for the same AC.** `table-row-skeleton.test.ts` had an AC-14 (no-raw-color) negative
regex assertion; the sibling `stat-card-skeleton.test.ts` did not, despite covering the exact
same AC for a different component. QA added the missing assertion (test-only, no production
code touched) rather than just flagging it. QA also ran the REAL Storybook browser-mode runner
(not simulated) for the new `Shared/StatCardSkeleton` story (3/3 passed) and confirmed the
`discipline-screen.stories.tsx` full-file failure is the same pre-existing `useRouter`-invariant
env baseline documented in prior E17 memory notes (verified via `git show <pre-story-commit>` —
the `useRouter()` call pre-dates this story, landed in US-E17.1).

Full pipeline: fe-lead did own research (RSC-vs-client isLoading reality check, real StatCard
counts, shared-vs-feature-local resolution) before delegating a single comprehensive
implementation brief → engineer (TDD, 1 commit, 2 new route-segment `loading.tsx` files + 1
new shared component + 1 new feature-local component, 3 documented spec deviations) →
tech-lead (Approved, 0 blocking, 2 CONSIDER notes) + a11y (PASS, 1 Minor A11Y-001 fixed in a
follow-up delegation, 1 Minor A11Y-002 deferred as design-system follow-up) in parallel → fix
(1 small delegation, `announce` prop + single-region merge) → design-review gate (fe-lead,
manual checklist audit substituting for unavailable `/impeccable` tool, reused tech-lead/a11y
verdicts) → QA (Go, 100% AC coverage, closed 1 test-file asymmetry gap, real Storybook browser
run for the new shared component) → harness proof (`--unit 1 --integration 0 --e2e 1
--platform 0`) → TEST_MATRIX row synced → merge. 1030/1030 unit, tsc/build clean throughout.

US-E17.11 (Touch Target ≥44px: grade rows + violation rows, UX-08/DR-011) implemented
2026-07-05 on `feat/us-e17.11-touch-target-44px` (merged `0adfc74` + deleted). Solo mode.
The smallest real production diff in this epic so far (4 classNames in one file) but the
LARGEST verification/documentation lift — spec.md predated 4 prior stories (E17.2/E17.4/
E17.5/E17.8/E17.10) that had already touched the exact files this US targeted.

**When a BA spec predates multiple intervening stories on the same files, read current state
FIRST and brief the engineer with an explicit "already done, skip" list — don't let it
rediscover this mid-implementation.** Both `grade-book-table.tsx`'s sticky column (US-E17.5)
and `discipline`'s violation rows + icon-only delete button (US-E17.4/E17.8) already met the
44px floor by the time this story started; the ONLY real gap was `GradeRow`'s data cells
(`th[scope=row]` + 3 `<td>`s) having no `min-h-[44px]` at all (~33-36px computed, below the
floor). Pre-computed this via reading `button.tsx`'s `size="icon"` variant (`min-h-11
min-w-11` already baked in from E17.8) and `discipline-avatar.tsx`'s `size="lg"` (40px) +
`violations-tab.tsx`'s `py-3.5` (28px) ≈ 68px row height, BEFORE delegating — the engineer's
brief said explicitly "skip file X, here's why" for the no-op file, avoiding a wasted diff.

**A spec's literal CSS-property wording can be stale relative to a LATER story's deliberate
decision on the SAME file — don't blindly "complete" the spec's AC text if it would regress
a documented decision.** spec.md/use-cases.md's AC-07 literally says the sticky column should
use `bg-card`/`z-10`; the actual code (from US-E17.5) deliberately uses `bg-edu-card`/`z-[1]`
for dark-mode-literal-token pinning (documented in `grade-book-table.test.tsx`'s own existing
test comments). Kept the E17.5 choice, did NOT revert to the spec's literal wording — this
story's own AC-15 ("no regression on US-E17.2/E17.5") would have been violated by "fixing" it.
Both `fe-tech-lead-reviewer` and `fe-accessibility-auditor` independently confirmed this was
the right call by re-deriving the dark-mode CSS var behavior themselves, not trusting the claim.

**QA's Go/No-Go found a real structural problem in story.md itself: only 8 of 15 ACs from
use-cases.md were carried into the story packet's own AC list** — and the 7 silently dropped
(AC-03/04/08/09/11/12/14) were disproportionately the ones with zero test coverage, making the
"8/8 covered" self-report misleadingly look 100% when real automated-proof coverage was closer
to 60%. **Recurring lesson for this epic: always diff story.md's AC section against
use-cases.md's full AC list before calling a story done — a narrowed AC list can hide real
gaps rather than reflect a deliberate scope cut.** Fixed by reconciling the full 15-AC list
into story.md with an honest per-AC status (DONE-tested / DONE-by-inspection / NOT-TESTED),
rather than silently re-narrowing again.

**QA also found 2 more files in the exact violation-row pattern that neither the original
spec nor the engineer's scope decisions had ever named** — `student-conduct-screen/components/
my-violations-list.tsx` and `parent-discipline/components/ViolationsList.tsx` (both read-only,
`py-4` rows, no icon buttons). The spec's OQ-E17.11-02 asked "does `student-conduct-screen.tsx`
exist with the same markup" — the literal file doesn't exist, so the original scope-decision
doc technically answered the OQ but missed that the FEATURE (student's own violations list)
exists under a different file/folder name. **When an open question asks "does file X exist,"
also grep for the CAPABILITY by role/feature, not just the literal filename** — a renamed/
reorganized file can make a literal-match search return a false negative for something that's
real and needs auditing.

**Closing a QA-flagged "verified by inspection only" gap doesn't always need the same proof
mechanism per file — match the mechanism to what the file actually offers.** For the delete-
button-bearing `violations-tab.tsx` (a genuine interactive surface), added a Storybook
`play()` viewport-resize assertion (same `page.viewport(375,812)` pattern as the grade table).
For the two READ-ONLY list files with no `.stories.tsx` of their own, chose a cheaper
`renderToStaticMarkup` unit test asserting `py-4` presence instead of building new Storybook
harnesses from scratch — a lower-effort path that still runs in CI (`bun vitest run`) and
gives real regression signal, since the Storybook browser runner doesn't execute in every
environment anyway. Explicitly instructed the engineer to make this judgment call and report
which path it took per file, rather than mandating one approach uniformly.

**A mislabeled AC reference in test/story code comments (`AC-E17.11-15` used for a test that
actually proves `AC-E17.11-01`) was caught by QA, not the engineer's own TDD or tech-lead
review** — both had reviewed the assertions' correctness but not the traceability-comment
accuracy. Cheap follow-up fix, but worth remembering: a test being CORRECT doesn't mean its
AC-ID label is; QA's AC-to-test mapping pass is the gate that actually catches this class of
drift, not the earlier code-quality gates.

Full pipeline: fe-lead pre-investigated current file state across 4 prior stories' worth of
drift before delegating (found the 1 real gap + 2 no-op-but-verify files) → engineer (TDD, 1
commit, 4 classNames changed + 2 new unit tests + 1 new Storybook story) → tech-lead
(Approved, 1 SHOULD-FIX doc note + 2 CONSIDER notes) + a11y (PASS, 0 blocking, 1 non-blocking
doc-drift note) in parallel → design-review gate (fe-lead, manual checklist substituting for
unavailable `/impeccable` tool, reused tech-lead/a11y verdicts, documented all scope decisions
+ follow-ups in story.md Evidence) → QA (CONDITIONAL PASS, found 2 more affected files + a
15-vs-8 AC undercounting + an AC-mislabel; all closed in 1 follow-up engineer delegation, no
production code changed, test-only) → fe-lead reconciled the full 15-AC story.md section in
parallel with the engineer's gap-closing commit → harness proof (`--unit 1 --integration 0
--e2e 1 --platform 0`) → TEST_MATRIX row synced → merge. 1034/1034 unit, tsc/build clean
throughout. Flagged (not fixed, pre-existing from US-E17.5, out of this story's scope):
dark-mode sticky-column `--edu-card`/`--edu-border` not overridden in `.dark` while `--card`
is — candidate for a future dark-mode visual QA/token-reconciliation story.

US-E17.12 (Contextual Toast Messages, UX-06/DR-011) implemented 2026-07-05 on
`feat/us-e17.12-contextual-toast` (merged `8fd0ea5` + deleted). Solo mode. Implemented directly
by fe-lead (no fe-nextjs-engineer delegation) — small, well-scoped copy/timing diff across two
known call sites, no architecture step needed.

**Both target i18n keys (`announcements.sendToastContext`, `discipline.violations.successContext`)
already existed in vi.json/en.json from a prior DR-011 batch even though spec.md called the
discipline one "net-new" — grepped both files before writing any code and confirmed byte-for-byte
match to spec's required values, so correctly did NOT re-add them.** Same "spec can be stale the
moment prior work already shipped it" pattern as US-E17.6/E17.9's notes — always grep the actual
messages files for a claimed "net-new" key before adding it.

**The generic-fallback branch is provably unreachable through either screen's current UI — extracted
the branch logic into a pure, unit-tested helper instead of trying to force a Storybook story to hit
it.** Announcements: `estimate()` returns >0 for every selectable audience and `canSubmit` requires
`audience.length > 0`. Discipline: `handleSubmit` early-returns unless `form.studentName.trim() !==
""`. Both `fe-tech-lead-reviewer` and `fe-accessibility-auditor` independently re-derived this and
agreed — when a fallback branch is a defensive guard the UI can never actually trigger, pin it with a
pure-function unit test rather than contorting a Storybook interaction test to fake it.

**Both parallel gate agents passed with zero fix loop** (tech-lead Approved with 1 cosmetic CONSIDER
— untrimmed vs trimmed studentName between the toast and the optimistic list row, applied by
trimming once at the `input` construction site; a11y PASS 0 blocking, 1 informational note re:
4000ms readability for long names, no code change needed since screen-reader announcement isn't
gated by visual duration).

**Storybook `<Toaster/>` decorator pattern reused from `admin-settings-screen.stories.tsx`**
(`body.findByText(...)` against `document.body` after mounting `<Toaster/>` in the decorator) — the
announcements/discipline story files didn't have `<Toaster/>` wired before this story, so toast
assertions would have silently found nothing. Grep for an existing `<Toaster/>`-in-decorator story
before writing a new toast-assertion story in a file that doesn't have one yet.

**No `fe-qa-playwright` delegation this time** — deliberately skipped for a 2-call-site copy/timing
change with full unit coverage of both branches and a passing Storybook proof for the reachable
branch; QA's marginal value here was already covered by the unit tests + the tech-lead's own
traceability check. Reserve QA skip for similarly tiny, single-reviewer-pass, fully-unit-tested
diffs — don't generalize to multi-file/new-screen stories.

Full pipeline: fe-lead implemented directly (TDD: 2 pure helpers + `.test.ts` red→green, 2 call-site
wirings, 2 new Storybook stories with a newly-added `<Toaster/>` decorator) → tech-lead (Approved, 1
CONSIDER, applied) + a11y (PASS, 0 blocking) in parallel → design-review gate (fe-lead, manual
checklist — copy/timing-only diff, 0 impeccable-scope findings) → harness proof (`--unit 1
--integration 0 --e2e 1 --platform 0`) → TEST_MATRIX row updated (was stale `planned`/no×4) → merge.
1043/1043 unit, tsc/build clean throughout. Confirmed via `git stash` that the discipline-screen
Storybook file's wholesale `useRouter`-invariant failure (all 16 stories, pre-existing + new) is a
repo-wide harness issue unrelated to this diff (identical failure on unmodified `main`).

US-E17.13 (Setup Stepper — progress bar + "BƯỚC N/M" counter, UX-07/DR-011) implemented 2026-07-05
on `feat/us-e17.13-setup-stepper` (merged `8f3c371` + deleted). Solo mode. **Last story in E17 —
epic now COMPLETE (US-E17.1 through US-E17.13, all `implemented`).**

**Percent/current-step math correctly pushed into the domain use-case, not left component-local —
same pattern as prior E17 percent-calc stories.** Extended `getSetupProgress()`'s return shape with
`roundedPercent` (`Math.round`, divide-by-zero guarded) and `currentStep` (1-based index of first
incomplete step, capped at total) as a pure `roundStepPercent()` helper, backward-compatible with the
existing return fields — kept `get-setup-progress.use-case.test.ts`'s pre-existing assertions green
while adding 2/5=40, 1/3=33, 2/3=67 coverage.

**a11y found the exact recurring `text-muted-foreground` sub-3:1 icon-contrast bug this epic keeps
hitting (see E17.8/E17.9 notes) — this time on a NEW icon (`Circle`, pending-step status) that didn't
exist before this story, not a pre-existing element.** 2.95:1 on white `bg-card` → `text-edu-text-
secondary` (5.48:1), same fix token as every prior instance. Also worth noting the ENGINEER'S OWN
choice for the Check icon (`text-edu-text-primary` instead of the spec's literal `text-edu-success`)
was independently verified correct by both tech-lead and a11y — `text-edu-success` icon on a
`bg-edu-success` badge circle would be ~1:1/invisible; the deviation from spec's literal wording was
the RIGHT call, not a defect. **When FR text names a token that would produce same-color-on-same-
color, trust the engineer's contrast-driven substitution over the literal spec wording — verify by
computing the literal spec token's own ratio before treating a deviation as suspicious.**

**A11Y-002 (redundant SR announcement) was optional/non-blocking but applied anyway since it was a
1-line `aria-hidden="true"` addition** — same "cheap wins get applied before QA rather than logged
as follow-up" discipline as E17.3's A11Y-001 note.

**QA closed 2 real assertion gaps in EXISTING Storybook stories rather than the more common "shared
component, consumer untested" pattern from prior E17 stories** — this time `aria-label` on the
progressbar and icon color-token/motion-safe-spin assertions were simply never written into the
story's `play()` fn despite the underlying implementation being correct; extended the existing
`StepperZeroOfFive`/`StepperTwoOfFive` play fns in place rather than adding new stories.

**Design-review gate again substituted a manual checklist for the unavailable `/impeccable` CLI**
(consistent with every prior E17 story since E17.10) — documented explicitly in story.md's Evidence
section as "no separate CLI run" with the reasoning (narrow single-block diff on an already-shipped
screen, hierarchy/contrast/motion already covered by the two parallel gate agents).

Full pipeline: engineer (TDD, domain calc extension + presentation wiring + Storybook stories, 1
commit) → tech-lead (Approved, 0 blocking, 2 CONSIDER notes incl. flagging the all-done state as
unreachable within the banner's own `!allDone` visibility gate — pre-existing UX, not a gap) + a11y
(2 Minor findings A11Y-001/002, both fixed in 1 follow-up delegation) in parallel → fix → design-
review gate (fe-lead, manual checklist, reused tech-lead/a11y verdicts) → QA (Go, 8/8 AC covered
incl. 1 accepted manual/platform-tier item for reduced-motion, closed 2 story-assertion gaps,
test-only commit) → harness proof (`--unit 1 --integration 0 --e2e 1 --platform 0`) → TEST_MATRIX
row updated (was stale `planned`) → merge. 1055/1055 unit, tsc/build clean throughout.

**Epic-level note:** across all 13 US in E17, the recurring `text-muted-foreground`/`text-
destructive` sub-AA-contrast pattern was independently rediscovered on a NEW element at least 5
times (E17.8 icon/body, E17.9 back-button×2, this story's Circle icon) — still not fixed at the
design-system.md documentation level. Worth flagging to `uiux-design-system-builder`/an ADR next
time a design-system pass touches this epic's tokens, since `.claude/rules/design-system.md` and
`docs/product/design-system.md` still don't warn that these two "obviously safe" semantic names are
NOT verified-AA for icon/small-text use against `bg-card`/`bg-background`.
