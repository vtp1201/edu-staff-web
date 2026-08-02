---
name: pattern-partial-gap-closure-wiring
description: US-E18.31 feed — when BE closes ONE of N documented blocking gaps, re-ground-truth the WHOLE schema (invented DTOs, envelope shape, role vocabulary, nullability) before trusting "it's just a repo swap"
metadata:
  type: project
---

A BE story that closes one gap in a force-mocked feature does NOT mean the rest
of the existing FE wiring is correct. On US-E18.31 the brief said "the DTOs
ALREADY have `authorName`/`authorRole` typed, so this may be mostly a
repository-level swap". It was not.

**Why:** the mock-era DTOs (INT-190) were *invented* against a doc that predated
the published `openapi.yaml`. The real wire said `id`/`textBody`/`isPinned`/
`authorUserId`/`text`, and the feed-read `data` was a `FeedPage` OBJECT
(`{posts, pinnedPost}`, ADR 0083) rather than a bare `Post[]` — the "already
correct, kept unit-tested for the day it unblocks" repository would have
returned an empty feed on its first real call. A dead repo's tests only prove it
matches the DTO you invented, never that the DTO matches the wire.

**How to apply** when a packet says "gap #1 resolved, wire the read path":
1. Re-read the whole schema, not just the new fields. Diff EVERY DTO field
   against the yaml (names, nullability, `required` list, envelope `data` shape,
   list vs object). Budget for a DTO+mapper rewrite, not a swap.
2. **Enum vocabularies rarely match across services.** `social` copies IAM's
   `memberRoles[0]` verbatim (UPPERCASE `ADMIN|MANAGER|TEACHER|STAFF|STUDENT|
   PARENT`); the feed's badge vocabulary is `teacher|principal|student|parent`.
   There is no `PRINCIPAL` member role, and ADMIN authors every SCHOOL post. An
   unmapped value must map to `null` = "render no badge" — the old mapper's
   `default: teacher` would have labelled every admin "Giáo viên". A guessed
   badge is worse than no badge; extending the badge set is a design decision.
3. **"Additive + denormalized" almost always means NULLABLE.** Fields added by a
   BE migration with no backfill (`authorName`/`authorRole`) read back `null` on
   old rows. Widen the entity to `string | null` and put the fallback in
   presentation as i18n (`feed.unknownAuthor`) — never a placeholder string from
   the mapper (that is untranslated copy in the infra layer).
4. A "reserved but ALWAYS null" field (`avatarUrl`, OQ-165-01) should be
   *documented as never read*, not mapped optimistically. Assert it in a test
   (`expect(entity).not.toHaveProperty("authorAvatarUrl")`) so a later "helpful"
   mapping is caught.
5. Data the domain cannot represent (one presigned image vs caption-only
   `FeedAttachment[]`; a 6-emoji taxonomy vs 4 per-type counts) → map to
   empty/zero and document loudly. Do NOT lossy-remap; that is a product call.
   But content that IS representable (`linkUrl` → appended to the body text)
   should be kept, not silently dropped.

**Hybrid split mechanics** (same shape as `HybridMessagingRepository`):
`Hybrid(real, mock)` delegating per method, constructed only in the non-mock DI
branch, so the DI stays `USE_MOCK ? Mock : Hybrid` while the hybrid itself is
unconditional. Prove it with a spy-per-method fake asserting BOTH
`toHaveBeenCalled` on one side and `not.toHaveBeenCalled` on the other.

**Open risk worth flagging every time:** mock WRITES behind real READS produce a
fake-publish (the write succeeds in memory, then vanishes on refetch). Tolerable
only while the app ships `USE_MOCK=true` (pure mock repo, hybrid dormant).
Before the flag flips it needs a product decision or an honest degrade —
see [[pattern-force-mock-vs-honest-degrade]].

**Lefthook gotcha:** `vitest related` runs against the STAGED tree only, so a
"logical chunk" commit that splits an inherently coupled change set (entity +
mapper + DI + tests) fails on tests that pass in the full working tree. Commit
coupled layers together; the working tree is not corrupted by the failure.
