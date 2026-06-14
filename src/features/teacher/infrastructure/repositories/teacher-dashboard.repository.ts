import "server-only";
import type { AxiosInstance } from "axios";
import { TEACHER_EP } from "@/bootstrap/endpoint/teacher.endpoint";
import { type ApiEnvelope, parseEnvelope } from "@/bootstrap/lib/api-envelope";
import type { TeacherDashboardStats } from "../../domain/entities/dashboard-stats.entity";
import type { NotificationItem } from "../../domain/entities/notification-item.entity";
import type { PendingGradeItem } from "../../domain/entities/pending-grade-item.entity";
import type { ScheduleItem } from "../../domain/entities/schedule-item.entity";
import type {
  ITeacherDashboardRepository,
  Result,
} from "../../domain/repositories/i-teacher-dashboard.repository";
import type { ClassRosterResponseDto } from "../dtos/class-roster-response.dto";
import type { TeacherClassesResponseDto } from "../dtos/teacher-class-response.dto";
import { toTeacherDashboardFailure } from "../mappers/teacher-dashboard-failure.mapper";

export class TeacherDashboardRepository implements ITeacherDashboardRepository {
  constructor(private readonly http: AxiosInstance) {}

  /**
   * Sum enrollment counts across the teacher's classes. The core ClassResponse
   * carries no student-count field (TR/US-E13.4), so we fetch each class roster
   * and count. Per-class calls run in parallel.
   */
  async getTotalStudents(): Promise<Result<number>> {
    try {
      const classesEnv = (await this.http.get(TEACHER_EP.classes, {
        params: { raw: true },
      })) as unknown as ApiEnvelope<TeacherClassesResponseDto>;
      const { data: classes } = parseEnvelope(classesEnv);

      const counts = await Promise.all(
        (classes ?? []).map(async (cls) => {
          const rosterEnv = (await this.http.get(
            TEACHER_EP.classStudents(cls.classId),
            { params: { limit: 100, raw: true } },
          )) as unknown as ApiEnvelope<ClassRosterResponseDto>;
          const { data: roster } = parseEnvelope(rosterEnv);
          return (roster ?? []).length;
        }),
      );

      return { ok: true, data: counts.reduce((sum, n) => sum + n, 0) };
    } catch (err) {
      return { ok: false, error: toTeacherDashboardFailure(err) };
    }
  }

  // Schedule / pending grades / notifications have no core service yet (decision
  // 0014, mock-first). Return empty so the UI shows its empty states; swap to a
  // real call when the lms/noti endpoints land. The mock repo (USE_MOCK) serves
  // populated data for development.
  async getScheduleItems(): Promise<Result<ScheduleItem[]>> {
    return { ok: true, data: [] };
  }

  async getPendingGradeItems(): Promise<Result<PendingGradeItem[]>> {
    return { ok: true, data: [] };
  }

  async getDashboardStats(): Promise<Result<TeacherDashboardStats>> {
    return {
      ok: true,
      data: {
        totalStudents: 0,
        classesToday: 0,
        pendingGradesCount: 0,
        pendingApprovalCount: 0,
        newMessagesCount: 0,
      },
    };
  }

  async getNotifications(): Promise<Result<NotificationItem[]>> {
    return { ok: true, data: [] };
  }
}
