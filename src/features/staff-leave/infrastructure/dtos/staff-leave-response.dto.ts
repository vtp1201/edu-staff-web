import type {
  StaffActorRole,
  StaffLeaveStatus,
  StaffLeaveType,
} from "../../domain/entities/staff-leave-request.entity";

/**
 * Wire shape for a staff leave request (US-E09.3, `core` service — mock-first).
 * camelCase per the api-integration rule. Dates arrive ISO; the mapper formats
 * them to display strings. `initials` / `avatarTone` are optional (derived).
 */
export interface StaffLeaveResponseDto {
  id: string;
  staffId: string;
  staffName: string;
  initials?: string;
  avatarTone?: string;
  staffRole: StaffActorRole;
  department: string;
  leaveType: StaffLeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: StaffLeaveStatus;
  submittedAt: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
}
