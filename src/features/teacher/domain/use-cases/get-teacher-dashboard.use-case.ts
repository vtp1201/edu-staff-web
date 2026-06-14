import type { TeacherDashboardStats } from "../entities/dashboard-stats.entity";
import type { NotificationItem } from "../entities/notification-item.entity";
import type { PendingGradeItem } from "../entities/pending-grade-item.entity";
import type { ScheduleItem } from "../entities/schedule-item.entity";
import type { TeacherDashboardFailure } from "../failures/teacher-dashboard.failure";
import type {
  ITeacherDashboardRepository,
  Result,
} from "../repositories/i-teacher-dashboard.repository";

/** Composed dashboard payload. `stats.totalStudents` is replaced by the
 *  authoritative `getTotalStudents()` source (summed per-class enrollments). */
export interface TeacherDashboardData {
  stats: TeacherDashboardStats;
  scheduleItems: ScheduleItem[];
  pendingGradeItems: PendingGradeItem[];
  notifications: NotificationItem[];
}

export class GetTeacherDashboardUseCase {
  constructor(private readonly repo: ITeacherDashboardRepository) {}

  async execute(): Promise<Result<TeacherDashboardData>> {
    const [totalStudents, schedule, pendingGrades, stats, notifications] =
      await Promise.all([
        this.repo.getTotalStudents(),
        this.repo.getScheduleItems(),
        this.repo.getPendingGradeItems(),
        this.repo.getDashboardStats(),
        this.repo.getNotifications(),
      ]);

    const firstFailure = firstError([
      totalStudents,
      schedule,
      pendingGrades,
      stats,
      notifications,
    ]);
    if (firstFailure) return { ok: false, error: firstFailure };

    // All ok past the guard above — narrow with non-null assertions guarded by it.
    if (
      !totalStudents.ok ||
      !schedule.ok ||
      !pendingGrades.ok ||
      !stats.ok ||
      !notifications.ok
    ) {
      return { ok: false, error: { type: "unknown" } };
    }

    return {
      ok: true,
      data: {
        stats: { ...stats.data, totalStudents: totalStudents.data },
        scheduleItems: schedule.data,
        pendingGradeItems: pendingGrades.data,
        notifications: notifications.data,
      },
    };
  }
}

function firstError(
  results: Array<Result<unknown>>,
): TeacherDashboardFailure | undefined {
  for (const r of results) {
    if (!r.ok) return r.error;
  }
  return undefined;
}
