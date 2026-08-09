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

/** Batch member-id → display-name lookup (IAM directory), injected from DI. */
export type ResolveMemberNames = (
  memberIds: string[],
) => Promise<Map<string, string>>;

export class TeacherClassRepository implements ITeacherClassRepository {
  /** `currentUserId` (the token's `memberId`) drives the GVCN flag on each class. */
  constructor(
    private readonly http: AxiosInstance,
    private readonly currentUserId: string | null,
    /**
     * core's `EnrollmentResponse` carries no student display fields, so the
     * roster would render raw member ids. Decorated here with ONE batched IAM
     * `GET /members?ids=` (same composition as `admin-roster.di.ts`). Absent in
     * mock mode; a failed lookup yields an empty map, never throws.
     */
    private readonly resolveNames?: ResolveMemberNames,
  ) {}

  async listMyClasses(): Promise<ClassResult<TeacherClass[]>> {
    try {
      const classes = await this.fetchAllPages<TeacherClassesResponseDto>(
        TEACHER_EP.classes,
      );

      // `studentCount` now arrives on the class list itself (BE US-173 — the
      // TEACHER branch of `ListClassesUseCase` runs the same `enrichClassRows`
      // as the admin branch), so the old "drain every class's roster just to
      // count it" 1+N fan-out is gone (US-E18.30).
      return {
        ok: true,
        data: classes.map((cls) =>
          toTeacherClass(cls, cls.studentCount, this.currentUserId),
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
      const missing = roster
        .filter((r) => !r.displayName?.trim())
        .map((r) => r.studentMemberId);
      const names =
        this.resolveNames && missing.length > 0
          ? await this.resolveNames(missing)
          : new Map<string, string>();
      return {
        ok: true,
        data: roster.map((dto) =>
          toTeacherRosterStudent({
            ...dto,
            displayName:
              dto.displayName?.trim() || names.get(dto.studentMemberId),
          }),
        ),
      };
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
