import "server-only";

import type { AxiosInstance } from "axios";
import { PARENT_ATTENDANCE_EP } from "@/bootstrap/endpoint/parent-attendance.endpoint";
import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { AttendanceDateRange } from "../../domain/entities/attendance-date-range.entity";
import type { ChildAttendanceRecord } from "../../domain/entities/child-attendance-record.entity";
import type { ParentAttendanceFailure } from "../../domain/failures/parent-attendance.failure";
import type { IChildAttendanceRepository } from "../../domain/repositories/i-child-attendance.repository";
import type { ChildAttendanceResponseDto } from "../dtos/child-attendance-response.dto";
import { toChildAttendanceRecords } from "../mappers/child-attendance.mapper";

/**
 * Maps a normalised {@link ApiError} to the parent-attendance failure union.
 *
 * Codes ground-truthed against
 * `edu-api/services/core/internal/attendance/core/domain/error/errors.go` —
 * each constructor passes an i18n key that `pkg/kit/response`'s `codeFromKey`
 * upper-cases onto the wire (`attendance_forbidden` → `ATTENDANCE_FORBIDDEN`).
 * Branch on the CODE first and only fall back to the status, per
 * `.claude/rules/api-integration.md`; never on `message` (it is localized by
 * `Accept-Language`).
 */
function throwFailure(err: unknown): never {
  const code = errorCodeOf(err);
  const status = statusOf(err) ?? 0;
  let failure: ParentAttendanceFailure;
  if (code === "ATTENDANCE_FORBIDDEN") {
    // The parent is not linked to this child (`LinkReader.IsLinked` said no, or
    // fail-closed on a link-store error) — US-047's authorization branch.
    failure = { type: "forbidden" };
  } else if (code === "ATTENDANCE_INVALID_DATE_RANGE") {
    failure = { type: "invalid-date-range" };
  } else if (code === "ATTENDANCE_DATE_RANGE_TOO_LARGE") {
    failure = { type: "date-range-too-large" };
  } else if (status === 403) {
    failure = { type: "forbidden" };
  } else if (code === "NETWORK_ERROR" || status >= 500) {
    failure = { type: "network-error" };
  } else {
    // Includes the remaining 400s (`ATTENDANCE_INVALID_MEMBER_ID` /
    // `ATTENDANCE_INVALID_DATE`) — a malformed request the parent cannot fix by
    // narrowing the range, so it must NOT be dressed up as a range failure.
    failure = { type: "unknown" };
  }
  throw failure;
}

/**
 * Real implementation of `IChildAttendanceRepository` (US-E18.34) —
 * `GET /core/api/v1/members/{memberId}/attendance?startDate=&endDate=`.
 *
 * This replaces US-E20.5's `UnavailableChildAttendanceRepository`, which was
 * built on the openapi summary's claim that the endpoint is "STUDENT-self or
 * ADMIN". That prose is stale: `get_student_attendance.go`'s `authorize()` has
 * allowed a PARENT to read a LINKED child since US-047 (`LinkReader.IsLinked`,
 * fail-closed on a link-store error). Nothing about the endpoint changed —
 * only our reading of it.
 *
 * Range validation stays in `GetChildAttendanceUseCase` and runs BEFORE this
 * repository is reached, so an obviously invalid range costs no round-trip; the
 * BE enforces the identical two rules (`endDate >= startDate`, and a span of
 * `< 366` days between the endpoints — equivalent to the use-case's
 * `daysInclusive(...) <= 366`), and their codes are mapped above for the case
 * where the two ever drift.
 */
export class ChildAttendanceRepository implements IChildAttendanceRepository {
  constructor(private readonly http: AxiosInstance) {}

  async getChildAttendance(
    childId: string,
    range: AttendanceDateRange,
  ): Promise<ChildAttendanceRecord[]> {
    try {
      const dto = (await this.http.get(
        PARENT_ATTENDANCE_EP.memberAttendance(childId),
        { params: { startDate: range.startDate, endDate: range.endDate } },
      )) as unknown as ChildAttendanceResponseDto;
      return toChildAttendanceRecords(dto);
    } catch (err) {
      throwFailure(err);
    }
  }
}
