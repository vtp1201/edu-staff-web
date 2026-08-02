---
name: pattern-promote-with-own-ivm
description: E20.5 — promoting a component whose types live in a feature's domain (shared owns its OWN .i-vm, never a domain→components edge) + generated mock data for a current-month default range
metadata:
  type: project
---

Confirmed on US-E20.5 (`/parent/attendance`, mock-first).

**A promoted component must own its VM types — but do NOT "move" types that a
feature's `domain/` still needs.** The architecture said to relocate
`ChildSummary`/`ChildColor` from `features/grades/domain/entities/` into
`components/shared/child-switcher/child-switcher.i-vm.ts`. That would make
`IGradeBookRepository`/`GetChildListUseCase` (domain!) import
`@/components/shared/...` — a hard layer violation, worse than the smell it
fixed. **Why:** the layer table is absolute for `domain/`; a shared component
importing a feature domain type has precedent (`components/shared/
grade-book-table` imports `features/grades/domain`), the reverse has none.
**How to apply:** declare the shared component's own contract
(`XxxChild`/`XxxVM`) in its `.i-vm.ts`; leave the feature's domain type where
it is; consumers pass structurally-compatible objects (assignability makes
drift a compile error). Result: zero illegal edges, zero changes to the
feature's domain, smaller blast radius. Say so in the packet Evidence as a
deliberate deviation.

**Promotion parity proof = the moved interaction stories, re-run.** Moving the
4 existing stories verbatim (only `title` + import paths change) pins the card
wrapper, tablist ARIA, colour-mix active state, avatar map and roving tabindex
in one shot — cheaper and stronger than a hand checklist. The ONE required
edit is the namespace: `useTranslations("<feature>")` → `Common` (a shared atom
cannot own a feature namespace); delete the old key, don't leave it dead.

**Show/hide rules stay in the CONSUMER, and consumers may disagree.**
`GradeBookScreen` hides the switcher when `<2` children; the new screen shows
it for `≥1`. Encode that in the shared story's doc comment so the next reader
doesn't "fix" one of them. Same for the tablist↔tabpanel pairing
(`tabpanel-<id>` / `tab-<id>`): each consumer builds its own `panelProps`.

**A current-month default range makes hand-listed fixtures rot.** Pinning mock
records to one month renders the screen empty from the next month on. Generate
them: deterministic `weekdayIndex(date) + childOffset` into a 10-school-day
`STATUS_CYCLE` (weekends filtered) guarantees all four statuses appear in ANY
calendar month, is stable per child+range, and differs per child — all
assertable. Route the generator through the REAL DTO→mapper path so un-mocking
only swaps the data source.

**Don't trust `?childId=`.** Resolve it against the caller's OWN linked list
(`resolveActiveChildId(ids, requested)` → first child if not a member), so an
arbitrary URL id never reaches the repository even in mock mode.

**Mutation-check new play fns before claiming TDD.** 10 stories passing first
try is suspicious: flipping `showRetry` to `true` and deleting the badge icon
red-lined exactly 3 — that's the honest red.

Baselines after this story: **459 files / 3304 vitest**, **157 files / 1182
Storybook** (both fully green). The `tenant-switch-dialog` "Open Card List"
story is intermittently flaky — re-run before blaming your change.
