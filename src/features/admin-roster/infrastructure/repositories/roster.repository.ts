import "server-only";
import type { AxiosInstance } from "axios";
import {
  classStudentsPath,
  ROSTER_EP,
  unenrollPath,
} from "@/bootstrap/endpoint/admin-roster.endpoint";
import { type ApiEnvelope, parseEnvelope } from "@/bootstrap/lib/api-envelope";
import type { ClassSummary } from "../../domain/entities/class-summary.entity";
import type { RosterStudent } from "../../domain/entities/roster-student.entity";
import type { SearchStudent } from "../../domain/entities/search-student.entity";
import type {
  IRosterRepository,
  Result,
  VoidResult,
} from "../../domain/repositories/i-roster.repository";
import type { ClassesResponseDto } from "../dtos/classes-response.dto";
import type { RosterResponseDto } from "../dtos/roster-response.dto";
import type { SearchStudentsResponseDto } from "../dtos/search-students-response.dto";
import {
  toClassSummary,
  toRosterStudent,
  toSearchStudent,
} from "../mappers/roster.mapper";
import { toRosterFailure } from "../mappers/roster-failure.mapper";

export class RosterRepository implements IRosterRepository {
  constructor(private readonly http: AxiosInstance) {}

  async getClasses(params: {
    academicYear?: string;
  }): Promise<Result<ClassSummary[]>> {
    try {
      // cursor-paginated: use { raw: true } + parseEnvelope (TR-031)
      const envelope = (await this.http.get(ROSTER_EP.classes, {
        params: {
          ...(params.academicYear ? { academicYear: params.academicYear } : {}),
        },
        raw: true,
      })) as unknown as ApiEnvelope<ClassesResponseDto>;
      const { data } = parseEnvelope(envelope);
      return { ok: true, data: (data as ClassSummary[]).map(toClassSummary) };
    } catch (err) {
      return { ok: false, error: toRosterFailure(err) };
    }
  }

  async getClassRoster(classId: string): Promise<Result<RosterStudent[]>> {
    try {
      // cursor-paginated: use { raw: true } + parseEnvelope (TR-031)
      const envelope = (await this.http.get(classStudentsPath(classId), {
        raw: true,
      })) as unknown as ApiEnvelope<RosterResponseDto>;
      const { data } = parseEnvelope(envelope);
      return {
        ok: true,
        data: (data as RosterStudent[]).map(toRosterStudent),
      };
    } catch (err) {
      return { ok: false, error: toRosterFailure(err) };
    }
  }

  /**
   * Search pool — returns candidate students for the Add panel.
   * This method should NOT be called directly in the real repo; the DI factory
   * routes getSearchPool to the mock for this method (TR-033, decision 0014).
   * No core endpoint exists for listing students not in any class yet.
   */
  async getSearchPool(_classId: string): Promise<Result<SearchStudent[]>> {
    try {
      const data = (await this.http.get(
        ROSTER_EP.searchPool,
      )) as unknown as SearchStudentsResponseDto;
      return { ok: true, data: data.map(toSearchStudent) };
    } catch (err) {
      return { ok: false, error: toRosterFailure(err) };
    }
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
