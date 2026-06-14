export interface ScheduleItemVM {
  period: number;
  /** i18n session key — "morning" | "afternoon". */
  sessionKey: "morning" | "afternoon";
  subject: string;
  className: string;
  room: string;
  status: "done" | "live" | "upcoming";
}

export interface PendingGradeVM {
  studentName: string;
  initials: string;
  assessmentType: string;
  className: string;
}

export interface NotificationVM {
  /** Stable lucide icon key. */
  icon: string;
  /** CSS variable reference for the icon-box tint, e.g. "var(--edu-primary)". */
  colorVar: string;
  message: string;
  timeAgo: string;
}

export interface TeacherDashboardVM {
  /** null = total unavailable (loading/error) → render an em dash. */
  totalStudents: number | null;
  /** null = total unavailable (loading/error) → render an em dash. */
  totalClasses: number | null;
  classesToday: number;
  pendingGradesCount: number;
  pendingApprovalCount: number;
  newMessagesCount: number;
  scheduleItems: ScheduleItemVM[];
  pendingGradeItems: PendingGradeVM[];
  notifications: NotificationVM[];
  /** App-relative route to the grade-entry screen (rendered as a Link). */
  gradesPath: string;
}
