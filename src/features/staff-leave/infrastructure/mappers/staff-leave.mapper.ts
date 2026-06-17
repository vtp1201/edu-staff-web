import type { StaffLeaveRequestEntity } from "../../domain/entities/staff-leave-request.entity";
import type { StaffLeaveResponseDto } from "../dtos/staff-leave-response.dto";

/** Derive 2-letter initials from a full name (fallback for missing wire field). */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === "") return "?";
  const last = parts[parts.length - 1][0] ?? "";
  const first = parts.length > 1 ? (parts[0][0] ?? "") : "";
  return (last + first).toUpperCase() || "?";
}

export const StaffLeaveMapper = {
  toEntity(dto: StaffLeaveResponseDto): StaffLeaveRequestEntity {
    return {
      id: dto.id,
      staffId: dto.staffId,
      staffName: dto.staffName,
      initials: dto.initials ?? initialsOf(dto.staffName),
      avatarTone: dto.avatarTone ?? "var(--edu-primary)",
      staffRole: dto.staffRole,
      department: dto.department,
      leaveType: dto.leaveType,
      startDate: dto.startDate,
      endDate: dto.endDate,
      days: dto.days,
      reason: dto.reason,
      status: dto.status,
      submittedAt: dto.submittedAt,
      approvedBy: dto.approvedBy ?? null,
      approvedAt: dto.approvedAt ?? null,
      rejectedBy: dto.rejectedBy ?? null,
      rejectedAt: dto.rejectedAt ?? null,
      rejectionReason: dto.rejectionReason ?? null,
    };
  },
};
