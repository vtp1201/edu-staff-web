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

**Mock WRITES behind real READS are NEVER acceptable — do not ship them and
then flag the risk.** (Cost me a Revision Required on E18.31.) The write
succeeds in memory and vanishes on the next refetch (a fresh `makeRepo()` = a
fresh store) = a fake publish. **Ground-truth the flag before calling it
dormant:** `bootstrap/lib/mock.ts` `USE_MOCK` is `false` when the env var is
UNSET, `next.config.ts` THROWS on a deploy build with `NEXT_PUBLIC_USE_MOCK=true`,
and `.env.local` here is already `false` — so the *hybrid* branch, not the mock
branch, is what production runs. Correct posture (both halves):
- repo: the hybrid holds only `real`; each mutation returns
  `{ok:false,error:{type:"forbidden"}}` with no HTTP ([[pattern-force-mock-vs-honest-degrade]]);
- UI: a `writesEnabled = USE_MOCK` boolean threaded RSC → VM (exam-bank's
  `authoringEnabled` precedent) hiding/disabling composer, reaction chips,
  comment box, and the WHOLE "…" menu (pin/report/remove all mutate), plus a
  `role="status"` notice. Prove it with a route `page.test.ts`
  (`writesEnabled === USE_MOCK` via `vi.doMock("@/bootstrap/lib/mock")` +
  `resetModules`) and one interaction story, mutation-checked by flipping the flag.
Extra bite when the screen feeds a still-force-mocked sibling feature (moderation):
real content ids + a mock `removeContent`/`report` = a fake "reported" on a
safeguarding path. Gate those CTAs too, even though the sibling is another story.

**Don't encode a role vocabulary locally.** Before writing an enum→display map,
grep for the canonical one (`ROLE_ENUM_TO_APP`/`appRoleOf` in
`features/auth/domain/entities/role-meta.ts`, used by `decodeRoleClaim`). ADMIN
and MANAGER *are* `principal`, STAFF *is* `teacher` — "the feed has no ADMIN
badge" was my invention. Cross-feature `features/auth/domain/…` imports are an
established precedent; a feature-domain `policies/<x>-role.ts` that narrows the
canonical appRole to the local union is the right home, and the route's viewer
switch must use it too or the two drift.

**Lefthook runs `tsc` on the STAGED tree, not the working tree** — a "logical
chunk" commit that stages a mapper but not the rename that the rest of the tree
already depends on fails typecheck even though the working tree is clean. Coupled
refactors = one commit.

**Lefthook gotcha:** `vitest related` runs against the STAGED tree only, so a
"logical chunk" commit that splits an inherently coupled change set (entity +
mapper + DI + tests) fails on tests that pass in the full working tree. Commit
coupled layers together; the working tree is not corrupted by the failure.
