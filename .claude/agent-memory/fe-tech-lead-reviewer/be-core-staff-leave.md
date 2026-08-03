---
name: be-core-staff-leave
description: core staff-leave contract — tenant-wide list defaults to SUBMITTED, approve/reject need composite key, US-170 nullables
metadata:
  type: reference
---

`core` `/api/v1/conduct/staff-leave-requests*` (openapi ~L5666-5910, schema ~L10353,
ERROR_CODES §"Conduct — Staff leave request"). Verified 2026-08-03 (US-E18.36 review).

- **List branches on `staffMemberId` presence.** Present = that member's rows. OMITTED =
  tenant-wide oversight (ADMIN/MANAGER/SUPER_ADMIN only, else 403 `VIOLATION_FORBIDDEN`),
  `status`-sliced, **defaults to `SUBMITTED`** when `status` is absent → an "all requests"
  screen MUST fan out over exactly `SUBMITTED|APPROVED|REJECTED`. `DRAFT` and the literal
  `pending` are 400 `VIOLATION_INVALID_STATE` (no 4th reachable state). Cursor spaces are
  per-branch (a by-id cursor is invalid tenant-wide → 400 `LEAVE_REQUEST_INVALID_INPUT`).
- **approve/reject = POST (not PUT) + MANDATORY `staffMemberId` QUERY param** alongside the
  path `id` (`StaffLeaveStaffMemberId`, `required: true`) — storage partitions on
  `(tenantId, staffMemberId)`. Reject body key is `rejectionReason` (not `reason`).
  Approve has no body. Same composite-addressing family as moderation's `ReportRef`.
- **US-170 nullables, two DIFFERENT reasons** (do not share placeholder copy):
  `leaveType` null = legacy pre-migration row, not backfilled (diminishing);
  `department` null = no ACTIVE department-scoped assignment (ongoing, indefinite).
  `department` is resolved at READ time (not a snapshot).
- Wire row is narrow: `requestId, staffMemberId, startDate, endDate, reason, state,
  selfApproved, createdAt, updatedAt` (+ nullable `approverMemberId, rejectionReason,
  leaveType, department`). NO staffName / days / initials / staffRole — all FE-derived
  (names+roles via `iam-directory` batch; role null → omit badge).
- 403 codes: submit → `LEAVE_REQUEST_FORBIDDEN`; list/approve/reject → `VIOLATION_FORBIDDEN`.
  Others: 404 `LEAVE_REQUEST_NOT_FOUND`, 409 `VIOLATION_SAME_ACTOR` (ADR 0073 distinct-actor,
  with single-admin self-approve fallback → `selfApproved: true`),
  409 `VIOLATION_INVALID_TRANSITION`, 422 `VIOLATION_REJECTION_REASON_REQUIRED`.
