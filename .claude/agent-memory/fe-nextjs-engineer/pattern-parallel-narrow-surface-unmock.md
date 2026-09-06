---
name: pattern-parallel-narrow-surface-unmock
description: US-E24.6 — when a packet says "remap use-case X to the real wire" but X's shipped callers cannot supply the real contract's required fields, ADD a parallel narrow surface instead of mutating X; plus the Server-Action clock hole and the STUDENT-caller id override
metadata:
  type: project
---

A packet's "remap `<UseCase>` về wire thật" is a HYPOTHESIS, not an instruction. Verify what the
existing call sites actually collect first; if they cannot produce a field the real contract
REQUIRES, mutating the use-case breaks them silently (they still compile — the missing field is on
the INPUT type, and a screen that never gathered it just stops working at runtime).

**Why:** US-E24.6's packet said to remap `SubmitLeaveRequestUseCase`. But `/student/conduct` and
`/parent/conduct` submit the legacy `{studentId, type, submittedBy}` shape and never gather a
`classId`, which core's `CreateStudentLeaveRequestRequest` requires. Repointing that factory would
have 400'd both shipped screens.

**How to apply:** add a SIBLING (`submitMyLeaveRequest` / `SubmitMyLeaveRequestInput` /
`makeSubmitLeaveRepo()`), keep the legacy method + factory untouched on the force-mocked repo, and
write the DI test that asserts BOTH halves — the new factories follow `USE_MOCK`, the legacy ones
stay mock-backed in real mode. Keep the two as DISTINCT interface methods (not one overloaded one)
so a future edit cannot silently repoint one at the other. See [[pattern-carve-out-unmock-and-canonical-dialog]]
for the 2nd-repo-factory carve-out shape this builds on.

## Two traps this story surfaced

1. **An injectable clock must not become a Server Action parameter.** A `today?: string` argument is
   a lovely test seam on a use-case and a BACK-DATING HOLE on an action: every Server Action argument
   comes from the client. Keep the seam on the use-case, drop it from the action, and freeze the
   system clock in the action's test (`vi.useFakeTimers()` + `vi.setSystemTime`) instead.
2. **Role-asymmetric ownership of a target id.** When one role may only act on ITSELF and another
   legitimately names someone else (STUDENT self-submit vs PARENT-for-linked-child), do not just
   document it — OVERRIDE it server-side: `decodeRoleClaim(token) === "student" ? decodeMemberIdClaim(token) : requested`.
   A student with no `memberId` claim is refused before the wire. Prove it with a forged-token test
   that asserts the BODY the repo received, not the return value.

## Reusable idioms

- Two failure keys for one field only when the user's next action differs (`reason-too-short` vs
  `reason-too-long`). Before minting a key, grep the union: `LEAVE_REQUEST_STUDENT_NOT_ENROLLED`
  already mapped to `student-not-enrolled`; a plan naming it `not-enrolled` would have forked the copy.
- Widening a feature's failure union breaks `tsc` at every `t(\`errors.${key}\`)` call site — that is
  the typed-messages guard working. Add the vi+en keys, do not narrow the `t()` call.
- Multi-step mutation with a partial-failure tail (create, then N uploads): return
  `{ ok: true, requestId, total, failedCount }` and give the screen a files-only retry against the
  SAME `requestId`. Never a toast alone — see [[pattern-force-mock-vs-honest-degrade]].
