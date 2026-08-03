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
import type { EnrollmentListResponseDto } from "../dtos/enrollment-response.dto";
import type { RosterStudentDetail } from "../mappers/roster.mapper";
import {
  toClassSummary,
  toRosterStudentFromEnrollment,
} from "../mappers/roster.mapper";
import { toRosterFailure } from "../mappers/roster-failure.mapper";

/**
 * `memberId → display detail` resolver, injected by
 * `bootstrap/di/admin-roster.di.ts` from `iam-directory`'s
 * `BatchResolveMembersUseCase` (the ONE batch-lookup client in this app — do
 * not add a second). Composing across services belongs in `bootstrap/di`
 * (decision 0017), so this repository sees a plain function and never spans
 * `core` and `iam` itself.
 *
 * Contractually never reports per-id: ids it cannot resolve are simply absent
 * from the returned map.
 */
export type ResolveStudentDetails = (
  memberIds: string[],
) => Promise<Map<string, RosterStudentDetail>>;

/** BE caps `limit` at 100 (`listMaxLimit`, core `list_classes.go`). */
const ROSTER_PAGE_SIZE = 100;
/**
 * Safety stop for cursor following. 10 × 100 = 1000 students in one class,
 * far beyond any real roster — a higher count means a paging bug, and looping
 * forever server-side would be the worse failure.
 */
const ROSTER_MAX_PAGES = 10;

export class RosterRepository implements IRosterRepository {
  constructor(
    private readonly http: AxiosInstance,
    /**
     * Optional so the wire-level tests (and any caller that only needs the
     * class list or the write paths) can construct the repository with just an
     * http client. Absent = rows carry no name/dob/gender, which presentation
     * renders as placeholders — a degraded display, never an error (same
     * convention as `parent-child-list.repository.ts`).
     */
    private readonly resolveStudentDetails?: ResolveStudentDetails,
  ) {}

  async getClasses(params: {
    academicYear?: string;
  }): Promise<Result<ClassSummary[]>> {
    try {
      // cursor-paginated list: { raw: true } + parseEnvelope (TR-031). No
      // gradeLevel client-side filter here (unlike class-management) — the
      // roster class picker shows every class on the page. One HTTP call total:
      // the homeroom teacher's id AND display name ride on each row since BE
      // US-173 (US-E18.30 removed the per-row `.../homeroom-teacher` fan-out,
      // which also fixed the picker rendering a raw member uuid as the GVCN).
      const envelope = (await this.http.get(ROSTER_EP.classes, {
        params: {
          ...(params.academicYear ? { academicYear: params.academicYear } : {}),
        },
        raw: true,
      })) as unknown as ApiEnvelope<ClassesResponseDto>;
      const { data } = parseEnvelope(envelope);
      return { ok: true, data: data.map((dto) => toClassSummary(dto)) };
    } catch (err) {
      return { ok: false, error: toRosterFailure(err) };
    }
  }

  /**
   * REAL since US-E18.35 — un-mocks the US-E18.5 "permanent" mock.
   *
   * That force-mock had one stated cause: `EnrollmentResponse` carries no
   * display fields and "IAM has no batch/by-id profile lookup". IAM US-144 +
   * ADR-0120 + US-169 removed exactly that blocker, so the roster is now a
   * genuine two-source composition:
   *
   * 1. core `GET /classes/{id}/students` — the AUTHORITY for WHICH students are
   *    enrolled (cursor-paginated; every page is followed so a large class is
   *    not silently truncated).
   * 2. IAM `GET /members?ids=` via the injected resolver — DECORATION ONLY, for
   *    exactly the ids step 1 returned. It is never an existence oracle and must
   *    never be handed an id core did not produce. NOT necessarily one call:
   *    `BatchResolveMembersUseCase` chunks at 50 ids, so a class of 51+ students
   *    costs `ceil(n / 50)` sequential calls.
   *
   * The decoration is best-effort: a failure degrades rows to
   * name/dob/gender-less (placeholders) rather than failing the screen. Note the
   * blast radius of that degrade is the WHOLE roster, not one chunk — the
   * use-case returns on the first failing chunk (US-E18.29/US-E18.33 behaviour,
   * unchanged here), so nothing already resolved survives. The enrollment read
   * is NOT best-effort — without it there is no roster.
   */
  async getClassRoster(classId: string): Promise<Result<RosterStudent[]>> {
    try {
      const enrollments = await this.listEnrollments(classId);
      const details = await this.studentDetailMap(
        enrollments.map((e) => e.studentMemberId),
      );
      return {
        ok: true,
        data: enrollments.map((e) =>
          toRosterStudentFromEnrollment(e, details.get(e.studentMemberId)),
        ),
      };
    } catch (err) {
      return { ok: false, error: toRosterFailure(err) };
    }
  }

  /** Every enrollment page for the class ({ raw: true } + parseEnvelope, TR-031). */
  private async listEnrollments(classId: string) {
    const rows: EnrollmentListResponseDto = [];
    let cursor: string | undefined;

    for (let page = 0; page < ROSTER_MAX_PAGES; page++) {
      const envelope = (await this.http.get(classStudentsPath(classId), {
        params: {
          limit: ROSTER_PAGE_SIZE,
          ...(cursor ? { cursor } : {}),
        },
        // Top level, sibling of `params` — `isRawCall` reads `config.raw`.
        raw: true,
      })) as unknown as ApiEnvelope<EnrollmentListResponseDto>;
      const { data, pagination } = parseEnvelope(envelope);
      rows.push(...data);
      if (!pagination?.hasMore || !pagination.nextCursor) break;
      cursor = pagination.nextCursor;
    }
    return rows;
  }

  /**
   * Names/dob/gender for EXACTLY the ids the enrollment list returned, in one
   * batched call. Never throws: a lookup error degrades to an empty map and
   * the rows render with placeholders.
   */
  private async studentDetailMap(
    memberIds: string[],
  ): Promise<Map<string, RosterStudentDetail>> {
    if (!this.resolveStudentDetails || memberIds.length === 0) return new Map();
    try {
      return await this.resolveStudentDetails(memberIds);
    } catch {
      return new Map();
    }
  }

  /**
   * PERMANENTLY mock-first (US-E18.5, cross-repo ask #9) — and NOT unblocked by
   * US-E18.35. This gap is a MISSING ENDPOINT, unrelated to the display-field
   * gap that closed: core exposes no query for "students not enrolled in this
   * class" (`/students/unassigned` does not exist), so there is nothing to
   * call. Adding dob/gender to the IAM batch lookup does not help — a lookup by
   * id cannot enumerate a candidate pool. The DI factory therefore still
   * delegates THIS method (only) to the mock repo, and this stub is never
   * invoked.
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
