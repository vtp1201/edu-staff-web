---
name: pattern-dead-code-triage-after-unmock
description: After deleting a mock repository, zero-reference exports are NOT uniformly deletable — fixtures go, mapper/DTO contract surface stays with a retention comment
metadata:
  type: feedback
---

Deleting a `*.mock.repository.ts` orphans several exports at once. `fe-tech-lead-reviewer`
(US-E24.18) triages them into two classes, and expects BOTH handled in the same commit:

- **Mock-only seed data** (`MOCK_*` fixtures in `*.fixtures.ts`) → **delete**, plus any
  `import type` that becomes unused as a result (tsc won't fail on it, Biome may not either —
  check by hand).
- **Contract surface adjacent to a kept domain entity** (`to<X>` mapper fn, `<X>ResponseDto`)
  whose only remaining caller is its own mapper test → **keep, and add a one-line comment**
  saying it is retained for the anticipated path, not a leftover. Reviewer explicitly asked
  for the comment rather than the deletion.

**Why:** a zero-grep-hit export reads identically whether it is rot or deliberate. Without the
comment the next cleanup pass deletes real contract surface the BE already publishes; with it,
the intent survives. The split line is "does a kept domain entity still describe this shape".

**How to apply:** when a review flags "orphaned export", ask which class each one is before
mass-deleting. If the packet told you not to touch the entity, don't delete its mapper/DTO.

Related: [[pattern-partial-unmock-return-type-blocker]], [[pattern-unmock-anticipatory-dto]].

Side note from the same review: inserting a new Storybook export directly under an existing
free-floating `/** … */` block silently steals that doc from the export below it. When adding
a story mid-file, check the comment immediately above the insertion point.
