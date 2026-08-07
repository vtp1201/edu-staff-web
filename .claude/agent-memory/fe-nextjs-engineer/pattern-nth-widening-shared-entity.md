---
name: pattern-nth-widening-shared-entity
description: E18.52 — widening a SHARED directory entity for a new tier; verify which of two same-named-ish entities the endpoint owns, and expect the compile fallout to be the real design decision
metadata:
  type: project
---

Widening a shared cross-feature entity (`iam-directory`'s `DirectoryMember`) for a new BE
response tier.

**Why:** E18.52 un-mocked messaging `getContacts()` after IAM ADR 0129 opened a narrowed tier.
The same capability had already been widened 3× — but on the OTHER endpoint.

**How to apply:**

1. **Confirm which entity the endpoint owns before editing.** `iam-directory` has TWO:
   `DirectoryMember` ← `GET tenants/{id}/members` (LIST) and `MemberSummary`/`MemberBatchItemDto`
   ← `GET members?ids=` (BATCH). US-E18.33/35/41 widened the BATCH one; a packet saying "Nth
   widening" can still point at the wrong file. Grep the mapper, not the name.
2. **The widening itself is 10 minutes; the COMPILE FALLOUT is the story.** Making 3 fields
   optional broke exactly 3 downstream reads (`TeacherMember.email`,
   `PrincipalTeacher.email`/`.status`). The choice there is the reviewable one:
   - do NOT `?? ""` / `?? "ACTIVE"` (fabricates a value that renders as real);
   - make the downstream field optional/nullable, carry it across with the same conditional
     spread, and have the UI OMIT the caption/badge. Behavior is unchanged because those
     surfaces (`/admin/*`, `/principal/*`) are structurally staff-tier — say that in the doc
     comment so the next reader knows the branch is unreachable, not sloppy.
   - `Record<Entity["status"], Tone>` breaks when the field becomes nullable → extract
     `NonNullable<...>` into a named type.
3. **Prove the OLD tier, not just the new one.** The strongest regression test is
   "staff-tier row is byte-identical": exact `Object.keys().sort()` + full `toEqual`. Add the
   same at the consuming repo ("staff-tier response maps identically to the narrowed one").
4. **A cross-service read belongs in DI, not in the feature's repo.** `MessagingRepository`
   (social) took an injected `ContactDirectoryPort {role, list}` composed in
   `messaging.di.ts` from `SearchMembersUseCase` — same shape as
   `ClassManagementRepository.searchDirectory`. Missing port = fail closed with its own cause,
   never an empty list (an empty picker reads as "no teachers exist").
5. **A required-and-restricted query param becomes a pinned constant + a documented product
   decision.** The endpoint takes ONE `role=`, so "list several roles" = N full drains. Pin it
   (`CONTACT_PICKER_ROLE = "TEACHER"`), justify it in the DI comment AND the packet Evidence,
   and flag widening as a product ask.
6. **Label a row by the PINNED FILTER, not `roles[0]`.** A staff-tier row lists every role the
   member holds, so `roles[0]` can mislabel; the filter is the only fact true of every row —
   and it is the only one a narrowed row has at all.
7. Two 403s with different remedies ⇒ two failure types (`role-filter-required` vs
   `forbidden`), asserted with an explicit `not.toEqual` so a later refactor cannot collapse them.

See also [[pattern-tiered-response-widening]], [[pattern-unmock-anticipatory-dto]],
[[pattern-partial-gap-closure-wiring]], [[pattern-two-gaps-one-forcemock]].
