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
import type { TeacherClassesResponseDto } from "../dtos/teacher-class-response.dto";
import { toTeacherDashboardFailure } from "../mappers/teacher-dashboard-failure.mapper";

export class TeacherDashboardRepository implements ITeacherDashboardRepository {
  constructor(private readonly http: AxiosInstance) {}

  /**
   * Sum enrollment counts across the teacher's classes. `studentCount` arrives
   * on the class list itself since BE US-173 (the TEACHER branch of
   * `ListClassesUseCase` runs the same `enrichClassRows` as the admin branch),
   * so we just add up the wire field — the old "drain every class's roster just
   * to count it" 1+N fan-out is gone (US-E18.30), same as
   * `teacher-class.repository.ts`'s `listMyClasses`. The class list is still
   * cursor-paginated, so the sum stays accurate beyond a single 100-item page.
   */
  async getTotalStudents(): Promise<Result<number>> {
    try {
      const classes = await this.fetchAllPages<TeacherClassesResponseDto>(
        TEACHER_EP.classes,
      );
      return {
        ok: true,
        data: classes.reduce((sum, cls) => sum + cls.studentCount, 0),
      };
    } catch (err) {
      return { ok: false, error: toTeacherDashboardFailure(err) };
    }
  }

  /** Count of the teacher's assigned classes (cursor-paginated list length). */
  async getTotalClasses(): Promise<Result<number>> {
    try {
      const classes = await this.fetchAllPages<TeacherClassesResponseDto>(
        TEACHER_EP.classes,
      );
      return { ok: true, data: classes.length };
    } catch (err) {
      return { ok: false, error: toTeacherDashboardFailure(err) };
    }
  }

  /** Drain a cursor-paginated list endpoint into a single array. */
  private async fetchAllPages<T extends unknown[]>(
    url: string,
  ): Promise<T[number][]> {
    const all: T[number][] = [];
    let cursor: string | null = null;
    do {
      const params: Record<string, unknown> = { limit: 100 };
      if (cursor) params.cursor = cursor;
      const env = (await this.http.get(url, {
        params,
        raw: true,
      })) as unknown as ApiEnvelope<T>;
      const { data: page, pagination } = parseEnvelope(env);
      all.push(...(page ?? []));
      cursor = pagination?.nextCursor ?? null;
    } while (cursor);
    return all;
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
        totalClasses: 0,
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
