import "server-only";
import type { AxiosInstance } from "axios";
import { TEACHER_EP } from "@/bootstrap/endpoint/teacher.endpoint";
import { type ApiEnvelope, parseEnvelope } from "@/bootstrap/lib/api-envelope";
import type { TeacherClass } from "../../domain/entities/teacher-class.entity";
import type { TeacherRosterStudent } from "../../domain/entities/teacher-roster-student.entity";
import type {
  ClassResult,
  ITeacherClassRepository,
} from "../../domain/repositories/i-teacher-class.repository";
import type { ClassRosterResponseDto } from "../dtos/class-roster-response.dto";
import type { TeacherClassesResponseDto } from "../dtos/teacher-class-response.dto";
import { toTeacherRosterStudent } from "../mappers/teacher-class.mapper";
import { toTeacherClassFailure } from "../mappers/teacher-class-failure.mapper";
import { toTeacherClass } from "../mappers/teacher-dashboard.mapper";

export class TeacherClassRepository implements ITeacherClassRepository {
  /** `currentUserId` (JWT `sub`) drives the GVCN flag on each class. */
  constructor(
    private readonly http: AxiosInstance,
    private readonly currentUserId: string | null,
  ) {}

  async listMyClasses(): Promise<ClassResult<TeacherClass[]>> {
    try {
      const classes = await this.fetchAllPages<TeacherClassesResponseDto>(
        TEACHER_EP.classes,
      );

      const counts = await Promise.all(
        classes.map((cls) =>
          this.fetchAllPages<ClassRosterResponseDto>(
            TEACHER_EP.classStudents(cls.classId),
          ).then((roster) => roster.length),
        ),
      );

      return {
        ok: true,
        data: classes.map((cls, i) =>
          toTeacherClass(cls, counts[i], this.currentUserId),
        ),
      };
    } catch (err) {
      return { ok: false, error: toTeacherClassFailure(err) };
    }
  }

  async getClassStudents(
    classId: string,
  ): Promise<ClassResult<TeacherRosterStudent[]>> {
    try {
      const roster = await this.fetchAllPages<ClassRosterResponseDto>(
        TEACHER_EP.classStudents(classId),
      );
      return { ok: true, data: roster.map(toTeacherRosterStudent) };
    } catch (err) {
      return { ok: false, error: toTeacherClassFailure(err) };
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
}
