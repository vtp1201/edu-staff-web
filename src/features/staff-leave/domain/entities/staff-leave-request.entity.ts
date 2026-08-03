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
  /**
   * `null` when the staff member's role could not be resolved from the IAM
   * directory (batch lookup unavailable / id not resolvable). The badge is
   * OMITTED rather than defaulted — labelling someone "Giáo viên" or
   * "Nhân viên" on a guess is a fabrication (US-E18.36).
   */
  staffRole: StaffActorRole | null;
  /**
   * The staff member's CURRENT department name, resolved by BE at READ time —
   * NOT a snapshot of the department when the leave was submitted (a later
   * reassignment changes this on old requests too).
   *
   * `null` whenever the staff member holds no ACTIVE department-scoped
   * position assignment. This is a genuine, ONGOING business state that can
   * persist indefinitely — NOT a legacy-data gap. Its placeholder copy must
   * differ from {@link StaffLeaveRequestEntity.leaveType}'s (US-E18.36 /
   * core US-170).
   */
  department: string | null;
  /**
   * `null` ONLY for requests submitted BEFORE core US-170 added the field —
   * pre-existing rows are not backfilled. Every request submitted after that
   * migration carries a value (required at submit time), so this null is a
   * LEGACY-ONLY, diminishing-over-time state — semantically different from
   * {@link StaffLeaveRequestEntity.department}'s ongoing null.
   */
  leaveType: StaffLeaveType | null;
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
