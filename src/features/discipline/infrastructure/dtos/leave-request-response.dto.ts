import type {
  LeaveStatus,
  LeaveType,
} from "../../domain/entities/leave-request.entity";

/** Mirrors core service `LeaveRequestResponse` (camelCase wire fields). */
export interface LeaveRequestResponseDto {
  id: string;
  studentId: string;
  studentName: string;
  initials?: string;
  avatarTone?: string;
  classId: string;
  className: string;
  submittedBy: "student" | "parent";
  submitterName: string;
  reason: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  type: LeaveType;
  status: LeaveStatus;
  submittedAt: string;
  approvedBy?: string | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
}
