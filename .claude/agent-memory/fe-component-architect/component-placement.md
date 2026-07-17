---
name: component-placement
description: Canonical component placement decisions and promotion triggers established in US-E13.1
metadata:
  type: project
---

## Component placement patterns

**GenderBadge:** Originally feature-local in
`features/admin-roster/presentation/student-roster-screen/components/gender-badge.tsx`.
Promoted to `components/shared/gender-badge/` in US-E13.1 because TeacherRosterTable
is the second consumer. Promoted API: `femaleLabel: string` + `maleLabel: string` props
(removes hardcoded `useTranslations("adminRoster")`). Both callers inject translated strings.

**RosterPagination pattern:** Admin `RosterPagination` is tightly coupled to `adminRoster`
i18n namespace. Teacher screen uses a private `TeacherRosterPagination` sub-function
in the same file. Promote to `components/shared/` only when a third screen needs it OR
when admin is refactored.

**Admin RosterBreadcrumb vs TeacherRosterBreadcrumb:** NOT shared. Admin breadcrumb is
a dropdown class-switcher (DropdownMenu). Teacher breadcrumb is a static trail (nav>ol>li).
Different patterns — each stays feature-local.

**Disabled action buttons with Tooltip:** Use `<button disabled aria-disabled="true">`
wrapped in `<Tooltip>`. Radix Tooltip wires `aria-describedby` automatically. No custom
aria wiring needed.

**ClassCard stays feature-local** at `features/teacher/presentation/teacher-classes/components/`.
Promote to `components/shared/` only when a second screen (e.g., principal class list)
needs the same card pattern.

**OtpInput (US-E22.1):** promoted `features/auth/presentation/forgot-password/otp-input.tsx`
→ `components/shared/otp-input/otp-input.tsx` on 2nd call site (`EmailVerifyDialog`).
Composed-but-primitive-ish shared component → plain co-located `OtpInputProps` interface
in the `.tsx` file, NOT a separate `.i-vm.ts` (that's reserved for screen/container
server↔client contracts; `OtpInput` is a controlled, non-container component — same
class as `StatusBadge`, which also inlines `StatusBadgeProps` with no `.i-vm.ts`).
Pattern for promoting a controlled input-like shared component: add optional
`digitAriaLabel`/`groupAriaLabel`-style i18n-injection props + `error`/`disabled` state
props, keep the original caller's behavior unchanged by leaving new props optional/undefined
at that call site (behavior-preserving move).

**StatusBadge tone vs literal design-spec color:** when a design-spec entry gives a literal
hex/token color (e.g. `var(--edu-teal)`) for a semantically "success"-like badge, check
`StatusTone` for a closer-hued existing tone (e.g. `"teal"`) before defaulting to
`"success"` — the union already has `primary/success/warning/error/info/purple/teal/muted`;
picking the closest literal-color tone over the semantically-obvious one is a one-word
implementation detail worth flagging to the reviewer, not a new component/token.

**EduSkeleton/EduError/EduEmpty (US-E03.1) — do NOT assume these are real shared
components.** They exist ONLY as demo primitives in `design_src/edu/states.jsx`
(mockup-only); nothing under that name was ever ported to `components/shared/`.
Real shared skeleton inventory in `src/`: `components/ui/skeleton/` (base
primitive) + `components/shared/stat-card-skeleton/` (`StatCardSkeletonGrid`,
cards-shaped only — exact canonical fit for any "4 StatCards loading" region,
reuse directly). No shared chart-shaped or generic scoped-error/empty
component exists — every screen (`discipline-screen`, `audit-log-screen`,
`notifications-center`, `teacher-classes-screen`, `academic-record-screen`,
`staff-leave-screen`, ~20+ total) hand-rolls its own feature-local
`ErrorState`/`EmptyState`/`TableRowSkeleton` from the base primitives. This is
an established (if debt-accumulating) precedent — `US-E12.12`'s architect
pass already found and accepted the same gap. Follow it: build new
region-state chrome feature-local, cite the precedent, and flag promotion to
`fe-lead` as a future consolidation story rather than doing it unilaterally.

