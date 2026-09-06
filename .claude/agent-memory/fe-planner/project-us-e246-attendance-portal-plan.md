---
name: project-us-e246-attendance-portal-plan
description: US-E24.6 student/parent attendance portal plan — key decision to NOT touch legacy leave-request call sites, reuse of parent-attendance's member-attendance repo for student self
metadata:
  type: project
---

Plan written into `docs/stories/epics/E24-learning-class-hub/US-E24.6-student-parent-attendance-portal/US-E24.6-student-parent-attendance-portal.md` (§Plan), 2026-09-06, worktree `us-e24.6`.

Key decision (deviates from a literal reading of the packet's "remap SubmitLeaveRequestUseCase to wire
thật"): the 2 EXISTING leave-request call sites (`/student/conduct`, `/parent/conduct` — legacy
`leave-request-sheet.tsx` / `LeaveRequestForm.tsx`, legacy `SubmitLeaveRequestInput` with `type`/
`submittedBy`, no `classId`) are left completely untouched, still wired through `makeRepo()`
(force-mock). Repointing their existing factories to a real repo would break them (they never collect
`classId`, mandatory on the real wire). Instead this US ADDS a parallel narrower surface —
`SubmitMyLeaveRequestInput` (matches `CreateStudentLeaveRequestRequest` 1:1), `submitMyLeaveRequest`/
`getLeaveRequestsForAttendance`/`uploadLeaveAttachment` on `IDisciplineRepository`, and a new
`makeSubmitLeaveRepo()` DI factory mirroring E24.11's `makeLeaveRepo()` — used ONLY by the new
`/student/attendance` + extended `/parent/attendance` screens. Consolidating the 3 leave-request form
variants into the new shared `LeaveRequestDialog` stays a backlog item (already noted in the packet's
Harness Delta), not part of this US.

**Why:** minimizes blast radius on a high-risk (mutation + PII + multi-role) story — touching the shared
`IDisciplineRepository` interface is unavoidable (new methods), but NOT repointing already-wired-and-shipped
factories keeps `/student/conduct`/`/parent/conduct` behavior frozen. **How to apply:** when a US says
"remap use-case X to wire" but X is already consumed by an unrelated shipped screen with an incompatible
input shape, prefer adding a sibling method/factory over mutating the shared one — same instinct as
[[project-us-e116-lms-plan]]'s "new module, don't extend" and [[project-us-e192-moderation-plan]]'s
"extend don't fork" (the two aren't in tension: extend the REPOSITORY INTERFACE — additive — don't repoint
an existing FACTORY that other screens depend on).

Also confirmed reusable without any new repository: `IChildAttendanceRepository.getChildAttendance(memberId,
range)` (`features/parent-attendance`, US-E18.34) hits `GET /core/api/v1/members/{memberId}/attendance` —
generically "member attendance", already documented as usable by STUDENT-self per the BE docstring — the
student-attendance screen calls it directly with the self `memberId` (from `decodeMemberIdClaim`), no new
repository/DTO/mapper needed. Only additive domain change: `ChildAttendanceRecord` gets an optional
`classId` back (previously intentionally dropped by the mapper) because Q3's fallback needs it.
