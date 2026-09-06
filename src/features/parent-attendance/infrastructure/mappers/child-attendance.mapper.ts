import { mapStatusFromWire } from "@/features/attendance/infrastructure/mappers/attendance.mapper";
import type { ChildAttendanceRecord } from "../../domain/entities/child-attendance-record.entity";
import type { ChildAttendanceResponseDto } from "../dtos/child-attendance-response.dto";

/**
 * `MemberAttendanceResponse` → domain records. Rows are sorted ascending so the
 * list order never depends on the wire order (the BE documents ascending order,
 * but the mapper does not depend on the server honouring it).
 *
 * `classId` passes through as of US-E24.6 (it was dropped by US-E20.5) — the
 * parent's leave-request dialog needs the child's class and has no other way to
 * learn it. A row without one is left ABSENT, never defaulted to `""`.
 *
 * The UPPER_SNAKE wire enum is translated through `mapStatusFromWire`
 * (US-E18.34) rather than passed through — reusing `features/attendance`'s
 * single wire↔domain table instead of duplicating it here.
 */
export function toChildAttendanceRecords(
  dto: ChildAttendanceResponseDto,
): ChildAttendanceRecord[] {
  return dto.records
    .map((r) => ({
      date: r.date,
      status: mapStatusFromWire(r.status),
      ...(r.classId ? { classId: r.classId } : {}),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
