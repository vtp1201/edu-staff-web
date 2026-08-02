import "server-only";

import type { AttendanceDateRange } from "../../domain/entities/attendance-date-range.entity";
import type { ChildAttendanceRecord } from "../../domain/entities/child-attendance-record.entity";
import type { ParentAttendanceFailure } from "../../domain/failures/parent-attendance.failure";
import type { IChildAttendanceRepository } from "../../domain/repositories/i-child-attendance.repository";

/**
 * Real-environment implementation of `IChildAttendanceRepository` (US-E20.5):
 * it fails fast with a typed `forbidden` failure and attempts NO HTTP call.
 *
 * `GET /members/{memberId}/attendance` (`edu-api/services/core/docs/
 * openapi.yaml`, operationId `getMemberAttendance`) authorizes STUDENT (self)
 * or ADMIN/SUPER_ADMIN only — PARENT is absent from that list, so this is a
 * PERMANENT authorization gap, not a "not implemented yet" gap: `forbidden` is
 * the accurate failure type, and issuing the request would only burn a
 * round-trip to be told 403. A cross-repo ask is filed with the BE team (add
 * PARENT to the ACL, or ship a parent-scoped
 * `GET /parents/{id}/children/{childId}/attendance`).
 *
 * Why this exists instead of falling back to the mock: the mock fabricates
 * present/late/excused/absent rows for a REAL child, which a parent could act
 * on. Showing invented attendance is strictly worse than an honest
 * "not available yet" state (the screen omits the retry control for this
 * failure — `isRetryableFailure`).
 *
 * Un-mock later by replacing this class with a real HTTP repository; the DTO +
 * mapper are already contract-correct, so that diff is small.
 */
export class UnavailableChildAttendanceRepository
  implements IChildAttendanceRepository
{
  async getChildAttendance(
    _childId: string,
    _range: AttendanceDateRange,
  ): Promise<ChildAttendanceRecord[]> {
    const failure: ParentAttendanceFailure = { type: "forbidden" };
    throw failure;
  }
}
