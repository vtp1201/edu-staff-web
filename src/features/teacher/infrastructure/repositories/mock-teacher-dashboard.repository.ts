import "server-only";
import type { TeacherDashboardStats } from "../../domain/entities/dashboard-stats.entity";
import type { NotificationItem } from "../../domain/entities/notification-item.entity";
import type { PendingGradeItem } from "../../domain/entities/pending-grade-item.entity";
import type { ScheduleItem } from "../../domain/entities/schedule-item.entity";
import type {
  ITeacherDashboardRepository,
  Result,
} from "../../domain/repositories/i-teacher-dashboard.repository";

/** Mock data mirrors the 1406 teacher.jsx handoff constants (not i18n — seed data). */
const TOTAL_STUDENTS = 140;

const STATS: TeacherDashboardStats = {
  totalStudents: TOTAL_STUDENTS,
  classesToday: 3,
  pendingGradesCount: 23,
  pendingApprovalCount: 4,
  newMessagesCount: 5,
};

const SCHEDULE: ScheduleItem[] = [
  {
    period: 1,
    subject: "Toán học",
    className: "10A1",
    room: "P.201",
    status: "done",
  },
  {
    period: 3,
    subject: "Toán học",
    className: "11B2",
    room: "P.203",
    status: "live",
  },
  {
    period: 7,
    subject: "Toán học",
    className: "12C1",
    room: "P.205",
    status: "upcoming",
  },
];

const PENDING_GRADES: PendingGradeItem[] = [
  {
    studentName: "Nguyễn Văn An",
    assessmentType: "KT 15 phút",
    className: "10A1",
  },
  {
    studentName: "Trần Thị Bình",
    assessmentType: "Bài tập về nhà",
    className: "11B2",
  },
  {
    studentName: "Lê Hoàng Cường",
    assessmentType: "KT miệng",
    className: "12C1",
  },
];

const NOTIFICATIONS: NotificationItem[] = [
  {
    icon: "calendar",
    color: "primary",
    message: "Họp hội đồng giáo viên lúc 15:00 hôm nay",
    timeAgo: "30 phút trước",
  },
  {
    icon: "users",
    color: "warning",
    message: "3 học sinh vắng mặt lớp 10A1",
    timeAgo: "1 giờ trước",
  },
  {
    icon: "fileText",
    color: "success",
    message: "Kế hoạch thi cuối kỳ đã được cập nhật",
    timeAgo: "2 giờ trước",
  },
];

export class MockTeacherDashboardRepository
  implements ITeacherDashboardRepository
{
  async getTotalStudents(): Promise<Result<number>> {
    return { ok: true, data: TOTAL_STUDENTS };
  }

  async getScheduleItems(): Promise<Result<ScheduleItem[]>> {
    return { ok: true, data: SCHEDULE };
  }

  async getPendingGradeItems(): Promise<Result<PendingGradeItem[]>> {
    return { ok: true, data: PENDING_GRADES };
  }

  async getDashboardStats(): Promise<Result<TeacherDashboardStats>> {
    return { ok: true, data: STATS };
  }

  async getNotifications(): Promise<Result<NotificationItem[]>> {
    return { ok: true, data: NOTIFICATIONS };
  }
}
