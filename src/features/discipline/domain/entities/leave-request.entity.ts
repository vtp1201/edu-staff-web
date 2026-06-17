export type LeaveStatus = "pending" | "approved" | "rejected";

export type LeaveType = "medical" | "personal" | "event" | "other";

export interface LeaveRequestEntity {
  id: string;
  studentId: string;
  studentName: string;
  initials: string;
  avatarTone: string;
  classId: string;
  className: string;
  submittedBy: "student" | "parent";
  submitterName: string;
  reason: string;
  /** Pre-formatted "DD/MM/YYYY" by the mapper. */
  startDate: string;
  endDate: string;
  dayCount: number;
  type: LeaveType;
  status: LeaveStatus;
  submittedAt: string;
  approvedBy: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
}
