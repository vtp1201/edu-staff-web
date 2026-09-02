import "server-only";
import type { AxiosInstance } from "axios";
import { ASSESSMENT_EP } from "@/bootstrap/endpoint/assessment-scheme.endpoint";
import { DISCIPLINE_EP } from "@/bootstrap/endpoint/discipline.endpoint";
import { TEACHER_EP } from "@/bootstrap/endpoint/teacher.endpoint";
import { type ApiEnvelope, parseEnvelope } from "@/bootstrap/lib/api-envelope";
import type {
  TeacherClass,
  TeacherClassKpi,
} from "../../domain/entities/teacher-class.entity";
import type { TeacherRosterStudent } from "../../domain/entities/teacher-roster-student.entity";
import type {
  ClassResult,
  ITeacherClassRepository,
} from "../../domain/repositories/i-teacher-class.repository";
import type { ClassRosterResponseDto } from "../dtos/class-roster-response.dto";
import type {
  LeaveRequestStateResponseDto,
  ViolationStateResponseDto,
} from "../dtos/homeroom-kpi-response.dto";
import type { SubjectNamesResponseDto } from "../dtos/subject-name-response.dto";
import type { TeacherClassesResponseDto } from "../dtos/teacher-class-response.dto";
import {
  toHomeroomKpi,
  toTeacherRosterStudent,
} from "../mappers/teacher-class.mapper";
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
      //
      // `teachingSubjectIds` (BE US-234) is id-only, so the subject catalogue is
      // drained ONCE for the whole page (never per class) — and only when some
      // row actually carries subject ids, so a pure-GVCN teacher pays nothing.
      const subjectNames = classes.some(
        (cls) => (cls.teachingSubjectIds ?? []).length > 0,
      )
        ? await this.fetchSubjectNames()
        : new Map<string, string>();

      return {
        ok: true,
        data: classes.map((cls) =>
          toTeacherClass(
            cls,
            cls.studentCount,
            this.currentUserId,
            subjectNames,
          ),
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

  /**
   * GVCN KPI slice (US-E24.7). Three INDEPENDENT sources, each degrading on its
   * own — one rejected sub-call must never break the card (AC: "ẩn ô, không
   * crash"), so this method resolves `ok: true` with a partial KPI even when
   * every source fails.
   *
   * The violations list carries EVERY workflow state (no `state` query param),
   * so "chờ xử lý" is a client-side count — but the KPI is a glanceable signal,
   * not an audit total, so only the FIRST page is read (US-E24.7 review). When
   * more pages follow, the count is flagged capped and the card shows "N+"
   * rather than draining a whole school year of records for one number.
   *
   * `attendanceRate` (draft US-245,
   * `GET /classes/{id}/attendance/summary?termId=`) is deliberately NOT called:
   * `termId` is a required query param and the web has no term source at all
   * today (no `academic-terms`/`activeTerm` read anywhere in this repo), so the
   * call could not be formed even once BE deploys it. Until a term source
   * lands, the field is mock-only — same "permanent stub until X" shape as
   * `discipline.repository.ts`.
   */
  async getHomeroomKpi(
    classId: string,
  ): Promise<ClassResult<Partial<TeacherClassKpi>>> {
    const [violations, leave] = await Promise.allSettled([
      this.fetchFirstPage<ViolationStateResponseDto[]>(
        DISCIPLINE_EP.violations,
        { classId },
      ),
      this.fetchAllPages<LeaveRequestStateResponseDto[]>(
        DISCIPLINE_EP.leaveRequests,
        { classId },
      ),
    ]);

    return {
      ok: true,
      data: toHomeroomKpi({
        ...(violations.status === "fulfilled"
          ? {
              violations: violations.value.items,
              violationsHasMore: violations.value.hasMore,
            }
          : {}),
        ...(leave.status === "fulfilled"
          ? { pendingLeaveCount: leave.value.length }
          : {}),
      }),
    };
  }

  /** One drained pass over the shared subject catalogue → `id → name`. A failed
   *  lookup yields an empty map (the mapper then shows the raw id) — a missing
   *  subject NAME must never cost the teacher the whole class list. */
  private async fetchSubjectNames(): Promise<Map<string, string>> {
    try {
      const subjects = await this.fetchAllPages<SubjectNamesResponseDto>(
        ASSESSMENT_EP.subjects,
      );
      return new Map(subjects.map((s) => [s.subjectId, s.name]));
    } catch {
      return new Map<string, string>();
    }
  }

  /** Read the FIRST page of a cursor-paginated list endpoint, reporting
   *  whether more pages follow (so a count over it can be marked capped). */
  private async fetchFirstPage<T extends unknown[]>(
    url: string,
    query: Record<string, unknown> = {},
  ): Promise<{ items: T[number][]; hasMore: boolean }> {
    const env = (await this.http.get(url, {
      params: { limit: 100, ...query },
      raw: true,
    })) as unknown as ApiEnvelope<T>;
    const { data: page, pagination } = parseEnvelope(env);
    return {
      items: page ?? [],
      hasMore: pagination?.hasMore ?? pagination?.nextCursor != null,
    };
  }

  /** Drain a cursor-paginated list endpoint into a single array. */
  private async fetchAllPages<T extends unknown[]>(
    url: string,
    query: Record<string, unknown> = {},
  ): Promise<T[number][]> {
    const all: T[number][] = [];
    let cursor: string | null = null;
    do {
      const params: Record<string, unknown> = { limit: 100, ...query };
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
