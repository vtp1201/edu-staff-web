import "server-only";
import type { AxiosInstance } from "axios";
import { CLASS_EP } from "@/bootstrap/endpoint/class.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  parseEnvelope,
  statusOf,
} from "@/bootstrap/lib/api-envelope";
import type {
  Class,
  CreateClassInput,
  RenameClassInput,
} from "../../domain/entities/class.entity";
import type { TeacherMember } from "../../domain/entities/teacher-member.entity";
import type { ClassManagementFailure } from "../../domain/failures/class-management.failure";
import type {
  ClassListPage,
  IClassManagementRepository,
} from "../../domain/repositories/i-class-management.repository";
import { fail, ok, type Result } from "../../domain/use-cases/result";
import type { ClassResponseDto } from "../dtos/class-response.dto";
import type { EnrollmentResponseDto } from "../dtos/enrollment-response.dto";
import type { HomeroomAssignmentResponseDto } from "../dtos/homeroom-assignment-response.dto";
import {
  type ClassEnrichment,
  ClassManagementMapper,
} from "../mappers/class-management.mapper";

/**
 * Map a normalised ApiError to the class-management failure union.
 * Branch on error.code (UPPER_SNAKE), never on message (TR-026, decision 0008).
 * Full `Class + TeachingAssignment (US-041)` matrix — see story US-E18.4.
 */
function toFailure(err: unknown): ClassManagementFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  if (code === "NETWORK_ERROR" || status === undefined) {
    return { type: "network-error" };
  }
  if (code === "CLASS_ALREADY_EXISTS") {
    return { type: "duplicate-class" };
  }
  if (code === "CLASS_ARCHIVED") {
    return { type: "class-archived" };
  }
  if (
    code === "CLASS_GRADE_LEVEL_OUTSIDE_TENANT_RANGE" ||
    code === "CLASS_INVALID_GRADE_LEVEL" ||
    code === "SCHOOL_GRADE_LEVEL_RANGE_NOT_CONFIGURED"
  ) {
    return { type: "grade-level-out-of-range" };
  }
  if (code === "CLASS_ASSIGNMENT_TEACHER_NOT_FOUND") {
    return { type: "homeroom-teacher-not-found" };
  }
  if (code === "CLASS_ASSIGNMENT_NOT_TEACHER_ROLE") {
    return { type: "assignee-not-teacher" };
  }
  if (code === "CLASS_INVALID_NAME") {
    return { type: "invalid-name" };
  }
  if (code === "CLASS_INVALID_ACADEMIC_YEAR") {
    return { type: "invalid-academic-year" };
  }
  if (code === "CLASS_NOT_FOUND" || status === 404) {
    return { type: "not-found" };
  }
  if (code === "CLASS_FORBIDDEN" || status === 403) {
    return { type: "forbidden" };
  }
  if ((err as { retryable?: boolean })?.retryable) {
    return { type: "network-error" };
  }
  return { type: "unknown" };
}

export class ClassManagementRepository implements IClassManagementRepository {
  constructor(private readonly http: AxiosInstance) {}

  /** Paginate a class's roster to completion and count enrollments. */
  private async countRoster(classId: string): Promise<number> {
    let count = 0;
    let cursor: string | undefined;
    for (;;) {
      const envelope = (await this.http.get(CLASS_EP.classStudents(classId), {
        params: { cursor, limit: 100 },
        raw: true,
      })) as unknown as ApiEnvelope<EnrollmentResponseDto[]>;
      const { data, pagination } = parseEnvelope(envelope);
      count += data.length;
      if (!pagination?.hasMore || !pagination.nextCursor) break;
      cursor = pagination.nextCursor;
    }
    return count;
  }

  /** `404 CLASS_ASSIGNMENT_NOT_FOUND` means "no homeroom" — not an error. */
  private async fetchHomeroom(
    classId: string,
  ): Promise<{ id: string | null; name: string | null }> {
    try {
      const dto = (await this.http.get(
        CLASS_EP.classHomeroomTeacher(classId),
      )) as unknown as HomeroomAssignmentResponseDto;
      const teacher = ClassManagementMapper.toTeacherMemberFromHomeroom(dto);
      return { id: teacher.userId, name: teacher.displayName };
    } catch (err) {
      if (errorCodeOf(err) === "CLASS_ASSIGNMENT_NOT_FOUND") {
        return { id: null, name: null };
      }
      throw err;
    }
  }

  private async enrich(classId: string): Promise<ClassEnrichment> {
    const [studentCount, homeroom] = await Promise.all([
      this.countRoster(classId),
      this.fetchHomeroom(classId),
    ]);
    return {
      studentCount,
      homeroomTeacherId: homeroom.id,
      homeroomTeacherName: homeroom.name,
    };
  }

