---
name: pattern-nullable-reasons-and-status-default-fanout
description: E18.36 un-mock lessons — two nullables with DIFFERENT null reasons need different copy; a status-sliced list that DEFAULTS to one state forces a fan-out; a key-completing route param must be threaded all the way to presentation
metadata:
  type: project
---

Learned closing US-E18.36 (staff-leave un-mock, core US-149 + US-170 + IAM US-144).

**Why:** the packet asked for "widen 2 fields to nullable + flip the DI"; the real
work was three contract facts the brief could not see.

**How to apply** when un-mocking a screen whose BE just closed its last gap:

1. **Two nullable fields ≠ one placeholder.** Read the openapi *description*, not
   just `nullable: true`. Here `leaveType: null` = legacy row not backfilled
   (diminishing) while `department: null` = no active department assignment
   (ongoing, indefinite). Different cause ⇒ different copy ("Chưa ghi nhận loại
   nghỉ" vs "Chưa có phòng ban") ⇒ prove it with `expect(a).not.toBe(b)` in the
   story, and assert each null INDEPENDENTLY in the mapper test (the other field
   stays populated) so a shared "unknown" collapse can't sneak back.
2. **A list endpoint whose `status` param DEFAULTS to one value is a trap.** The
   tenant-wide branch defaults to `SUBMITTED`; a screen that loads everything and
   filters client-side would silently show empty approved/rejected tabs. Fan out
   one paged call per state and merge; prove it by call COUNT + the params of
   each call, not by the merged output.
3. **A "redundant-looking" route param may complete the storage key.** core's
   approve/reject take a MANDATORY `staffMemberId` query param alongside the path
   id (partition key). That means the signature change ripples repo → use-case →
   Server Action → `.i-vm.ts` → screen callback. Check `components/parameters/*`
   in openapi before assuming `id` addresses a row.
4. **Fields with no wire source at all** (here `staffRole`) are derived from the
   IAM directory role and left `null` when unresolvable → OMIT the badge. Never
   default a labelled slot; `days` from an inclusive date span and a hashed
   decorative `avatarTone` are legitimate derivations, a role guess is not.
5. Force-mocked features force-mock READS and WRITES together — when the read
   blocker dies, the writes go real in the same commit (mock writes behind real
   reads = fake approve). Verify the write side wasn't separately blocked first.

Related: [[pattern-unmock-anticipatory-dto]] (the DTO here was likewise a shape only
the mock ever produced — replace it, don't widen it), [[pattern-two-gaps-one-forcemock]],
[[pattern-partial-gap-closure-wiring]].