**Segmented/pill-style radiogroup or tab-like toggle (US-E03.1):** when
design-spec wants a filled-pill active state (not the default shadcn circle
radio or default tab underline), the correct move is a `variant` prop
addition on the EXISTING primitive (`components/ui/radio-group/`,
`components/ui/tabs/`), keyed off Radix's built-in `data-state="checked"`/
`data-state="active"` attribute — no new ARIA, no new component. Mirrors the
LMS lesson-player precedent (`variant` prop on `Tabs` for visually-distinct
tab groups).

**LoadMoreButton (US-E19.1):** `moderation-screen/components/load-more-button.tsx`
(`hasMore`/`isLoadingMore`/`onLoadMore`/`hasError?`) is a promotion candidate the
MOMENT a 2nd screen needs identical cursor-pagination UI (feed's AC-1908.1-.5 maps
1:1) — flagged it as "promote now, don't wait for a 3rd" since it's already fully
generic/presentational with zero feature logic. `ReportErrorBanner`-shaped inline
error state (role=alert + icon + title + message + optional retry, pre-translated
strings) has now recurred 3-4x (`RegionErrorState`, `ReportErrorBanner`, feed) —
flagged as promotion-worthy but did NOT promote unilaterally (bigger reconcile
lift than LoadMoreButton since existing copies differ slightly in i18n-binding
style) — that's a fast-follow flag to `fe-lead`, not a same-story fix.

**FeedMenu compound-slot pattern (US-E19.1):** one menu component serving both a
post-level (up to 3 items: pin/remove/report) and comment-level (report-only)
call site via OPTIONAL named slot props (`pin?: {pinned,label,onToggle}`,
`remove?: {label,onRemove}`), never two menu components. Built on
`DropdownMenuTrigger asChild` wrapping a real `<Button>` (exact `ExamCard`
precedent, `features/exam-bank/presentation/exam-bank-screen/exam-card.tsx`) —
gives native Radix trigger-ref focus-restore for free, no custom hook needed.

**Leaf container exception to "one container owns all queries" (US-E19.1):**
established precedent (`moderation-screen.tsx`) centralizes ALL TanStack Query
hooks in the single screen container, even a lazily-enabled tab query. Broke
that pattern deliberately for `FeedComments` (expand-on-demand comment thread
per post) because N independently mounted/unmounted instances (one per
expanded post) is a different shape than one always-mounted tab — hoisting
would need hooks-in-a-loop or manual `useQueries` array-tracking for zero
Clean-Architecture benefit. Rule of thumb: centralize query ownership in the
screen container UNLESS the sub-tree is itself an N-cardinality,
independently-mounted list item (then let that leaf own its own query/mutation
via Server-Action-ref props — still legal presentation-layer TanStack Query
usage, same as any container).

**use-dialog-return-focus.ts gap (US-E19.2's shared dialogs, found during
US-E19.1 architecture pass):** neither `ReportContentDialog` nor
`DestructiveConfirmDialog` uses `src/shared/use-dialog-return-focus.ts`, and
both are invoked with NO mounted `<DialogTrigger>`/`<AlertDialogTrigger>` (bare
`open`/`onOpenChange`) — exactly the hook's documented failure mode (focus falls
to `<body>` on close instead of returning to the invoking button). Confirmed by
reading both `.tsx` sources directly, not assumed. Flag to `fe-lead` as a
fast-follow ON those two shared components — do not patch them from inside a
consumer story's scope.

**PublishConfirmDialog / TagChipsInput — PROMOTED (US-E11.9, question-bank, 2026-07-17):**
both moved `lesson-plan`'s feature-local versions to `components/shared/publish-confirm-dialog/`
and `components/shared/tag-chips-input/` (folder + `index.ts` + `.stories.tsx` each), updated
`lesson-plan`'s 2 importers (`lesson-plan-builder-screen.tsx`, `plan-meta-panel.tsx`).
`TagChipsInput` was generalized: `maxTags`/`maxTagLength` became caller-supplied props instead
of reading `lesson-plan`'s entity-file constants (zero feature-domain import in the shared
version now). Found during this pass: `exam-bank` (US-E11.3) actually reuses
`DestructiveConfirmDialog` (red/destructive tone) for ITS publish flow — a pre-existing
inconsistency, out of scope to fix, but confirms `lesson-plan`'s non-destructive dialog (not
exam-bank's) is the correct precedent to promote/reuse for any future publish-confirm need.
**Tooling gap hit during this promotion**: `fe-component-architect` has no shell/Bash/file-delete
tool in its toolset (Read/Write/Edit/Glob/Grep/SendMessage only) — could not physically `git rm`
the 2 old feature-local files or run `bun vitest run` to prove zero regression. Stopgap used:
overwrote the old files with a `// MOVED, see <shared path>` comment + `export {}` (compiles
clean, zero remaining importers per grep) and flagged in the handoff message that `fe-lead`/
`fe-nextjs-engineer` must `git rm` those 2 files and run the lesson-plan regression suite before
merge. **Lesson for next promotion**: if doing this again from this role, expect the same
tool gap — do the grep-verified import-rewiring + stub-out, then explicitly hand off the
literal `git rm` + test-run step rather than silently assuming it happened.

