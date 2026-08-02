import { mapStatusFromWire } from "@/features/attendance/infrastructure/mappers/attendance.mapper";
import type { ChildAttendanceRecord } from "../../domain/entities/child-attendance-record.entity";
import type { ChildAttendanceResponseDto } from "../dtos/child-attendance-response.dto";

/**
 * `MemberAttendanceResponse` → domain records. `classId` is intentionally
 * dropped (no UI surface needs it yet; same precedent as `attendance.mapper.ts`
 * dropping `studentCode`) and rows are sorted ascending so the list order never
 * depends on the wire order (the BE documents ascending order, but the mapper
 * does not depend on the server honouring it).
 *
 * The UPPER_SNAKE wire enum is translated through `mapStatusFromWire`
 * (US-E18.34) rather than passed through — reusing `features/attendance`'s
 * single wire↔domain table instead of duplicating it here.
 */
export function toChildAttendanceRecords(
  dto: ChildAttendanceResponseDto,
): ChildAttendanceRecord[] {
  return dto.records
    .map((r) => ({ date: r.date, status: mapStatusFromWire(r.status) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
