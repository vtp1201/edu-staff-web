---
name: us-e15.2-qa-patterns
description: Teacher schedule (reuse of TimetableGrid cellVariant="teacher") — clean PASS; how to strengthen "renders" assertions into real AC1-3/AC6 proof
metadata:
  type: project
---

US-E15.2 (teacher read-only weekly schedule, reusing US-E15.1's `TimetableGrid`
with `cellVariant="teacher"`): clean **PASS**, no defects. Engineer's own 5
Storybook stories + unit/integration tests already covered AC1/AC2/AC4/AC5/AC7
substantively (not just "renders without crashing") — best baseline seen so far
for a reuse-heavy story. Strengthened 3 gaps rather than finding real bugs:

1. **AC2 "no edit affordance" only checked button text (`/Thêm|Sửa/`), not
   icon-only affordances.** Added a `canvasElement.querySelector("svg.lucide-pencil,
   svg.lucide-square-pen, svg.lucide-edit, svg.lucide-edit-2, svg.lucide-edit-3")`
   check → `toBeNull()`. Icon-only edit buttons (no accessible name matching a
   text pattern) would have slipped past the original assertion.

2. **AC3 "visual consistency" (subjectColor/15 tint + 3px left border) had ZERO
   class-level assertion anywhere in the repo** — not even in the US-E15.1
   sibling `timetable-view.stories.tsx`. This is a repo-wide gap for this
   component pattern, not specific to this story. Added: find the rendered
   subject-name text node, `.parentElement` holds the cell's `bg-edu-*/15` +
   `border-l-edu-*` classes (the DOM shape is
   `<td><div bg/border/accent><div text>{subjectName}</div>...</div></td>` — the
   text node's *immediate* parent, not itself, carries the tint/border). Map
   fixture subject → color token via `weekly-timetable.mapper.ts`'s
   `SUBJECT_COLOR_TABLE` (e.g. `math` → `"primary"` → `bg-edu-primary/15` /
   `border-l-edu-primary` from `subject-color-tokens.ts`) to know what to assert.

3. **AC6 mobile story only asserted `table` renders, not that the actual scroll
   mechanism (`overflow-x-auto` wrapper) is present.** A table that "renders" at
   375px doesn't prove it won't visually break — assert `table.className` has
   `min-w-[920px]` AND `table.parentElement.className` has `overflow-x-auto`.

**Reusable finding: this component pattern's CSS-class-level AC (color token +
border) has no test anywhere in `timetable-view.stories.tsx` either** — worth
proposing this same class-assertion pattern be added there too if that story
ever gets touched again (currently out of scope, didn't edit that file).

**RBAC/Server Action test judgment:** a small read-only reuse screen with an
already-tested `requireRole(["teacher"])` guard at the Server Action layer (3
unit tests: guard-fail→forbidden, guard-pass→delegates, use-case-failure→mapped
errorKey) does NOT need a Playwright E2E spec — the guard pattern is identical
to sibling `teacher/*` routes and the tenant-level guard lives in a shared
layout already covered elsewhere. Confirmed this judgment against the
`GuardResult`/`evaluateAccess` code directly (`src/bootstrap/auth-guard/`)
rather than assuming.

**i18n test convention confirmed:** no story in this repo renders an `en`
locale variant via `NextIntlClientProvider` — coverage for i18n is (a) `tsc`
compile-time key existence via the typed `messages.d.ts` augmentation and (b)
manual grep for hardcoded Vietnamese diacritics outside messages/mocks. Don't
add an en-locale story as a "gap fix" unless the story's AC explicitly demands
locale-switching behavior — it'd be inconsistent with every other screen in the
codebase.

Test counts (unchanged from engineer's baseline, only assertions strengthened):
unit 3 (`GetMyTeachingScheduleUseCase`), integration 6 (mock repo + Server
Action RBAC), Storybook interaction 5/5 pass (`teacher-schedule.stories.tsx`) +
7 from sibling `timetable-view.stories.tsx` = 12 total in scoped
`vitest:storybook run src/features/timetable`. Full `bun vitest run`: 242
files/1278 pass. `tsc --noEmit` clean. `bun run build` succeeds, emits
`/teacher/schedule` route.
