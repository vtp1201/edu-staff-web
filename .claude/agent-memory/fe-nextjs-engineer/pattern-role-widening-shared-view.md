---
name: pattern-role-widening-shared-view
description: US-E15.3 — adding a 3rd viewerRole to a shared screen component (parallel props not unified, named derivations, sibling picker) plus the traps hit along the way
metadata:
  type: project
---

Widening an existing role-gated screen component (`TimetableView`: student|parent → +principal).

**Why:** the old gate was a single `isParent` boolean that secretly decided FOUR things
(week-nav visibility, picker visibility, grid `cellVariant`, header copy). A 3rd role makes
that conflation a bug factory.
**How to apply:** whenever a 2-role component gains a 3rd role.

- Replace the one boolean with **named derivations** (`showWeekNav`, `showChildPicker`,
  `showTeacherPicker`, `cellVariant`) — each names exactly what it gates. Keep **parallel**
  optional props + parallel `useState` slots per role (`selectedChildId` / `selectedTeacherId`);
  unifying to `selectedMemberId` buys a rename and loses the per-source id field name.
  Existing roles then provably render identically (all new props optional & additive).
- Sibling leaf component (`teacher-picker.tsx`) over a generic `member-picker` when the two
  data shapes diverge on ≥3 axes (id field, name-fallback, avatar identity, extra status
  affordance). Decision 0026 item 3 — promote on the 3rd caller, not the 2nd.
- **Hidden trap:** a "success → `state.timetable.className`" header suffix. For a by-member
  week the top-level `className` is the MEMBER's own name, not a class → force `""` for the
  new role instead of extending the suffix (a teacher's week spans many classes).
- **Result-shape bridge:** the source feature (`principal`) uses `Result` `.value`/`.failure`,
  the target feature uses `.data`/`.error`. Bridge explicitly in the Server Action with a
  `switch`, and table-test EVERY member of the wider failure union — the two members with no
  counterpart (`conflict-exists`/`unknown`) must land on a retryable error, NOT be collapsed
  into the "nothing published" empty state.

Mechanics worth remembering:
- Server-Action unit test mocking DI factories: `vi.mock` factories referencing top-level
  consts throw "Cannot access X before initialization" → wrap the whole fixture bundle in
  `vi.hoisted(() => ({...}))`.
- Biome `// biome-ignore` must sit on the line IMMEDIATELY above the offending token, not
  above the statement — a multi-line call wrapping the `!` makes the suppression "unused"
  (2 warnings, still commits since they're warnings; fix by moving the comment inside the call).
- Real-mode build check: `env -u NEXT_PUBLIC_USE_MOCK bun run build` (unset, not `=false`).
- `bunx vitest run --config vitest.storybook.mts` runs the whole SB suite green (154/1157 at
  2026-08-02) — the "runner broken" memory is long stale.
- `requireRole(["principal"])` fails in mock mode (`decodeRoleClaim` → `"admin"`), but that is
  CONSISTENT: `(app)/principal/layout.tsx` already redirects `admin` away, so `/principal/*`
  is simply unreachable in mock mode. Not a reason to weaken the action guard.
