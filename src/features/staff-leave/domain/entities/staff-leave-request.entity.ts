/**
 * Staff leave request entity (US-E09.3).
 * Dates are pre-formatted by the mapper (display strings) so the presentation
 * layer never parses raw wire timestamps. `avatarTone` is a CSS color string
 * (e.g. `var(--edu-primary)`) used for the avatar circle's tinted background.
 */
export type StaffLeaveStatus = "pending" | "approved" | "rejected";
export type StaffLeaveType = "annual" | "sick" | "personal" | "family";
export type StaffActorRole = "teacher" | "staff";

export interface StaffLeaveRequestEntity {
  id: string;
  staffId: string;
  staffName: string;
  initials: string;
  avatarTone: string; // CSS color string for avatar background
  staffRole: StaffActorRole;
  department: string;
  leaveType: StaffLeaveType;
  startDate: string; // "DD/MM/YYYY"
  endDate: string; // "DD/MM/YYYY"
  days: number;
  reason: string;
  status: StaffLeaveStatus;
  submittedAt: string; // "DD/MM/YYYY HH:mm"
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}
