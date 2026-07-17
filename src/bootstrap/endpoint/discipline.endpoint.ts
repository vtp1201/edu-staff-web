/**
 * Core service `conduct` endpoints — discipline feature (US-E09.1, remapped
 * US-E18.14). Ground-truthed against
 * `edu-api/services/core/internal/conduct/adapter/http/routes.go`. Kong strips
 * the `/core` prefix, so the client path is `/core/api/v1/conduct/...`.
 *
 * **Recorded, not consumed.** The whole discipline feature is permanently
 * mock-first (`discipline.di.ts` force-mocks regardless of `USE_MOCK`) — see
 * `docs/stories/epics/E18-be-wiring/US-E18.14-discipline-conduct-wiring/story.md`.
 * Two categorical blockers compound to make every operation unreachable:
 *   (1) no real student-roster UUID lookup on the web (roster stays mock-first,
 *       US-E18.5 / ask #9); and
 *   (2) no self-scope `classId` discovery for STUDENT or PARENT (ask #15 / #22)
 *       — every conduct list use-case requires `classId`, even the STUDENT's
 *       own-record-only branch, and `POST /student-leave-requests` requires
 *       `classId` as a mandatory body field even for self-submit.
 * These constants are kept accurate for the day this unblocks; the real
 * repository never calls them for data ops.
 *
 * Base: `/core/api/v1/conduct`
 */
export const DISCIPLINE_EP = {
  // --- student-violations ---
  // list GET /?classId= · create POST / (DRAFT, GVCN) · edit PATCH /:id
  // · POST /:id/submit · POST /:id/approve · POST /:id/reject { rejectionReason }
  violations: "/core/api/v1/conduct/student-violations",
  recordViolation: "/core/api/v1/conduct/student-violations",
  editViolation: (id: string) =>
    `/core/api/v1/conduct/student-violations/${id}`,
  submitViolation: (id: string) =>
    `/core/api/v1/conduct/student-violations/${id}/submit`,
  approveViolation: (id: string) =>
    `/core/api/v1/conduct/student-violations/${id}/approve`,
  rejectViolation: (id: string) =>
    `/core/api/v1/conduct/student-violations/${id}/reject`,
  // The web's `deleteViolation` has no real equivalent — the real model has no
  // hard delete (a DRAFT is discarded by the author; an APPROVED record is
  // immutable). Kept pointing at the record path for documentation only; never
  // called (permanent stub, force-mocked DI).
  deleteViolation: (id: string) =>
    `/core/api/v1/conduct/student-violations/${id}`,

  // --- student-conduct-grades ---
  // set POST / (create/overwrite DRAFT, GVCN) · list GET /?classId=&termId=
  // · POST /:studentMemberId/submit?classId=&termId= · .../approve · .../reject { reason }
  conduct: "/core/api/v1/conduct/student-conduct-grades",
  setConductGrade: "/core/api/v1/conduct/student-conduct-grades",
  submitConductGrade: (studentMemberId: string) =>
    `/core/api/v1/conduct/student-conduct-grades/${studentMemberId}/submit`,
  approveConductGrade: (studentMemberId: string) =>
    `/core/api/v1/conduct/student-conduct-grades/${studentMemberId}/approve`,
  rejectConductGrade: (studentMemberId: string) =>
    `/core/api/v1/conduct/student-conduct-grades/${studentMemberId}/reject`,
  // NOTE: the web's single-action `overrideConductGrade(studentId, grade, note)`
  // (PUT, principal-only, immediate) has NO real equivalent — the real model is
  // a GVCN-authored DRAFT → SUBMIT → BGH APPROVE/REJECT workflow (a different
  // actor/workflow shape entirely, not a drop-in remap). See story packet §2.
  // Kept as a documentation alias to the set path; never called.
  overrideConduct: (_studentId: string) =>
    "/core/api/v1/conduct/student-conduct-grades",

  // --- student-leave-requests ---
  // submit POST / (STUDENT self / linked PARENT → SUBMITTED, requires classId
  // as a mandatory body field) · list GET /?studentMemberId=|classId=
  // · POST /:id/approve?studentMemberId= · POST /:id/reject?studentMemberId= { rejectionReason }
  leaveRequests: "/core/api/v1/conduct/student-leave-requests",
  submitLeaveRequest: "/core/api/v1/conduct/student-leave-requests",
  approveLeave: (id: string) =>
    `/core/api/v1/conduct/student-leave-requests/${id}/approve`,
  rejectLeave: (id: string) =>
    `/core/api/v1/conduct/student-leave-requests/${id}/reject`,

  // --- Student self-service (US-E09.2) ---
  // No dedicated self-view route exists: a STUDENT reads its own records via the
  // same list endpoints above, role-scoped server-side — BUT every list
  // use-case requires `classId`, which a STUDENT has no way to discover on the
  // real API (ask #15 / #22). Aliased to the list paths for documentation; the
  // real repo never calls them (permanent stub).
  myConduct: "/core/api/v1/conduct/student-conduct-grades",
  myViolations: "/core/api/v1/conduct/student-violations",
  myLeaveRequests: "/core/api/v1/conduct/student-leave-requests",

  // --- Parent multi-child view (US-E09.4) ---
  // PERMANENTLY UNMAPPED: real BE conduct-grade listing DOES resolve a
  // parent's linked children server-side (`ParentStudentLinkReader`, US-096),
  // but the operative web blocker is unchanged — there is still no endpoint a
  // PARENT can call to discover a linked child's `classId`/`termId` to even
  // form the list request (ask #15/#22). These have no
  // `/core/api/v1/conduct/*` equivalent reachable from the web; kept as the
  // legacy documentation paths, never called by the real repo (force-mocked DI).
  parentChildren: "/core/api/v1/parent/children",
  childConductSummary: (childId: string) =>
    `/core/api/v1/discipline/children/${childId}/conduct-summary`,
  childViolations: (childId: string) =>
    `/core/api/v1/discipline/children/${childId}/violations`,
  childLeaveRequests: (childId: string) =>
    `/core/api/v1/discipline/children/${childId}/leave-requests`,
  submitChildLeaveRequest: (childId: string) =>
    `/core/api/v1/discipline/children/${childId}/leave-requests`,
} as const;