**OwnerToggle → QBScopeToggle (flagged, not executed, US-E11.9):** `lesson-plan`'s
`owner-toggle.tsx` has its own doc-comment: "Feature-local for now — anticipated 2nd consumer is
question-bank (promote on that story, decision 0026)." Confirms the "mockup/code-comment names
the anticipated consumer" pattern below. Did NOT promote it in this pass — plan.md only
authorized 2 promotions (tag-chips-input, publish-confirm-dialog); a 3rd unscoped move risked
compounding regression surface on `lesson-plan` beyond what was reviewed for this story. Flagged
to `fe-lead`/`fe-nextjs-engineer` as a legitimate 3rd promotion candidate for whoever implements
`QBScopeToggle`. Same-pass second flag: `lesson-plan-error-state.tsx` (generic role=alert+icon+
title+message+retry) is about to get a structurally identical 2nd instance in question-bank's
list error state — also flagged, also not executed (bigger reconcile risk, same "flag don't
force" call).

**PublishConfirmDialog (US-E11.8, lesson-plan) — historical note, now resolved above:** exam-bank
(US-E11.3) already had its own feature-local non-destructive `publish-confirm-dialog.tsx`
(AlertDialog, check icon, success/primary tone — distinct from `DestructiveConfirmDialog` which
is red/AlertTriangle and semantically wrong for a positive one-way action). Lesson-plan needed an
identical shape plus `isLoading`/`aria-busy` (exam-bank's version lacked it). Two near-identical
feature-local copies = the textbook decision-0026 promotion trigger. Lesson: **when a design
mockup's own code comment says "reused shape for X + Y"** (e.g. lesson-plan.jsx's
`LPTagChipsInput` comment), take that as a strong 2nd-consumer signal even before the 2nd screen
is actually built — still stay feature-local per the conservative rule
(component-organization.md), but flag the promotion explicitly with the anticipated consumer
named, so the next story's architect doesn't have to rediscover the connection.

**EmptyState covers "N distinct empty states" without N components:** US-E11.8's list screen
had 4 distinct empty/prompt states (mine-no-filters, mine-filtered, browse-no-subject-prompt,
browse-empty-for-subject) per spec. Resist the urge to build a feature-local
"LessonPlanEmpty"/"FooEmpty" wrapper (that's what pre-`EmptyState` features like exam-bank did,
`ExamBankEmpty`) — if `components/shared/empty-state/` already exists, route all N variants
through it via a pure prop-deriving function in the container, and only flag the *older*
feature-local Empty components (exam-bank's, lesson-bank's) as backfill candidates rather than
duplicating their pre-EmptyState pattern in new work.

**StatusBadge composes an icon inside it via `children`, no separate "chip" component:** when a
design mockup names a bespoke status-chip component (e.g. `LPStatusChip`) that is icon+text+
tone-matched to the existing `StatusBadge` tone set, don't build it — it's just
`<StatusBadge tone="..."><Icon aria-hidden />{label}</StatusBadge>`. Same reasoning applies to
mockup-named dropdown components (`LPDropdown`) that map 1:1 onto the existing `Select` Radix
primitive — the mockup hand-rolls these only because it has no component library, not because
the real app needs a new component.

## Promotion trigger rule (component-organization.md)
- Same pattern used by 2 screens = promote to `components/shared/`.
- Promote = MOVE (not copy). Update all import paths.
- Feature-local composed = `features/<x>/presentation/<screen>/components/`.
- Always grep `components/ui`, `components/shared`, `features/*/presentation` before
  proposing a new component.
