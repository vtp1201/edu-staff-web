import type { TeacherDashboardStats } from "../entities/dashboard-stats.entity";
import type { NotificationItem } from "../entities/notification-item.entity";
import type { PendingGradeItem } from "../entities/pending-grade-item.entity";
import type { ScheduleItem } from "../entities/schedule-item.entity";
import type { TeacherDashboardFailure } from "../failures/teacher-dashboard.failure";

/** Discriminated result — success carries data; failure carries a typed key. */
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: TeacherDashboardFailure };

export interface ITeacherDashboardRepository {
  getTotalStudents(): Promise<Result<number>>;
  getTotalClasses(): Promise<Result<number>>;
  getScheduleItems(): Promise<Result<ScheduleItem[]>>;
  getPendingGradeItems(): Promise<Result<PendingGradeItem[]>>;
  getDashboardStats(): Promise<Result<TeacherDashboardStats>>;
  getNotifications(): Promise<Result<NotificationItem[]>>;
}
