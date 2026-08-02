import type { ChildAttendanceRecord } from "../../domain/entities/child-attendance-record.entity";
import type { ChildAttendanceResponseDto } from "../dtos/child-attendance-response.dto";

/**
 * `MemberAttendanceResponse` → domain records. `classId` is intentionally
 * dropped (no UI surface needs it yet; same precedent as `attendance.mapper.ts`
 * dropping `studentCode`) and rows are sorted ascending so the list order never
 * depends on the wire order.
 */
export function toChildAttendanceRecords(
  dto: ChildAttendanceResponseDto,
): ChildAttendanceRecord[] {
  return dto.records
    .map((r) => ({ date: r.date, status: r.status }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
