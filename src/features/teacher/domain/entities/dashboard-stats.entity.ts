/** Aggregate counters shown in the teacher dashboard stat grid. */
export interface TeacherDashboardStats {
  totalStudents: number;
  totalClasses: number;
  classesToday: number;
  pendingGradesCount: number;
  pendingApprovalCount: number;
  newMessagesCount: number;
}
