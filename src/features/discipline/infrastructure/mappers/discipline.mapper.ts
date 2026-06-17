import type { ConductSummaryEntity } from "../../domain/entities/conduct-summary.entity";
import type { LeaveRequestEntity } from "../../domain/entities/leave-request.entity";
import type { ViolationEntity } from "../../domain/entities/violation.entity";
import type { ConductResponseDto } from "../dtos/conduct-response.dto";
import type { LeaveRequestResponseDto } from "../dtos/leave-request-response.dto";
import type { ViolationResponseDto } from "../dtos/violation-response.dto";

/** Derive 2-letter initials from a full name (fallback for missing wire field). */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === "") return "?";
  const last = parts[parts.length - 1][0] ?? "";
  const first = parts.length > 1 ? (parts[0][0] ?? "") : "";
  return (last + first).toUpperCase() || "?";
}

export const DisciplineMapper = {
  toViolation(dto: ViolationResponseDto): ViolationEntity {
    return {
      id: dto.id,
      studentId: dto.studentId,
      studentName: dto.studentName,
      initials: dto.initials ?? initialsOf(dto.studentName),
      avatarTone: dto.avatarTone ?? "primary",
      classId: dto.classId,
      className: dto.className,
      type: dto.type,
      date: dto.date,
      period: dto.period ?? null,
      description: dto.description,
      severity: dto.severity,
      handledBy: dto.handledBy,
      status: dto.status,
    };
  },

  toConductSummary(dto: ConductResponseDto): ConductSummaryEntity {
    return {
      studentId: dto.studentId,
      studentName: dto.studentName,
      initials: dto.initials ?? initialsOf(dto.studentName),
      avatarTone: dto.avatarTone ?? "primary",
      classId: dto.classId,
      className: dto.className,
      violationCount: dto.violationCount,
      unexcusedAbsences: dto.unexcusedAbsences,
      points: dto.points,
      grade: dto.grade,
      isOverridden: dto.isOverridden ?? false,
      overrideNote: dto.overrideNote ?? null,
      semester: dto.semester,
    };
  },

  toLeaveRequest(dto: LeaveRequestResponseDto): LeaveRequestEntity {
    return {
      id: dto.id,
      studentId: dto.studentId,
      studentName: dto.studentName,
      initials: dto.initials ?? initialsOf(dto.studentName),
      avatarTone: dto.avatarTone ?? "primary",
      classId: dto.classId,
      className: dto.className,
      submittedBy: dto.submittedBy,
      submitterName: dto.submitterName,
      reason: dto.reason,
      startDate: dto.startDate,
      endDate: dto.endDate,
      dayCount: dto.dayCount,
      type: dto.type,
      status: dto.status,
      submittedAt: dto.submittedAt,
      approvedBy: dto.approvedBy ?? null,
      rejectedBy: dto.rejectedBy ?? null,
      rejectionReason: dto.rejectionReason ?? null,
    };
  },
};