  async listClasses(params: {
    academicYear?: string;
    gradeLevel?: number;
    cursor?: string;
  }): Promise<Result<ClassListPage, ClassManagementFailure>> {
    try {
      // cursor-paginated list: { raw: true } + parseEnvelope (TR-026). No
      // `gradeLevel` query filter on the real wire (US-E18.4) — apply
      // client-side after fetching the page.
      const envelope = (await this.http.get(CLASS_EP.classes, {
        params: { academicYear: params.academicYear, cursor: params.cursor },
        raw: true,
      })) as unknown as ApiEnvelope<ClassResponseDto[]>;
      const { data, pagination } = parseEnvelope(envelope);
      const filtered =
        params.gradeLevel === undefined
          ? data
          : data.filter((dto) => dto.gradeLevel === params.gradeLevel);

      const classes = await Promise.all(
        filtered.map(async (dto) => {
          const enrichment = await this.enrich(dto.classId);
          return ClassManagementMapper.toClass(dto, enrichment);
        }),
      );

      return ok({
        data: classes,
        nextCursor: pagination?.nextCursor ?? null,
        hasMore: pagination?.hasMore ?? false,
      });
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async createClass(
    input: CreateClassInput,
  ): Promise<Result<Class, ClassManagementFailure>> {
    try {
      const data = (await this.http.post(
        CLASS_EP.classes,
        ClassManagementMapper.toCreateClassBody(input),
      )) as unknown as ClassResponseDto;
      // A brand-new class has no students/homeroom yet — cheap accurate
      // defaults, no extra round-trips.
      return ok(
        ClassManagementMapper.toClass(data, {
          studentCount: 0,
          homeroomTeacherId: null,
          homeroomTeacherName: null,
        }),
      );
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async renameClass(
    classId: string,
    input: RenameClassInput,
  ): Promise<Result<Class, ClassManagementFailure>> {
    try {
      let { name, gradeLevel } = input;
      if (name === undefined || gradeLevel === undefined) {
        // Real `UpdateClassRequest` requires BOTH fields — backfill any
        // missing one from the current class (US-E18.4).
        const current = (await this.http.get(
          CLASS_EP.class(classId),
        )) as unknown as ClassResponseDto;
        name = name ?? current.name;
        gradeLevel = gradeLevel ?? current.gradeLevel;
      }
      const data = (await this.http.patch(
        CLASS_EP.class(classId),
        ClassManagementMapper.toUpdateClassBody({ name, gradeLevel }),
      )) as unknown as ClassResponseDto;
      const enrichment = await this.enrich(classId);
      return ok(ClassManagementMapper.toClass(data, enrichment));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async archiveClass(
    classId: string,
  ): Promise<Result<void, ClassManagementFailure>> {
    try {
      await this.http.post(CLASS_EP.classArchive(classId));
      return ok(undefined);
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async assignHomeroomTeacher(
    classId: string,
    teacherUserId: string,
  ): Promise<Result<void, ClassManagementFailure>> {
    try {
      await this.http.put(CLASS_EP.classHomeroomTeacher(classId), {
        teacherMemberId: teacherUserId,
      });
      return ok(undefined);
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async getHomeroomTeacher(
    classId: string,
  ): Promise<Result<TeacherMember | null, ClassManagementFailure>> {
    try {
      const dto = (await this.http.get(
        CLASS_EP.classHomeroomTeacher(classId),
      )) as unknown as HomeroomAssignmentResponseDto;
      return ok(ClassManagementMapper.toTeacherMemberFromHomeroom(dto));
    } catch (err) {
      if (errorCodeOf(err) === "CLASS_ASSIGNMENT_NOT_FOUND") {
        return ok(null);
      }
      return fail(toFailure(err));
    }
  }

  // MOCK-FIRST, permanently, until BE ships a listing endpoint (US-E18.4):
  // IAM's public API (`edu-api/services/iam/docs/openapi.yaml`, `Members`
  // tag) exposes only `POST` (add), `PATCH` (change roles), `DELETE`
  // (remove) on `/api/v1/tenants/{id}/members` — NO `GET` list and NO `GET`
  // single-member lookup. The only member-lookup endpoint
  // (`GET /internal/v1/tenants/{tenantId}/members/{userId}`) is explicitly
  // internal service-to-service only (bypasses Kong). There is currently no
  // way for the web app to list members (with or without a role filter) from
  // IAM. Cross-repo ask #7 logged in EPIC-OVERVIEW.md. The DI factory always
  // serves this method from the mock repository, regardless of `USE_MOCK`.
  async listTeachers(): Promise<
    Result<TeacherMember[], ClassManagementFailure>
  > {
    return fail({ type: "unknown" });
  }
}
