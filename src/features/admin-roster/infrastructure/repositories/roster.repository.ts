import "server-only";
import type { AxiosInstance } from "axios";
import {
  classStudentsPath,
  ROSTER_EP,
  unenrollPath,
} from "@/bootstrap/endpoint/admin-roster.endpoint";
import { CLASS_EP } from "@/bootstrap/endpoint/class.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  parseEnvelope,
} from "@/bootstrap/lib/api-envelope";
// Reuse class-management's `HomeroomAssignmentResponse` DTO — the homeroom
// resource (`GET /classes/{id}/homeroom-teacher`) is identical to US-E18.4.
import type { HomeroomAssignmentResponseDto } from "@/features/admin/class-management/infrastructure/dtos/homeroom-assignment-response.dto";
import type { ClassSummary } from "../../domain/entities/class-summary.entity";
import type { RosterStudent } from "../../domain/entities/roster-student.entity";
import type { SearchStudent } from "../../domain/entities/search-student.entity";
import type {
  IRosterRepository,
  Result,
  VoidResult,
} from "../../domain/repositories/i-roster.repository";
import type { ClassesResponseDto } from "../dtos/classes-response.dto";
import { toClassSummary } from "../mappers/roster.mapper";
import { toRosterFailure } from "../mappers/roster-failure.mapper";

export class RosterRepository implements IRosterRepository {
  constructor(private readonly http: AxiosInstance) {}

  /**
   * Wire `ClassResponse` has no homeroom field (US-E18.5) — fan out one
   * `GET .../homeroom-teacher` per class. `404 CLASS_ASSIGNMENT_NOT_FOUND`
   * means "no homeroom", not an error → `null`. The wire carries only
   * `teacherMemberId` (raw uuid) with no display name — IAM has no public
   * member-lookup endpoint (cross-repo ask #6/#7), so we fall back to the raw
   * id, the same tolerable single-field degradation as US-E18.4.
   */
  private async fetchHomeroomName(classId: string): Promise<string | null> {
    try {
      const dto = (await this.http.get(
        CLASS_EP.classHomeroomTeacher(classId),
      )) as unknown as HomeroomAssignmentResponseDto;
      return dto.teacherMemberId;
    } catch (err) {
      if (errorCodeOf(err) === "CLASS_ASSIGNMENT_NOT_FOUND") {
        return null;
      }
      throw err;
    }
  }

  async getClasses(params: {
    academicYear?: string;
  }): Promise<Result<ClassSummary[]>> {
    try {
      // cursor-paginated list: { raw: true } + parseEnvelope (TR-031). No
      // gradeLevel client-side filter here (unlike class-management) — the
      // roster class picker shows every class on the page.
      const envelope = (await this.http.get(ROSTER_EP.classes, {
        params: {
          ...(params.academicYear ? { academicYear: params.academicYear } : {}),
        },
        raw: true,
      })) as unknown as ApiEnvelope<ClassesResponseDto>;
      const { data } = parseEnvelope(envelope);
      const classes = await Promise.all(
        data.map(async (dto) => {
          const homeroomTeacherName = await this.fetchHomeroomName(dto.classId);
          return toClassSummary(dto, homeroomTeacherName);
        }),
      );
      return { ok: true, data: classes };
    } catch (err) {
      return { ok: false, error: toRosterFailure(err) };
    }
  }

  /**
   * PERMANENTLY mock-first regardless of `USE_MOCK` (US-E18.5, cross-repo
   * ask #9) — matches class-management's `listTeachers` precedent (US-E18.4).
   * The wire `EnrollmentResponse` (`GET /classes/{id}/students`) carries only
   * `enrollmentId`/`classId`/`studentMemberId`/`academicYearLabel`/`enrolledAt`
   * — no student name, DOB, gender, or status. IAM has no batch/by-id profile
   * lookup on the public API (ask #7) and no `gender` field anywhere. Rendering
   * raw UUIDs for every roster row is not a shippable screen, so the DI factory
   * always delegates this method to the mock repo. This stub is never invoked.
   */
  async getClassRoster(_classId: string): Promise<Result<RosterStudent[]>> {
    return { ok: false, error: { type: "unknown" } };
  }

  /**
   * PERMANENTLY mock-first (US-E18.5, cross-repo ask #9). No core endpoint
   * exists for the unassigned-student search pool (`/students/unassigned`
   * doesn't exist), and even the roster listing carries no display fields (see
   * `getClassRoster`). The DI factory always delegates this to the mock repo.
   * This stub is never invoked.
   */
  async getSearchPool(_classId: string): Promise<Result<SearchStudent[]>> {
    return { ok: false, error: { type: "unknown" } };
  }

  async enrollStudent(classId: string, studentId: string): Promise<VoidResult> {
    try {
      await this.http.post(classStudentsPath(classId), {
        studentMemberId: studentId,
      });
      return { ok: true, data: undefined };
    } catch (err) {
      return { ok: false, error: toRosterFailure(err) };
    }
  }

  async unenrollStudent(
    classId: string,
    studentId: string,
  ): Promise<VoidResult> {
    try {
      await this.http.delete(unenrollPath(classId, studentId));
      return { ok: true, data: undefined };
    } catch (err) {
      const failure = toRosterFailure(err);
      // TR-034: ROSTER_STUDENT_NOT_ENROLLED (404) on delete → silent success
      // (student already removed — idempotent unenroll)
      if (failure.type === "not-found") {
        return { ok: true, data: undefined };
      }
      return { ok: false, error: failure };
    }
  }

  async unenrollStudents(
    classId: string,
    studentIds: string[],
  ): Promise<VoidResult> {
    try {
      await Promise.all(
        studentIds.map((id) => this.http.delete(unenrollPath(classId, id))),
      );
      return { ok: true, data: undefined };
    } catch (err) {
      const failure = toRosterFailure(err);
      // TR-034: 404 on individual deletes is idempotent — treat as success
      if (failure.type === "not-found") {
        return { ok: true, data: undefined };
      }
      return { ok: false, error: failure };
    }
  }

  /**
   * Two-step transfer: unenroll from source class, then enroll in target class.
   * No dedicated transfer endpoint exists in the core service (TR-032, US-E06.7).
   * The `ROSTER_STUDENT_ALREADY_ENROLLED` (409) from enroll step surfaces as
   * `already-enrolled` failure — used for transfer-warning UX.
   */
  async transferStudent(
    studentId: string,
    fromClassId: string,
    toClassId: string,
  ): Promise<VoidResult> {
    // Step 1: unenroll from source (404 = already gone = ok)
    const unenrollResult = await this.unenrollStudent(fromClassId, studentId);
    if (!unenrollResult.ok) return unenrollResult;

    // Step 2: enroll in target
    return this.enrollStudent(toClassId, studentId);
  }
}
