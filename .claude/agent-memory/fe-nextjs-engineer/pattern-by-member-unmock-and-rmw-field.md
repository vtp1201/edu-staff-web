---
name: pattern-by-member-unmock-and-rmw-field
description: E18.26 — un-mocking a self-scope feature via a by-member endpoint; non-throwing secondary composed call; adding a persisted field to a read-modify-write PUT silently wipes untouched rows
metadata:
  type: project
---

US-E18.26 (timetable by-member + slot `room`). Patterns worth reusing.

**Why:** BE shipped a `GET /members/{memberId}/…` self-scope family, which is
how several "mock-first because there's no `/me` endpoint" features get
un-mocked. The traps below cost real debugging time.

**How to apply:**

- **memberId-keyed ≠ classId-keyed.** When BE adds a by-member read, the
  existing `getByX(parentId)` use-case usually can't be reused — add a NEW
  repository method (`getByMember`) rather than overloading; the old one stays
  contract-correct with zero callers. `GetChildTimetableUseCase` went from
  `getByClass(child.classId)` → `getByMember(child.childId)`: the child no
  longer needs a discoverable classId at all, so the entity's `classId` can
  become optional/display-only.
- **Adding a persisted field to a read-modify-write PUT: preserve it on the
  UNTOUCHED rows too.** The RMW re-maps the entire slot list on every
  single-cell edit. Threading `room` only into the spliced cell would have
  wiped every other cell's room on each save — a silent data-loss bug the
  packet didn't anticipate. Whenever a new wire field lands on an RMW
  full-replace body, add `field: s.field || undefined` to the `.map()` of kept
  rows AND a test asserting a kept row still carries it.
- **Secondary composed call must not throw.** Display-metadata calls (here
  `GET /members/{id}/enrollment` for `className`) belong in a private
  `tryFetchX()` that catches EVERYTHING and returns `null`. Only the primary
  call's failure propagates. Tests: one per documented degrade code + one
  generic `new Error()` + one proving the primary still propagates.
- **Fan-out → lookup map.** A by-member endpoint that returns per-slot
  `classId` kills the 1+N per-parent fan-out: keep the ONE list call purely as
  a `id → name` `Map` and issue both calls with `Promise.all`. Concurrency
  reorders `vi.fn` calls → assert the call SET (`.map(url).sort()`), not order.
- **`{ links: [...] }` is not an array and not paginated.** Always open the
  actual `openapi.yaml` schema before reaching for `fetchAllPages`/`raw:true`;
  `linked-students` wraps its items in an object with no cursor params. Write
  the negative assertion (`expect(get.mock.calls[0]).toHaveLength(1)` — no
  axios config at all) so the confirmation is executable, not prose.
  Beware: `features/parent-links` has a DIFFERENT, speculative
  `LinkedStudentResponseDto` (`fullName`/`avatarUrl`) for the same URL — it
  does NOT match the real BE.
- **Making an entity field optional + adding a required one ripples wide.**
  `name?` + `ordinal: number` broke 3 sibling use-case test doubles, a stories
  fixture and the picker in one `tsc` pass — cheap, but budget for it. Adding
  a method to the repo interface breaks every `Partial<IRepo>` test double too.
- **Don't mint a failure-union member for a defensively-unreachable code.**
  `TIMETABLE_CHILD_AMBIGUOUS` (fires only if you call the endpoint with the
  parent's own id, which the client never does) reuses `network-error`; a new
  member would ripple into exhaustive `Record<ErrorKey, …>`s in two screens +
  i18n for a state that cannot render. Put the rationale in the mapping
  function's doc comment.
- **`{links}`-style 403s differ per BE module**: linked-students returns
  `PARENTLINK_FORBIDDEN`, the sibling enrollment read returns
  `ROSTER_ACCESS_FORBIDDEN`. Grep `ERROR_CODES.md` per endpoint; a story packet
  naming one does not mean the other uses it.
- **`bun run vitest:storybook run` works and is fast enough** (151 files / 1095
  tests, ~40s). `bun vitest --project=storybook` does NOT exist.
